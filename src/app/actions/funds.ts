"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { FamilyFund, FundScope } from "@/lib/funds";
import {
  DEFAULT_PERSONAL_FUND_COLOR,
  DEFAULT_SHARED_FUND_COLOR,
  FIXED_EXPENSES_FUND_COLOR,
  FIXED_EXPENSES_FUND_NAME,
  LEGACY_PERSONAL_FUND_COLOR,
  SAVINGS_FUND_COLOR,
  SAVINGS_FUND_NAME,
  getFixedExpensesFund,
  getSavingsFund,
  isAllowedFundColor,
  isFixedExpensesFund,
  isSavingsFund,
} from "@/lib/funds";
import {
  calculateFundCashBalance,
  calculateSoloPersonalFundBalance,
  getDefaultSharedFund,
  getPersonalFund,
  personalFundDisplayName,
} from "@/lib/funds";
import {
  buildFundMonthHistory,
  buildFundMonthStats,
  displayFundNameForBalance,
  firstName,
  isBalanceReportFund,
  listFundSpendsInWindow,
  listMonthKeys,
  monthWindow,
  pickTopMovers,
  type FundBalanceExpense,
  type FundMonthHistoryPoint,
  type FundMonthStats,
  type FundRecentMovement,
} from "@/lib/funds-balance";
import { isIndividualHousehold, isMultiMember } from "@/lib/household";
import { perfLog, perfNow } from "@/lib/perf";
import {
  getRequestFamilyId,
  getRequestFamilyMemberCount,
  requireRequestFamilyId,
  requireRequestUser,
} from "@/lib/request-context";

/** Explicit columns for hot-path fund reads (avoid select *). */
const FUND_COLUMNS =
  "id, family_id, name, scope, owner_profile_id, is_default, is_system, sort_order, archived_at, color, purpose, is_grocery, created_at, updated_at";

function revalidateFundPaths(options?: { includeHome?: boolean; includeFixed?: boolean }) {
  // Dashboard lives in Zustand — skip "/" unless the mutation changes ledger data.
  if (options?.includeHome) revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/profile");
  revalidatePath("/bolsillos");
  if (options?.includeFixed) revalidatePath("/fixed-expenses");
}

async function requireUser() {
  return requireRequestUser();
}

async function getUserFamilyId(userId: string) {
  return requireRequestFamilyId(userId);
}

/** Read-only fund list — no inserts/migrations. Prefer on overview / navigation. */
export async function loadFamilyFunds(familyId: string): Promise<FamilyFund[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("family_funds")
    .select(FUND_COLUMNS)
    .eq("family_id", familyId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(
      error.message.includes("family_funds")
        ? "Falta aplicar la migración de fondos (family_funds). Ejecuta database/migrations/001_family_funds.sql"
        : error.message
    );
  }

  return (data ?? []) as FamilyFund[];
}

/**
 * Fast path for reads: return existing funds without running ensure bootstrap.
 * Only bootstraps when the family has no funds (or a required system pot is missing).
 */
export async function getFamilyFundsFast(
  familyId: string,
  options?: { requireSavings?: boolean; requireFixed?: boolean }
): Promise<FamilyFund[]> {
  const funds = await loadFamilyFunds(familyId);
  const needsBootstrap =
    funds.length === 0 ||
    (options?.requireSavings && !getSavingsFund(funds)) ||
    (options?.requireFixed && !getFixedExpensesFund(funds));
  if (!needsBootstrap) return funds;
  return ensureFamilyFunds(familyId);
}

