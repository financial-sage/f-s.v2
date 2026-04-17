import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import InstallPrompt from "@/components/InstallPrompt";
import PWARegister from "@/components/PWARegister";
import { ExpenseModalProvider } from "@/components/ExpenseModalProvider";
import "./globals.css";

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
      className="h-full antialiased"
    >
      <body suppressHydrationWarning className="h-dvh overflow-hidden text-on-surface">
        <ExpenseModalProvider>
          <PWARegister />
          <InstallPrompt />
          <main className="h-dvh overflow-y-auto overflow-x-hidden overscroll-none no-scrollbar">
            {children}
          </main>
          <BottomNav />
        </ExpenseModalProvider>
      </body>
    </html>
  );
}
