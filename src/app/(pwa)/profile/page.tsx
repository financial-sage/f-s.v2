import { revalidatePath } from "next/cache";
import {
  BellRing,
  ChevronRight,
  CircleHelp,
  Coins,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CurrencySelectRow } from "@/components/CurrencySelectRow";
import FamilySettings from "@/components/FamilySettings";
import SignOutButton from "@/components/SignOutButton";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import { ThemeToggleRow } from "@/components/ThemeToggleRow";

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
  const familyLabel = family?.name?.trim() || "Tu espacio";

  const preferences = [
    { icon: BellRing, label: "Notificaciones", value: "Activadas" },
    { icon: CircleHelp, label: "Soporte", value: "Disponible" },
    { icon: ShieldCheck, label: "Privacidad", value: "Protegida" },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-linear-to-b from-[#f3f5f0] via-[#e8ede4] to-[#d5dfd0] text-on-surface">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(ellipse_at_bottom,_rgba(74,101,73,0.16),_transparent_70%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-28 pt-4">
        <header className="mb-3 flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="text-[11px] font-light text-on-surface-variant">Tu cuenta</p>
            <h1 className="text-[17px] font-medium tracking-tight text-on-surface">Perfil</h1>
          </div>
          <SignOutButton compact />
        </header>

        <section
          className="mb-4 overflow-hidden rounded-[1.85rem] p-5 shadow-[0_14px_40px_rgba(43,52,55,0.12)] backdrop-blur-2xl"
          style={{
            backgroundImage:
              "linear-gradient(145deg, rgba(255,255,255,0.72) 0%, rgba(74,101,73,0.10) 55%, rgba(74,101,73,0.18) 100%)",
          }}
        >
          <div className="flex items-center gap-3.5">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-14 w-14 rounded-full object-cover shadow-sm ring-2 ring-white/60"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-lg font-medium text-on-primary-container shadow-sm ring-2 ring-white/60">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-light text-on-surface-variant">{familyLabel}</p>
              <h2 className="truncate text-xl font-light tracking-tight text-on-surface">
                {displayName}
              </h2>
              <p className="mt-0.5 truncate text-xs font-light text-on-surface-variant">
                {user.email}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-3 overflow-hidden rounded-[1.85rem] border border-white/45 bg-white/55 p-4 shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium tracking-tight text-on-surface">Familia</h3>
              {hasPartner ? (
                <p className="mt-1 text-sm font-light text-on-surface-variant">
                  Espacio compartido con {partnerDisplayName}
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm font-light text-on-surface-variant">
                    Código de invitación
                  </p>
                  <div className="mt-3 rounded-2xl border border-white/50 bg-white/60 px-4 py-3 backdrop-blur-md">
                    <p className="font-mono text-xl font-medium tracking-[0.2em] text-primary">
                      {inviteCode}
                    </p>
                  </div>

                  <details className="mt-3 group">
                    <summary className="list-none">
                      <span className="inline-flex cursor-pointer items-center rounded-full bg-surface-low/90 px-3.5 py-1.5 text-xs font-medium text-on-surface transition hover:bg-white/70">
                        Ingresar código
                      </span>
                    </summary>

                    <form action={joinFamily} className="mt-3 flex flex-col gap-2.5">
                      <input
                        name="inviteCode"
                        type="text"
                        inputMode="text"
                        maxLength={6}
                        placeholder="Código de 6 caracteres"
                        className="w-full rounded-2xl border border-outline-variant/30 bg-white/70 px-4 py-3 text-center font-mono text-on-surface uppercase outline-none backdrop-blur-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                        required
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-[0_8px_18px_rgba(43,52,55,0.16)] transition hover:brightness-110"
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
          <div className="mb-3">
            <FamilySettings
              familyId={family.id}
              initialModel={currentFinancialModel}
              initialSplitPct={currentSplitPct}
              isUserOne={isUserOne}
            />
          </div>
        ) : null}

        <section className="mb-4 overflow-hidden rounded-[1.85rem] border border-white/45 bg-white/55 shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
          <div className="px-4 pt-3.5 pb-1">
            <p className="text-[11px] font-light text-on-surface-variant">Preferencias</p>
          </div>

          <div className="divide-y divide-outline-variant/15">
            <ThemeToggleRow />
            <CurrencySelectRow />
            <Link
              href="/fixed-expenses"
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-primary shadow-sm">
                  <Wallet size={16} />
                </div>
                <span className="text-sm font-medium text-on-surface">Gastos fijos</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-light text-on-surface-variant">
                <span>Abrir</span>
                <ChevronRight size={14} />
              </div>
            </Link>
            <Link
              href="/categories"
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-primary shadow-sm">
                  <Coins size={16} />
                </div>
                <span className="text-sm font-medium text-on-surface">Categorías</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-light text-on-surface-variant">
                <span>Administrar</span>
                <ChevronRight size={14} />
              </div>
            </Link>
            {preferences.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-primary shadow-sm">
                    <Icon size={16} />
                  </div>
                  <span className="text-sm font-medium text-on-surface">{label}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-light text-on-surface-variant">
                  <span>{value}</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
