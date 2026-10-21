import { createAdminClient } from "@/utils/supabase/admin";
import {
  resolveHouseholdEntitlement,
  type CoupleMode,
  type FamilyBillingRow,
} from "@/lib/premium";

const LIST_LIMIT = 100;

export type PremiumSourceLabel =
  | "vip"
  | "stub"
  | "campaign"
  | "paid"
  | "unknown";

export type AdminOverview = {
  users: number;
  families: number;
  premiumHouseholds: number;
  premiumVipHouseholds: number;
  vipUsers: number;
  inactiveUsers: number;
  funnel: {
    solo: number;
    coupleTrial: number;
    couplePremium: number;
    couplePaused: number;
    other: number;
  };
};

export type AdminPremiumRow = {
  familyId: string;
  inviteCode: string | null;
  memberCount: number;
  memberNames: string[];
  premiumUntil: string | null;
  source: PremiumSourceLabel;
};

export type AdminVipRow = {
  userId: string;
  fullName: string | null;
  email: string | null;
  familyId: string | null;
  inviteCode: string | null;
  updatedAt: string | null;
};

export type AdminInactiveRow = {
  userId: string;
  fullName: string | null;
  email: string | null;
  familyId: string | null;
  createdAt: string | null;
};

export type AdminSearchHit = {
  kind: "user" | "family";
  userId?: string;
  fullName?: string | null;
  email?: string | null;
  isVip?: boolean;
  familyId: string | null;
  inviteCode: string | null;
  isPremiumHousehold?: boolean;
  premiumSource?: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  family_id: string | null;
  is_vip?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function normalizeSource(raw: string | null | undefined): PremiumSourceLabel {
  if (raw === "vip" || raw === "stub" || raw === "campaign" || raw === "paid") {
    return raw;
  }
  return "unknown";
}

function funnelBucket(mode: CoupleMode): keyof AdminOverview["funnel"] {
  switch (mode) {
    case "solo":
    case "couple_waiting_partner":
      return "solo";
    case "couple_trial":
    case "couple_pre_trial":
      return "coupleTrial";
    case "couple_premium":
      return "couplePremium";
    case "couple_paused":
      return "couplePaused";
    default:
      return "other";
  }
}

async function emailMapForIds(userIds: string[]): Promise<Map<string, string | null>> {
  const admin = createAdminClient();
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string | null>();

  await Promise.all(
    unique.map(async (id) => {
      try {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (error || !data.user) {
          map.set(id, null);
          return;
        }
        map.set(id, data.user.email ?? null);
      } catch {
        map.set(id, null);
      }
    })
  );

  return map;
}

async function loadFamiliesBilling(): Promise<FamilyBillingRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("families")
    .select(
      "id, user_1_id, user_2_id, invite_code, couple_trial_started_at, couple_trial_ends_at, is_premium_household, premium_until, first_movement_at, first_movement_by, premium_source"
    );

  if (!error && data) {
    return data as FamilyBillingRow[];
  }

  const { data: fallback } = await admin
    .from("families")
    .select(
      "id, user_1_id, user_2_id, invite_code, couple_trial_started_at, couple_trial_ends_at, is_premium_household, premium_until, first_movement_at, first_movement_by"
    );

  return (fallback ?? []) as FamilyBillingRow[];
}

/** Users with at least one expense as paid_by. */
async function activeSpenderIds(): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("expenses").select("paid_by");
  if (error || !data) return new Set();
  return new Set(
    data
      .map((row) => (row as { paid_by?: string | null }).paid_by)
      .filter((id): id is string => Boolean(id))
  );
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const admin = createAdminClient();

  const [usersRes, familiesRes, vipRes, profilesRes, families, spenders] =
    await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("families").select("*", { count: "exact", head: true }),
      admin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_vip", true),
      admin.from("profiles").select("id"),
      loadFamiliesBilling(),
      activeSpenderIds(),
    ]);

  const profileIds = ((profilesRes.data ?? []) as { id: string }[]).map((p) => p.id);
  const inactiveUsers = profileIds.filter((id) => !spenders.has(id)).length;

  let premiumHouseholds = 0;
  let premiumVipHouseholds = 0;
  const funnel: AdminOverview["funnel"] = {
    solo: 0,
    coupleTrial: 0,
    couplePremium: 0,
    couplePaused: 0,
    other: 0,
  };

  for (const row of families) {
    const entitlement = resolveHouseholdEntitlement(row);
    funnel[funnelBucket(entitlement.coupleMode)] += 1;
    if (entitlement.isPremiumHousehold) {
      premiumHouseholds += 1;
      if (normalizeSource(row.premium_source) === "vip") {
        premiumVipHouseholds += 1;
      }
    }
  }

  return {
    users: usersRes.count ?? 0,
    families: familiesRes.count ?? 0,
    premiumHouseholds,
    premiumVipHouseholds,
    vipUsers: vipRes.error ? 0 : (vipRes.count ?? 0),
    inactiveUsers,
    funnel,
  };
}

