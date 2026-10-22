"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, LoaderCircle, MessageSquareWarning } from "lucide-react";
import { createSupportTicketAction } from "@/app/actions/support";

type Props = {
  appVersion: string;
};

export default function SupportTicketForm({ appVersion }: Props) {
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      let location = pathname || "/profile/support";
      try {
        if (typeof document !== "undefined" && document.referrer) {
          const ref = new URL(document.referrer);
          if (ref.origin === window.location.origin) {
            location = `${ref.pathname}${ref.search}` || location;
          }
        }
      } catch {
        /* ignore */
      }

      const result = await createSupportTicketAction({
        message,
        location,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : null,
        appVersion,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTicketNumber(result.ticketNumber);
      setMessage("");
    });
  }

  if (ticketNumber) {
    return (
      <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
            <CheckCircle2 size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-on-surface">
              Incidencia registrada
            </p>
            <p className="mt-1 text-sm font-light text-on-surface-variant">
              Tu número es{" "}
              <span className="font-semibold text-on-surface">{ticketNumber}</span>
              . Lo revisamos desde el panel de administración; no hace falta
              enviar un correo.
            </p>
            <button
              type="button"
              onClick={() => setTicketNumber(null)}
              className="mt-3 text-[12px] font-medium text-primary underline-offset-2 hover:underline"
            >
              Enviar otra
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <MessageSquareWarning size={16} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-on-surface">Nueva incidencia</p>
          <p className="mt-1 text-[12px] font-light leading-relaxed text-on-surface-variant">
            Describe qué pasó. Guardamos tu email, la pantalla en la que estás y
            un número de incidencia para seguirlo en admin.
          </p>
        </div>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        maxLength={4000}
        placeholder="Ej. Al escanear una factura PDF en iPhone, el botón se queda en «Leyendo…»"
        className="w-full resize-y rounded-2xl border border-outline-variant/30 bg-surface-low px-3.5 py-3 text-sm font-light text-on-surface outline-none placeholder:text-on-surface/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
      />

      {error ? (
        <p className="text-[12px] font-medium text-rose-600">{error}</p>
      ) : null}

      <button
        type="button"
        disabled={pending || message.trim().length < 10}
        onClick={submit}
        className="fab-ink inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {pending ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : null}
        {pending ? "Enviando…" : "Registrar incidencia"}
      </button>
    </div>
  );
}
