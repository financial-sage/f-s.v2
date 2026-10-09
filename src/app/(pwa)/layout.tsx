import type { Metadata, Viewport } from "next";
import FamilyNavProvider from "@/components/FamilyNavProvider";
import InstallPrompt from "@/components/InstallPrompt";
import PWARegister from "@/components/PWARegister";
import { ExpenseModalProvider } from "@/components/ExpenseModalProvider";
import PageTransition from "@/components/PageTransition";
import RealtimeSync from "@/components/RealtimeSync";

export const metadata: Metadata = {
  title: "SinDescuadre",
  description: "Gestión de finanzas en pareja",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SinDescuadre",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4a6549",
};

export default function PwaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ExpenseModalProvider>
      <RealtimeSync />
      <PWARegister />
      <InstallPrompt />
      <main className="h-dvh overflow-y-auto overflow-x-hidden overscroll-none no-scrollbar">
        <PageTransition>{children}</PageTransition>
      </main>
      <FamilyNavProvider />
    </ExpenseModalProvider>
  );
}
