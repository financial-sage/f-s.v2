import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SinDescuadre · Métricas",
  description: "Métricas del hogar en la web (Premium)",
};

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {children}
    </div>
  );
}
