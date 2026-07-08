"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

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
    <div className="flex h-dvh flex-col overflow-hidden bg-surface text-on-surface">
      <header className="fixed top-0 z-50 w-full bg-surface/80 px-6 py-4 backdrop-blur-md" />

      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-none p-6 pt-24 no-scrollbar">
        <div className="w-full max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div className="hidden lg:block">
              <div className="relative overflow-hidden rounded-3xl bg-primary/10 p-8">
                <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent" />
                <div className="relative">
                  <h2 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
                    Crea tu cuenta
                  </h2>
                  <p className="mt-3 text-lg text-on-surface-variant">
                    Tus finanzas, claras y simples.
                  </p>
                  <div className="mt-10 rounded-2xl bg-surface-lowest/80 p-6 backdrop-blur-sm">
                    <p className="font-headline text-2xl font-bold leading-tight text-on-surface">
                      Diseñado para avanzar paso a paso, sin fricción.
                    </p>
                    <p className="mt-4 text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                      Onboarding Progresivo
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="mb-8 text-center lg:hidden">
                <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
                  Crea tu cuenta
                </h1>
                <p className="mt-2 text-lg text-on-surface-variant">
                  Tus finanzas, claras y simples.
                </p>
              </div>

              <Card className="bg-surface-low p-8">
                {isSuccess ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in-95 duration-700 ease-out">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-100/50 bg-emerald-50 shadow-sm">
                      <MailCheck className="h-10 w-10 text-primary" strokeWidth={1.2} />
                    </div>

                    <h3 className="mb-3 text-2xl font-bold tracking-tight text-on-surface">Revisa tu bandeja</h3>
                    <p className="mb-8 max-w-[280px] text-sm leading-relaxed text-on-surface-variant">
                      Hemos enviado un enlace seguro a <span className="font-semibold text-on-surface">{email}</span> para verificar tu identidad.
                    </p>

                    <Button
                      onClick={() => router.push("/login")}
                      variant="ghost"
                      className="h-10 px-6 text-sm font-semibold text-primary hover:bg-primary/10 hover:text-primary-dim"
                    >
                      Ya lo confirmé, iniciar sesión
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                      label="Nombre"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      type="text"
                      required
                      className="bg-surface-lowest"
                    />

                    <Input
                      label="Correo electrónico"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nombre@ejemplo.com"
                      type="email"
                      required
                      className="bg-surface-lowest"
                    />

                    <Input
                      label="Contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      type="password"
                      required
                      className="bg-surface-lowest"
                    />

                    {error && (
                      <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      isLoading={isLoading}
                    >
                      {isLoading && <LoaderCircle size={18} className="animate-spin" />}
                      {isLoading ? "Creando cuenta..." : "Crear cuenta"}
                    </Button>
                  </form>
                )}
              </Card>

              <div className="mt-8 text-center">
                <p className="font-body text-on-surface-variant">
                  ¿Ya tienes cuenta?
                  <Link href="/login" className="ml-1 font-bold text-primary hover:underline">
                    Inicia sesión
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
