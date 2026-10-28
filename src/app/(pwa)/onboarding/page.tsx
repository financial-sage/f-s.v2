"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Copy,
  Heart,
  LoaderCircle,
  Moon,
  Monitor,
  Sparkles,
  Sun,
  UserRound,
  Users,
  Wallet,
  Landmark,
} from "lucide-react";
import {
  createSoloFamilyAction,
  getCurrentFamilyState,
  joinFamilyAction,
} from "@/app/actions/family";
import { createAccountAction, listFamilyAccountsAction } from "@/app/actions/accounts";
import { createFundAction, listFamilyFundsAction } from "@/app/actions/funds";
import { useExpenseStore } from "@/store/useExpenseStore";
import {
  CURRENCY_OPTIONS,
  type AppCurrency,
  readStoredCurrency,
  writeStoredCurrency,
} from "@/lib/currency";
import {
  applyThemeClass,
  persistThemeMode,
  readStoredThemeMode,
  resolveIsDark,
  type ThemeMode,
} from "@/lib/theme";
import { FUND_COLOR_OPTIONS, getPersonalFund, type FundColor } from "@/lib/funds";
import {
  ensureFirstRunForUser,
  markSetupCompleted,
  patchFirstRun,
} from "@/lib/firstRun";

type WizardStep =
  | "welcome"
  | "mode"
  | "couple_talk"
  | "couple_choice"
  | "join_input"
  | "invite_code"
  | "setup_theme"
  | "setup_currency"
  | "setup_account"
  | "setup_fund";

type UseMode = "individual" | "couple";

/** Primary CTA — same shape as gastos Guardar, gold brand gradient. */
const CTA_CLASS =
  "fab-gold flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
const BACK_CLASS =
  "w-full py-2.5 text-[13px] font-light text-on-surface-variant/80 transition-colors hover:text-on-surface";
const CHOICE_CLASS =
  "flex w-full items-start gap-3 rounded-2xl border-[0.5px] border-outline-variant/20 bg-transparent px-4 py-4 text-left transition-colors hover:border-[#c4a574]/35 disabled:opacity-60";
const CHOICE_ACTIVE =
  "border-[#c4a574]/50 bg-[color-mix(in_srgb,#c4a574_12%,transparent)]";
