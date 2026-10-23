import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEnvAdminEmail } from "@/lib/admin-emails";
import {
  canUseFullPwa,
  DESKTOP_SHELL_COOKIE,
  DESKTOP_SHELL_QUERY,
  readForceDesktopShell,
} from "@/lib/device";

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/profile/privacy",
  "/profile/support",
  "/welcome",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname === "/welcome" || pathname.startsWith("/welcome/")) return true;
  return false;
}

function isWebShellPath(pathname: string): boolean {
  return pathname === "/web" || pathname.startsWith("/web/");
}

function isAdminConsolePath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isOnboardingPath(pathname: string): boolean {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

function isLandingPath(pathname: string): boolean {
  return pathname === "/welcome" || pathname.startsWith("/welcome/");
}

async function isSessionAdmin(
  supabase: ReturnType<typeof createServerClient>,
  user: { id: string; email?: string | null }
): Promise<boolean> {
  if (isEnvAdminEmail(user.email)) return true;

  const { data } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  return (data as { is_superadmin?: boolean | null } | null)?.is_superadmin === true;
}

function applyDesktopShellCookie(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const flag = request.nextUrl.searchParams.get(DESKTOP_SHELL_QUERY);
  if (flag === "1" || flag === "true") {
    response.cookies.set(DESKTOP_SHELL_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
    });
  } else if (flag === "0" || flag === "false") {
    response.cookies.set(DESKTOP_SHELL_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  response = applyDesktopShellCookie(request, response);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });
          response = applyDesktopShellCookie(request, response);

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent");
  const host = request.headers.get("host");
  const forceDesktopShell = readForceDesktopShell({
    cookieHeader: request.headers.get("cookie"),
    cookieValue: request.cookies.get(DESKTOP_SHELL_COOKIE)?.value,
    searchParams: request.nextUrl.searchParams,
  });
  const fullPwa = canUseFullPwa({ userAgent, host, forceDesktopShell });

  // Authenticated users on the marketing landing → product shell.
  if (user && isLandingPath(pathname)) {
    const url = request.nextUrl.clone();
    url.search = "";
    if (await isSessionAdmin(supabase, user)) {
      url.pathname = "/admin";
    } else if (fullPwa) {
      url.pathname = "/";
    } else {
      url.pathname = "/web";
    }
    const redirectResponse = NextResponse.redirect(url);
    return applyDesktopShellCookie(request, redirectResponse);
  }

  if (isPublicPath(pathname)) {
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = fullPwa ? "/login" : "/welcome";
    // Keep QA override on the redirect so /welcome sees it even before the cookie sticks.
    if (!fullPwa && forceDesktopShell) {
      url.search = `?${DESKTOP_SHELL_QUERY}=1`;
    } else {
      url.search = "";
    }
    const redirectResponse = NextResponse.redirect(url);
    return applyDesktopShellCookie(request, redirectResponse);
  }

  // Mobile / local dev: keep current PWA behaviour.
  if (fullPwa) {
    return response;
  }

  // Desktop production: admins land in the admin console.
  if (await isSessionAdmin(supabase, user)) {
    if (isAdminConsolePath(pathname)) {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    return applyDesktopShellCookie(request, redirectResponse);
  }

  // Desktop production: web shell and onboarding stay reachable for non-admins.
  if (isWebShellPath(pathname) || isOnboardingPath(pathname)) {
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/web";
  url.search = "";
  const redirectResponse = NextResponse.redirect(url);
  return applyDesktopShellCookie(request, redirectResponse);
}

export const config = {
  matcher: [
    /*
     * Include `/` explicitly — some Next matchers skip the bare root.
     * Skip Next internals, API, and static assets.
     */
    "/",
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest\\.json|sw\\.js|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|css|map|txt|xml)$).*)",
  ],
};
