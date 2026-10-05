"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import type { FamilyFund, FundScope } from "@/lib/funds";
import {
  DEFAULT_PERSONAL_FUND_COLOR,
  DEFAULT_SHARED_FUND_COLOR,
  isAllowedFundColor,
} from "@/lib/funds";
import { calculateFundCashBalance, getDefaultSharedFund, getPersonalFund } from "@/lib/funds";

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

export async function ensureFamilyFunds(familyId: string): Promise<FamilyFund[]> {
  const admin = getSupabaseAdminClient();

  const { data: existing, error } = await admin
    .from("family_funds")
    .select("*")
    .eq("family_id", familyId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    // Table may not exist yet — surface a clear message
    throw new Error(
      error.message.includes("family_funds")
        ? "Falta aplicar la migración de fondos (family_funds). Ejecuta database/migrations/001_family_funds.sql"
        : error.message
    );
  }

  let funds = (existing ?? []) as FamilyFund[];

  const hasDefaultShared = funds.some((f) => f.scope === "shared" && f.is_default);
  if (!hasDefaultShared) {
    const sharedPayload = {
      family_id: familyId,
      name: "Fondo común",
      scope: "shared" as const,
      owner_profile_id: null,
      is_default: true,
      is_system: true,
      sort_order: 0,
      color: DEFAULT_SHARED_FUND_COLOR,
    };
    let { data: created, error: createError } = await admin
      .from("family_funds")
      .insert(sharedPayload as never)
      .select("*")
      .single();
    if (createError && /color/i.test(createError.message)) {
      const { color: _color, ...withoutColor } = sharedPayload;
      ({ data: created, error: createError } = await admin
        .from("family_funds")
        .insert(withoutColor as never)
        .select("*")
        .single());
    }
    if (createError) throw new Error(createError.message);
    funds = [...funds, created as FamilyFund];
  }

  const { data: members } = await admin
    .from("profiles")
    .select("id")
    .eq("family_id", familyId);

  for (const member of members ?? []) {
    const hasPersonal = funds.some(
      (f) => f.scope === "personal" && f.owner_profile_id === member.id
    );
    if (!hasPersonal) {
      const personalPayload = {
        family_id: familyId,
        name: "Mi fondo",
        scope: "personal" as const,
        owner_profile_id: member.id,
        is_default: true,
        is_system: true,
        sort_order: 10,
        color: DEFAULT_PERSONAL_FUND_COLOR,
      };
      let { data: created, error: createError } = await admin
        .from("family_funds")
        .insert(personalPayload as never)
        .select("*")
        .single();
      if (createError && /color/i.test(createError.message)) {
        const { color: _color, ...withoutColor } = personalPayload;
        ({ data: created, error: createError } = await admin
          .from("family_funds")
          .insert(withoutColor as never)
          .select("*")
          .single());
      }
      if (createError) throw new Error(createError.message);
      funds = [...funds, created as FamilyFund];
    }
  }

  return funds;
}

export async function listFamilyFundsAction(): Promise<FamilyFund[]> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  return ensureFamilyFunds(familyId);
}

export async function createFundAction(input: {
  name: string;
  scope: FundScope;
  color?: string;
}): Promise<FamilyFund> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const name = input.name.trim();
  const color = (input.color ?? DEFAULT_SHARED_FUND_COLOR).trim();

  if (!name) throw new Error("El nombre del fondo es obligatorio.");
  if (name.length > 40) throw new Error("El nombre es demasiado largo.");
  if (!isAllowedFundColor(color)) {
    throw new Error("Selecciona un color válido.");
  }

  await ensureFamilyFunds(familyId);
  const admin = getSupabaseAdminClient();

  const payload =
    input.scope === "shared"
      ? {
          family_id: familyId,
          name,
          scope: "shared" as const,
          owner_profile_id: null,
          is_default: false,
          is_system: false,
          sort_order: 100,
          color,
        }
      : {
          family_id: familyId,
          name,
          scope: "personal" as const,
          owner_profile_id: user.id,
          is_default: false,
          is_system: false,
          sort_order: 110,
          color,
        };

  const { data, error } = await admin
    .from("family_funds")
    .insert(payload as never)
    .select("*")
    .single();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error("Ya existe un fondo con ese nombre.");
    }
    if (/color/i.test(error.message) && /column|schema|does not exist/i.test(error.message)) {
      throw new Error(
        "Falta aplicar la migración de color (family_funds.color). Ejecuta database/migrations/002_family_funds_color.sql"
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/profile");

  return data as FamilyFund;
}

export async function archiveFundAction(fundId: string) {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const admin = getSupabaseAdminClient();

  const { data: fund, error } = await admin
    .from("family_funds")
    .select("*")
    .eq("id", fundId)
    .eq("family_id", familyId)
    .maybeSingle();

  if (error || !fund) throw new Error("Fondo no encontrado.");
  if (fund.is_system) throw new Error("No puedes archivar un fondo del sistema.");
  if (fund.scope === "personal" && fund.owner_profile_id !== user.id) {
    throw new Error("Solo puedes archivar tus fondos personales.");
  }

  const { data: expenses } = await admin
    .from("expenses")
    .select("amount, category, paid_by, responsible_for, fund_id, paid_from_fund, transfer_group_id, is_active")
    .eq("family_id", familyId)
    .eq("is_active", true);

  const balance = calculateFundCashBalance((expenses ?? []) as never[], fundId);
  if (Math.abs(balance) > 0.009) {
    throw new Error("El fondo debe tener saldo 0 antes de archivarlo.");
  }

  const { error: updateError } = await admin
    .from("family_funds")
    .update({ archived_at: new Date().toISOString() } as never)
    .eq("id", fundId);

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/");
  revalidatePath("/profile");
  return { success: true };
}

export async function depositToFundAction(input: {
  fundId: string;
  amount: number;
  date?: string;
  concept?: string;
}) {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Ingresa un importe válido.");
  }

  const funds = await ensureFamilyFunds(familyId);
  const fund = funds.find((f) => f.id === input.fundId && !f.archived_at);
  if (!fund) throw new Error("Fondo no encontrado.");

  if (fund.scope === "personal" && fund.owner_profile_id !== user.id) {
    throw new Error("Solo puedes aportar a tu fondo personal.");
  }

  const admin = getSupabaseAdminClient();
  const responsibleFor =
    fund.scope === "shared" ? "joint_fund" : (fund.owner_profile_id as string);

  const payload = {
    family_id: familyId,
    amount: Number(amount.toFixed(2)),
    concept:
      input.concept?.trim() ||
      (fund.scope === "shared" ? `Aporte a ${fund.name}` : "Aporte personal"),
    category: "deposit",
    split_type: fund.scope === "shared" ? "shared_equal" : "personal",
    responsible_for: responsibleFor,
    paid_by: user.id,
    payer_share_pct: 100,
    is_settled: true,
    fund_id: fund.id,
    paid_from_fund: false,
    expense_date: input.date ?? new Date().toISOString().slice(0, 10),
  };

  const { error } = await admin.from("expenses").insert(payload as never);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/history");
  return { success: true, fundId: fund.id };
}

