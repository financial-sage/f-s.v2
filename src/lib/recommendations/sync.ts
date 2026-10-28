import { createClient } from "@/utils/supabase/server";
import { renderRecommendationCopy } from "./copy";
import { draftCopyWithLlm, isLlmConfigured } from "./llm";
import { getOpenAIModel } from "@/lib/ai/openai";
import { getRecommendationSpeech } from "./locale";
import { isEarlyHousehold, selectRecommendationCandidates } from "./rules";
import type {
  ForceGeminiDraftItem,
  ForceGeminiDraftResult,
  RecommendationCandidate,
  RecommendationContext,
  RecommendationKind,
  RecommendationRecord,
  RecommendationStatus,
} from "./types";
import { RECOMMENDATION_PERMANENTLY_DELETED_FACT } from "./types";

export type { ForceGeminiDraftItem, ForceGeminiDraftResult };

const DISMISS_COOLDOWN_DAYS = 14;
const DEFER_DAYS = 3;
const ARCHIVE_LIMIT = 50;
const ARCHIVE_DAYS = 90;
const ACTIVE_STATUSES: RecommendationStatus[] = ["new", "seen"];
const ARCHIVE_STATUSES: RecommendationStatus[] = [
  "accepted",
  "deferred",
  "dismissed",
  "resolved",
];

type DbRow = {
  id: string;
  family_id: string;
  member_id: string | null;
  rule_id: string;
  kind?: RecommendationKind | null;
  priority: RecommendationRecord["priority"];
  status: RecommendationStatus;
  facts: RecommendationRecord["facts"];
  title: string;
  body: string;
  why: string[] | null;
  impact: string | null;
  cta_href: string | null;
  cta_label: string | null;
  defer_until: string | null;
  copy_source: RecommendationRecord["copy_source"];
  created_at: string;
  updated_at: string;
};

function mapRow(row: DbRow): RecommendationRecord {
  return {
    id: row.id,
    family_id: row.family_id,
    member_id: row.member_id,
    rule_id: row.rule_id,
    kind: (row.kind as RecommendationKind) || "recommendation",
    priority: row.priority,
    status: row.status,
    facts: (row.facts ?? {}) as RecommendationRecord["facts"],
    title: row.title,
    body: row.body,
    why: row.why ?? [],
    impact: row.impact,
    cta_href: row.cta_href,
    cta_label: row.cta_label,
    defer_until: row.defer_until,
    copy_source: row.copy_source ?? "template",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function listActiveRecommendations(
  familyId: string
): Promise<RecommendationRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("family_recommendations")
    .select("*")
    .eq("family_id", familyId)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[recommendations] listActive", error.message);
    return [];
  }

  return ((data ?? []) as DbRow[])
    .map(mapRow)
    .filter((row) => !isPermanentlyDeleted(row.facts));
}

function isPermanentlyDeleted(
  facts: RecommendationRecord["facts"] | null | undefined
) {
  return Boolean(facts?.[RECOMMENDATION_PERMANENTLY_DELETED_FACT]);
}

