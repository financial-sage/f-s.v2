import { revalidatePath } from "next/cache";
import { BellRing, ChevronRight, CircleHelp, Coins, ShieldCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";
import FamilySettings from "@/components/FamilySettings";
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

function getFirstName(value?: string | null, fallback = "Mi pareja") {
  const firstName = value?.trim().split(/\s+/)[0];
  return firstName || fallback;
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
      "full_name, avatar_url, family_id, family:families!profiles_family_id_fkey(id, invite_code, name, user_1_id, user_2_id, financial_model, user_1_split_pct)"
    )
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name?.trim() || user.email?.split("@")[0] || "Usuario";
  const initials = getInitials(displayName);
  const family = Array.isArray(profile?.family) ? profile.family[0] : profile?.family;
  const inviteCode = family?.invite_code ?? "------";
  const currentFinancialModel = family?.financial_model ?? "joint_fund";
  const currentSplitPct = Number(family?.user_1_split_pct ?? 50);
  const isUserOne = family?.user_1_id === user.id;
  const partnerId = family?.user_1_id === user.id ? family?.user_2_id : family?.user_1_id ?? null;

  const { data: partnerProfile } = partnerId
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", partnerId)
        .maybeSingle()
    : { data: null };

  const partnerDisplayName = getFirstName(partnerProfile?.full_name);
  const hasPartner = Boolean(partnerId);

  const preferences = [
    { icon: BellRing, label: "Notificaciones", value: "Activadas" },
    { icon: Coins, label: "Moneda", value: "MXN ($)" },
    { icon: CircleHelp, label: "Soporte", value: "Disponible" },
    { icon: ShieldCheck, label: "Privacidad", value: "Protegida" },
  ];

  return (
    <div className="min-h-dvh bg-surface px-4 pt-6 pb-28">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="px-2 pt-2 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
            Ajustes
          </p>

          <div className="mt-4 flex flex-col items-center text-center">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-24 w-24 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-extrabold text-on-primary shadow-sm">
                {initials}
              </div>
            )}

            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-on-surface">
              {displayName}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">{user.email}</p>
          </div>
        </header>

        <section className="rounded-3xl bg-surface-lowest p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Users size={18} />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-on-surface">Familia</h2>
              {hasPartner ? (
                <p className="mt-1 text-sm text-on-surface-variant">
                  Espacio compartido con {partnerDisplayName}
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-on-surface-variant">Código de invitación</p>
                  <div className="mt-3 rounded-2xl bg-primary/8 px-4 py-3">
                    <p className="font-mono text-xl font-extrabold tracking-[0.2em] text-primary">
                      {inviteCode}
                    </p>
                  </div>

                  <details className="mt-3 group">
                    <summary className="list-none">
                      <span className="inline-flex cursor-pointer items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-slate-200">
                        Ingresar código
                      </span>
                    </summary>

                    <form action={joinFamily} className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <input
                        name="inviteCode"
                        type="text"
                        inputMode="text"
                        maxLength={6}
                        placeholder="Código de 6 caracteres"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-on-surface uppercase outline-none focus:border-sage"
                        required
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-primary px-5 py-3 font-semibold text-on-primary transition hover:brightness-110"
                      >
                        Unirse
                      </button>
                    </form>
                  </details>
                </>
              )}
            </div>
          </div>
        </section>

        {family?.id ? (
          <FamilySettings
            familyId={family.id}
            initialModel={currentFinancialModel}
            initialSplitPct={currentSplitPct}
            isUserOne={isUserOne}
          />
        ) : null}

        <section className="overflow-hidden rounded-3xl bg-surface-lowest shadow-sm">
          <div className="px-4 pt-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
              Preferencias
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {preferences.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-slate-100 p-2 text-primary">
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
          </div>
        </section>

        <div className="pt-1">
          <SignOutButton subtle />
        </div>
      </div>
    </div>
  );
}