export async function ensureFamilyFunds(familyId: string): Promise<FamilyFund[]> {
  const admin = getSupabaseAdminClient();

  const { data: existing, error } = await admin
    .from("family_funds")
    .select(FUND_COLUMNS)
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

  const hasSharedSpending = funds.some(
    (f) =>
      f.scope === "shared" &&
      !isFixedExpensesFund(f) &&
      !isSavingsFund(f)
  );
  if (!hasSharedSpending) {
    const sharedPayload = {
      family_id: familyId,
      name: "Fondo común",
      scope: "shared" as const,
      owner_profile_id: null,
      is_default: true,
      is_system: true,
      sort_order: 0,
      color: DEFAULT_SHARED_FUND_COLOR,
      purpose: "general" as const,
    };
    let { data: created, error: createError } = await admin
      .from("family_funds")
      .insert(sharedPayload as never)
      .select(FUND_COLUMNS)
      .single();
    if (createError && /color|purpose/i.test(createError.message)) {
      const { color: _color, purpose: _purpose, ...withoutOptional } = sharedPayload;
      ({ data: created, error: createError } = await admin
        .from("family_funds")
        .insert(withoutOptional as never)
        .select(FUND_COLUMNS)
        .single());
    }
    if (createError) throw new Error(createError.message);
    funds = [...funds, created as FamilyFund];
  }

  const existingFixedFund = funds.find((f) => isFixedExpensesFund(f));
  if (!existingFixedFund) {
    const fixedPayload = {
      family_id: familyId,
      name: FIXED_EXPENSES_FUND_NAME,
      scope: "shared" as const,
      owner_profile_id: null,
      is_default: false,
      is_system: true,
      sort_order: 5,
      color: FIXED_EXPENSES_FUND_COLOR,
      purpose: "fixed_expenses" as const,
    };
    let { data: created, error: createError } = await admin
      .from("family_funds")
      .insert(fixedPayload as never)
      .select(FUND_COLUMNS)
      .single();
    if (createError && /purpose/i.test(createError.message)) {
      // Migration not applied yet — skip system fund until purpose column exists.
    } else if (createError && /color/i.test(createError.message)) {
      const { color: _color, ...withoutColor } = fixedPayload;
      ({ data: created, error: createError } = await admin
        .from("family_funds")
        .insert(withoutColor as never)
        .select(FUND_COLUMNS)
        .single());
      if (createError) throw new Error(createError.message);
      funds = [...funds, created as FamilyFund];
    } else if (createError) {
      throw new Error(createError.message);
    } else if (created) {
      funds = [...funds, created as FamilyFund];
    }
  } else if (
    (existingFixedFund.color ?? "").toLowerCase() !==
    FIXED_EXPENSES_FUND_COLOR.toLowerCase()
  ) {
    const { data: updated, error: colorError } = await admin
      .from("family_funds")
      .update({ color: FIXED_EXPENSES_FUND_COLOR } as never)
      .eq("id", existingFixedFund.id)
      .select(FUND_COLUMNS)
      .single();
    if (!colorError && updated) {
      funds = funds.map((f) => (f.id === updated.id ? (updated as FamilyFund) : f));
    }
  }

  const existingSavingsFund = funds.find((f) => isSavingsFund(f));
  if (!existingSavingsFund) {
    const savingsPayload = {
      family_id: familyId,
      name: SAVINGS_FUND_NAME,
      scope: "shared" as const,
      owner_profile_id: null,
      is_default: false,
      is_system: true,
      sort_order: 8,
      color: SAVINGS_FUND_COLOR,
      purpose: "savings" as const,
    };
    let { data: created, error: createError } = await admin
      .from("family_funds")
      .insert(savingsPayload as never)
      .select(FUND_COLUMNS)
      .single();
    if (createError && /purpose/i.test(createError.message)) {
      // Migration not applied yet — skip until purpose column exists.
    } else if (createError && /color/i.test(createError.message)) {
      const { color: _color, ...withoutColor } = savingsPayload;
      ({ data: created, error: createError } = await admin
        .from("family_funds")
        .insert(withoutColor as never)
        .select(FUND_COLUMNS)
        .single());
      if (createError) throw new Error(createError.message);
      funds = [...funds, created as FamilyFund];
    } else if (createError) {
      throw new Error(createError.message);
    } else if (created) {
      funds = [...funds, created as FamilyFund];
    }
  } else if (
    (existingSavingsFund.color ?? "").toLowerCase() !== SAVINGS_FUND_COLOR.toLowerCase()
  ) {
    const { data: updated, error: colorError } = await admin
      .from("family_funds")
      .update({ color: SAVINGS_FUND_COLOR } as never)
      .eq("id", existingSavingsFund.id)
      .select(FUND_COLUMNS)
      .single();
    if (!colorError && updated) {
      funds = funds.map((f) => (f.id === updated.id ? (updated as FamilyFund) : f));
    }
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
        name: "Mi bolsillo",
        scope: "personal" as const,
        owner_profile_id: member.id,
        // Shared Fondo común keeps the single family default; personal starts unmarked.
        is_default: false,
        is_system: true,
        sort_order: 10,
        color: DEFAULT_PERSONAL_FUND_COLOR,
      };
      let { data: created, error: createError } = await admin
        .from("family_funds")
        .insert(personalPayload as never)
        .select(FUND_COLUMNS)
        .single();
      if (createError && /color/i.test(createError.message)) {
        const { color: _color, ...withoutColor } = personalPayload;
        ({ data: created, error: createError } = await admin
          .from("family_funds")
          .insert(withoutColor as never)
          .select(FUND_COLUMNS)
          .single());
      }
      if (createError) throw new Error(createError.message);
      funds = [...funds, created as FamilyFund];
    }
  }

  // Migrate legacy navy personal defaults to brand gold (logo accent).
  for (const personal of funds.filter((f) => f.scope === "personal")) {
    const stored = (personal.color ?? "").trim().toLowerCase();
    const needsGold =
      !stored || stored === LEGACY_PERSONAL_FUND_COLOR.toLowerCase();
    if (!needsGold) continue;
    if (stored === DEFAULT_PERSONAL_FUND_COLOR.toLowerCase()) continue;
    const { data: updated, error: colorError } = await admin
      .from("family_funds")
      .update({ color: DEFAULT_PERSONAL_FUND_COLOR } as never)
      .eq("id", personal.id)
      .select(FUND_COLUMNS)
      .single();
    if (!colorError && updated) {
      funds = funds.map((f) => (f.id === updated.id ? (updated as FamilyFund) : f));
    }
  }

  // Rename legacy system personal label "Mi fondo" → "Mi bolsillo".
  for (const personal of funds.filter(
    (f) =>
      f.scope === "personal" &&
      f.is_system &&
      f.name.trim().toLowerCase() === "mi fondo"
  )) {
    const { data: updated, error: nameError } = await admin
      .from("family_funds")
      .update({ name: "Mi bolsillo", updated_at: new Date().toISOString() } as never)
      .eq("id", personal.id)
      .select(FUND_COLUMNS)
      .single();
    if (!nameError && updated) {
      funds = funds.map((f) => (f.id === updated.id ? (updated as FamilyFund) : f));
    }
  }

  // One star only: if a shared spending default exists, clear personal defaults.
  const hasSharedDefault = funds.some(
    (f) =>
      f.scope === "shared" &&
      f.is_default &&
      !isFixedExpensesFund(f) &&
      !isSavingsFund(f)
  );
  if (hasSharedDefault) {
    const personalDefaults = funds.filter(
      (f) => f.scope === "personal" && f.is_default
    );
    if (personalDefaults.length > 0) {
      const { error: clearPersonalError } = await admin
        .from("family_funds")
        .update({ is_default: false, updated_at: new Date().toISOString() } as never)
        .in(
          "id",
          personalDefaults.map((f) => f.id)
        );
      if (!clearPersonalError) {
        const cleared = new Set(personalDefaults.map((f) => f.id));
        funds = funds.map((f) =>
          cleared.has(f.id) ? { ...f, is_default: false } : f
        );
      }
    }
  }

  return funds;
}

