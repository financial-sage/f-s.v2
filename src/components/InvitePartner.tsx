"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle, Users } from "lucide-react";
import { joinFamilyWithCode } from "@/app/actions/family";

interface InvitePartnerProps {
  inviteCode: string;
}

export default function InvitePartner({ inviteCode }: InvitePartnerProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Users size={18} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Invita a tu pareja</h2>
          <p className="text-sm text-slate-500">Comparte tu código o únete con otro.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
          Tu código de invitación
        </p>
        <p className="font-mono text-3xl font-extrabold tracking-[0.3em] text-slate-800">
          {inviteCode}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setErrorMessage("");

          startTransition(async () => {
            try {
              await joinFamilyWithCode(code);
              setCode("");
              router.push("/");
              router.refresh();
            } catch (error) {
              setErrorMessage(
                error instanceof Error ? error.message : "No se pudo unir a la familia."
              );
            }
          });
        }}
        className="space-y-3"
      >
        <input
          type="text"
          inputMode="text"
          maxLength={6}
          value={code}
          onChange={(e) =>
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
          }
          placeholder="Código de 6 caracteres"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-lg tracking-[0.25em] text-slate-800 uppercase outline-none focus:border-sage"
        />

        {errorMessage && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-sage px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending && <LoaderCircle size={18} className="animate-spin" />}
          {isPending ? "Uniendo..." : "Unirse usando el código"}
        </button>
      </form>
    </section>
  );
}
