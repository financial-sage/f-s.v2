"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 text-on-surface">
      <header className="fixed top-0 z-50 w-full bg-slate-50/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center justify-end">
          <div className="hidden gap-6 md:flex">
            <span className="font-label text-sm font-medium text-on-surface">Seguridad</span>
            <span className="font-label text-sm font-medium text-on-surface">Ayuda</span>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-none p-6 pt-24 no-scrollbar">
        <div className="w-full max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div className="hidden lg:block">
              <div className="relative overflow-hidden rounded-3xl bg-primary/10 p-8">
                <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent" />
                <div className="relative">
                  <h2 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
                    Bienvenido de nuevo
                  </h2>
                  <p className="mt-3 text-lg text-on-surface-variant">
                    Controla tus finanzas con calma y claridad.
                  </p>
                  <div className="mt-10 rounded-2xl bg-white/80 p-6 backdrop-blur-sm">
                    <p className="font-headline text-2xl font-bold leading-tight text-on-surface">
                      "La paz financiera comienza con una conversación honesta."
                    </p>
                    <p className="mt-4 text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                      Filosofía Sage
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="mb-8 text-center lg:hidden">
                <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
                  Bienvenido de nuevo
                </h1>
                <p className="mt-2 text-lg text-on-surface-variant">
                  Controla tus finanzas con calma y claridad.
                </p>
              </div>

              <section className="rounded-3xl bg-white p-8 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="ml-4 block font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                      Correo electrónico
                    </label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border-none bg-surface-low px-6 py-4 text-on-surface outline-none transition-all placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20"
                      placeholder="nombre@ejemplo.com"
                      type="email"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="mx-4 flex items-center justify-between">
                      <label className="block font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                        Contraseña
                      </label>
                      <span className="font-label text-xs font-medium text-primary">
                        ¿Olvidaste tu contraseña?
                      </span>
                    </div>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border-none bg-surface-low px-6 py-4 text-on-surface outline-none transition-all placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20"
                      placeholder="••••••••"
                      type="password"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-5 text-lg font-bold text-on-primary shadow-lg shadow-primary/10 transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading && <LoaderCircle size={18} className="animate-spin" />}
                    {isLoading ? "Entrando..." : "Entrar"}
                  </button>
                </form>
              </section>

              <div className="mt-8 text-center">
                <p className="font-body text-on-surface-variant">
                  ¿No tienes cuenta?
                  <Link href="/register" className="ml-1 font-bold text-primary hover:underline">
                    Regístrate aquí
                  </Link>
                </p>
              </div>

              <div className="mt-6 text-center">
                <Link href="/" className="text-sm text-on-surface-variant hover:text-primary">
                  Volver
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