export async function transferBetweenFundsAction(input: {
  fromFundId: string;
  toFundId: string;
  amount: number;
  date?: string;
}) {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Ingresa un importe válido.");
  }
  if (input.fromFundId === input.toFundId) {
    throw new Error("Elige dos fondos distintos.");
  }

  const funds = await ensureFamilyFunds(familyId);
  const from = funds.find((f) => f.id === input.fromFundId && !f.archived_at);
  const to = funds.find((f) => f.id === input.toFundId && !f.archived_at);
  if (!from || !to) throw new Error("Fondo no encontrado.");

  if (from.scope === "personal" && from.owner_profile_id !== user.id) {
    throw new Error("Solo puedes transferir desde tu fondo personal.");
  }
  if (to.scope === "personal" && to.owner_profile_id !== user.id) {
    throw new Error("Solo puedes transferir hacia tu fondo personal.");
  }

  const admin = getSupabaseAdminClient();
  const { data: expenses } = await admin
    .from("expenses")
    .select("amount, category, paid_by, responsible_for, fund_id, paid_from_fund, transfer_group_id, is_active")
    .eq("family_id", familyId)
    .eq("is_active", true);

  const defaultShared = getDefaultSharedFund(funds);
  const balance = calculateFundCashBalance((expenses ?? []) as never[], from.id, {
    treatLegacyJointAsFundId: defaultShared?.id ?? null,
  });

  if (balance + 0.009 < amount) {
    throw new Error("Saldo insuficiente en el fondo de origen.");
  }

  const transferGroupId = crypto.randomUUID();
  const expenseDate = input.date ?? new Date().toISOString().slice(0, 10);
  const amountFixed = Number(amount.toFixed(2));

  const fromResponsible =
    from.scope === "shared" ? "joint_fund" : (from.owner_profile_id as string);
  const toResponsible =
    to.scope === "shared" ? "joint_fund" : (to.owner_profile_id as string);

  const { error } = await admin.from("expenses").insert([
    {
      family_id: familyId,
      amount: amountFixed,
      concept: `Transferencia a ${to.name}`,
      category: "withdrawal",
      split_type: "personal",
      responsible_for: fromResponsible,
      paid_by: user.id,
      payer_share_pct: 100,
      is_settled: true,
      fund_id: from.id,
      paid_from_fund: true,
      transfer_group_id: transferGroupId,
      expense_date: expenseDate,
    },
    {
      family_id: familyId,
      amount: amountFixed,
      concept: `Transferencia desde ${from.name}`,
      category: "deposit",
      split_type: "personal",
      responsible_for: toResponsible,
      paid_by: user.id,
      payer_share_pct: 100,
      is_settled: true,
      fund_id: to.id,
      paid_from_fund: false,
      transfer_group_id: transferGroupId,
      expense_date: expenseDate,
    },
  ] as never);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/history");
  return { success: true, transferGroupId };
}

export async function getFundsOverviewAction() {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const funds = await ensureFamilyFunds(familyId);
  const admin = getSupabaseAdminClient();

  const { data: expenses } = await admin
    .from("expenses")
    .select(
      "amount, category, concept, paid_by, responsible_for, fund_id, paid_from_fund, transfer_group_id, is_active, is_settled"
    )
    .eq("family_id", familyId)
    .eq("is_active", true);

  const defaultShared = getDefaultSharedFund(funds);
  const rows = (expenses ?? []) as never[];

  return {
    funds,
    balances: funds
      .filter((f) => !f.archived_at)
      .filter((f) => f.scope === "shared" || f.owner_profile_id === user.id)
      .map((fund) => ({
        fund,
        balance: calculateFundCashBalance(rows, fund.id, {
          treatLegacyJointAsFundId: defaultShared?.id ?? null,
        }),
      })),
    personalFundId: getPersonalFund(funds, user.id)?.id ?? null,
    sharedDefaultFundId: defaultShared?.id ?? null,
  };
}
