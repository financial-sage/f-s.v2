import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

function safeNextPath(nextParam: string | null) {
  if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
    return nextParam;
  }
  return "/";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  const next = safeNextPath(searchParams.get("next"));

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
        const meta = user.user_metadata ?? {};
        const fullName =
          (typeof meta.full_name === "string" && meta.full_name.trim()) ||
          (typeof meta.name === "string" && meta.name.trim()) ||
          null;
        const avatarUrl =
          (typeof meta.avatar_url === "string" && meta.avatar_url) ||
          (typeof meta.picture === "string" && meta.picture) ||
          null;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, family_id")
          .eq("id", user.id)
          .maybeSingle();

        const patch: { full_name?: string; avatar_url?: string } = {};
        if (!profile?.full_name && fullName) patch.full_name = fullName;
        if (!profile?.avatar_url && avatarUrl) patch.avatar_url = avatarUrl;

        if (Object.keys(patch).length > 0) {
          await supabase.from("profiles").update(patch as never).eq("id", user.id);
        }

        if (!profile?.family_id) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    const login = new URL("/login", origin);
    login.searchParams.set("error", error.message);
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(`${origin}/login`);
}
