"use client";

import { useMemo, useState } from "react";
import { Crown } from "lucide-react";
import PremiumPaywallModal from "@/components/PremiumPaywallModal";
import {
  formatPremiumTrialChip,
  type HouseholdEntitlement,
} from "@/lib/premium";

type Props = {
  entitlement?: HouseholdEntitlement | null;
  /** Fallback when store says profile is_premium (legacy). */
  isPremiumFallback?: boolean;
};

export default function PremiumHeaderChip({
  entitlement,
  isPremiumFallback = false,
}: Props) {
  const [paywallOpen, setPaywallOpen] = useState(false);

  const chip = useMemo(() => {
    if (entitlement?.coupleMode === "couple_trial") {
      const label = formatPremiumTrialChip(entitlement.trialSecondsRemaining);
      if (label) {
        return { label, tone: "trial" as const };
      }
    }
    if (entitlement?.isPremiumHousehold || isPremiumFallback) {
      return { label: "Premium", tone: "premium" as const };
    }
    return { label: "Premium", tone: "cta" as const };
  }, [entitlement, isPremiumFallback]);

  return (
    <>
      <button
        type="button"
        onClick={() => setPaywallOpen(true)}
        className={`premium-chip-lux inline-flex max-w-[12rem] items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold tracking-tight transition-transform active:scale-[0.98] ${
          chip.tone === "trial"
            ? "premium-chip-lux-trial"
            : chip.tone === "premium"
              ? "text-accent"
              : "text-on-surface"
        }`}
        aria-label={chip.label}
      >
        <Crown
          size={12}
          className={
            chip.tone === "trial"
              ? "text-[#c4a574]"
              : chip.tone === "premium"
                ? "fill-accent text-accent"
                : "text-accent"
          }
        />
        <span className="truncate">{chip.label}</span>
      </button>

      <PremiumPaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        inviteCode={entitlement?.inviteCode}
      />
    </>
  );
}
