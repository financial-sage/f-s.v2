import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { parseReceiptImage } from "@/lib/receipts/parse-receipt";
import { isOpenAIConfigured } from "@/lib/ai/openai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Receipt Vision can take a few seconds on cold starts. */
export const maxDuration = 60;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(request: Request) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI no configurado (falta OPENAI_API_KEY)." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let mimeType = "image/jpeg";
  let base64 = "";
  let localeHint: string | undefined;

  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      localeHint = String(form.get("localeHint") ?? "") || undefined;
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Falta la imagen." }, { status: 400 });
      }
      mimeType = file.type || "image/jpeg";
      if (!ALLOWED_TYPES.has(mimeType) && !mimeType.startsWith("image/")) {
        return NextResponse.json(
          { error: "Formato de imagen no soportado." },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.byteLength > 8 * 1024 * 1024) {
        return NextResponse.json(
          { error: "La imagen supera 8 MB." },
          { status: 400 }
        );
      }
      base64 = buffer.toString("base64");
    } else {
      const body = (await request.json()) as {
        mimeType?: string;
        base64?: string;
        localeHint?: string;
      };
      mimeType = body.mimeType || "image/jpeg";
      base64 = (body.base64 || "").replace(/^data:[^;]+;base64,/, "");
      localeHint = body.localeHint;
      if (!base64) {
        return NextResponse.json({ error: "Falta la imagen." }, { status: 400 });
      }
    }

    const receipt = await parseReceiptImage({ mimeType, base64, localeHint });
    return NextResponse.json({ ok: true, receipt });
  } catch (err) {
    console.error("[receipts/parse]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "No se pudo leer el ticket.",
      },
      { status: 500 }
    );
  }
}
