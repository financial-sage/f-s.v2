import { NextResponse } from "next/server";
import { isSuperAdminUser } from "@/lib/admin";
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
  let funds: { id: string; name: string }[] = [];
  let wantLineItems = false;

  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      localeHint = String(form.get("localeHint") ?? "") || undefined;
      wantLineItems =
        String(form.get("includeLineItems") ?? "") === "1" ||
        String(form.get("includeLineItems") ?? "").toLowerCase() === "true";
      const fundsRaw = String(form.get("funds") ?? "");
      if (fundsRaw) {
        try {
          const parsed = JSON.parse(fundsRaw) as unknown;
          if (Array.isArray(parsed)) {
            funds = parsed
              .map((row) => {
                if (!row || typeof row !== "object") return null;
                const o = row as { id?: unknown; name?: unknown };
                if (typeof o.id !== "string" || typeof o.name !== "string") {
                  return null;
                }
                return { id: o.id, name: o.name };
              })
              .filter((row): row is { id: string; name: string } => Boolean(row));
          }
        } catch {
          funds = [];
        }
      }
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
        funds?: { id: string; name: string }[];
        includeLineItems?: boolean;
      };
      mimeType = body.mimeType || "image/jpeg";
      base64 = (body.base64 || "").replace(/^data:[^;]+;base64,/, "");
      localeHint = body.localeHint;
      funds = Array.isArray(body.funds) ? body.funds : [];
      wantLineItems = Boolean(body.includeLineItems);
      if (!base64) {
        return NextResponse.json({ error: "Falta la imagen." }, { status: 400 });
      }
    }

    const isAdmin = await isSuperAdminUser({
      userId: user.id,
      email: user.email,
    });
    // Superadmin grocery trial: always extract product lines for admins
    // (client flag can race; wantLineItems kept for future non-admin use).
    const includeLineItems = isAdmin || wantLineItems;

    const receipt = await parseReceiptImage({
      mimeType,
      base64,
      localeHint,
      funds,
      includeLineItems,
    });
    console.info("[receipts/parse]", {
      includeLineItems,
      lineCount: Array.isArray(receipt.lines) ? receipt.lines.length : 0,
      merchant: receipt.merchant,
      total: receipt.total,
    });
    return NextResponse.json({
      ok: true,
      receipt,
      meta: {
        includeLineItems,
        lineCount: Array.isArray(receipt.lines) ? receipt.lines.length : 0,
      },
    });
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
