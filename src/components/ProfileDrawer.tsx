"use client";

import { BellRing, ChevronRight, CircleHelp, Coins, ShieldCheck, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { joinFamilyWithCode } from "@/app/actions/family";
import FamilySettings from "@/components/FamilySettings";
import SignOutButton from "@/components/SignOutButton";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggleRow } from "@/components/ThemeToggleRow";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DrawerProfileState {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  familyId: string | null;
  inviteCode: string;
  financialModel: string;
  user1SplitPct: number;
  isUserOne: boolean;
  partnerDisplayName: string;
  hasPartner: boolean;
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

export default function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profileState, setProfileState] = useState<DrawerProfileState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [joinError, setJoinError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    async function loadProfileState() {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || isCancelled) {
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "full_name, avatar_url, family_id, family:families!profiles_family_id_fkey(id, invite_code, user_1_id, user_2_id, financial_model, user_1_split_pct)"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (isCancelled) {
        return;
      }

      const family = Array.isArray(profile?.family) ? profile.family[0] : profile?.family;
      const partnerId = family?.user_1_id === user.id ? family?.user_2_id : family?.user_1_id ?? null;

      const { data: partnerProfile } = partnerId
        ? await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", partnerId)
            .maybeSingle()
        : { data: null };

      if (isCancelled) {
        return;
      }

      setProfileState({
        displayName: profile?.full_name?.trim() || user.email?.split("@")[0] || "Usuario",
        email: user.email ?? "",
        avatarUrl: profile?.avatar_url ?? null,
        familyId: family?.id ?? null,
        inviteCode: family?.invite_code ?? "------",
        financialModel: family?.financial_model ?? "joint_fund",
        user1SplitPct: Number(family?.user_1_split_pct ?? 50),
        isUserOne: family?.user_1_id === user.id,
        partnerDisplayName: getFirstName(partnerProfile?.full_name),
        hasPartner: Boolean(partnerId),
      });

      setIsLoading(false);
    }

    void loadProfileState();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, supabase]);

  async function handleJoinFamily(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setJoinMessage("");
    setJoinError(false);

    try {
      await joinFamilyWithCode(inviteCode);
      setJoinMessage("Te uniste correctamente a la familia.");
      setInviteCode("");
      setShowJoinForm(false);
      router.refresh();
    } catch (error) {
      setJoinMessage(error instanceof Error ? error.message : "No se pudo unir a la familia.");
      setJoinError(true);
    }
  }

  const preferences = [
    { icon: BellRing, label: "Notificaciones", value: "Activadas" },
    { icon: Coins, label: "Moneda", value: "MXN ($)" },
    { icon: CircleHelp, label: "Soporte", value: "Disponible" },
    { icon: ShieldCheck, label: "Privacidad", value: "Protegida" },
  ];

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-110 bg-on-surface/95/35 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-120 w-screen max-w-none bg-surface shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto bg-surface px-4 py-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
              Perfil
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-surface-low p-2 text-on-surface-variant transition hover:bg-surface-container"
            >
              <X size={18} />
            </button>
          </div>

          {isLoading || !profileState ? (
            <div className="rounded-3xl bg-surface-lowest p-6 text-sm text-on-surface-variant shadow-sm">
              Cargando ajustes...
            </div>
          ) : (
            <div className="space-y-5">
              <section className="px-2 pt-1 text-center">
                <div className="flex flex-col items-center text-center">
                  {profileState.avatarUrl ? (
                    <img
                      src={profileState.avatarUrl}
                      alt={profileState.displayName}
                      className="h-20 w-20 rounded-full object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-on-primary shadow-sm">
                      {getInitials(profileState.displayName)}
                    </div>
                  )}

                  <h2 className="mt-3 text-xl font-extrabold tracking-tight text-on-surface">
                    {profileState.displayName}
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">{profileState.email}</p>
                </div>
              </section>

              <section className="rounded-3xl bg-surface-lowest p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Users size={18} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-on-surface">Familia</h3>
                    {profileState.hasPartner ? (
                      <p className="mt-1 text-sm text-on-surface-variant">
                        Espacio compartido con {profileState.partnerDisplayName}
                      </p>
                    ) : (
                      <>
                        <p className="mt-1 text-sm text-on-surface-variant">Código de invitación</p>
                        <div className="mt-3 rounded-2xl bg-primary/8 px-4 py-3">
                          <p className="font-mono text-lg font-extrabold tracking-[0.2em] text-primary">
                            {profileState.inviteCode}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowJoinForm((prev) => !prev)}
                          className="mt-3 inline-flex items-center rounded-full bg-surface-low px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-surface-container"
                        >
                          Ingresar código
                        </button>

                        {showJoinForm ? (
                          <form onSubmit={handleJoinFamily} className="mt-3 flex flex-col gap-3">
                            <input
                              value={inviteCode}
                              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                              type="text"
                              inputMode="text"
                              maxLength={6}
                              placeholder="Código de 6 caracteres"
                              className="w-full rounded-2xl border border-outline-variant/30 bg-surface px-4 py-3 text-center font-mono text-on-surface uppercase outline-none focus:border-sage"
                              required
                            />
                            <button
                              type="submit"
                              className="rounded-full bg-primary px-5 py-3 font-semibold text-on-primary transition hover:brightness-110"
                            >
                              Unirse
                            </button>
                          </form>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </section>

              {profileState.familyId ? (
                <FamilySettings
                  familyId={profileState.familyId}
                  initialModel={profileState.financialModel}
                  initialSplitPct={profileState.user1SplitPct}
                  isUserOne={profileState.isUserOne}
                />
              ) : null}

              <section className="overflow-hidden rounded-3xl bg-surface-lowest shadow-sm">
                <div className="px-4 pt-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
                    Preferencias
                  </p>
                </div>

                <div className="divide-y divide-outline-variant/20">
                  <ThemeToggleRow />
                  {preferences.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3">
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
                </div>
              </section>

              {joinMessage ? (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    joinError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {joinMessage}
                </div>
              ) : null}

              <div className="sticky bottom-0 bg-surface pt-3">
                <SignOutButton subtle />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body
  );
}