export async function getAdminPremiumList(
  limit = LIST_LIMIT
): Promise<AdminPremiumRow[]> {
  const admin = createAdminClient();
  const families = (await loadFamiliesBilling()).filter((row) =>
    resolveHouseholdEntitlement(row).isPremiumHousehold
  );

  const memberIds = families.flatMap((f) =>
    [f.user_1_id, f.user_2_id].filter(Boolean)
  ) as string[];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", memberIds.length ? memberIds : ["00000000-0000-0000-0000-000000000000"]);

  const nameById = new Map(
    ((profiles ?? []) as { id: string; full_name: string | null }[]).map((p) => [
      p.id,
      p.full_name,
    ])
  );

  return families.slice(0, limit).map((row) => {
    const ids = [row.user_1_id, row.user_2_id].filter(Boolean) as string[];
    return {
      familyId: row.id,
      inviteCode: row.invite_code,
      memberCount: ids.length,
      memberNames: ids.map((id) => nameById.get(id) ?? "Sin nombre"),
      premiumUntil: row.premium_until,
      source: normalizeSource(row.premium_source),
    };
  });
}

export async function getAdminVipList(limit = LIST_LIMIT): Promise<AdminVipRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, family_id, is_vip, updated_at")
    .eq("is_vip", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const rows = data as ProfileRow[];
  const familyIds = rows
    .map((r) => r.family_id)
    .filter((id): id is string => Boolean(id));

  const inviteByFamily = new Map<string, string | null>();
  if (familyIds.length) {
    const { data: families } = await admin
      .from("families")
      .select("id, invite_code")
      .in("id", familyIds);
    for (const f of (families ?? []) as { id: string; invite_code: string | null }[]) {
      inviteByFamily.set(f.id, f.invite_code);
    }
  }

  const emails = await emailMapForIds(rows.map((r) => r.id));

  return rows.map((r) => ({
    userId: r.id,
    fullName: r.full_name,
    email: emails.get(r.id) ?? null,
    familyId: r.family_id,
    inviteCode: r.family_id ? inviteByFamily.get(r.family_id) ?? null : null,
    updatedAt: r.updated_at ?? null,
  }));
}

export async function getAdminInactiveList(
  limit = LIST_LIMIT
): Promise<AdminInactiveRow[]> {
  const admin = createAdminClient();
  const [{ data: profiles }, spenders] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, family_id, created_at")
      .order("created_at", { ascending: false }),
    activeSpenderIds(),
  ]);

  const inactive = ((profiles ?? []) as ProfileRow[])
    .filter((p) => !spenders.has(p.id))
    .slice(0, limit);

  const emails = await emailMapForIds(inactive.map((p) => p.id));

  return inactive.map((p) => ({
    userId: p.id,
    fullName: p.full_name,
    email: emails.get(p.id) ?? null,
    familyId: p.family_id,
    createdAt: p.created_at ?? null,
  }));
}

export async function searchAdminDirectory(
  query: string
): Promise<AdminSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const admin = createAdminClient();
  const hits: AdminSearchHit[] = [];
  const code = q.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

  if (code.length === 6) {
    const { data: family } = await admin
      .from("families")
      .select("id, invite_code, is_premium_household, premium_source, user_1_id, user_2_id")
      .eq("invite_code", code)
      .maybeSingle();

    if (family) {
      const f = family as {
        id: string;
        invite_code: string | null;
        is_premium_household: boolean | null;
        premium_source: string | null;
        user_1_id: string;
        user_2_id: string | null;
      };
      hits.push({
        kind: "family",
        familyId: f.id,
        inviteCode: f.invite_code,
        isPremiumHousehold: Boolean(f.is_premium_household),
        premiumSource: f.premium_source,
      });

      const memberIds = [f.user_1_id, f.user_2_id].filter(Boolean) as string[];
      if (memberIds.length) {
        const { data: members } = await admin
          .from("profiles")
          .select("id, full_name, family_id, is_vip")
          .in("id", memberIds);
        const emails = await emailMapForIds(memberIds);
        for (const m of (members ?? []) as ProfileRow[]) {
          hits.push({
            kind: "user",
            userId: m.id,
            fullName: m.full_name,
            email: emails.get(m.id) ?? null,
            isVip: Boolean(m.is_vip),
            familyId: m.family_id,
            inviteCode: f.invite_code,
            isPremiumHousehold: Boolean(f.is_premium_household),
            premiumSource: f.premium_source,
          });
        }
      }
      return hits;
    }
  }

  // Email search via Auth admin list (paginated, early-stage scale).
  const needle = q.toLowerCase();
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const matched = (list?.users ?? []).filter((u) =>
    (u.email ?? "").toLowerCase().includes(needle)
  );

  if (!matched.length) return [];

  const ids = matched.map((u) => u.id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, family_id, is_vip")
    .in("id", ids);

  const profileById = new Map(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p])
  );

  const familyIds = [...profileById.values()]
    .map((p) => p.family_id)
    .filter((id): id is string => Boolean(id));

  const familyById = new Map<
    string,
    {
      invite_code: string | null;
      is_premium_household: boolean | null;
      premium_source: string | null;
    }
  >();

  if (familyIds.length) {
    const { data: families } = await admin
      .from("families")
      .select("id, invite_code, is_premium_household, premium_source")
      .in("id", familyIds);
    for (const f of (families ?? []) as {
      id: string;
      invite_code: string | null;
      is_premium_household: boolean | null;
      premium_source: string | null;
    }[]) {
      familyById.set(f.id, f);
    }
  }

  for (const user of matched) {
    const profile = profileById.get(user.id);
    const family = profile?.family_id
      ? familyById.get(profile.family_id)
      : undefined;
    hits.push({
      kind: "user",
      userId: user.id,
      fullName: profile?.full_name ?? null,
      email: user.email ?? null,
      isVip: Boolean(profile?.is_vip),
      familyId: profile?.family_id ?? null,
      inviteCode: family?.invite_code ?? null,
      isPremiumHousehold: Boolean(family?.is_premium_household),
      premiumSource: family?.premium_source ?? null,
    });
  }

  return hits;
}

