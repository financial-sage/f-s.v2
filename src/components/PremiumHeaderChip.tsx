"use client";

import { useMemo, useState } from "react";
import { Crown } from "lucide-react";
import PremiumPaywallModal from "@/components/PremiumPaywallModal";
import PremiumBenefitsModal from "@/components/PremiumBenefitsModal";
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
  const [sheetOpen, setSheetOpen] = useState(false);

  const isPremium =
    Boolean(entitlement?.isPremiumHousehold) || isPremiumFallback;

  const chip = useMemo(() => {
    if (entitlement?.coupleMode === "couple_trial") {
      const label = formatPremiumTrialChip(entitlement.trialSecondsRemaining);
      if (label) {
        return { label, tone: "trial" as const, showLabel: true };
      }
    }
    if (isPremium) {
      return { label: "Premium", tone: "premium" as const, showLabel: false };
    }
    return { label: "Hazte Premium", tone: "cta" as const, showLabel: true };
  }, [entitlement, isPremium]);

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={`premium-chip-lux inline-flex items-center transition-transform active:scale-[0.98] ${
          chip.tone === "premium"
            ? "premium-chip-lux-owned text-accent"
            : chip.tone === "trial"
              ? "premium-chip-lux-trial max-w-[12rem] gap-1.5 px-3 py-1.5 text-[11px] font-semibold tracking-tight"
              : "max-w-[13rem] gap-1.5 px-3 py-1.5 text-[11px] font-medium tracking-tight text-on-surface"
        }`}
        aria-label={chip.label}
      >
        <Crown
          size={chip.tone === "premium" ? 14 : 12}
          className={
            chip.tone === "trial"
              ? "text-[#c4a574]"
              : chip.tone === "premium"
                ? "fill-accent text-accent"
                : "text-accent"
          }
        />
        {chip.showLabel ? <span className="truncate">{chip.label}</span> : null}
      </button>

      {isPremium ? (
        <PremiumBenefitsModal
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          entitlement={entitlement}
        />
      ) : (
        <PremiumPaywallModal
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          inviteCode={entitlement?.inviteCode}
        />
      )}
    </>
  );
}
