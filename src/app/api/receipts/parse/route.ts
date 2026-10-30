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
  let funds: { id: string; name: string }[] = [];
  let categories: {
    id: string;
    name: string;
    parent_id: string | null;
    icon?: string | null;
  }[] = [];

  function parseJsonArray<T>(
    raw: string,
    mapRow: (row: Record<string, unknown>) => T | null
  ): T[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          return mapRow(row as Record<string, unknown>);
        })
        .filter((row): row is T => Boolean(row));
    } catch {
      return [];
    }
  }

  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      localeHint = String(form.get("localeHint") ?? "") || undefined;
      funds = parseJsonArray(String(form.get("funds") ?? ""), (o) => {
        if (typeof o.id !== "string" || typeof o.name !== "string") return null;
        return { id: o.id, name: o.name };
      });
      categories = parseJsonArray(String(form.get("categories") ?? ""), (o) => {
        if (typeof o.id !== "string" || typeof o.name !== "string") return null;
        return {
          id: o.id,
          name: o.name,
          parent_id:
            typeof o.parent_id === "string"
              ? o.parent_id
              : o.parent_id == null
                ? null
                : null,
          icon: typeof o.icon === "string" ? o.icon : null,
        };
      });
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
        categories?: {
          id: string;
          name: string;
          parent_id?: string | null;
          icon?: string | null;
        }[];
      };
      mimeType = body.mimeType || "image/jpeg";
      base64 = (body.base64 || "").replace(/^data:[^;]+;base64,/, "");
      localeHint = body.localeHint;
      funds = Array.isArray(body.funds) ? body.funds : [];
      categories = Array.isArray(body.categories)
        ? body.categories
            .map((c) => {
              if (!c || typeof c.id !== "string" || typeof c.name !== "string") {
                return null;
              }
              return {
                id: c.id,
                name: c.name,
                parent_id: c.parent_id ?? null,
                icon: c.icon ?? null,
              };
            })
            .filter(
              (
                row
              ): row is {
                id: string;
                name: string;
                parent_id: string | null;
                icon: string | null;
              } => Boolean(row)
            )
        : [];
      if (!base64) {
        return NextResponse.json({ error: "Falta la imagen." }, { status: 400 });
      }
    }

    // Grocery tickets: extract product lines for price compare (all members).
    const includeLineItems = true;

    const receipt = await parseReceiptImage({
      mimeType,
      base64,
      localeHint,
      funds,
      categories,
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
