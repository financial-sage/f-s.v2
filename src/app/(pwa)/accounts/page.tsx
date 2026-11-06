export const dynamic = "force-dynamic";

import AccountsPanel from "@/components/AccountsPanel";
import { getAccountsOverviewAction } from "@/app/actions/accounts";
import { parseAccountsTabParam } from "@/lib/accounts";
import {
  getRequestFamilyMemberCount,
  requirePwaSession,
} from "@/lib/request-context";
import { perfLog, perfNow } from "@/lib/perf";

type AccountsPageProps = {
  searchParams?: Promise<{ tab?: string | string[] }>;
};

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const start = perfNow();
  const { user, familyId } = await requirePwaSession();
  const params = (await searchParams) ?? {};
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab = parseAccountsTabParam(rawTab);

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
      initialTab={initialTab}
    />
  );
}
