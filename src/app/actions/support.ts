"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminUser } from "@/lib/admin";

export type SupportTicketStatus = "new" | "read" | "resolved";

export type SupportTicketRow = {
  id: string;
  ticket_number: string;
  user_id: string | null;
  family_id: string | null;
  email: string;
  message: string;
  location: string | null;
  user_agent: string | null;
  app_version: string | null;
  status: SupportTicketStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isSuperAdminUser({ userId: user.id, email: user.email }))) {
    throw new Error("No autorizado.");
  }
  return user;
}

export async function createSupportTicketAction(input: {
  message: string;
  location?: string | null;
  userAgent?: string | null;
  appVersion?: string | null;
}): Promise<
  | { ok: true; ticketNumber: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  const message = String(input.message ?? "").trim();
  if (message.length < 10) {
    return {
      ok: false,
      error: "Cuéntanos un poco más (al menos 10 caracteres).",
    };
  }
  if (message.length > 4000) {
    return { ok: false, error: "El mensaje es demasiado largo." };
  }

  const email = (user.email ?? "").trim();
  if (!email) {
    return { ok: false, error: "Tu cuenta no tiene email asociado." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();

  const admin = createAdminClient();
  const { data: ticketNumber, error: seqError } = await admin.rpc(
    "next_support_ticket_number" as never
  );

  if (seqError || typeof ticketNumber !== "string" || !ticketNumber) {
    console.error("[support] ticket number", seqError?.message);
    return { ok: false, error: "No se pudo generar el número de incidencia." };
  }

  const now = new Date().toISOString();
  const { error: insertError } = await admin.from("support_tickets").insert({
    ticket_number: ticketNumber,
    user_id: user.id,
    family_id:
      (profile as { family_id?: string | null } | null)?.family_id ?? null,
    email,
    message,
    location: input.location?.trim().slice(0, 500) || null,
    user_agent: input.userAgent?.trim().slice(0, 500) || null,
    app_version: input.appVersion?.trim().slice(0, 40) || null,
    status: "new",
    created_at: now,
    updated_at: now,
  } as never);

  if (insertError) {
    console.error("[support] insert", insertError.message);
    return { ok: false, error: "No se pudo guardar la incidencia." };
  }

  revalidatePath("/admin");
  revalidatePath("/profile/support");
  return { ok: true, ticketNumber };
}

export async function listSupportTicketsForAdmin(options?: {
  status?: SupportTicketStatus | "open" | "all";
  limit?: number;
}): Promise<SupportTicketRow[]> {
  const admin = createAdminClient();
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const status = options?.status ?? "open";

  let query = admin
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status === "open") {
    query = query.in("status", ["new", "read"]);
  } else if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[support] list", error.message);
    return [];
  }
  return (data ?? []) as SupportTicketRow[];
}

export async function listSupportTicketsAction(options?: {
  status?: SupportTicketStatus | "open" | "all";
  limit?: number;
}): Promise<SupportTicketRow[]> {
  await requireSuperAdmin();
  return listSupportTicketsForAdmin(options);
}

export async function updateSupportTicketStatusAction(
  id: string,
  status: SupportTicketStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireSuperAdmin();
  if (!id) return { ok: false, error: "Incidencia inválida." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("support_tickets")
    .update({
      status,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin");
  return { ok: true };
}
