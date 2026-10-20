"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { memberCountFromFamilyUsers, partnerLabel } from "@/lib/household";
import { useExpenseStore } from "@/store/useExpenseStore";
import { createClient } from "@/utils/supabase/client";

type FamilyNavState = {
  familyId?: string;
  currentUserId?: string;
  partnerUserId?: string | null;
  familyMemberCount: number;
  partnerFirstName: string;
  financialModel: string;
  user1SplitPct: number;
};

const DEFAULT_STATE: FamilyNavState = {
  partnerUserId: null,
  familyMemberCount: 1,
  partnerFirstName: "",
  financialModel: "joint_fund",
  user1SplitPct: 50,
};

/** Loads BottomNav family props once on the client so the PWA layout stays sync. */
export default function FamilyNavProvider() {
  const [nav, setNav] = useState<FamilyNavState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const storeFamilyId = useExpenseStore((s) => s.familyId);
  const storeUserId = useExpenseStore((s) => s.userId);
  const storePartnerId = useExpenseStore((s) => s.partnerId);
  const storePartnerName = useExpenseStore((s) => s.partnerName);
  const storeFinancialModel = useExpenseStore((s) => s.financialModel);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) {
          if (!cancelled) setReady(true);
          return;
        }

        const { data: family } = await supabase
          .from("families")
          .select("id, user_1_id, user_2_id, financial_model, user_1_split_pct")
          .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
          .maybeSingle();

        if (!family?.id || cancelled) {
          if (!cancelled) setReady(true);
          return;
        }

        const partnerId =
          family.user_1_id === user.id ? family.user_2_id : family.user_1_id ?? null;

        const { data: partnerProfile } = partnerId
          ? await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", partnerId)
              .maybeSingle()
          : { data: null };

        if (cancelled) return;

        const familyMemberCount = memberCountFromFamilyUsers(
          family.user_1_id,
          family.user_2_id
        );

        setNav({
          familyId: family.id,
          currentUserId: user.id,
          partnerUserId: partnerId,
          familyMemberCount,
          partnerFirstName:
            partnerLabel(familyMemberCount, partnerProfile?.full_name) ?? "",
          financialModel: family.financial_model ?? "joint_fund",
          user1SplitPct: Number(family.user_1_split_pct ?? 50),
        });
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Warm the expense-form chunk while the user is browsing so the sheet opens instantly.
  useEffect(() => {
    if (!ready || !nav.familyId) return;

    const prefetch = () => {
      void import("@/components/AddExpenseForm");
    };

    const ric = window.requestIdleCallback?.bind(window);
    if (ric) {
      const idleId = ric(prefetch, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(prefetch, 200);
    return () => window.clearTimeout(timeoutId);
  }, [ready, nav.familyId]);

  const familyId = nav.familyId ?? storeFamilyId ?? undefined;
  const currentUserId = nav.currentUserId ?? storeUserId ?? undefined;
  const partnerUserId =
    nav.partnerUserId !== undefined && nav.partnerUserId !== null
      ? nav.partnerUserId
      : storePartnerId;
  const familyMemberCount = partnerUserId
    ? 2
    : nav.familyId
      ? nav.familyMemberCount
      : storePartnerId
        ? 2
        : 1;
  const partnerFirstName =
    nav.partnerFirstName ||
    partnerLabel(familyMemberCount, storePartnerName) ||
    "";

  // Always mount so the expense sheet is available (don't wait on ready=null).
  return (
    <BottomNav
      familyId={familyId}
      currentUserId={currentUserId}
      partnerUserId={partnerUserId}
      familyMemberCount={familyMemberCount}
      partnerFirstName={partnerFirstName}
      financialModel={nav.familyId ? nav.financialModel : storeFinancialModel}
      user1SplitPct={nav.user1SplitPct}
    />
  );
}
