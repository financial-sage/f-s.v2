"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Tus finanzas, claras y simples."
      quote="Diseñado para avanzar paso a paso, sin fricción."
      quoteLabel="Onboarding progresivo"
      footer={
        isSuccess ? null : (
          <p className="text-sm font-light text-on-surface-variant">
            ¿Ya tienes cuenta?
            <Link href="/login" className="ml-1 font-medium text-primary hover:underline">
              Inicia sesión
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
            Hemos enviado un enlace seguro a{" "}
            <span className="font-medium text-on-surface">{email}</span> para verificar tu
            identidad.
          </p>

          <Button
            onClick={() => router.push("/login")}
            variant="ghost"
            className="h-10 px-6 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Ya lo confirmé, iniciar sesión
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            type="text"
            required
          />

          <Input
            label="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@ejemplo.com"
            type="email"
            required
          />

          <Input
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
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
            {isLoading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>

          <SocialAuthButtons mode="register" />
        </form>
      )}
    </AuthLayout>
  );
}
