export const dynamic = "force-dynamic";

import FixedExpensesManager from "@/components/FixedExpensesManager";
import {
  getRequestFamilyMemberCount,
  requirePwaSession,
} from "@/lib/request-context";
import { perfLog, perfNow } from "@/lib/perf";

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
