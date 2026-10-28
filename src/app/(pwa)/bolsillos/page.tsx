export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import {
  getRequestFamilyMemberCount,
  requirePwaSession,
} from "@/lib/request-context";
import { perfLog, perfNow } from "@/lib/perf";

const BolsillosPanel = dynamicImport(() => import("@/components/BolsillosPanel"), {
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-page-gradient text-sm text-on-surface-variant">
      Cargando bolsillos…
    </div>
  ),
});

export default async function BolsillosPage() {
  const start = perfNow();
  const { user, familyId } = await requirePwaSession();
  const familyMemberCount = await getRequestFamilyMemberCount(familyId);
  perfLog("BolsillosPage", { ms: perfNow() - start });

  return (
    <BolsillosPanel
      currentUserId={user.id}
      familyMemberCount={familyMemberCount}
    />
  );
}
