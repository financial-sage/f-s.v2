import type { Metadata, Viewport } from "next";
import FamilyNavProvider from "@/components/FamilyNavProvider";
import InstallPrompt from "@/components/InstallPrompt";
import PWARegister from "@/components/PWARegister";
import UpdateNotifier from "@/components/UpdateNotifier";
import { ExpenseModalProvider } from "@/components/ExpenseModalProvider";
import PageTransition from "@/components/PageTransition";
import RealtimeSync from "@/components/RealtimeSync";
import StoreHydrator from "@/components/StoreHydrator";
import FirstRunGate from "@/components/FirstRunGate";
import PartnerFirstMoveCelebration from "@/components/PartnerFirstMoveCelebration";
import RecommendationsSoftNotice from "@/components/RecommendationsSoftNotice";

export const metadata: Metadata = {
  title: "SinDescuadre",
  applicationName: "SinDescuadre",
  description: "Gestión de finanzas personales y en familia",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SinDescuadre",
  },
  icons: {
    icon: [
      { url: "/icons/v3/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/v3/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/v3/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Default dark; ThemeScript / applyThemeClass sync to the real app theme at runtime
  // so Android standalone chrome matches light/dark (not only OS prefers-color-scheme).
  themeColor: "#0f1729",
};

export default function PwaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ExpenseModalProvider>
      <StoreHydrator />
      <FirstRunGate />
      <PartnerFirstMoveCelebration />
      <RealtimeSync />
      <PWARegister />
      <UpdateNotifier />
      <InstallPrompt />
      {/* Full-bleed paint behind system nav / home indicator (PWA standalone). */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-page-gradient"
        aria-hidden
      />
      <main className="relative z-0 h-dvh overflow-y-auto overflow-x-hidden overscroll-none no-scrollbar">
        <PageTransition>{children}</PageTransition>
      </main>
      <FamilyNavProvider />
      {/* Above BottomNav (z-50) so the recommendations chip stays tappable. */}
      <RecommendationsSoftNotice />
    </ExpenseModalProvider>
  );
}