const FIELD_CLASS =
  "mt-1.5 w-full rounded-2xl border-[0.5px] border-outline-variant/25 bg-transparent px-4 py-3.5 text-[15px] font-light tracking-tight text-on-surface outline-none placeholder:text-outline-variant/45 focus:border-[#c4a574]/45";

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>("welcome");
  const [userId, setUserId] = useState("");
  const [mode, setMode] = useState<UseMode>("individual");
  const [inviteCode, setInviteCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [currency, setCurrency] = useState<AppCurrency>("EUR");
  const [accountName, setAccountName] = useState("Efectivo");
  const [fundChoice, setFundChoice] = useState<"use_default" | "create">("use_default");
  const [fundName, setFundName] = useState("");
  const [fundColor, setFundColor] = useState<FundColor>(
    FUND_COLOR_OPTIONS[0].value as FundColor
  );
  const [hasDefaultPersonalFund, setHasDefaultPersonalFund] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const forceSetup =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("step") === "setup";

        const state = await getCurrentFamilyState();
        if (!isMounted) return;

        if (!state.userId) {
          router.replace("/login");
          return;
        }

        setUserId(state.userId);
        setThemeMode(readStoredThemeMode());
        setCurrency(readStoredCurrency());

        const firstRun = ensureFirstRunForUser(state.userId, {
          hasFamily: Boolean(state.familyId),
        });

        if (state.familyId) {
          // Already in a household (cloned prod, rejoined, etc.): go home.
          // Never keep ?step=setup bouncing with FirstRunGate.
          markSetupCompleted(
            state.userId,
            firstRun.mode ??
              (state.familyMemberCount >= 2 ? "couple" : "individual")
          );
          router.replace("/");
          return;
        }

        if (forceSetup) {
          setStep("welcome");
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el onboarding.");
        }
      } finally {
        if (isMounted) setIsBooting(false);
      }
    }

    void bootstrap();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const progressLabel = useMemo(() => {
    const map: Record<WizardStep, string> = {
      welcome: "Bienvenida",
      mode: "Tu espacio",
      couple_talk: "En pareja",
      couple_choice: "Empezar",
      join_input: "Código",
      invite_code: "Invitar",
      setup_theme: "Tema",
      setup_currency: "Moneda",
      setup_account: "Cuenta",
      setup_fund: "Bolsillo",
    };
    return map[step];
  }, [step]);

  function goSetup() {
    setError("");
    setStep("setup_theme");
  }

  function applyTheme(next: ThemeMode) {
    setThemeMode(next);
    persistThemeMode(next);
    applyThemeClass(resolveIsDark(next));
  }

  function handleCreateSpace(nextMode: UseMode) {
    if (!userId) return;
    setError("");
    setMode(nextMode);
    patchFirstRun(userId, { mode: nextMode });

    startTransition(async () => {
      try {
        const result = await createSoloFamilyAction(userId);
        setGeneratedCode(result.code);
        await useExpenseStore.getState().fetchData();
        if (nextMode === "couple") {
          setStep("invite_code");
        } else {
          goSetup();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear tu espacio.");
      }
    });
  }

  function handleJoinFamily() {
    if (!userId) return;
    setError("");
    startTransition(async () => {
      try {
        await joinFamilyAction(userId, inviteCode);
        patchFirstRun(userId, { mode: "couple" });
        await useExpenseStore.getState().fetchData();
        goSetup();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo completar la unión.");
      }
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("No se pudo copiar el código.");
    }
  }

  function finishSetup() {
    if (!userId) return;
    setError("");
    startTransition(async () => {
      try {
        writeStoredCurrency(currency);
        persistThemeMode(themeMode);
        applyThemeClass(resolveIsDark(themeMode));

        const accounts = await listFamilyAccountsAction();
        const personalAccounts = accounts.filter(
          (a) => a.scope === "personal" && a.owner_profile_id === userId
        );
        const name = accountName.trim() || "Efectivo";
        if (personalAccounts.length === 0) {
          await createAccountAction({
            name,
            scope: "personal",
            visibility: "private",
          });
        } else if (
          name &&
          name.toLowerCase() !== "efectivo" &&
          !personalAccounts.some((a) => a.name.trim().toLowerCase() === name.toLowerCase())
        ) {
          await createAccountAction({
            name,
            scope: "personal",
            visibility: "private",
          });
        }

        if (fundChoice === "create") {
          const fn = fundName.trim();
          if (!fn) {
            setError("Escribe un nombre para el bolsillo.");
            return;
          }
          await createFundAction({
            name: fn,
            scope: mode === "couple" ? "shared" : "personal",
            color: fundColor,
            isDefault: false,
          });
        }

        markSetupCompleted(userId, mode);
        router.refresh();
        await useExpenseStore.getState().fetchData();
        router.push("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar la configuración.");
      }
    });
  }

  if (isBooting) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page-gradient px-4">
        <div className="rounded-2xl border-[0.5px] border-outline-variant/20 bg-surface-lowest/80 px-6 py-5 text-[13px] font-light text-on-surface-variant backdrop-blur-md">
          Preparando tu espacio…
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-page-gradient px-4 py-6">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-page-glow" />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-md min-h-0 flex-col">
        <div className="mb-5 flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5">
            <img
              src="/icons/v3/apple-touch-icon.png"
              alt=""
              className="h-9 w-9 rounded-[0.7rem] shadow-sm"
            />
            <div>
              <p className="text-[11px] font-light tracking-wide text-on-surface-variant">
                SinDescuadre
              </p>
              <p className="text-[13px] font-light text-on-surface">{progressLabel}</p>
            </div>
          </div>
          <span className="rounded-full border-[0.5px] border-[#c4a574]/35 bg-[color-mix(in_srgb,#c4a574_12%,transparent)] px-2.5 py-1 text-[10px] font-light uppercase tracking-[0.14em] text-[#a8895a]">
            Primeros pasos
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.85rem] border-[0.5px] border-outline-variant/20 bg-surface-lowest/85 shadow-[var(--glass-shadow)] backdrop-blur-2xl">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-7 sm:py-7">
          {error ? (
            <div className="alert-error mb-4 rounded-2xl px-4 py-3 text-[13px] font-light">{error}</div>
          ) : null}

          {step === "welcome" && (
            <div className="space-y-5">
              <div className="inline-flex rounded-full border-[0.5px] border-[#c4a574]/30 bg-[color-mix(in_srgb,#c4a574_12%,transparent)] p-2 text-[#c4a574]">
                <Sparkles size={16} strokeWidth={1.75} />
              </div>
              <h1 className="text-[1.7rem] font-light leading-tight tracking-tight text-on-surface">
                Bienvenido a SinDescuadre
              </h1>
              <p className="text-[13px] font-light leading-relaxed text-on-surface-variant">
                Aquí el dinero se mira con calma: qué entra, qué sale y hacia dónde va. Sin
                tablas interminables ni pelearte con la app. Puedes usarlo solo o en pareja;
                tú eliges el ritmo.
              </p>

              <div className="space-y-2.5">
                <div className="rounded-2xl border-[0.5px] border-outline-variant/20 px-4 py-3.5">
                  <div className="mb-1.5 flex items-center gap-2 text-on-surface">
                    <span className="icon-chip-coin flex h-7 w-7 items-center justify-center rounded-xl border">
                      <UserRound size={14} strokeWidth={1.75} />
                    </span>
                    <p className="text-[13px] font-medium">Si lo usas individual</p>
                  </div>
                  <p className="text-[13px] font-light leading-relaxed text-on-surface-variant">
                    Es tu espacio personal. La cuenta es el banco; los bolsillos organizan el
                    gasto del mes (ocio, casa, viajes…); el ahorro es lo que apartas y no
                    tocas. Ves en un vistazo cuánto te queda, a tu ritmo.
                  </p>
                </div>

                <div className="rounded-2xl border-[0.5px] border-outline-variant/20 px-4 py-3.5">
                  <div className="mb-1.5 flex items-center gap-2 text-on-surface">
                    <span className="icon-chip-coin flex h-7 w-7 items-center justify-center rounded-xl border">
                      <Users size={14} strokeWidth={1.75} />
                    </span>
                    <p className="text-[13px] font-medium">Si lo usan en pareja</p>
                  </div>
                  <p className="text-[13px] font-light leading-relaxed text-on-surface-variant">
                    Comparten la misma foto del dinero: lo común, lo de cada uno y lo que
                    aún no está saldado. No se trata de controlar al otro, sino de ver lo
                    mismo y hablar con más honestidad. Menos “¿en qué nos gastamos eso?” y
                    más acuerdos tranquilos al final del mes.
                  </p>
                </div>
              </div>

              <p className="text-[13px] font-light leading-relaxed text-on-surface-variant">
                En el siguiente paso eliges cómo empezar. Si más adelante quieres pasar de
                individual a pareja, podrás invitar con un código.
              </p>

              <button type="button" className={CTA_CLASS} onClick={() => setStep("mode")}>
                Empezar
              </button>
            </div>
          )}

          {step === "mode" && (
            <div className="space-y-4">
              <h1 className="text-[1.55rem] font-light tracking-tight text-on-surface">
                ¿Cómo usarás SinDescuadre?
              </h1>
              <p className="text-[13px] font-light text-on-surface-variant">
                Elige el ritmo que encaja contigo ahora. Más adelante puedes invitar a alguien.
              </p>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleCreateSpace("individual")}
                className={CHOICE_CLASS}
              >
                <span className="icon-chip-coin mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border">
                  <UserRound size={18} strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-on-surface">Individual</span>
                  <span className="mt-1 block text-[13px] font-light text-on-surface-variant">
                    Tu espacio personal para ordenar ingresos, gastos y ahorros a tu ritmo.
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setMode("couple");
                  patchFirstRun(userId, { mode: "couple" });
                  setStep("couple_talk");
                }}
                className={CHOICE_CLASS}
              >
                <span className="icon-chip-coin mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border">
                  <Users size={18} strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-on-surface">Pareja</span>
                  <span className="mt-1 block text-[13px] font-light text-on-surface-variant">
                    Comparten la misma foto del dinero: lo común, lo personal y las conversaciones
                    difíciles con más calma.
                  </span>
                </span>
              </button>
              <button type="button" onClick={() => setStep("welcome")} className={BACK_CLASS}>
                Volver
              </button>
              {isPending ? (
                <div className="flex items-center justify-center gap-2 text-[13px] font-light text-on-surface-variant">
                  <LoaderCircle size={15} className="animate-spin text-[#c4a574]" />
                  Creando tu espacio…
                </div>
              ) : null}
            </div>
          )}

          {step === "couple_talk" && (
            <div className="space-y-5">
              <div className="inline-flex rounded-full border-[0.5px] border-[#c4a574]/30 bg-[color-mix(in_srgb,#c4a574_12%,transparent)] p-2 text-[#c4a574]">
                <Heart size={16} strokeWidth={1.75} />
              </div>
              <h1 className="text-[1.55rem] font-light tracking-tight text-on-surface">
                El dinero en pareja pide honestidad
              </h1>
              <div className="space-y-3 text-[13px] font-light leading-relaxed text-on-surface-variant">
                <p>
                  No se trata de controlar al otro. Se trata de ver lo mismo: qué entra, qué se
                  reparte y qué queda para cada uno.
                </p>
                <p>
                  En SinDescuadre pueden tener lo compartido y también un rincón personal. La
                  confianza crece cuando no hay sorpresas al final del mes.
                </p>
              </div>
              <button
                type="button"
                className={CTA_CLASS}
                onClick={() => setStep("couple_choice")}
              >
                Continuar
              </button>
              <button type="button" onClick={() => setStep("mode")} className={BACK_CLASS}>
                Volver
              </button>
            </div>
          )}

          {step === "couple_choice" && (
            <div className="space-y-4">
              <h1 className="text-[1.55rem] font-light tracking-tight text-on-surface">
                ¿Cómo empiezan?
              </h1>
              <p className="text-[13px] font-light text-on-surface-variant">
                Si tu pareja ya creó el espacio, únete con su código. Si no, créalo tú e
                invita.
              </p>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setStep("join_input")}
                className={CHOICE_CLASS}
              >
                <span className="icon-chip-coin mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border">
                  <Users size={18} strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-on-surface">Tengo un código</span>
                  <span className="mt-1 block text-[13px] font-light text-on-surface-variant">
                    Me invitaron y quiero unirme a su espacio.
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleCreateSpace("couple")}
                className={CHOICE_CLASS}
              >
                <span className="icon-chip-coin mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border">
                  <Sparkles size={18} strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-on-surface">
                    Crear nuestra familia
                  </span>
                  <span className="mt-1 block text-[13px] font-light text-on-surface-variant">
                    Genero un código para que mi pareja se una.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStep("couple_talk")}
                className={BACK_CLASS}
              >
                Volver
              </button>
              {isPending ? (
                <div className="flex items-center justify-center gap-2 text-[13px] font-light text-on-surface-variant">
                  <LoaderCircle size={15} className="animate-spin text-[#c4a574]" />
                  Creando…
                </div>
              ) : null}
            </div>
          )}

          {step === "join_input" && (
            <div className="space-y-4">
              <h1 className="text-[1.55rem] font-light tracking-tight text-on-surface">
                Código de invitación
              </h1>
              <p className="text-[13px] font-light text-on-surface-variant">
                Son 6 caracteres. Pídeselos a tu pareja.
              </p>
              <input
                value={inviteCode}
                onChange={(e) =>
                  setInviteCode(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
                  )
                }
                placeholder="ABC123"
                maxLength={6}
                className="w-full rounded-2xl border-[0.5px] border-outline-variant/25 bg-transparent px-4 py-4 text-center font-mono text-2xl font-light tracking-[0.35em] text-on-surface uppercase outline-none placeholder:text-outline-variant/40 focus:border-[#c4a574]/45"
              />
              <button
                type="button"
                className={CTA_CLASS}
                disabled={isPending || inviteCode.length !== 6}
                onClick={handleJoinFamily}
              >
                {isPending ? <LoaderCircle size={16} className="animate-spin" /> : null}
                Unirme
              </button>
              <button
                type="button"
                onClick={() => setStep("couple_choice")}
                className={BACK_CLASS}
              >
                Volver
              </button>
            </div>
          )}

          {step === "invite_code" && (
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-[1.55rem] font-light tracking-tight text-on-surface">
                  Invita a tu pareja
                </h1>
                <p className="mt-2 text-[13px] font-light text-on-surface-variant">
                  Comparte este código de 6 caracteres para que se una a su espacio.
                </p>
              </div>
              <div className="rounded-2xl border-[0.5px] border-[#c4a574]/30 bg-[color-mix(in_srgb,#c4a574_10%,transparent)] px-4 py-5 text-center">
                <p className="text-[10px] font-light uppercase tracking-[0.22em] text-on-surface-variant">
                  Tu código
                </p>
                <p className="mt-3 font-mono text-3xl font-light tracking-[0.28em] text-on-surface">
                  {generatedCode}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-[0.5px] border-outline-variant/25 bg-transparent text-[13px] font-medium text-on-surface transition-colors hover:border-[#c4a574]/40"
              >
                <Copy size={15} strokeWidth={1.75} />
                {copied ? "Copiado" : "Copiar código"}
              </button>

              <div className="rounded-2xl border-[0.5px] border-outline-variant/20 px-4 py-3.5 text-left">
                <p className="text-[13px] font-medium text-on-surface">
                  Mientras tanto verás el modo individual
                </p>
                <p className="mt-1.5 text-[13px] font-light leading-relaxed text-on-surface-variant">
                  Es normal: hasta que tu pareja introduzca el código y se una, SinDescuadre
                  te muestra el perfil y el dashboard en modo individual. En cuanto se una,
                  el espacio pasará automáticamente a modo pareja y verán el mismo dinero
                  juntos.
                </p>
              </div>

              <button type="button" className={CTA_CLASS} onClick={goSetup}>
                Continuar a la configuración
              </button>
            </div>
          )}

          {step === "setup_theme" && (
            <div className="space-y-4">
              <h1 className="text-[1.55rem] font-light tracking-tight text-on-surface">
                Elige el aspecto
              </h1>
              <p className="text-[13px] font-light text-on-surface-variant">
                Puedes cambiarlo después en tu perfil.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "light" as const, label: "Claro", icon: Sun },
                    { id: "dark" as const, label: "Oscuro", icon: Moon },
                    { id: "system" as const, label: "Sistema", icon: Monitor },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => applyTheme(id)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-[0.5px] px-2 py-4 text-[13px] font-light transition-colors ${
                      themeMode === id
                        ? CHOICE_ACTIVE + " text-on-surface"
                        : "border-outline-variant/20 text-on-surface-variant hover:border-[#c4a574]/35"
                    }`}
                  >
                    <Icon size={17} strokeWidth={1.75} />
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={CTA_CLASS}
                onClick={() => setStep("setup_currency")}
              >
                Continuar
              </button>
            </div>
          )}

          {step === "setup_currency" && (
            <div className="space-y-4">
              <h1 className="text-[1.55rem] font-light tracking-tight text-on-surface">
                ¿En qué moneda cuentas?
              </h1>
              <p className="text-[13px] font-light text-on-surface-variant">
                Solo cambia cómo se muestran los importes.
              </p>
              <div className="space-y-2">
                {CURRENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setCurrency(opt.code)}
                    className={`flex w-full items-center justify-between rounded-2xl border-[0.5px] px-4 py-3.5 text-left transition-colors ${
                      currency === opt.code
                        ? CHOICE_ACTIVE
                        : "border-outline-variant/20 hover:border-[#c4a574]/35"
                    }`}
                  >
                    <span className="text-[14px] font-medium text-on-surface">{opt.label}</span>
                    <span className="text-[13px] font-light text-on-surface-variant">
                      {opt.code} · {opt.symbol}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={CTA_CLASS}
                onClick={() => setStep("setup_account")}
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={() => setStep("setup_theme")}
                className={BACK_CLASS}
              >
                Volver
              </button>
            </div>
          )}

          {step === "setup_account" && (
            <div className="space-y-4">
              <div className="inline-flex rounded-full border-[0.5px] border-[#c4a574]/30 bg-[color-mix(in_srgb,#c4a574_12%,transparent)] p-2 text-[#c4a574]">
                <Landmark size={16} strokeWidth={1.75} />
              </div>
              <h1 className="text-[1.55rem] font-light tracking-tight text-on-surface">
                Tu primera cuenta
              </h1>
              <p className="text-[13px] font-light leading-relaxed text-on-surface-variant">
                La cuenta es el banco: dónde vive el dinero. Empezamos con efectivo; luego
                puedes añadir la nómina u otra cuenta. Después lo organizas en bolsillos y
                ahorro.
              </p>
              <label className="block text-[11px] font-light text-on-surface-variant">
                Nombre
                <input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value.slice(0, 40))}
                  className={FIELD_CLASS}
                  placeholder="Efectivo"
                />
              </label>
              <button
                type="button"
                className={CTA_CLASS}
                onClick={() => setStep("setup_fund")}
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={() => setStep("setup_currency")}
                className={BACK_CLASS}
              >
                Volver
              </button>
            </div>
          )}

          {step === "setup_fund" && (
            <div className="space-y-4">
              <div className="inline-flex rounded-full border-[0.5px] border-[#c4a574]/30 bg-[color-mix(in_srgb,#c4a574_12%,transparent)] p-2 text-[#c4a574]">
                <Wallet size={16} strokeWidth={1.75} />
              </div>
              <h1 className="text-[1.55rem] font-light tracking-tight text-on-surface">
                Tu bolsillo de gasto
              </h1>
              <p className="text-[13px] font-light leading-relaxed text-on-surface-variant">
                {mode === "couple"
                  ? "El bolsillo es para gastar el mes: no es el banco ni el ahorro. Pueden usar el común o crear uno con nombre (gasolina, casa…)."
                  : "El bolsillo es para gastar el mes: no es el banco ni el ahorro. Usa tu bolsillo personal o crea uno con nombre para un gasto concreto."}
              </p>

              {hasDefaultPersonalFund || mode === "couple" ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setFundChoice("use_default")}
                    className={`w-full rounded-2xl border-[0.5px] px-4 py-3.5 text-left transition-colors ${
                      fundChoice === "use_default"
                        ? CHOICE_ACTIVE
                        : "border-outline-variant/20 hover:border-[#c4a574]/35"
                    }`}
                  >
                    <span className="block text-[14px] font-medium text-on-surface">
                      {mode === "couple" ? "Usar el bolsillo común" : "Usar Mi bolsillo"}
                    </span>
                    <span className="mt-0.5 block text-[12px] font-light text-on-surface-variant">
                      Ya está listo; puedes crear más después.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFundChoice("create")}
                    className={`w-full rounded-2xl border-[0.5px] px-4 py-3.5 text-left transition-colors ${
                      fundChoice === "create"
                        ? CHOICE_ACTIVE
                        : "border-outline-variant/20 hover:border-[#c4a574]/35"
                    }`}
                  >
                    <span className="block text-[14px] font-medium text-on-surface">
                      Crear otro bolsillo
                    </span>
                    <span className="mt-0.5 block text-[12px] font-light text-on-surface-variant">
                      Dale un nombre y un color.
                    </span>
                  </button>
                </div>
              ) : null}

              {fundChoice === "create" || !hasDefaultPersonalFund ? (
                <div className="space-y-3">
                  <label className="block text-[11px] font-light text-on-surface-variant">
                    Nombre del bolsillo
                    <input
                      value={fundName}
                      onChange={(e) => setFundName(e.target.value.slice(0, 40))}
                      className={FIELD_CLASS}
                      placeholder={mode === "couple" ? "Casa, viajes…" : "Restaurantes, ocio…"}
                    />
                  </label>
                  <div className="overflow-hidden rounded-lg border border-glass-border">
                    <div className="grid grid-cols-8 gap-px bg-outline-variant/25">
                      {FUND_COLOR_OPTIONS.map((opt) => {
                        const selected = fundColor === opt.value;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFundColor(opt.value)}
                            className="relative h-6 w-full"
                            style={{ backgroundColor: opt.value }}
                            aria-label={opt.label}
                            aria-pressed={selected}
                          >
                            {selected ? (
                              <span
                                className="absolute inset-0 ring-2 ring-inset ring-white/95"
                                aria-hidden
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                className={CTA_CLASS}
                disabled={isPending}
                onClick={finishSetup}
              >
                {isPending ? <LoaderCircle size={16} className="animate-spin" /> : null}
                Entrar a SinDescuadre
              </button>
              <button
                type="button"
                onClick={() => setStep("setup_account")}
                className={BACK_CLASS}
              >
                Volver
              </button>
            </div>
          )}
          </div>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/login"
            className="text-[13px] font-light text-on-surface-variant transition-colors hover:text-[#c4a574]"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
