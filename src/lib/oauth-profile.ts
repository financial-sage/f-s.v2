import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  AVATARS_BUCKET,
  avatarObjectPath,
  withAvatarCacheBust,
} from "@/lib/avatar";

function pickUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null;
  return trimmed;
}

/** Prefer a larger Google profile image when the URL is size-scoped. */
export function normalizeOauthAvatarUrl(url: string): string {
  if (!url.includes("googleusercontent.com")) return url;
  return url.replace(/=s\d+(-[a-z])?/i, "=s256$1");
}

export function oauthAvatarFromUser(user: User): string | null {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    pickUrl(meta.avatar_url) || pickUrl(meta.picture) || pickUrl(meta.avatar);
  if (fromMeta) return normalizeOauthAvatarUrl(fromMeta);

  for (const identity of user.identities ?? []) {
    if (identity.provider !== "google") continue;
    const data = identity.identity_data ?? {};
    const fromIdentity =
      pickUrl(data.avatar_url) || pickUrl(data.picture) || pickUrl(data.avatar);
    if (fromIdentity) return normalizeOauthAvatarUrl(fromIdentity);
  }

  return null;
}

export function oauthFullNameFromUser(user: User): string | null {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    null;
  if (fromMeta) return fromMeta;

  for (const identity of user.identities ?? []) {
    if (identity.provider !== "google") continue;
    const data = identity.identity_data ?? {};
    const name =
      (typeof data.full_name === "string" && data.full_name.trim()) ||
      (typeof data.name === "string" && data.name.trim()) ||
      null;
    if (name) return name;
  }

  return null;
}

async function hostOauthAvatar(
  supabase: SupabaseClient,
  userId: string,
  remoteUrl: string
): Promise<string> {
  try {
    const response = await fetch(remoteUrl, {
      headers: { Accept: "image/*" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return remoteUrl;

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const mime = contentType.startsWith("image/")
      ? contentType.split(";")[0]!.trim()
      : "image/jpeg";
    const uploadMime = mime === "image/png" ? "image/png" : "image/jpeg";
    const bytes = Buffer.from(await response.arrayBuffer());
    const path = avatarObjectPath(userId, uploadMime);

    const { error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(path, bytes, {
        upsert: true,
        contentType: uploadMime,
        cacheControl: "3600",
      });

    if (uploadError) return remoteUrl;

    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);

    return withAvatarCacheBust(publicUrl);
  } catch {
    return remoteUrl;
  }
}

/**
 * Fills name/avatar from Google when the profile still has no photo.
 * Tries to copy the Google image into Storage; falls back to the Google URL.
 */
export async function syncOauthProfileDefaults(
  supabase: SupabaseClient,
  user: User
): Promise<{ familyId: string | null }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, family_id")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = oauthFullNameFromUser(user);
  const remoteAvatar = oauthAvatarFromUser(user);
  const patch: { full_name?: string; avatar_url?: string } = {};

  if (!profile?.full_name?.trim() && fullName) {
    patch.full_name = fullName;
  }

  if (!profile?.avatar_url?.trim() && remoteAvatar) {
    patch.avatar_url = await hostOauthAvatar(supabase, user.id, remoteAvatar);
  }

  if (Object.keys(patch).length > 0) {
    if (profile) {
      await supabase.from("profiles").update(patch as never).eq("id", user.id);
    } else {
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: patch.full_name ?? fullName,
        avatar_url: patch.avatar_url ?? remoteAvatar,
      } as never);
    }
  }

  return { familyId: profile?.family_id ?? null };
}
