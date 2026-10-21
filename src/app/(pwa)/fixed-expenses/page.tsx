export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import {
  getRequestFamilyMemberCount,
  requirePwaSession,
} from "@/lib/request-context";
import { perfLog, perfNow } from "@/lib/perf";

const FixedExpensesManager = dynamicImport(
  () => import("@/components/FixedExpensesManager"),
  {
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-page-gradient text-sm text-on-surface-variant">
        Cargando gastos fijos…
      </div>
    ),
  }
);

export default async function FixedExpensesPage() {
  const start = perfNow();
  const { user, familyId } = await requirePwaSession();
  const familyMemberCount = await getRequestFamilyMemberCount(familyId);
  perfLog("FixedExpensesPage", { ms: perfNow() - start });

  return (
    <FixedExpensesManager
      currentUserId={user.id}
      familyMemberCount={familyMemberCount}
    />
  );
}
