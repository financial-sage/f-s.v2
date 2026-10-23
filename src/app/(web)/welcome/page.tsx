import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isEnvAdminEmail } from "@/lib/admin-emails";
import {
  canUseFullPwa,
  DESKTOP_SHELL_COOKIE,
  DESKTOP_SHELL_QUERY,
  readForceDesktopShell,
} from "@/lib/device";
import { createClient } from "@/utils/supabase/server";
import MarketingLanding from "@/components/web/MarketingLanding";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SinDescuadre · Llegar a fin de mes, tan claro como un tap",
  description:
    "Organiza tu dinero solo o en pareja. Cuentas, bolsillos y orientación con IA — la app completa en tu móvil.",
};

function buildAbsoluteLoginUrl(host: string | null, proto: string | null) {
  const safeHost =
    (host ?? "sindescuadre.app").split(",")[0]?.trim() || "sindescuadre.app";
  const scheme =
    proto === "http" || proto === "https"
      ? proto
      : safeHost.includes("localhost") || safeHost.startsWith("127.")
        ? "http"
        : "https";
  return `${scheme}://${safeHost}/login`;
}

type WelcomeSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: WelcomeSearchParams;
}) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const params = await searchParams;
  const desktopParam = params[DESKTOP_SHELL_QUERY];
  const desktopValue = Array.isArray(desktopParam)
    ? desktopParam[0]
    : desktopParam;

  const search = new URLSearchParams();
  if (desktopValue != null) search.set(DESKTOP_SHELL_QUERY, desktopValue);

  const forceDesktop = readForceDesktopShell({
    cookieHeader: headerStore.get("cookie"),
    cookieValue: cookieStore.get(DESKTOP_SHELL_COOKIE)?.value,
    searchParams: search,
  });

  const userAgent = headerStore.get("user-agent");
  const host = headerStore.get("host");
  const proto =
    headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? null;

  const fullPwa = canUseFullPwa({
    userAgent,
    host,
    forceDesktopShell: forceDesktop,
  });

  if (fullPwa) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (isEnvAdminEmail(user.email)) {
      redirect("/admin");
    }
    const { data } = await supabase
      .from("profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .maybeSingle();
    if ((data as { is_superadmin?: boolean | null } | null)?.is_superadmin) {
      redirect("/admin");
    }
    redirect("/web");
  }

  const loginUrl = buildAbsoluteLoginUrl(host, proto);

  return <MarketingLanding loginUrl={loginUrl} />;
}
