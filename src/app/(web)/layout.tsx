import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SinDescuadre · Métricas",
  description: "Métricas del hogar en la web (Premium)",
};

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-page-gradient text-on-surface">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-page-gradient"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-page-glow" />
      <main className="relative z-0 mx-auto min-h-dvh w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
