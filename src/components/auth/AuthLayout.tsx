import Link from "next/link";
import type { ReactNode } from "react";
import { sageGlassGradient } from "@/lib/glass";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  quote: string;
  quoteLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  showBackLink?: boolean;
};

export function AuthLayout({
  title,
  subtitle,
  quote,
  quoteLabel,
  children,
  footer,
  showBackLink = true,
}: AuthLayoutProps) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-page-gradient text-on-surface">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-page-glow" />

      <main className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-none px-4 py-8 no-scrollbar">
        <div className="w-full max-w-5xl">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_400px]">
            <div className="hidden lg:block">
              <div
                className="relative overflow-hidden rounded-[1.85rem] p-8 shadow-[0_14px_40px_rgba(43,52,55,0.12)] backdrop-blur-2xl"
                style={{
                  backgroundImage: sageGlassGradient(),
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/img/apple-touch-icon.png?v=2"
                  alt="SinDescuadre"
                  className="mb-5 h-14 w-14 rounded-[1rem] shadow-[0_12px_28px_rgba(43,52,55,0.18)]"
                />
                <p className="text-[11px] font-light text-on-surface-variant">{quoteLabel}</p>
                <h2 className="mt-2 text-4xl font-light leading-tight tracking-tight text-on-surface">
                  {title}
                </h2>
                <p className="mt-3 text-base font-light text-on-surface-variant">{subtitle}</p>

                <div className="mt-10 overflow-hidden rounded-3xl border border-emerald-100/70 bg-surface-lowest/90 p-5 shadow-[0_16px_40px_rgba(96,133,92,0.16)] backdrop-blur-xl">
                  <p className="text-xl font-light leading-snug tracking-tight text-on-surface">
                    {quote}
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-auto w-full max-w-md">
              <div className="mb-6 flex flex-col items-center px-1 text-center lg:hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/img/apple-touch-icon.png?v=2"
                  alt="SinDescuadre"
                  className="mb-4 h-16 w-16 rounded-[1.1rem] shadow-[0_12px_28px_rgba(43,52,55,0.18)]"
                />
                <p className="text-[11px] font-light text-on-surface-variant">{quoteLabel}</p>
                <h1 className="mt-1 text-[2rem] font-light leading-tight tracking-tight text-on-surface">
                  {title}
                </h1>
                <p className="mt-2 text-sm font-light text-on-surface-variant">{subtitle}</p>
              </div>

              <div className="overflow-hidden rounded-[1.85rem] border border-glass-border bg-surface-lowest/90 p-6 shadow-[0_14px_40px_rgba(43,52,55,0.12)] backdrop-blur-2xl sm:p-8">
                {children}
              </div>

              {footer ? <div className="mt-6 text-center">{footer}</div> : null}

              {showBackLink ? (
                <div className="mt-4 text-center">
                  <Link
                    href="/"
                    className="text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
                  >
                    Volver
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