export async function listFamilyFundsAction(): Promise<FamilyFund[]> {
  const user = await requireUser();
  const familyId = await getRequestFamilyId(user.id);
  // Layout/stores hydrate before onboarding — never 500 when family is missing.
  if (!familyId) return [];
  return getFamilyFundsFast(familyId);
}

async function clearDefaultsAndPromote(
  familyId: string,
  fundId: string,
  others: FamilyFund[],
  alreadyDefault: boolean
) {
  const admin = getSupabaseAdminClient();

  if (others.length > 0) {
    const { error: clearError } = await admin
      .from("family_funds")
      .update({ is_default: false, updated_at: new Date().toISOString() } as never)
      .in(
        "id",
        others.map((f) => f.id)
      );
    if (clearError) throw new Error(clearError.message);
  }

  if (!alreadyDefault) {
    const { error: setError } = await admin
      .from("family_funds")
      .update({ is_default: true, updated_at: new Date().toISOString() } as never)
      .eq("id", fundId)
      .eq("family_id", familyId);
    if (setError) throw new Error(setError.message);
  }
}

/**
 * Only one spending pocket may be "por defecto" for a member at a time:
 * shared funds (family) + that member's personal funds compete for the star.
 * The partner's personal defaults are left untouched.
 */
async function promoteFundAsExclusiveDefault(
  familyId: string,
  actorProfileId: string,
  fundId: string
) {
  const admin = getSupabaseAdminClient();
  const { data: funds, error } = await admin
    .from("family_funds")
    .select(FUND_COLUMNS)
    .eq("family_id", familyId)
    .is("archived_at", null);

  if (error) throw new Error(error.message);

  const list = (funds as FamilyFund[] | null) ?? [];
  const target = list.find((f) => f.id === fundId);
  if (!target) throw new Error("Bolsillo no encontrado.");
  if (isFixedExpensesFund(target)) {
    throw new Error("Gastos fijos no puede ser el bolsillo por defecto.");
  }
  if (isSavingsFund(target)) {
    throw new Error("Ahorro no puede ser el bolsillo por defecto de gastos.");
  }
  if (target.scope === "personal" && target.owner_profile_id !== actorProfileId) {
    throw new Error("Solo puedes marcar como favorito tu bolsillo personal.");
  }

  const others = list.filter((f) => {
    if (f.id === fundId || !f.is_default) return false;
    if (isFixedExpensesFund(f) || isSavingsFund(f)) return false;
    if (f.scope === "shared") return true;
    return f.scope === "personal" && f.owner_profile_id === actorProfileId;
  });

  await clearDefaultsAndPromote(familyId, fundId, others, target.is_default);
}