export async function countActiveRecommendations(
  familyId: string
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("family_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .in("status", ACTIVE_STATUSES);

  if (error) {
    console.error("[recommendations] countActive", error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Archived / past notes for re-reading (ADR-0011 historial).
 */
export async function listArchivedRecommendations(
  familyId: string
): Promise<RecommendationRecord[]> {
  const supabase = await createClient();
  const since = daysAgoIso(ARCHIVE_DAYS);
  const { data, error } = await supabase
    .from("family_recommendations")
    .select("*")
    .eq("family_id", familyId)
    .in("status", ARCHIVE_STATUSES)
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(ARCHIVE_LIMIT);

  if (error) {
    console.error("[recommendations] listArchive", error.message);
    return [];
  }

  return ((data ?? []) as DbRow[])
    .map(mapRow)
    .filter((row) => !isPermanentlyDeleted(row.facts));
}

/**
 * Ensure open recommendations match current domain candidates.
 * Creates missing ones (with Gemini or template copy); does not revive dismissed.
 */
export async function syncRecommendationsForFamily(
  familyId: string,
  ctx: RecommendationContext,
  options?: { preferTemplate?: boolean }
): Promise<RecommendationRecord[]> {
  const supabase = await createClient();
  const candidates = selectRecommendationCandidates(ctx);
  const speech = options?.preferTemplate
    ? undefined
    : await getRecommendationSpeech();
  const now = new Date().toISOString();

  const { data: existingRows, error: existingError } = await supabase
    .from("family_recommendations")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (existingError) {
    console.error(
      "[recommendations] sync list — ¿falta la migración family_recommendations?",
      existingError.message
    );
    return [];
  }

  const existing = (existingRows ?? []) as DbRow[];
  const openByRule = new Map<string, DbRow>();
  const blockedRules = new Set<string>();
  const issuedMilestones = new Set<number>();

  for (const row of existing) {
    if (ACTIVE_STATUSES.includes(row.status)) {
      if (!openByRule.has(row.rule_id)) openByRule.set(row.rule_id, row);
    }
    if (row.status === "deferred" && row.defer_until) {
      if (new Date(row.defer_until).getTime() > Date.now()) {
        blockedRules.add(row.rule_id);
      }
    }
    if (row.status === "dismissed") {
      const created = new Date(row.updated_at || row.created_at).getTime();
      const cooldown = new Date(daysAgoIso(DISMISS_COOLDOWN_DAYS)).getTime();
      if (created >= cooldown) blockedRules.add(row.rule_id);
    }
    // Welcome is once per household — never recreate after any prior issuance.
    if (row.rule_id === "welcome_panel") {
      blockedRules.add("welcome_panel");
    }
    // Savings milestone: never re-issue the same threshold.
    if (row.rule_id === "savings_milestone") {
      const m = Number(
        (row.facts as RecommendationRecord["facts"])?.milestone
      );
      if (Number.isFinite(m) && m > 0) issuedMilestones.add(m);
    }
    // Month pulse: at most one open; cooldown after any recent close.
    if (
      row.rule_id === "month_pulse_summary" &&
      !ACTIVE_STATUSES.includes(row.status)
    ) {
      const updated = new Date(row.updated_at || row.created_at).getTime();
      const week = new Date(daysAgoIso(7)).getTime();
      if (updated >= week) blockedRules.add("month_pulse_summary");
    }
  }

  // Fresh profile: drop premature account/savings alerts so welcome can lead.
  if (isEarlyHousehold(ctx)) {
    for (const [ruleId, row] of Array.from(openByRule.entries())) {
      if (ruleId === "welcome_panel") continue;
      const { error: resolveError } = await supabase
        .from("family_recommendations")
        .update({
          status: "resolved",
          updated_at: now,
        } as never)
        .eq("id", row.id)
        .in("status", ACTIVE_STATUSES);
      if (resolveError) {
        console.error(
          "[recommendations] resolve stale early-household",
          resolveError.message
        );
        continue;
      }
      openByRule.delete(ruleId);
    }
  }

  // Draft / refresh with OpenAI when opening the dedicated page (not soft-notice poll).
  if (!options?.preferTemplate && isLlmConfigured() && speech) {
    console.info(
      "[recommendations] drafting with OpenAI",
      { rules: Array.from(openByRule.keys()), locale: speech.meta.locale }
    );
    for (const candidate of candidates) {
      const open = openByRule.get(candidate.ruleId);
      if (!open) continue;
      const sameLocale =
        (open.copy_source === "openai" || open.copy_source === "gemini") &&
        String(open.facts?.currency ?? "") === speech.currency;
      if (sameLocale) continue;
      const candidateWithLocale = {
        ...candidate,
        facts: { ...candidate.facts, currency: speech.currency },
      };
      const copy = await renderRecommendationCopy(candidateWithLocale, speech);
      if (copy.source !== "openai") {
        console.warn(
          "[recommendations] OpenAI upgrade skipped (fallback template)",
          candidate.ruleId
        );
        continue;
      }
      const { data: updated, error: updateError } = await supabase
        .from("family_recommendations")
        .update({
          title: copy.title,
          body: copy.body,
          why: copy.why,
          impact: copy.impact,
          copy_source: copy.source,
          facts: candidateWithLocale.facts,
          updated_at: now,
        } as never)
        .eq("id", open.id)
        .select("*")
        .maybeSingle();
      if (updateError) {
        console.error("[recommendations] OpenAI upgrade update failed", updateError.message);
        continue;
      }
      if (updated) openByRule.set(candidate.ruleId, updated as DbRow);
    }
  } else if (!options?.preferTemplate && !isLlmConfigured()) {
    console.warn(
      "[recommendations] OPENAI_API_KEY not visible to the Next server — restart `next dev` after editing .env.local"
    );
  }

  for (const candidate of candidates) {
    if (openByRule.has(candidate.ruleId)) continue;
    if (blockedRules.has(candidate.ruleId)) continue;
    if (candidate.ruleId === "savings_milestone") {
      const m = Number(candidate.facts.milestone);
      if (Number.isFinite(m) && issuedMilestones.has(m)) continue;
    }
    if (openByRule.size >= 3) break;

    // Welcome must be AI-drafted even on soft-notice sync (template only as fallback).
    const forceLlm = candidate.ruleId === "welcome_panel";
    const useTemplate = Boolean(options?.preferTemplate) && !forceLlm;
    const speechForCopy =
      useTemplate
        ? undefined
        : speech ?? (await getRecommendationSpeech());

    const facts = speechForCopy
      ? { ...candidate.facts, currency: speechForCopy.currency }
      : candidate.facts;
    const candidateWithLocale = { ...candidate, facts };
    const copy = useTemplate
      ? (await import("./templates")).templateCopyForCandidate(candidate)
      : await renderRecommendationCopy(candidateWithLocale, speechForCopy);
    const insert = {
      family_id: familyId,
      member_id: null,
      rule_id: candidate.ruleId,
      kind: candidate.kind ?? "recommendation",
      priority: candidate.priority,
      status: "new" as const,
      facts,
      title: copy.title,
      body: copy.body,
      why: copy.why,
      impact: copy.impact,
      cta_href: candidate.ctaHref,
      cta_label: candidate.ctaLabel,
      defer_until: null,
      copy_source: copy.source,
      updated_at: now,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("family_recommendations")
      .insert(insert as never)
      .select("*")
      .maybeSingle();

    if (insertError) {
      // Unique race on open rule — ignore
      console.error("[recommendations] insert", insertError.message);
      continue;
    }
    if (inserted) {
      openByRule.set(candidate.ruleId, inserted as DbRow);
    }
  }

  return listActiveRecommendations(familyId);
}

/**
 * Superadmin / QA: force OpenAI rewrite on every open recommendation
 * (ignores same-locale skip). Collects per-rule errors for the debug modal.
 */
export async function forceDraftOpenRecommendationsWithGemini(
  familyId: string,
  ctx: RecommendationContext
): Promise<ForceGeminiDraftResult> {
  const model = getOpenAIModel();
  const geminiConfigured = isLlmConfigured();

  if (!geminiConfigured) {
    return {
      ok: false,
      geminiConfigured: false,
      model,
      items: [],
      upgraded: 0,
      failed: 0,
      message:
        "OPENAI_API_KEY no está visible en el servidor. Revisa env y reinicia.",
    };
  }

  // Ensure open rows exist from current domain rules first.
  await syncRecommendationsForFamily(familyId, ctx, { preferTemplate: true });

  const supabase = await createClient();
  const speech = await getRecommendationSpeech();
  const candidates = selectRecommendationCandidates(ctx);
  const byRule = new Map<string, RecommendationCandidate>(
    candidates.map((c) => [c.ruleId, c])
  );

  const { data: openRows, error: listError } = await supabase
    .from("family_recommendations")
    .select("*")
    .eq("family_id", familyId)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false });

  if (listError) {
    return {
      ok: false,
      geminiConfigured: true,
      model,
      items: [],
      upgraded: 0,
      failed: 0,
      message: `No se pudieron listar recomendaciones: ${listError.message}`,
    };
  }

  const rows = (openRows ?? []) as DbRow[];
  if (rows.length === 0) {
    return {
      ok: false,
      geminiConfigured: true,
      model,
      items: [],
      upgraded: 0,
      failed: 0,
      message:
        "No hay recomendaciones activas. El contexto actual no dispara ninguna regla.",
    };
  }

  const items: ForceGeminiDraftItem[] = [];
  let upgraded = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    const base = byRule.get(row.rule_id as RecommendationCandidate["ruleId"]);
    const candidate: RecommendationCandidate = base
      ? {
          ...base,
          facts: {
            ...base.facts,
            ...((row.facts ?? {}) as RecommendationCandidate["facts"]),
            currency: speech.currency,
          },
        }
      : {
          ruleId: row.rule_id as RecommendationCandidate["ruleId"],
          kind: (row.kind as RecommendationCandidate["kind"]) || "recommendation",
          priority: row.priority,
          facts: {
            ...((row.facts ?? {}) as RecommendationCandidate["facts"]),
            currency: speech.currency,
          },
          ctaHref: row.cta_href,
          ctaLabel: row.cta_label,
        };

    const drafted = await draftCopyWithLlm(candidate, speech);
    if (!drafted.ok) {
      failed += 1;
      items.push({ ruleId: row.rule_id, ok: false, error: drafted.error });
      continue;
    }

    const { error: updateError } = await supabase
      .from("family_recommendations")
      .update({
        title: drafted.copy.title,
        body: drafted.copy.body,
        why: drafted.copy.why,
        impact: drafted.copy.impact,
        copy_source: drafted.copy.source,
        facts: candidate.facts,
        updated_at: now,
      } as never)
      .eq("id", row.id);

    if (updateError) {
      failed += 1;
      items.push({
        ruleId: row.rule_id,
        ok: false,
        error: `Update DB: ${updateError.message}`,
      });
      continue;
    }

    upgraded += 1;
    items.push({ ruleId: row.rule_id, ok: true });
  }

  return {
    ok: failed === 0 && upgraded > 0,
    geminiConfigured: true,
    model,
    items,
    upgraded,
    failed,
    message:
      failed > 0
        ? `${failed} de ${items.length} fallaron al regenerar con IA`
        : `Regeneradas ${upgraded} con OpenAI (${model})`,
  };
}

export async function markOpenRecommendationsSeen(
  familyId: string
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("family_recommendations")
    .update({
      status: "seen",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("family_id", familyId)
    .eq("status", "new");
}

export async function updateRecommendationStatus(
  id: string,
  familyId: string,
  status: Extract<
    RecommendationStatus,
    "seen" | "accepted" | "deferred" | "dismissed"
  >
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "deferred") {
    const until = new Date();
    until.setDate(until.getDate() + DEFER_DAYS);
    patch.defer_until = until.toISOString();
  }
  if (status === "seen" || status === "accepted" || status === "dismissed") {
    patch.defer_until = null;
  }

  const { error } = await supabase
    .from("family_recommendations")
    .update(patch as never)
    .eq("id", id)
    .eq("family_id", familyId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Hide from Activas / Anteriores; keeps row for cooldown and once-only rules. */
export async function deleteRecommendation(
  id: string,
  familyId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("family_recommendations")
    .select("facts")
    .eq("id", id)
    .eq("family_id", familyId)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!existing) return { ok: false, error: "Nota no encontrada" };

  const prevFacts =
    existing.facts && typeof existing.facts === "object"
      ? (existing.facts as RecommendationRecord["facts"])
      : {};

  if (isPermanentlyDeleted(prevFacts)) return { ok: true };

  const { error } = await supabase
    .from("family_recommendations")
    .update({
      status: "dismissed",
      defer_until: null,
      facts: {
        ...prevFacts,
        [RECOMMENDATION_PERMANENTLY_DELETED_FACT]: true,
      },
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .eq("family_id", familyId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export { DEFER_DAYS, DISMISS_COOLDOWN_DAYS };
