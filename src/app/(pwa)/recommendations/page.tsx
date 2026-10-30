export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import RecommendationsPremiumGate from "@/components/RecommendationsPremiumGate";
import CfoNotesPage from "@/components/CfoNotesPage";
import { isSuperAdminUser } from "@/lib/admin";
import { getHomePageData } from "@/lib/dashboard";
import { formatTrialDaysLeft } from "@/lib/premium";
import { recommendationContextFromHome } from "@/lib/recommendations/from-home";
import {
  listActiveRecommendations,
  listArchivedRecommendations,
  markOpenRecommendationsSeen,
  syncRecommendationsForFamily,
} from "@/lib/recommendations/sync";

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

  let active: Awaited<ReturnType<typeof listActiveRecommendations>> = [];
  let archive: Awaited<ReturnType<typeof listArchivedRecommendations>> = [];
  if (canUse) {
    const ctx = recommendationContextFromHome(home.data);
    await syncRecommendationsForFamily(home.data.familyId, ctx);
    await markOpenRecommendationsSeen(home.data.familyId);
    active = await listActiveRecommendations(home.data.familyId);
    archive = await listArchivedRecommendations(home.data.familyId);
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
    <div className="relative h-dvh overflow-y-auto overscroll-y-contain no-scrollbar bg-page-gradient pb-[calc(var(--fab-clearance)+1rem)]">
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
            Para ti
          </p>
          <h1 className="truncate text-[1.15rem] font-light tracking-tight text-on-surface">
            Notas
          </h1>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-lg space-y-4 px-4 pt-4">
        <p className="text-[13px] font-light leading-relaxed text-on-surface-variant">
          Avisos, empujones, logros y sugerencias a partir de tu situación. Tú
          decides; no ejecutamos movimientos por ti. Puedes volver a leer las
          notas anteriores cuando quieras.
        </p>

        {canUse && accessLabel && trialHint ? (
          <p className="text-[11px] font-light text-accent/90">
            {accessLabel}: {trialHint}
          </p>
        ) : null}

        {!canUse ? (
          <RecommendationsPremiumGate
            access={entitlement?.recommendationsAccess ?? "locked"}
            inviteCode={entitlement?.inviteCode}
            isCouple={
              (entitlement?.memberCount ?? home.data.familyMemberCount) >= 2
            }
          />
        ) : (
          <Suspense
            fallback={
              <p className="text-[13px] font-light text-on-surface-variant">
                Cargando notas…
              </p>
            }
          >
            <CfoNotesPage active={active} archive={archive} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