async function getFamilyMemberCount(familyId: string): Promise<number> {
  const { getRequestFamilyMemberCount } = await import("@/lib/request-context");
  return getRequestFamilyMemberCount(familyId);
}

export async function createFundAction(input: {
  name: string;
  scope: FundScope;
  color?: string;
  isDefault?: boolean;
  /** Superadmin grocery trial. */
  isGrocery?: boolean;
}): Promise<FamilyFund> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const memberCount = await getFamilyMemberCount(familyId);
  const name = input.name.trim();
  const scope: FundScope =
    isIndividualHousehold(memberCount) ? "personal" : input.scope;
  if (isIndividualHousehold(memberCount) && input.scope === "shared") {
    throw new Error("En un espacio individual solo puedes crear bolsillos personales.");
  }
  const color = (
    input.color ??
    (scope === "shared" ? DEFAULT_SHARED_FUND_COLOR : DEFAULT_PERSONAL_FUND_COLOR)
  ).trim();
  const wantDefault = Boolean(input.isDefault);
  const wantGrocery = Boolean(input.isGrocery);

  if (!name) throw new Error("El nombre del bolsillo es obligatorio.");
  if (name.length > 40) throw new Error("El nombre es demasiado largo.");
  if (name.trim().toLowerCase() === FIXED_EXPENSES_FUND_NAME.toLowerCase()) {
    throw new Error("Ese nombre está reservado para el módulo de Gastos fijos.");
  }
  if (name.trim().toLowerCase() === SAVINGS_FUND_NAME.toLowerCase()) {
    throw new Error("Ese nombre está reservado para el módulo de Ahorros.");
  }
  if (!isAllowedFundColor(color)) {
    throw new Error("Selecciona un color válido.");
  }
  if (wantGrocery) {
    const { isSuperAdminUser } = await import("@/lib/admin");
    const allowed = await isSuperAdminUser({
      userId: user.id,
      email: user.email,
    });
    if (!allowed) {
      throw new Error("La marca de compra/mercado es solo para prueba interna.");
    }
  }

  await ensureFamilyFunds(familyId);
  const { assertCanCreateExtraFund } = await import("@/lib/premiumServer");
  await assertCanCreateExtraFund(familyId);
  const admin = getSupabaseAdminClient();

  const payload =
    scope === "shared"
      ? {
          family_id: familyId,
          name,
          scope: "shared" as const,
          owner_profile_id: null,
          is_default: false,
          is_system: false,
          sort_order: 100,
          color,
          purpose: "general" as const,
          is_grocery: wantGrocery,
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
          purpose: "general" as const,
          is_grocery: wantGrocery,
        };

  let { data, error } = await admin
    .from("family_funds")
    .insert(payload as never)
    .select(FUND_COLUMNS)
    .single();

  if (error && /is_grocery/i.test(error.message)) {
    const { is_grocery: _g, ...withoutGrocery } = payload;
    ({ data, error } = await admin
      .from("family_funds")
      .insert(withoutGrocery as never)
      .select(
        "id, family_id, name, scope, owner_profile_id, is_default, is_system, sort_order, archived_at, color, purpose, created_at, updated_at"
      )
      .single());
  }

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error("Ya existe un bolsillo con ese nombre.");
    }
    if (/color/i.test(error.message) && /column|schema|does not exist/i.test(error.message)) {
      throw new Error(
        "Falta aplicar la migración de color (family_funds.color). Ejecuta database/migrations/002_family_funds_color.sql"
      );
    }
    throw new Error(error.message);
  }

  let created = data as FamilyFund;
  if (wantDefault) {
    await promoteFundAsExclusiveDefault(familyId, user.id, created.id);
    created = { ...created, is_default: true };
  }

  revalidateFundPaths();

  return created;
}

