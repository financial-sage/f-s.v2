import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";

async function createFamily(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = String(formData.get("familyName") ?? "").trim() || "Nueva familia";
  const admin = getSupabaseAdminClient();

  const { data: family, error } = await admin
    .from("families")
    .insert({
      name,
      user_1_id: user.id,
      user_2_id: null,
    } as never)
    .select("id")
    .single();

  if (error || !family) {
    redirect(`/onboarding?error=${encodeURIComponent(error?.message ?? "No se pudo crear la familia")}`);
  }

  redirect("/");
}

async function joinFamily(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const code = String(formData.get("familyCode") ?? "")
    .trim()
    .toUpperCase();
  const admin = getSupabaseAdminClient();

  if (!/^[A-Z0-9]{6}$/.test(code)) {
    redirect("/onboarding?error=Ingresa un código válido de 6 caracteres");
  }

  const { data: family, error } = await admin
    .from("families")
    .select("id, user_1_id, user_2_id")
    .eq("invite_code", code)
    .maybeSingle();

  if (error || !family) {
    redirect(`/onboarding?error=${encodeURIComponent(error?.message ?? "Familia no encontrada")}`);
  }

  if (family.user_1_id !== user.id && family.user_2_id && family.user_2_id !== user.id) {
    redirect("/onboarding?error=Esta familia ya tiene dos miembros");
  }

  if (family.user_1_id !== user.id && !family.user_2_id) {
    const { error: familyUpdateError } = await admin
      .from("families")
      .update({ user_2_id: user.id } as never)
      .eq("id", family.id);

    if (familyUpdateError) {
      redirect(`/onboarding?error=${encodeURIComponent(familyUpdateError.message)}`);
    }
  }

  redirect("/");
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = (await searchParams) ?? {};

  return (
    <div className="min-h-dvh bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md space-y-5 rounded-3xl bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Configura tu familia
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Crea una nueva o únete con un código.
          </p>
        </div>

        {params.error && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.error}
          </div>
        )}

        <form action={createFamily} className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <input
            name="familyName"
            type="text"
            placeholder="Nombre de la familia"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-sage"
          />
          <button className="w-full rounded-full bg-sage px-4 py-3 font-semibold text-white transition hover:brightness-110">
            Crear nueva familia
          </button>
        </form>

        <form action={joinFamily} className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <input
            name="familyCode"
            type="text"
            placeholder="Código de invitación"
            required
            maxLength={6}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center font-mono text-slate-800 uppercase outline-none focus:border-sage"
          />
          <button className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100">
            Unirse con código
          </button>
        </form>
      </div>
    </div>
  );
}
