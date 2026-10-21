export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import {
  getRequestFamilyMemberCount,
  requirePwaSession,
} from "@/lib/request-context";
import { perfLog, perfNow } from "@/lib/perf";

const SavingsPanel = dynamicImport(() => import("@/components/SavingsPanel"), {
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-page-gradient text-sm text-on-surface-variant">
      Cargando ahorros…
    </div>
  ),
});

export default async function SavingsPage() {
  const start = perfNow();
  const { user, familyId } = await requirePwaSession();
  const familyMemberCount = await getRequestFamilyMemberCount(familyId);
  perfLog("SavingsPage", { ms: perfNow() - start });

  return (
    <SavingsPanel
      currentUserId={user.id}
      familyMemberCount={familyMemberCount}
    />
  );
}
