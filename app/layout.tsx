import type { Metadata } from "next";
import "@/scss/globals.scss";
import { ConditionalLayout } from "@/src/components/layout/ConditionalLayout";
import { TransactionProvider } from "@/src/contexts/TransactionContext";
import { CurrencyProvider } from "@/src/contexts/CurrencyContext";
import { RegisterServiceWorker } from "./register-sw";


export const metadata: Metadata = {
  title: "Financial Sage - Gestión de Finanzas Personales",
  description: "Gestiona tus finanzas personales de manera inteligente. Controla gastos, crea presupuestos y alcanza tus metas financieras.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full" style={{ background: "var(--background-gradient)", colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        {/* Force Dark Mode Script - Debe ejecutarse antes que nada */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                document.documentElement.classList.add('dark');
                document.documentElement.style.colorScheme = 'dark';
              })();
            `,
          }}
        />
        
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></link>
        
        {/* PWA Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, minimal-ui" />
        <meta name="theme-color" content="#09090b" />
        <meta name="color-scheme" content="dark" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="FinSage" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="msapplication-navbutton-color" content="#09090b" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* iOS Icons */}
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.svg" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.svg" />
        
        {/* Favicon */}
        <link rel="icon" href="/icon-192.svg" />
      </head>
      <body className="flex min-h-full bg-white antialiased h-full overflow-hidden" style={{ background: "var(--background-gradient)" }} suppressHydrationWarning>
        <RegisterServiceWorker />
        <CurrencyProvider>
          <TransactionProvider>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </TransactionProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}