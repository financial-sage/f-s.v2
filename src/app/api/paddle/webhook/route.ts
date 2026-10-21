import { NextResponse, type NextRequest } from "next/server";
import { processPaddleWebhook } from "@/lib/paddle/webhook";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("paddle-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    const result = await processPaddleWebhook(rawBody, signature);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[paddle/webhook]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook error" },
      { status: 400 }
    );
  }
}