export async function updateFundAction(input: {
  fundId: string;
  name: string;
  color: string;
  isDefault?: boolean;
}): Promise<FamilyFund> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const admin = getSupabaseAdminClient();
  const name = input.name.trim();
  const color = input.color.trim();

  if (!name) throw new Error("El nombre del bolsillo es obligatorio.");
  if (name.length > 40) throw new Error("El nombre es demasiado largo.");
  if (!isAllowedFundColor(color)) {
    throw new Error("Selecciona un color válido.");
  }

  const { data: fund, error: fundError } = await admin
    .from("family_funds")
    .select(FUND_COLUMNS)
    .eq("id", input.fundId)
    .eq("family_id", familyId)
    .maybeSingle();

  if (fundError || !fund) throw new Error("Bolsillo no encontrado.");

  const current = fund as FamilyFund;
  if (current.archived_at) throw new Error("Este bolsillo está archivado.");

  if (
    !isFixedExpensesFund(current) &&
    name.toLowerCase() === FIXED_EXPENSES_FUND_NAME.toLowerCase()
  ) {
    throw new Error("Ese nombre está reservado para el módulo de Gastos fijos.");
  }
  if (!isSavingsFund(current) && name.toLowerCase() === SAVINGS_FUND_NAME.toLowerCase()) {
    throw new Error("Ese nombre está reservado para el módulo de Ahorros.");
  }

  if (current.scope === "personal" && current.owner_profile_id !== user.id) {
    throw new Error("Solo puedes editar tus bolsillos personales.");
  }

  if (input.isDefault === false && current.is_default) {
    throw new Error(
      "No puedes quitar el predeterminado. Marca otro bolsillo como por defecto."
    );
  }

  const { data, error } = await admin
    .from("family_funds")
    .update({
      name,
      color,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", input.fundId)
    .eq("family_id", familyId)
    .select(FUND_COLUMNS)
    .single();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error("Ya existe un bolsillo con ese nombre.");
    }
    throw new Error(error.message);
  }

  let updated = data as FamilyFund;

  if (input.isDefault === true) {
    await promoteFundAsExclusiveDefault(familyId, user.id, updated.id);
    updated = { ...updated, is_default: true };
  }

  revalidateFundPaths({ includeFixed: true });

  return updated;
}

