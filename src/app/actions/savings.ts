"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  transferAccountToFundAction,
  transferFundToAccountAction,
  loadFamilyAccountsForFamily,
} from "@/app/actions/accounts";
import {
  depositToFundAction,
  getFamilyFundsFast,
  transferBetweenFundsAction,
} from "@/app/actions/funds";
import {
  calculateAccountCashBalance,
  listOperableAccountsForUser,
  type FamilyAccount,
} from "@/lib/accounts";
import {
  calculateFundCashBalance,
  calculateSoloPersonalFundBalance,
  getDefaultSharedFund,
  getPersonalFund,
  getSavingsFund,
  isFixedExpensesFund,
  isSavingsFund,
  listActiveFunds,
  type FamilyFund,
} from "@/lib/funds";
import {
  isIndividualHousehold,
  memberCountFromFamilyUsers,
} from "@/lib/household";
import {
  calculateSavingsBalance,
  computeSavingsMonthMetrics,
  type SavingsMonthMetrics,
} from "@/lib/savings";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";

export type SavingsSource =
  | { type: "account"; id: string }
  | { type: "fund"; id: string }
  | { type: "external" };

export type SavingsMovement = {
  id: string;
  amount: number;
  concept: string | null;
  category: string | null;
  expense_date: string | null;
  direction: "in" | "out";
};

export type SavingsSourceAccount = FamilyAccount & { balance: number };
export type SavingsSourceFund = FamilyFund & { balance: number };

export type SavingsOverview = {
  fund: FamilyFund;
  balance: number;
  metrics: SavingsMonthMetrics;
  recentMovements: SavingsMovement[];
  operableAccounts: SavingsSourceAccount[];
  operableFunds: SavingsSourceFund[];
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

async function getUserFamilyId(userId: string) {
  const admin = getSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("family_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile?.family_id) {
    throw new Error("Debes pertenecer a una familia.");
  }

  return profile.family_id as string;
}

async function getFamilyMemberCount(familyId: string): Promise<number> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("families")
    .select("user_1_id, user_2_id")
    .eq("id", familyId)
    .maybeSingle();
  return memberCountFromFamilyUsers(data?.user_1_id, data?.user_2_id) || 1;
}

function revalidateSavingsPaths() {
  revalidatePath("/savings");
  revalidatePath("/accounts");
  revalidatePath("/history");
}

export async function getSavingsOverviewAction(): Promise<SavingsOverview> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const admin = getSupabaseAdminClient();

  const [funds, memberCount, accounts, expensesResult] = await Promise.all([
    getFamilyFundsFast(familyId, { requireSavings: true }),
    getFamilyMemberCount(familyId),
    loadFamilyAccountsForFamily(familyId),
    admin
      .from("expenses")
      .select(
        "id, amount, category, concept, paid_by, responsible_for, fund_id, paid_from_fund, account_id, paid_from_account, transfer_group_id, is_active, expense_date"
      )
      .eq("family_id", familyId)
      .eq("is_active", true)
      .order("expense_date", { ascending: false })
      .limit(500),
  ]);

  const savings = getSavingsFund(funds);
  if (!savings) {
    throw new Error(
      "No encontramos el bote de ahorro. Comprueba que la columna purpose esté migrada."
    );
  }

  if (expensesResult.error) throw new Error(expensesResult.error.message);

  const rows = (expensesResult.data ?? []) as Array<{
    id: string;
    amount: number;
    category: string | null;
    concept: string | null;
    fund_id: string | null;
    account_id?: string | null;
    expense_date: string | null;
    is_active?: boolean | null;
    paid_by: string;
    responsible_for?: string | null;
    paid_from_fund?: boolean | null;
    paid_from_account?: boolean | null;
    transfer_group_id?: string | null;
  }>;

  const metrics = computeSavingsMonthMetrics(rows, savings.id);

  const recentMovements: SavingsMovement[] = rows
    .filter((e) => e.fund_id === savings.id)
    .slice(0, 20)
    .map((e) => {
      const category = String(e.category ?? "").toLowerCase();
      return {
        id: e.id,
        amount: Number(e.amount || 0),
        concept: e.concept,
        category: e.category,
        expense_date: e.expense_date,
        direction: (category === "withdrawal" ? "out" : "in") as "in" | "out",
      };
    });

  const individual = isIndividualHousehold(memberCount);
  const defaultShared = getDefaultSharedFund(funds);
  const defaultPersonal = getPersonalFund(funds, user.id);
  const operableAccounts = listOperableAccountsForUser(accounts, user.id).map(
    (account) => ({
      ...account,
      balance: calculateAccountCashBalance(rows, account.id),
    })
  );
  // Any spending pocket can fund savings (leftover at month end) — not Ahorro / Gastos fijos.
  const operableFunds = listActiveFunds(funds)
    .filter((f) => {
      if (isSavingsFund(f) || isFixedExpensesFund(f)) return false;
      if (individual) {
        return f.scope === "personal" && f.owner_profile_id === user.id;
      }
      return f.scope === "shared" || f.owner_profile_id === user.id;
    })
    .map((fund) => ({
      ...fund,
      balance:
        fund.scope === "personal"
          ? calculateSoloPersonalFundBalance(
              rows,
              fund,
              user.id,
              defaultPersonal?.id ?? null
            )
          : calculateFundCashBalance(rows, fund.id, {
              treatLegacyJointAsFundId: defaultShared?.id ?? null,
            }),
    }));

  return {
    fund: savings,
    balance: calculateSavingsBalance(rows, funds),
    metrics,
    recentMovements,
    operableAccounts,
    operableFunds,
  };
}

