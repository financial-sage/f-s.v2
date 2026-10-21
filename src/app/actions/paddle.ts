"use server";

import { revalidatePath } from "next/cache";
import { getRequestUser, getRequestFamilyId } from "@/lib/request-context";
import {
  getPaddlePriceId,
  isPaddleConfigured,
  type PaddlePlanId,
} from "@/lib/paddle/config";
import { confirmPaddleTransactionForUser } from "@/lib/paddle/confirm";

export type PaddleCheckoutPayload = {
  priceId: string;
  email: string | null;
  customData: Record<string, string>;
};

export async function getPaddleCheckoutPayloadAction(
  plan: PaddlePlanId
): Promise<PaddleCheckoutPayload> {
  if (!isPaddleConfigured()) {
    throw new Error(
      "Paddle no está configurado. Añade NEXT_PUBLIC_PADDLE_CLIENT_TOKEN y los price IDs."
    );
  }

  const user = await getRequestUser();
  if (!user) throw new Error("Debes iniciar sesión.");

  const priceId = getPaddlePriceId(plan)?.trim() ?? null;
  if (!priceId) throw new Error("Falta el price ID de Paddle para este plan.");
  if (!/^pri_[a-zA-Z0-9]+$/.test(priceId) || priceId.length < 20) {
    throw new Error(
      `Price ID inválido para ${plan} ("${priceId.slice(0, 12)}…"). Reinicia el servidor tras actualizar .env.local y usa el Price ID (pri_…), no el Product ID (pro_…).`
    );
  }

  const familyId = await getRequestFamilyId(user.id);

  // Paddle customData values must be strings (no null).
  const customData: Record<string, string> = {
    supabase_user_id: user.id,
  };
  if (familyId) customData.family_id = familyId;

  return {
    priceId,
    email: user.email ?? null,
    customData,
  };
}

/** Called from the client when Overlay fires checkout.completed. */
export async function confirmPaddleCheckoutAction(transactionId: string) {
  const user = await getRequestUser();
  if (!user) throw new Error("Debes iniciar sesión.");
  if (!transactionId?.startsWith("txn_")) {
    throw new Error("Transacción inválida.");
  }

  const result = await confirmPaddleTransactionForUser({
    userId: user.id,
    transactionId,
  });

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/web");
  revalidatePath("/admin");

  return result;
}
