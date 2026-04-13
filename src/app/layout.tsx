import type { Metadata, Viewport } from "next";
import { Manrope, Inter } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Financial Sage",
  description: "Gestión de finanzas en pareja",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Financial Sage",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4a6549",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="h-dvh overflow-hidden text-on-surface">
        <main className="h-dvh overflow-y-auto overflow-x-hidden overscroll-none no-scrollbar">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