/**
 * Thin path: mark a fund as the exclusive default ("favorito") without
 * rewriting name/color or refetching expenses on the client.
 */
export async function setDefaultFundAction(fundId: string): Promise<{
  funds: FamilyFund[];
  defaultFundId: string;
}> {
  const start = perfNow();
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);

  await promoteFundAsExclusiveDefault(familyId, user.id, fundId);
  const funds = await loadFamilyFunds(familyId);

  revalidateFundPaths({ includeFixed: true });
  perfLog("setDefaultFundAction", { ms: perfNow() - start });

  return { funds, defaultFundId: fundId };
}

export async function archiveFundAction(fundId: string) {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const admin = getSupabaseAdminClient();

  const { data: fund, error } = await admin
    .from("family_funds")
    .select(FUND_COLUMNS)
    .eq("id", fundId)
    .eq("family_id", familyId)
    .maybeSingle();

  if (error || !fund) throw new Error("Bolsillo no encontrado.");
  if (fund.is_system) throw new Error("No puedes archivar un bolsillo del sistema.");
  if (fund.scope === "personal" && fund.owner_profile_id !== user.id) {
    throw new Error("Solo puedes archivar tus bolsillos personales.");
  }

  const { data: expenses } = await admin
    .from("expenses")
    .select("amount, category, paid_by, responsible_for, fund_id, paid_from_fund, transfer_group_id, is_active")
    .eq("family_id", familyId)
    .eq("is_active", true);

  const balance = calculateFundCashBalance((expenses ?? []) as never[], fundId);
  if (Math.abs(balance) > 0.009) {
    throw new Error("El bolsillo debe tener saldo 0 antes de archivarlo.");
  }

  const { error: updateError } = await admin
    .from("family_funds")
    .update({ archived_at: new Date().toISOString() } as never)
    .eq("id", fundId);

  if (updateError) throw new Error(updateError.message);

  revalidateFundPaths();
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

  const funds = await getFamilyFundsFast(familyId);
  const fund = funds.find((f) => f.id === input.fundId && !f.archived_at);
  if (!fund) throw new Error("Bolsillo no encontrado.");

  if (fund.scope === "personal" && fund.owner_profile_id !== user.id) {
    throw new Error("Solo puedes aportar a tu bolsillo personal.");
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

  if (fund.scope === "shared") {
    const { assertCoupleFeaturesAllowed } = await import("@/lib/premiumServer");
    await assertCoupleFeaturesAllowed(familyId);
  }

  const { error } = await admin.from("expenses").insert(payload as never);
  if (error) throw new Error(error.message);

  const { maybeStartCoupleTrialOnFirstMovement } = await import("@/lib/premiumServer");
  const trial = await maybeStartCoupleTrialOnFirstMovement({
    familyId,
    actorUserId: user.id,
    kind: "income",
  });

  revalidateFundPaths({
    includeHome: true,
    includeFixed: isFixedExpensesFund(fund),
  });
  return {
    success: true,
    fundId: fund.id,
    firstMoveTrialStarted: trial.started,
  };
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
    throw new Error("Elige dos bolsillos distintos.");
  }

  const funds = await getFamilyFundsFast(familyId);
  const from = funds.find((f) => f.id === input.fromFundId && !f.archived_at);
  const to = funds.find((f) => f.id === input.toFundId && !f.archived_at);
  if (!from || !to) throw new Error("Bolsillo no encontrado.");

  if (from.scope === "personal" && from.owner_profile_id !== user.id) {
    throw new Error("Solo puedes transferir desde tu bolsillo personal.");
  }
  if (to.scope === "personal" && to.owner_profile_id !== user.id) {
    throw new Error("Solo puedes transferir hacia tu bolsillo personal.");
  }

  const admin = getSupabaseAdminClient();
  const { data: expenses } = await admin
    .from("expenses")
    .select("amount, category, paid_by, responsible_for, fund_id, paid_from_fund, transfer_group_id, is_active")
    .eq("family_id", familyId)
    .eq("is_active", true);

  const defaultShared = getDefaultSharedFund(funds);
  const defaultPersonal = getPersonalFund(funds, user.id);
  const expenseRows = (expenses ?? []) as never[];
  const balance =
    from.scope === "personal"
      ? calculateSoloPersonalFundBalance(
          expenseRows,
          from,
          user.id,
          defaultPersonal?.id ?? null
        )
      : calculateFundCashBalance(expenseRows, from.id, {
          treatLegacyJointAsFundId: defaultShared?.id ?? null,
        });

  if (balance + 0.009 < amount) {
    throw new Error("Saldo insuficiente en el bolsillo de origen.");
  }

  const transferGroupId = crypto.randomUUID();
  const expenseDate = input.date ?? new Date().toISOString().slice(0, 10);
  const amountFixed = Number(amount.toFixed(2));

  const fromResponsible =
    from.scope === "shared" ? "joint_fund" : (from.owner_profile_id as string);
  const toResponsible =
    to.scope === "shared" ? "joint_fund" : (to.owner_profile_id as string);
  const fromLabel = personalFundDisplayName(from);
  const toLabel = personalFundDisplayName(to);

  const { error } = await admin.from("expenses").insert([
    {
      family_id: familyId,
      amount: amountFixed,
      concept: `Transferencia a ${toLabel}`,
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
      concept: `Transferencia desde ${fromLabel}`,
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

  revalidateFundPaths({
    includeHome: true,
    includeFixed: isFixedExpensesFund(from) || isFixedExpensesFund(to),
  });
  return { success: true, transferGroupId };
}

/** Lightweight fund list + default ids — no expense scan. */
export async function getFamilyFundsMetaAction() {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const funds = await getFamilyFundsFast(familyId);
  const defaultShared = getDefaultSharedFund(funds);
  const fixedFund = getFixedExpensesFund(funds);

  return {
    funds,
    personalFundId: getPersonalFund(funds, user.id)?.id ?? null,
    sharedDefaultFundId: defaultShared?.id ?? null,
    fixedExpensesFundId: fixedFund?.id ?? null,
  };
}

export async function getFundsOverviewAction() {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const funds = await getFamilyFundsFast(familyId);
  const admin = getSupabaseAdminClient();

  const { data: expenses } = await admin
    .from("expenses")
    .select(
      "amount, category, concept, paid_by, responsible_for, fund_id, paid_from_fund, transfer_group_id, is_active, is_settled"
    )
    .eq("family_id", familyId)
    .eq("is_active", true);

  const defaultShared = getDefaultSharedFund(funds);
  const fixedFund = getFixedExpensesFund(funds);
  const rows = (expenses ?? []) as Array<{
    amount: number;
    category?: string | null;
    concept?: string | null;
    paid_by: string;
    responsible_for?: string | null;
    fund_id?: string | null;
    paid_from_fund?: boolean | null;
    transfer_group_id?: string | null;
    is_active?: boolean | null;
    is_settled?: boolean | null;
  }>;

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
    fixedExpensesFundId: fixedFund?.id ?? null,
  };
}

export type BolsillosFundRow = {
  fund: FamilyFund;
  balance: number;
  displayName: string;
  stats: FundMonthStats;
  /** Last 6 calendar months (current first). */
  history: FundMonthHistoryPoint[];
  /** Spends inside the same 6-month window (client filters by month). */
  movements: FundRecentMovement[];
};

export type BolsillosBalanceOverview = {
  monthKey: string;
  monthLabel: string;
  historyMonthKeys: string[];
  totalSpentThisMonth: number;
  totalSpentLastMonth: number;
  totalDelta: number;
  totalDeltaPct: number | null;
  prevMonthEmpty: boolean;
  isCouple: boolean;
  funds: BolsillosFundRow[];
  topUp: FundMonthStats[];
  topDown: FundMonthStats[];
  personalFundId: string | null;
  sharedDefaultFundId: string | null;
};

export async function getBolsillosBalanceAction(): Promise<BolsillosBalanceOverview> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const admin = getSupabaseAdminClient();
  const { monthKey, prevMonthKey, monthLabel } = monthWindow();
  const historyMonthKeys = listMonthKeys(6);

  const [funds, memberCount, membersResult, expensesResult] = await Promise.all([
    getFamilyFundsFast(familyId),
    getRequestFamilyMemberCount(familyId),
    admin.from("profiles").select("id, full_name").eq("family_id", familyId),
    admin
      .from("expenses")
      .select(
        "id, amount, category, concept, paid_by, responsible_for, fund_id, paid_from_fund, account_id, transfer_group_id, is_active, is_settled, expense_date"
      )
      .eq("family_id", familyId)
      .eq("is_active", true),
  ]);

  if (expensesResult.error) {
    throw new Error(expensesResult.error.message || "No se pudieron cargar los gastos.");
  }

  const rows = (expensesResult.data ?? []) as FundBalanceExpense[];
  const nameById: Record<string, string> = {};
  for (const member of membersResult.data ?? []) {
    const row = member as { id: string; full_name?: string | null };
    nameById[row.id] = firstName(row.full_name);
  }

  const defaultShared = getDefaultSharedFund(funds);
  const personal = getPersonalFund(funds, user.id);
  const isCouple = isMultiMember(memberCount);

  const visible = funds
    .filter(isBalanceReportFund)
    .filter((f) => f.scope === "shared" || f.owner_profile_id === user.id)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const fundRows: BolsillosFundRow[] = visible.map((fund) => {
    const displayName = displayFundNameForBalance(fund, personal?.id ?? null);
    const stats = buildFundMonthStats({
      fund,
      displayName,
      expenses: rows,
      monthKey,
      prevMonthKey,
      includeByPayer: isCouple,
      nameById,
    });
    return {
      fund,
      displayName,
      balance: calculateFundCashBalance(rows, fund.id, {
        treatLegacyJointAsFundId: defaultShared?.id ?? null,
      }),
      stats,
      history: buildFundMonthHistory({
        expenses: rows,
        fundId: fund.id,
        monthKeys: historyMonthKeys,
        includeByPayer: isCouple,
        nameById,
      }),
      movements: listFundSpendsInWindow(
        rows,
        fund.id,
        historyMonthKeys,
        nameById,
        120
      ),
    };
  });

  const statsList = fundRows.map((row) => row.stats);
  const totalSpentThisMonth = Math.round(
    statsList.reduce((s, st) => s + st.spentThisMonth, 0) * 100
  ) / 100;
  const totalSpentLastMonth = Math.round(
    statsList.reduce((s, st) => s + st.spentLastMonth, 0) * 100
  ) / 100;
  const totalDelta = Math.round((totalSpentThisMonth - totalSpentLastMonth) * 100) / 100;
  const prevMonthEmpty = totalSpentLastMonth <= 0.009;
  const totalDeltaPct =
    prevMonthEmpty || totalSpentLastMonth === 0
      ? null
      : Math.round(((totalSpentThisMonth - totalSpentLastMonth) / totalSpentLastMonth) * 1000) /
        10;

  const { topUp, topDown } = pickTopMovers(statsList, 3);

  return {
    monthKey,
    monthLabel,
    historyMonthKeys,
    totalSpentThisMonth,
    totalSpentLastMonth,
    totalDelta,
    totalDeltaPct,
    prevMonthEmpty,
    isCouple,
    funds: fundRows,
    topUp,
    topDown,
    personalFundId: personal?.id ?? null,
    sharedDefaultFundId: defaultShared?.id ?? null,
  };
}
