import { revalidatePath } from "next/cache";
import { BellRing, ChevronRight, CircleHelp, Coins, ShieldCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";

async function joinFamily(formData: FormData) {
  "use server";

  const code = String(formData.get("inviteCode") ?? "")
    .trim()
    .toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(code)) {
    throw new Error("Ingresa un código válido de 6 caracteres.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = getSupabaseAdminClient();

  const { data: family, error: familyError } = await admin
    .from("families")
    .select("id, user_1_id, user_2_id")
    .eq("invite_code", code)
    .maybeSingle();

  if (familyError || !family) {
    throw new Error(familyError?.message ?? "Código de invitación inválido.");
  }

  if (family.user_1_id !== user.id && family.user_2_id && family.user_2_id !== user.id) {
    throw new Error("Esta familia ya tiene dos miembros.");
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    family_id: family.id,
  } as never);

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (family.user_1_id !== user.id && !family.user_2_id) {
    const { error: familyUpdateError } = await admin
      .from("families")
      .update({ user_2_id: user.id } as never)
      .eq("id", family.id);

    if (familyUpdateError) {
      throw new Error(familyUpdateError.message);
    }
  }

  revalidatePath("/");
  revalidatePath("/profile");
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "FS"
  );
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, avatar_url, family_id, family:families!profiles_family_id_fkey(id, invite_code, name)"
    )
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name?.trim() || user.email?.split("@")[0] || "Usuario";
  const initials = getInitials(displayName);
  const family = Array.isArray(profile?.family) ? profile.family[0] : profile?.family;
  const inviteCode = family?.invite_code ?? "------";

  const preferences = [
    { icon: BellRing, label: "Notificaciones", value: "Activadas" },
    { icon: Coins, label: "Moneda", value: "MXN ($)" },
    { icon: CircleHelp, label: "Soporte", value: "Disponible" },
    { icon: ShieldCheck, label: "Privacidad", value: "Protegida" },
  ];

  return (
    <div className="min-h-dvh bg-surface px-4 pt-6 pb-28">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
              Ajustes
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Perfil</h1>
          </div>
          <div className="rounded-full bg-surface-low p-3 text-primary">
            <BellRing size={18} />
          </div>
        </header>

        <section className="rounded-3xl bg-surface-lowest p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-28 w-28 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-3xl font-extrabold text-on-primary">
                {initials}
              </div>
            )}

            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-on-surface">
              {displayName}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">{user.email}</p>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl bg-surface-lowest p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">Tu familia / pareja</h2>
              <p className="text-sm text-on-surface-variant">Comparte o usa un código para unirte.</p>
            </div>
          </div>

          <div className="rounded-2xl bg-primary/8 p-4 text-center">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
              Tu código de invitación
            </p>
            <p className="font-mono text-3xl font-extrabold tracking-[0.3em] text-primary">
              {inviteCode}
            </p>
          </div>

          <form action={joinFamily} className="flex flex-col gap-3 sm:flex-row">
            <input
              name="inviteCode"
              type="text"
              inputMode="text"
              maxLength={6}
              placeholder="Código de 6 caracteres"
              className="w-full rounded-2xl border border-slate-200 bg-surface-low px-4 py-3 text-center font-mono text-on-surface uppercase outline-none focus:border-sage"
              required
            />
            <button
              type="submit"
              className="rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition hover:brightness-110"
            >
              Unirse
            </button>
          </form>
        </section>

        <section className="space-y-2">
          <p className="px-1 text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
            Preferencias
          </p>

          {preferences.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-2xl bg-surface-lowest px-4 py-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-surface-low p-2 text-primary">
                  <Icon size={18} />
                </div>
                <span className="font-semibold text-on-surface">{label}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <span>{value}</span>
                <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </section>

        <div className="pt-2">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