export type AdminRevenueTx = {
  transactionId: string;
  userId: string | null;
  amountCents: number;
  currency: string;
  status: string;
  billedAt: string | null;
};

export type AdminRevenueSnapshot = {
  monthRevenueCents: number;
  currency: string;
  activeSubscriptions: number;
  /** Approximate MRR in cents (monthly prices as-is; yearly / 12). */
  mrrCentsApprox: number;
  recentTransactions: AdminRevenueTx[];
};

function startOfMonthMadridIso(now = new Date()): string {
  // Approximate: use local UTC offset via Intl parts for Europe/Madrid calendar month.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  // Treat Madrid midnight as UTC+1/+2 roughly by storing as date-only start in UTC morning.
  return `${y}-${m}-01T00:00:00.000Z`;
}

export async function getAdminRevenueSnapshot(): Promise<AdminRevenueSnapshot> {
  const admin = createAdminClient();
  const monthStart = startOfMonthMadridIso();
  const monthlyPriceId =
    process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY?.trim() ?? "";
  const yearlyPriceId =
    process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY?.trim() ?? "";

  const empty: AdminRevenueSnapshot = {
    monthRevenueCents: 0,
    currency: "EUR",
    activeSubscriptions: 0,
    mrrCentsApprox: 0,
    recentTransactions: [],
  };

  const [txRes, subRes] = await Promise.all([
    admin
      .from("billing_transactions")
      .select(
        "paddle_transaction_id, user_id, amount_cents, currency, status, billed_at"
      )
      .gte("billed_at", monthStart)
      .order("billed_at", { ascending: false })
      .limit(100),
    admin
      .from("billing_subscriptions")
      .select("status, paddle_price_id")
      .in("status", ["active", "trialing", "past_due"]),
  ]);

  if (txRes.error && subRes.error) {
    return empty;
  }

  const monthTx = (txRes.data ?? []) as {
    paddle_transaction_id: string;
    user_id: string | null;
    amount_cents: number;
    currency: string;
    status: string;
    billed_at: string | null;
  }[];

  const completed = monthTx.filter((t) =>
    ["completed", "paid", "billed"].includes(String(t.status).toLowerCase())
  );

  const monthRevenueCents = completed.reduce(
    (sum, t) => sum + (t.amount_cents || 0),
    0
  );
  const currency = completed[0]?.currency ?? "EUR";

  const activeSubs = (subRes.data ?? []) as {
    status: string;
    paddle_price_id: string | null;
  }[];

  // MRR approx: use average completed monthly charge if we can't map prices;
  // yearly subs contribute amount/12 when we detect yearly price id.
  let mrrCentsApprox = 0;
  if (activeSubs.length) {
    const avgMonthly =
      completed.length > 0
        ? Math.round(
            completed
              .filter((t) => t.amount_cents > 0)
              .reduce((s, t) => s + t.amount_cents, 0) /
              Math.max(
                completed.filter((t) => t.amount_cents > 0).length,
                1
              )
          )
        : 0;

    for (const sub of activeSubs) {
      if (yearlyPriceId && sub.paddle_price_id === yearlyPriceId) {
        mrrCentsApprox += Math.round((avgMonthly || 0) / 12);
      } else if (monthlyPriceId && sub.paddle_price_id === monthlyPriceId) {
        mrrCentsApprox += avgMonthly;
      } else {
        mrrCentsApprox += avgMonthly;
      }
    }
  }

  const { data: recent } = await admin
    .from("billing_transactions")
    .select(
      "paddle_transaction_id, user_id, amount_cents, currency, status, billed_at"
    )
    .order("billed_at", { ascending: false })
    .limit(20);

  return {
    monthRevenueCents,
    currency,
    activeSubscriptions: activeSubs.length,
    mrrCentsApprox,
    recentTransactions: ((recent ?? []) as typeof monthTx).map((t) => ({
      transactionId: t.paddle_transaction_id,
      userId: t.user_id,
      amountCents: t.amount_cents,
      currency: t.currency,
      status: t.status,
      billedAt: t.billed_at,
    })),
  };
}
