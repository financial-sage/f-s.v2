"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Copy, LoaderCircle, Sparkles, UserRound, Users } from "lucide-react";
import { createSoloFamilyAction, getCurrentFamilyState, joinFamilyAction } from "@/app/actions/family";

type OnboardingStep = "choose" | "solo_success" | "join_input";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("choose");
  const [userId, setUserId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const state = await getCurrentFamilyState();

        if (!isMounted) {
          return;
        }

        if (!state.userId) {
          router.replace("/login");
          return;
        }

        if (state.familyId) {
          router.replace("/");
          return;
        }

        setUserId(state.userId);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el onboarding.");
        }
      } finally {
        if (isMounted) {
          setIsBooting(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [router]);

  function handleStartSolo() {
    if (!userId) {
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const result = await createSoloFamilyAction(userId);
        setGeneratedCode(result.code);
        setStep("solo_success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear tu espacio.");
      }
    });
  }

  function handleJoinFamily() {
    if (!userId) {
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        await joinFamilyAction(userId, inviteCode);
        router.push("/");
        router.refresh();
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

  if (isBooting) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-sm">
          Cargando onboarding...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md rounded-4xl bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="mb-4 inline-flex rounded-full bg-sage/10 p-2 text-sage">
            <Sparkles size={18} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            ¿Cómo usarás la app?
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Elige la forma que mejor se adapte a tu momento.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === "choose" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleStartSolo}
              disabled={isPending}
              className="flex w-full items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-sage/40 hover:bg-sage/5 disabled:opacity-60"
            >
              <div className="rounded-2xl bg-white p-2 text-slate-700 shadow-sm">
                <UserRound size={20} />
              </div>
              <div>
                <div className="text-base font-bold text-slate-800">Cuenta Individual</div>
                <div className="mt-1 text-sm text-slate-500">
                  Crea tu espacio y obtén un código para invitar después.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setStep("join_input");
              }}
              disabled={isPending}
              className="flex w-full items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-sage/40 hover:bg-sage/5 disabled:opacity-60"
            >
              <div className="rounded-2xl bg-white p-2 text-slate-700 shadow-sm">
                <Users size={20} />
              </div>
              <div>
                <div className="text-base font-bold text-slate-800">Unirme a mi pareja</div>
                <div className="mt-1 text-sm text-slate-500">
                  Usa un código de 6 caracteres para unirte a su espacio.
                </div>
              </div>
            </button>

            {isPending && (
              <div className="flex items-center justify-center gap-2 pt-2 text-sm text-slate-500">
                <LoaderCircle size={16} className="animate-spin" />
                Procesando...
              </div>
            )}
          </div>
        )}

        {step === "join_input" && (
          <div className="space-y-4">
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-center font-mono text-2xl tracking-[0.35em] text-slate-800 uppercase outline-none focus:border-sage"
            />

            <button
              type="button"
              onClick={handleJoinFamily}
              disabled={isPending || inviteCode.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-4 text-base font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && <LoaderCircle size={16} className="animate-spin" />}
              Validar y Unirme
            </button>

            <button
              type="button"
              onClick={() => setStep("choose")}
              className="w-full text-sm font-medium text-slate-500"
            >
              Volver
            </button>
          </div>
        )}

        {step === "solo_success" && (
          <div className="space-y-4 text-center">
            <div className="rounded-3xl bg-sage/8 px-4 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Tu código de invitación
              </p>
              <p className="mt-3 font-mono text-4xl font-extrabold tracking-[0.28em] text-slate-800">
                {generatedCode}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-4 font-semibold text-slate-700"
            >
              <Copy size={16} />
              {copied ? "Copiado" : "Copiar"}
            </button>

            <button
              type="button"
              onClick={() => {
                router.push("/");
                router.refresh();
              }}
              className="w-full rounded-full bg-primary px-4 py-4 font-bold text-white"
            >
              Ir al Dashboard
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-slate-500 hover:text-primary">
            Salir por ahora
          </Link>
        </div>
      </div>
    </div>
  );
}
