/** Soft cap on the original pick; we compress before upload. */
export const RECEIPT_MAX_INPUT_BYTES = 30 * 1024 * 1024;
/**
 * Keep well under Vercel / reverse-proxy body limits (~4.5 MB).
 * Multipart + base64 inflate the payload further on the server.
 */
export const RECEIPT_MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024;
/** Long edge — enough for OCR, small enough for phone photos. */
export const RECEIPT_MAX_EDGE = 1600;
/** Max PDF pages to rasterize (first pages + last). */
const RECEIPT_PDF_MAX_PAGES = 4;

export const RECEIPT_ACCEPT =
  "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,application/pdf,.pdf";

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

async function compressCanvasToJpegFile(
  source: HTMLCanvasElement,
  fileName = "receipt.jpg"
): Promise<File> {
  let quality = 0.82;
  let blob = await canvasToBlob(source, "image/jpeg", quality);

  while (blob.size > RECEIPT_MAX_UPLOAD_BYTES && quality > 0.4) {
    quality -= 0.1;
    blob = await canvasToBlob(source, "image/jpeg", quality);
  }

  if (blob.size > RECEIPT_MAX_UPLOAD_BYTES) {
    const scale = Math.min(1, 1200 / Math.max(source.width, source.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo procesar la imagen en este dispositivo.");
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    quality = 0.7;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
    while (blob.size > RECEIPT_MAX_UPLOAD_BYTES && quality > 0.35) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }
  }

  if (blob.size > RECEIPT_MAX_UPLOAD_BYTES) {
    throw new Error(
      "No se pudo reducir el archivo lo suficiente. Prueba una foto más cercana o un PDF más ligero."
    );
  }

  return new File([blob], fileName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function isPdfFile(file: File) {
  const type = (file.type || "").toLowerCase();
  return (
    type === "application/pdf" ||
    type === "application/x-pdf" ||
    /\.pdf$/i.test(file.name)
  );
}

function pickPdfPageNumbers(pageCount: number): number[] {
  if (pageCount <= 0) return [];
  if (pageCount <= RECEIPT_PDF_MAX_PAGES) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  // First pages + last (totals often live on the last page of e-invoices).
  const pages = new Set<number>();
  for (let i = 1; i <= RECEIPT_PDF_MAX_PAGES - 1; i++) pages.add(i);
  pages.add(pageCount);
  return [...pages].sort((a, b) => a - b);
}

async function prepareReceiptPdf(file: File): Promise<File> {
  const pdfjs = await import("pdfjs-dist");
  // Worker from the same package version (bundler resolves URL).
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  try {
    const pageNumbers = pickPdfPageNumbers(doc.numPages);
    if (pageNumbers.length === 0) {
      throw new Error("El PDF no tiene páginas legibles.");
    }

    const rendered: HTMLCanvasElement[] = [];
    for (const pageNumber of pageNumbers) {
      const page = await doc.getPage(pageNumber);
      const unscaled = page.getViewport({ scale: 1 });
      const scale = Math.min(2, RECEIPT_MAX_EDGE / Math.max(unscaled.width, unscaled.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("No se pudo procesar el PDF en este dispositivo.");
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      rendered.push(canvas);
    }

    const gap = 16;
    const width = Math.max(...rendered.map((c) => c.width));
    const height =
      rendered.reduce((sum, c) => sum + c.height, 0) +
      gap * Math.max(0, rendered.length - 1);

    const stitched = document.createElement("canvas");
    stitched.width = width;
    stitched.height = height;
    const stitchedCtx = stitched.getContext("2d");
    if (!stitchedCtx) {
      throw new Error("No se pudo procesar el PDF en este dispositivo.");
    }
    stitchedCtx.fillStyle = "#ffffff";
    stitchedCtx.fillRect(0, 0, width, height);

    let y = 0;
    for (const pageCanvas of rendered) {
      const x = Math.floor((width - pageCanvas.width) / 2);
      stitchedCtx.drawImage(pageCanvas, x, y);
      y += pageCanvas.height + gap;
    }

    return compressCanvasToJpegFile(stitched, "factura.jpg");
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("No se pudo")) {
      throw err;
    }
    throw new Error(
      "No se pudo leer ese PDF. Prueba exportarlo de nuevo o sube una imagen del ticket."
    );
  } finally {
    await doc.destroy();
  }
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

    return compressCanvasToJpegFile(canvas);
  } finally {
    bitmap.close();
  }
}

/**
 * Prepare a receipt file (photo or electronic PDF invoice) for Vision upload.
 * PDFs are rasterized client-side to JPEG so the API stays image-based.
 */
export async function prepareReceiptFile(file: File): Promise<File> {
  if (file.size > RECEIPT_MAX_INPUT_BYTES) {
    throw new Error("Ese archivo es demasiado grande. Prueba con otro más ligero.");
  }
  if (isPdfFile(file)) {
    return prepareReceiptPdf(file);
  }
  return prepareReceiptImage(file);
}
