import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import InstallPrompt from "@/components/InstallPrompt";
import PWARegister from "@/components/PWARegister";
import { ExpenseModalProvider } from "@/components/ExpenseModalProvider";
import { createClient } from "@/utils/supabase/server";
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

function getFirstName(value?: string | null, fallback = "Mi pareja") {
  const firstName = value?.trim().split(/\s+/)[0];
  return firstName || fallback;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let partnerFirstName = "Mi pareja";
  let financialModel = "joint_fund";
  let user1SplitPct = 50;

  if (user) {
    const { data: family } = await supabase
      .from("families")
      .select("user_1_id, user_2_id, financial_model, user_1_split_pct")
      .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
      .maybeSingle();

    financialModel = family?.financial_model ?? "joint_fund";
    user1SplitPct = Number(family?.user_1_split_pct ?? 50);

    const partnerId =
      family?.user_1_id === user.id ? family.user_2_id : family?.user_1_id ?? null;

    if (partnerId) {
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", partnerId)
        .maybeSingle();

      partnerFirstName = getFirstName(partnerProfile?.full_name);
    }
  }

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
          <BottomNav
            partnerFirstName={partnerFirstName}
            financialModel={financialModel}
            user1SplitPct={user1SplitPct}
          />
        </ExpenseModalProvider>
      </body>
    </html>
  );
}
