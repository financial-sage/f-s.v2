"use client";

import { useEffect, useState, useTransition } from "react";
import { LoaderCircle, Send } from "lucide-react";
import {
  canReportAppErrorsAction,
  reportVipAppErrorAction,
} from "@/app/actions/support";
import packageJson from "../../package.json";

type Props = {
  error: Error & { digest?: string };
  /** Compact styles for global-error (no Tailwind theme). */
  variant?: "app" | "bare";
};

export default function VipErrorReportButton({
  error,
  variant = "app",
}: Props) {
  const [canReport, setCanReport] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [fail, setFail] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void canReportAppErrorsAction().then((ok) => {
      if (!cancelled) setCanReport(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!canReport) return null;

  if (ticketNumber) {
    if (variant === "bare") {
      return (
        <p style={{ marginTop: "1rem", fontSize: "0.8rem", opacity: 0.85 }}>
          Reporte enviado · {ticketNumber}
        </p>
      );
    }
    return (
      <p className="mt-4 text-[12px] font-medium text-primary">
        Reporte enviado · {ticketNumber}
      </p>
    );
  }

  function send() {
    setFail(null);
    startTransition(async () => {
      const result = await reportVipAppErrorAction({
        digest: error.digest ?? null,
        message: error.message ?? null,
        stack: error.stack ?? null,
        location:
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : null,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : null,
        appVersion: packageJson.version,
      });
      if (!result.ok) {
        setFail(result.error);
        return;
      }
      setTicketNumber(result.ticketNumber);
    });
  }

  if (variant === "bare") {
    return (
      <div style={{ marginTop: "1rem" }}>
        <button
          type="button"
          disabled={pending}
          onClick={send}
          style={{
            border: "1px solid rgba(28,39,64,0.25)",
            borderRadius: "999px",
            padding: "0.65rem 1.25rem",
            background: "transparent",
            color: "#1c2740",
            fontSize: "0.875rem",
            cursor: pending ? "wait" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Enviando…" : "Enviar reporte de error"}
        </button>
        {fail ? (
          <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#b91c1c" }}>
            {fail}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 w-full max-w-sm">
      <button
        type="button"
        disabled={pending}
        onClick={send}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-5 text-[13px] font-medium text-accent transition active:scale-[0.98] disabled:opacity-55"
      >
        {pending ? (
          <LoaderCircle size={15} className="animate-spin" />
        ) : (
          <Send size={14} strokeWidth={1.75} />
        )}
        {pending ? "Enviando reporte…" : "Enviar reporte de error"}
      </button>
      {fail ? (
        <p className="mt-2 text-[12px] font-medium text-rose-600">{fail}</p>
      ) : (
        <p className="mt-2 text-[11px] font-light text-on-surface-variant">
          Como VIP, el reporte llega al panel de admin con el digest y el
          detalle técnico.
        </p>
      )}
    </div>
  );
}
