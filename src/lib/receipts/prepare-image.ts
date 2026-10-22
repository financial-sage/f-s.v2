/** Soft cap on the original pick; we compress before upload. */
export const RECEIPT_MAX_INPUT_BYTES = 30 * 1024 * 1024;
/**
 * Keep well under Vercel / reverse-proxy body limits (~4.5 MB).
 * Multipart + base64 inflate the payload further on the server.
 */
export const RECEIPT_MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024;
/** Long edge — enough for OCR, small enough for phone photos. */
export const RECEIPT_MAX_EDGE = 1600;

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
 * Resize + JPEG-compress a receipt photo in the browser so prod uploads
 * don't hit "Request Entity Too Large" (non-JSON 413 from the edge).
 */
export async function prepareReceiptImage(file: File): Promise<File> {
  const type = file.type || "application/octet-stream";
  const looksLikeImage =
    type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  if (!looksLikeImage) {
    throw new Error("Usa una foto del ticket (JPG, PNG o WebP).");
  }
  if (file.size > RECEIPT_MAX_INPUT_BYTES) {
    throw new Error("Esa foto es demasiado grande. Prueba con otra de la galería.");
  }

  // HEIC often fails in canvas — try createImageBitmap; fall back to original
  // only if already small enough for the gateway.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (file.size <= RECEIPT_MAX_UPLOAD_BYTES) {
      return file;
    }
    throw new Error(
      "No se pudo comprimir esa imagen. Prueba capturar de nuevo en JPG."
    );
  }

  try {
    const scale = Math.min(
      1,
      RECEIPT_MAX_EDGE / Math.max(bitmap.width, bitmap.height)
    );
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
    // White background helps OCR on transparent PNGs.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const outputType = "image/jpeg";
    let quality = 0.82;
    let blob = await canvasToBlob(canvas, outputType, quality);

    while (blob.size > RECEIPT_MAX_UPLOAD_BYTES && quality > 0.4) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, outputType, quality);
    }

    if (blob.size > RECEIPT_MAX_UPLOAD_BYTES) {
      // Second pass: smaller edge.
      const scale2 = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale2));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale2));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      quality = 0.7;
      blob = await canvasToBlob(canvas, outputType, quality);
      while (blob.size > RECEIPT_MAX_UPLOAD_BYTES && quality > 0.35) {
        quality -= 0.1;
        blob = await canvasToBlob(canvas, outputType, quality);
      }
    }

    if (blob.size > RECEIPT_MAX_UPLOAD_BYTES) {
      throw new Error(
        "No se pudo reducir el ticket lo suficiente. Prueba una foto más cercana."
      );
    }

    return new File([blob], "receipt.jpg", {
      type: outputType,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
