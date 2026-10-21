export const AVATARS_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function avatarObjectPath(userId: string, mimeType: string) {
  const ext =
    mimeType === "image/png"
      ? "png"
      : mimeType === "image/webp"
        ? "webp"
        : mimeType === "image/gif"
          ? "gif"
          : "jpg";
  return `${userId}/avatar.${ext}`;
}

export function assertValidAvatarFile(file: File) {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Usa una imagen JPG, PNG, WebP o GIF.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("La imagen debe pesar menos de 5 MB.");
  }
}

/** Bust CDN/browser cache after replace. */
export function withAvatarCacheBust(url: string) {
  const base = url.split("?")[0] ?? url;
  return `${base}?v=${Date.now()}`;
}