export async function contributeToSavingsAction(input: {
  amount: number;
  source: SavingsSource;
  date?: string;
}) {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const funds = await getFamilyFundsFast(familyId, { requireSavings: true });
  const savings = getSavingsFund(funds);
  if (!savings) throw new Error("No encontramos el bote de ahorro.");

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Ingresa un importe válido.");
  }

  const source = input.source;

  if (source.type === "external") {
    const result = await depositToFundAction({
      fundId: savings.id,
      amount,
      date: input.date,
      concept: "Aporte registrado",
    });
    revalidateSavingsPaths();
    return result;
  }

  if (source.type === "account") {
    const result = await transferAccountToFundAction({
      fromAccountId: source.id,
      toFundId: savings.id,
      amount,
      date: input.date,
    });
    revalidateSavingsPaths();
    return result;
  }

  const from = funds.find((f) => f.id === source.id && !f.archived_at);
  if (!from) throw new Error("Bolsillo de origen no encontrado.");
  if (isSavingsFund(from)) throw new Error("Elige un origen distinto al ahorro.");
  if (isFixedExpensesFund(from)) {
    throw new Error("No se puede aportar desde Gastos fijos.");
  }
  const memberCount = await getFamilyMemberCount(familyId);
  if (isIndividualHousehold(memberCount) && from.scope === "shared") {
    throw new Error("En un espacio individual solo puedes aportar desde tus bolsillos personales.");
  }
  if (from.scope === "personal" && from.owner_profile_id !== user.id) {
    throw new Error("Solo puedes aportar desde tu bolsillo personal.");
  }

  const result = await transferBetweenFundsAction({
    fromFundId: from.id,
    toFundId: savings.id,
    amount,
    date: input.date,
  });
  revalidateSavingsPaths();
  return result;
}

export async function withdrawFromSavingsAction(input: {
  amount: number;
  destination: Exclude<SavingsSource, { type: "external" }>;
  date?: string;
}) {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const funds = await getFamilyFundsFast(familyId, { requireSavings: true });
  const savings = getSavingsFund(funds);
  if (!savings) throw new Error("No encontramos el bote de ahorro.");

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Ingresa un importe válido.");
  }

  const destination = input.destination;

  if (destination.type === "account") {
    const result = await transferFundToAccountAction({
      fromFundId: savings.id,
      toAccountId: destination.id,
      amount,
      date: input.date,
    });
    revalidateSavingsPaths();
    return result;
  }

  const to = funds.find((f) => f.id === destination.id && !f.archived_at);
  if (!to) throw new Error("Bolsillo de destino no encontrado.");
  if (isSavingsFund(to)) throw new Error("Elige un destino distinto al ahorro.");
  const memberCount = await getFamilyMemberCount(familyId);
  if (isIndividualHousehold(memberCount) && to.scope === "shared") {
    throw new Error(
      "En un espacio individual solo puedes retirar hacia tus bolsillos personales."
    );
  }
  if (to.scope === "personal" && to.owner_profile_id !== user.id) {
    throw new Error("Solo puedes retirar hacia tu bolsillo personal.");
  }

  const result = await transferBetweenFundsAction({
    fromFundId: savings.id,
    toFundId: to.id,
    amount,
    date: input.date,
  });
  revalidateSavingsPaths();
  return result;
}
