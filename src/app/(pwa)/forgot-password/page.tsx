"use client";

import Link from "next/link";
import { useState } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo enviar el correo de recuperación.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Recupera tu acceso"
      subtitle="Te enviaremos un enlace seguro para crear una nueva contraseña."
      quote="Un momento de calma también es parte del control."
      quoteLabel="SinDescuadre"
      footer={
        isSuccess ? null : (
          <p className="text-sm font-light text-on-surface-variant">
            ¿La recordaste?
            <Link href="/login" className="ml-1 font-medium text-primary hover:underline">
              Volver al login
            </Link>
          </p>
        )
      }
    >
      {isSuccess ? (
        <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in zoom-in-95 duration-700 ease-out">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-primary shadow-sm">
            <MailCheck className="h-7 w-7" strokeWidth={1.4} />
          </div>

          <h3 className="mb-2 text-xl font-medium tracking-tight text-on-surface">
            Revisa tu bandeja
          </h3>
          <p className="mb-6 max-w-[280px] text-sm font-light leading-relaxed text-on-surface-variant">
            Si existe una cuenta con{" "}
            <span className="font-medium text-on-surface">{email}</span>, recibirás un
            enlace para restablecer tu contraseña.
          </p>

          <Button
            onClick={() => {
              window.location.href = "/login";
            }}
            variant="ghost"
            className="h-10 px-6 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Volver al login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@ejemplo.com"
            type="email"
            required
          />

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm text-red-700">
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
            {isLoading ? "Enviando..." : "Enviar enlace"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
