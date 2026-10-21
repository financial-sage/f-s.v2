import { revalidatePath } from "next/cache";
import { ChevronRight, CircleHelp, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CurrencySelectRow } from "@/components/CurrencySelectRow";
import ProfileAvatarEditor from "@/components/ProfileAvatarEditor";
import SharedSpaceCard from "@/components/SharedSpaceCard";
import SignOutButton from "@/components/SignOutButton";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import { ThemeToggleRow } from "@/components/ThemeToggleRow";
import ActivatePremiumRow from "@/components/ActivatePremiumRow";
import { sageGlassGradient } from "@/lib/glass";
import { getHouseholdEntitlement } from "@/lib/premiumServer";
import {
  householdSpaceTitle,
  memberCountFromFamilyUsers,
  partnerLabel,
} from "@/lib/household";
import { requireRequestUser } from "@/lib/request-context";
import { perfLog, perfNow } from "@/lib/perf";

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
  const start = perfNow();
  const supabase = await createClient();
  const user = await requireRequestUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, avatar_url, family_id, family:families!profiles_family_id_fkey(id, invite_code, name, user_1_id, user_2_id)"
    )
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name?.trim() || user.email?.split("@")[0] || "Usuario";
  const initials = getInitials(displayName);
  const family = Array.isArray(profile?.family) ? profile.family[0] : profile?.family;
  const inviteCode = family?.invite_code ?? "------";
  const partnerId = family?.user_1_id === user.id ? family?.user_2_id : family?.user_1_id ?? null;

  const [partnerProfileResult, partnerEmail, entitlement] = await Promise.all([
    partnerId
      ? supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", partnerId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    partnerId
      ? (async () => {
          try {
            const admin = getSupabaseAdminClient();
            const { data: partnerAuth } = await admin.auth.admin.getUserById(partnerId);
            return partnerAuth.user?.email ?? null;
          } catch {
            return null;
          }
        })()
      : Promise.resolve(null),
    family?.id ? getHouseholdEntitlement(family.id) : Promise.resolve(null),
  ]);

  const partnerProfile = partnerProfileResult.data;

  const familyMemberCount = memberCountFromFamilyUsers(
    family?.user_1_id,
    family?.user_2_id
  );
  const partnerDisplayName =
    partnerLabel(familyMemberCount, partnerProfile?.full_name) ?? "Mi pareja";
  const hasPartner = Boolean(partnerId);
  const familyLabel = family?.name?.trim() || householdSpaceTitle(familyMemberCount || 1);
  const spaceTitle = householdSpaceTitle(familyMemberCount || 1);
  perfLog("ProfilePage", { ms: perfNow() - start });

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-page-gradient text-on-surface">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-page-glow" />

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
            backgroundImage: sageGlassGradient(),
          }}
        >
          <div className="flex items-center gap-3.5">
            <ProfileAvatarEditor
              userId={user.id}
              displayName={displayName}
              initials={initials}
              avatarUrl={profile?.avatar_url ?? null}
            />
            <div className="min-w-0">
              <p className="text-[11px] font-light text-on-surface-variant">{familyLabel}</p>
              <h2 className="truncate text-xl font-light tracking-tight text-on-surface">
                {displayName}
              </h2>
              <p className="mt-0.5 truncate text-xs font-light text-on-surface-variant">
                {user.email}
              </p>
              <p className="mt-1 text-[11px] font-light text-on-surface-variant/80">
                Toca la foto para cambiarla
              </p>
            </div>
          </div>
        </section>

        <SharedSpaceCard
          spaceTitle={spaceTitle}
          hasPartner={hasPartner}
          partnerDisplayName={partnerDisplayName}
          partner={
            partnerId
              ? {
                  id: partnerId,
                  fullName: partnerDisplayName,
                  email: partnerEmail,
                  avatarUrl: partnerProfile?.avatar_url ?? null,
                }
              : null
          }
          inviteCode={inviteCode}
          joinForm={
            <details className="mt-3 group">
              <summary className="list-none">
                <span className="inline-flex cursor-pointer items-center rounded-full bg-surface-low/90 px-3.5 py-1.5 text-xs font-medium text-on-surface transition hover:bg-glass-strong">
                  Unirme a otro espacio
                </span>
              </summary>

              <form action={joinFamily} className="mt-3 flex flex-col gap-2.5">
                <input
                  name="inviteCode"
                  type="text"
                  inputMode="text"
                  maxLength={6}
                  placeholder="Código de 6 caracteres"
                  className="w-full rounded-2xl border border-outline-variant/30 bg-glass-strong px-4 py-3 text-center font-mono text-on-surface uppercase outline-none backdrop-blur-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
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
          }
        />

        <section className="mb-4 overflow-hidden rounded-[1.85rem] border border-glass-border bg-glass shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
          <div className="px-4 pt-3.5 pb-1">
            <p className="text-[11px] font-light text-on-surface-variant">Preferencias</p>
          </div>

          <div className="divide-y divide-outline-variant/15">
            <ThemeToggleRow />
            <CurrencySelectRow />
            <ActivatePremiumRow
              inviteCode={family?.invite_code}
              isPremiumHousehold={Boolean(entitlement?.isPremiumHousehold)}
            />
            <Link
              href="/profile/support"
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-glass-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
                  <CircleHelp size={16} />
                </div>
                <span className="text-sm font-medium text-on-surface">Soporte</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-light text-on-surface-variant">
                <span>Ayuda</span>
                <ChevronRight size={14} />
              </div>
            </Link>
            <Link
              href="/profile/privacy"
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-glass-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
                  <ShieldCheck size={16} />
                </div>
                <span className="text-sm font-medium text-on-surface">Privacidad</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-light text-on-surface-variant">
                <span>Ver</span>
                <ChevronRight size={14} />
              </div>
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
