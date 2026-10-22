"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PwaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[pwa error]", error.digest ?? "(sin digest)", error.message);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-page-gradient px-6 text-center">
      <p className="text-[11px] font-light tracking-[0.14em] text-on-surface-variant">
        Algo no cargó
      </p>
      <h1 className="mt-2 text-[1.35rem] font-light tracking-tight text-on-surface">
        No pudimos mostrar esta pantalla
      </h1>
      <p className="mt-3 max-w-sm text-[13px] font-light leading-relaxed text-on-surface-variant">
        Prueba de nuevo. Si sigue pasando, copia el código de abajo y envíalo a
        soporte.
      </p>
      {error.digest ? (
        <p className="mt-4 rounded-2xl border border-outline-variant/25 bg-surface-lowest/90 px-4 py-2 font-mono text-[11px] text-on-surface">
          Digest: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-on-primary"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-full border border-outline-variant/30 px-5 py-2.5 text-[13px] font-medium text-on-surface"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
