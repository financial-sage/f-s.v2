export const AVATARS_BUCKET = "avatars";
/** Soft cap on the original pick; we compress before upload. */
export const AVATAR_MAX_INPUT_BYTES = 30 * 1024 * 1024;
/** Hard cap after compression (matches Storage bucket limit). */
export const AVATAR_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_EDGE = 768;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/*";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jpg",
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
  const type = file.type || "application/octet-stream";
  const looksLikeImage = type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
  if (!looksLikeImage) {
    throw new Error("Usa una imagen JPG, PNG, WebP o GIF.");
  }
  if (type && !type.startsWith("image/") && !ALLOWED_MIME.has(type)) {
    throw new Error("Usa una imagen JPG, PNG, WebP o GIF.");
  }
  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    throw new Error("Esa foto es demasiado grande. Prueba con otra de la galería.");
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo procesar la imagen."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

/**
 * Resize + compress in the browser so phone photos upload without the user
 * manually lowering quality. Output is JPEG under the Storage size limit.
 */
export async function prepareAvatarFile(file: File): Promise<File> {
  assertValidAvatarFile(file);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("No se pudo leer esa imagen. Prueba JPG o PNG.");
  }

  try {
    const scale = Math.min(1, AVATAR_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo procesar la imagen en este dispositivo.");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);

    const outputType = "image/jpeg";
    let quality = 0.85;
    let blob = await canvasToBlob(canvas, outputType, quality);

    // Keep shrinking quality until we are comfortably under 5 MB.
    while (blob.size > AVATAR_MAX_UPLOAD_BYTES && quality > 0.45) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, outputType, quality);
    }

    if (blob.size > AVATAR_MAX_UPLOAD_BYTES) {
      throw new Error("No se pudo reducir esa foto lo suficiente. Prueba con otra.");
    }

    return new File([blob], "avatar.jpg", {
      type: outputType,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

/** Bust CDN/browser cache after replace. */
export function withAvatarCacheBust(url: string) {
  const base = url.split("?")[0] ?? url;
  return `${base}?v=${Date.now()}`;
}
