import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEnvAdminEmail } from "@/lib/admin-emails";
import { canUseFullPwa } from "@/lib/device";

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/profile/privacy",
  "/profile/support",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/auth/")) return true;
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

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

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
  const fullPwa = canUseFullPwa({ userAgent, host });

  if (isPublicPath(pathname)) {
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
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
    return NextResponse.redirect(url);
  }

  // Desktop production: web shell and onboarding stay reachable for non-admins.
  if (isWebShellPath(pathname) || isOnboardingPath(pathname)) {
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/web";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * App routes only — skip Next internals, API, and static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest\\.json|sw\\.js|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|css|map|txt|xml)$).*)",
  ],
};
