"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import CookieConsentModal from "@/components/CookieConsentModal";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("error");
    if (param) setError(param);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Forzamos una redirección nativa limpia.
      // Esto recarga la PWA, limpia la memoria y entra al dashboard con la sesión confirmada.
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <AuthLayout
        title="SinDescuadre"
        subtitle="Organiza tus finanzas y llega a fin de mes sin descuadres. Te mostramos qué está pasando con tu dinero — y qué conviene hacer después."
        quote="Cada movimiento cuenta una historia. Pronto te ayudaremos a leerla y a elegir el siguiente paso con más seguridad."
        quoteLabel="Tu dinero en orden"
        showBackLink={false}
        footer={
          <p className="text-sm font-light text-on-surface-variant">
            ¿No tienes cuenta?
            <Link href="/register" className="ml-1 font-medium text-primary hover:underline">
              Regístrate aquí
            </Link>
          </p>
        }
      >
        <p className="mb-4 hidden rounded-2xl border border-outline-variant/20 bg-surface-low/80 px-3.5 py-2.5 text-[12px] font-light leading-relaxed text-on-surface-variant lg:block">
          La app completa está pensada para el móvil.{" "}
          <Link href="/welcome" className="font-medium text-primary hover:underline">
            Abrir desde el teléfono
          </Link>
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@ejemplo.com"
            type="email"
            required
          />

          <div className="space-y-2">
            <div className="ml-1 flex items-center justify-between">
              <label className="block text-[11px] font-light text-on-surface-variant">
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-medium text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              required
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

        <Button
          type="submit"
          size="lg"
          className="w-full shadow-[0_8px_18px_rgba(43,52,55,0.18)]"
          isLoading={isLoading}
        >
          {isLoading && <LoaderCircle size={18} className="animate-spin" />}
          {isLoading ? "Entrando..." : "Entrar"}
        </Button>

        <SocialAuthButtons mode="login" />
      </form>
      </AuthLayout>

      <CookieConsentModal />
    </>
  );
}
