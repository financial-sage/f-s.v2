export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, Sparkles, WandSparkles } from "lucide-react";
import { redirect } from "next/navigation";
import RecommendationActions from "@/components/RecommendationActions";
import RecommendationsAdminTools from "@/components/RecommendationsAdminTools";
import RecommendationsPremiumGate from "@/components/RecommendationsPremiumGate";
import { isSuperAdminUser } from "@/lib/admin";
import { getHomePageData } from "@/lib/dashboard";
import { formatTrialDaysLeft } from "@/lib/premium";
import { recommendationContextFromHome } from "@/lib/recommendations/from-home";
import {
  listActiveRecommendations,
  markOpenRecommendationsSeen,
  syncRecommendationsForFamily,
} from "@/lib/recommendations/sync";

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Prioritaria",
  important: "Importante",
  opportunity: "Oportunidad",
  educational: "Para saber",
};

export default async function RecommendationsPage() {
  const home = await getHomePageData();

  if (!home.ok) {
    redirect(home.reason === "unauthenticated" ? "/login" : "/onboarding");
  }

  const entitlement = home.data.entitlement;
  const isSuperAdmin = await isSuperAdminUser({
    userId: home.data.userId,
    email: home.data.userEmail,
  });

  const canUse =
    Boolean(entitlement?.canUseRecommendations) || isSuperAdmin;

  let rows: Awaited<ReturnType<typeof listActiveRecommendations>> = [];
  if (canUse) {
    const ctx = recommendationContextFromHome(home.data);
    await syncRecommendationsForFamily(home.data.familyId, ctx);
    await markOpenRecommendationsSeen(home.data.familyId);
    rows = await listActiveRecommendations(home.data.familyId);
  }

  const trialHint = formatTrialDaysLeft(
    entitlement?.recommendationsTrialSecondsRemaining ?? null
  );
  const accessLabel =
    entitlement?.recommendationsAccess === "couple_trial"
      ? "Prueba pareja"
      : entitlement?.recommendationsAccess === "solo_trial"
        ? "Prueba individual"
        : entitlement?.recommendationsAccess === "premium"
          ? "Premium"
          : null;

  return (
    <div className="relative min-h-dvh bg-page-gradient pb-[calc(var(--fab-clearance)+1rem)]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-page-glow" />
      <header className="relative z-10 flex items-center gap-3 px-4 pb-2 pt-[max(0.75rem,var(--safe-top))]">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-lowest text-on-surface shadow-sm"
          aria-label="Volver"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] font-light tracking-[0.14em] text-on-surface-variant/80">
            Sugerencias
          </p>
          <h1 className="truncate text-[1.15rem] font-light tracking-tight text-on-surface">
            Recomendaciones
          </h1>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-lg space-y-4 px-4 pt-4">
        <p className="text-[13px] font-light leading-relaxed text-on-surface-variant">
          Propuestas concretas a partir de tu situación. Tú decides: aceptar,
          más tarde o descartar. No ejecutamos movimientos por ti.
        </p>

        {canUse && accessLabel && trialHint ? (
          <p className="text-[11px] font-light text-accent/90">
            {accessLabel}: {trialHint}
          </p>
        ) : null}

        <RecommendationsAdminTools isSuperAdmin={isSuperAdmin} />

        {!canUse ? (
          <RecommendationsPremiumGate
            access={entitlement?.recommendationsAccess ?? "locked"}
            inviteCode={entitlement?.inviteCode}
            isCouple={(entitlement?.memberCount ?? home.data.familyMemberCount) >= 2}
          />
        ) : rows.length === 0 ? (
          <div className="rounded-[1.85rem] border border-glass-border bg-surface-lowest/90 px-5 py-8 text-center shadow-[0_12px_28px_rgba(43,52,55,0.06)]">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Sparkles size={18} strokeWidth={1.75} />
            </div>
            <p className="text-[15px] font-light text-on-surface">
              No hay recomendaciones activas
            </p>
            <p className="mt-2 text-[13px] font-light leading-relaxed text-on-surface-variant">
              Cuando el contexto lo pida (ahorro, ritmo de gastos, cuentas),
              aparecerán aquí.
            </p>
            <Link
              href="/guidance"
              className="mt-5 inline-block text-[13px] font-light text-on-surface/75 underline-offset-4 hover:underline"
            >
              Ver orientación
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => (
              <li
                key={row.id}
                className="relative rounded-[1.85rem] border border-glass-border bg-surface-lowest/90 px-5 py-5 shadow-[0_12px_28px_rgba(43,52,55,0.06)] backdrop-blur-xl"
              >
                {row.copy_source === "gemini" ? (
                  <span
                    className="absolute right-3.5 top-3.5 inline-flex items-center gap-1.5 text-accent"
                    title="Generado con IA"
                  >
                    <WandSparkles size={13} strokeWidth={1.75} aria-hidden />
                    <span className="text-[10px] font-light tracking-wide text-accent/80">
                      Generado con IA
                    </span>
                  </span>
                ) : null}
                <div
                  className={`flex items-center gap-2 ${
                    row.copy_source === "gemini" ? "pr-[7.5rem]" : ""
                  }`}
                >
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-light tracking-wide text-[color-mix(in_srgb,var(--accent)_42%,#6b4423)]">
                    {PRIORITY_LABEL[row.priority] ?? row.priority}
                  </span>
                </div>
                <h2 className="mt-3 text-[1.25rem] font-light leading-snug tracking-tight text-[color-mix(in_srgb,var(--accent)_35%,#5c4030)]">
                  {row.title}
                </h2>
                <p className="mt-2 text-[14px] font-light leading-relaxed text-on-surface/80">
                  {row.body}
                </p>
                {row.why.length > 0 ? (
                  <ul className="mt-3 space-y-1">
                    {row.why.map((line) => (
                      <li
                        key={line}
                        className="text-[12px] font-light text-on-surface-variant"
                      >
                        · {line}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {row.impact ? (
                  <p className="mt-3 text-[12px] font-light leading-relaxed text-on-surface-variant/85">
                    {row.impact}
                  </p>
                ) : null}
                <RecommendationActions
                  id={row.id}
                  ctaHref={row.cta_href}
                  ctaLabel={row.cta_label}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
