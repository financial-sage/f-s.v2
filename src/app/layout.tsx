import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SinDescuadre",
  description: "Gestión de finanzas en pareja",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="antialiased">
      <body suppressHydrationWarning className="min-h-screen bg-background text-on-surface">
        {children}
      </body>
    </html>
  );
}
