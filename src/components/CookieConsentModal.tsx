"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { acceptCookieConsent, hasAcceptedCookieConsent } from "@/lib/cookie-consent";

export default function CookieConsentModal() {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (hasAcceptedCookieConsent()) return;
    setVisible(true);
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  function handleAccept() {
    acceptCookieConsent();
    setEntered(false);
    window.setTimeout(() => setVisible(false), 220);
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-200 flex items-end justify-center p-3 pb-[max(0.75rem,var(--safe-bottom))] sm:items-center sm:p-6 ${
        entered ? "opacity-100" : "opacity-0"
      } transition-opacity duration-300 ease-out`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div
        className={`absolute inset-0 bg-[color-mix(in_srgb,#0f1729_52%,transparent)] backdrop-blur-[3px] transition-opacity duration-300 dark:bg-[color-mix(in_srgb,#0f1729_72%,transparent)] ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />

      <div
        className={`relative w-full max-w-[22rem] overflow-hidden rounded-[1.65rem] border border-glass-border bg-surface-lowest shadow-[var(--glass-shadow-lg)] transition-all duration-300 ease-out ${
          entered ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.98] opacity-0"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#c4a574]/70 to-transparent"
          aria-hidden
        />

        <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#c4a574]">
            SinDescuadre
          </p>

          <h2
            id="cookie-consent-title"
            className="mt-2 text-[1.05rem] font-medium tracking-tight text-on-surface"
          >
            Cookies esenciales
          </h2>

          <p
            id="cookie-consent-desc"
            className="mt-2 text-[13px] font-normal leading-relaxed text-on-surface"
          >
            <span className="text-on-surface/80">
              Solo usamos cookies necesarias para tu sesión. Sin publicidad ni analítica de
              terceros.{" "}
            </span>
            <Link
              href="/profile/privacy"
              className="font-medium text-on-surface underline decoration-[#c4a574]/60 underline-offset-[3px] transition hover:decoration-[#c4a574]"
            >
              Privacidad
            </Link>
          </p>

          <button
            type="button"
            onClick={handleAccept}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-primary text-[13px] font-medium tracking-wide text-on-primary shadow-[0_10px_24px_rgba(15,23,41,0.28)] transition hover:brightness-[1.04] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4a574]/45"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
