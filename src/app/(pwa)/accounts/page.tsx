export const dynamic = "force-dynamic";

import AccountsPanel from "@/components/AccountsPanel";
import { getAccountsOverviewAction } from "@/app/actions/accounts";
import {
  getRequestFamilyMemberCount,
  requirePwaSession,
} from "@/lib/request-context";
import { perfLog, perfNow } from "@/lib/perf";

export default async function AccountsPage() {
  const start = perfNow();
  const { user, familyId } = await requirePwaSession();
  const [familyMemberCount, overview] = await Promise.all([
    getRequestFamilyMemberCount(familyId),
    getAccountsOverviewAction(),
  ]);
  perfLog("AccountsPage", { ms: perfNow() - start });

  return (
    <AccountsPanel
      currentUserId={user.id}
      familyMemberCount={familyMemberCount}
      initialOverview={overview}
    />
  );
}
