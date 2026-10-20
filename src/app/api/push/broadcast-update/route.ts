import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminUser } from "@/lib/admin";
import { broadcastAppUpdate } from "@/lib/push-server";
import { isPushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

function isSecretAuthorized(request: Request): boolean {
  const secret = process.env.PUSH_BROADCAST_SECRET?.trim();
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  const custom = request.headers.get("x-push-broadcast-secret");
  return custom === secret;
}

export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push no configurado (faltan claves VAPID)." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userOk =
    Boolean(user) &&
    (await isSuperAdminUser({ userId: user!.id, email: user!.email }));

  if (!userOk && !isSecretAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { version?: string; body?: string } = {};
  try {
    body = (await request.json()) as { version?: string; body?: string };
  } catch {
    body = {};
  }

  try {
    const result = await broadcastAppUpdate({
      version: body.version,
      body: body.body,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Broadcast failed" },
      { status: 500 }
    );
  }
}
