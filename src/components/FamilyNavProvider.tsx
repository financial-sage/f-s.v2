"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/utils/supabase/client";

type FamilyNavState = {
  familyId?: string;
  partnerFirstName: string;
  financialModel: string;
  user1SplitPct: number;
};

const DEFAULT_STATE: FamilyNavState = {
  partnerFirstName: "Mi pareja",
  financialModel: "joint_fund",
  user1SplitPct: 50,
};

function getFirstName(value?: string | null, fallback = "Mi pareja") {
  const firstName = value?.trim().split(/\s+/)[0];
  return firstName || fallback;
}

/** Loads BottomNav family props once on the client so the PWA layout stays sync. */
export default function FamilyNavProvider() {
  const [nav, setNav] = useState<FamilyNavState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);

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

        setNav({
          familyId: family.id,
          partnerFirstName: getFirstName(partnerProfile?.full_name),
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

  if (!ready || !nav.familyId) {
    return null;
  }

  return (
    <BottomNav
      familyId={nav.familyId}
      partnerFirstName={nav.partnerFirstName}
      financialModel={nav.financialModel}
      user1SplitPct={nav.user1SplitPct}
    />
  );
}
