import { NextResponse, type NextRequest } from "next/server";
import { isEnvAdminEmail } from "@/lib/admin-emails";
import { shouldUseWebShell } from "@/lib/device";
import { syncOauthProfileDefaults } from "@/lib/oauth-profile";
import { createClient } from "@/utils/supabase/server";

function safeNextPath(nextParam: string | null) {
  if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
    return nextParam;
  }
  return "/";
}

async function resolvePostAuthPath(
  request: NextRequest,
  user: { id: string; email?: string | null },
  nextParam: string | null
): Promise<string> {
  const next = safeNextPath(nextParam);
  const userAgent = request.headers.get("user-agent");
  const host = request.headers.get("host");

  if (!shouldUseWebShell({ userAgent, host })) {
    return next;
  }

  if (isEnvAdminEmail(user.email)) {
    return next;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  const isSuperadmin =
    (data as { is_superadmin?: boolean | null } | null)?.is_superadmin === true;

  if (isSuperadmin) {
    return next;
  }

  // Desktop production, non-admin: default destination is the web metrics shell.
  if (!nextParam || next === "/") {
    return "/web";
  }

  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  const nextParam = searchParams.get("next");

  if (oauthError) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", oauthError);
    return NextResponse.redirect(login);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { familyId } = await syncOauthProfileDefaults(supabase, user);

        if (!familyId) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }

        const path = await resolvePostAuthPath(request, user, nextParam);
        return NextResponse.redirect(`${origin}${path}`);
      }

      return NextResponse.redirect(`${origin}${safeNextPath(nextParam)}`);
    }

    const login = new URL("/login", origin);
    login.searchParams.set("error", error.message);
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(`${origin}/login`);
}
