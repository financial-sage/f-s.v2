"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { completeUserRegistration } from "@/app/actions/family";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hasInviteCode, setHasInviteCode] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        router.push("/");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        await completeUserRegistration({
          userId: data.user.id,
          fullName: name.trim(),
          inviteCode: hasInviteCode ? inviteCode : null,
        });
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
    <div className="h-dvh overflow-hidden bg-slate-50 text-on-surface flex flex-col">
      <header className="fixed top-0 z-50 w-full bg-slate-50/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          {/* <div className="flex items-center gap-2">
            <ArrowLeft className="text-primary" size={22} />
            <span className="font-headline text-xl font-bold tracking-tight text-on-surface">
              Financial Sage
            </span>
          </div> */}
          <div className="hidden gap-6 md:flex">
            <span className="font-label text-sm font-medium text-on-surface">Seguridad</span>
            <span className="font-label text-sm font-medium text-on-surface">Ayuda</span>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-none no-scrollbar p-6 pt-24">
        <div className="w-full max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div className="hidden lg:block">
              <div className="relative overflow-hidden rounded-3xl bg-primary/10 p-8">
                <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent" />
                <div className="relative">
                  <h2 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
                    {isLogin ? "Bienvenido de nuevo" : "Comienza tu viaje"}
                  </h2>
                  <p className="mt-3 text-lg text-on-surface-variant">
                    {isLogin
                      ? "Controla tus finanzas en pareja"
                      : "Crea tu cuenta familiar"}
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
                  {isLogin ? "Bienvenido de nuevo" : "Comienza tu viaje"}
                </h1>
                <p className="mt-2 text-lg text-on-surface-variant">
                  {isLogin
                    ? "Controla tus finanzas en pareja"
                    : "Crea tu cuenta familiar"}
                </p>
              </div>

              <section className={`rounded-3xl p-8 shadow-sm ${isLogin ? "bg-white" : "bg-surface-low"}`}>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {!isLogin && (
                    <div className="space-y-2">
                      <label className="ml-4 block font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                        Nombre
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-2xl border-none bg-surface-lowest px-6 py-4 text-on-surface outline-none transition-all placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20"
                        placeholder="Tu nombre completo"
                        type="text"
                        required={!isLogin}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="ml-4 block font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                      Correo electrónico
                    </label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full rounded-2xl border-none px-6 py-4 text-on-surface outline-none transition-all placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 ${isLogin ? "bg-surface-low" : "bg-surface-lowest"}`}
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
                      {isLogin && (
                        <span className="font-label text-xs font-medium text-primary">
                          ¿Olvidaste tu contraseña?
                        </span>
                      )}
                    </div>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full rounded-2xl border-none px-6 py-4 text-on-surface outline-none transition-all placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 ${isLogin ? "bg-surface-low" : "bg-surface-lowest"}`}
                      placeholder="••••••••"
                      type="password"
                      required
                    />
                  </div>

                  {!isLogin && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => {
                          setHasInviteCode((prev) => !prev);
                          if (hasInviteCode) {
                            setInviteCode("");
                          }
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-sage/20 bg-sage/5 px-4 py-3 text-left text-sm text-on-surface transition hover:bg-sage/10"
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
                            hasInviteCode
                              ? "border-sage bg-sage text-white"
                              : "border-sage/40 text-sage"
                          }`}
                        >
                          {hasInviteCode ? "✓" : "+"}
                        </span>
                        <span className="font-medium">¿Tienes un código de invitación?</span>
                      </button>

                      {hasInviteCode && (
                        <input
                          value={inviteCode}
                          onChange={(e) =>
                            setInviteCode(
                              e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
                            )
                          }
                          className="w-full rounded-2xl border-none bg-surface-lowest px-6 py-4 text-center font-mono tracking-[0.3em] text-on-surface uppercase outline-none transition-all placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20"
                          placeholder="ABC123"
                          type="text"
                          inputMode="text"
                          maxLength={6}
                        />
                      )}
                    </div>
                  )}

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
                    {isLoading
                      ? isLogin
                        ? "Entrando..."
                        : "Creando cuenta..."
                      : isLogin
                        ? "Entrar"
                        : "Crear cuenta"}
                  </button>
                </form>
              </section>

              <div className="mt-8 text-center">
                <p className="font-body text-on-surface-variant">
                  {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setHasInviteCode(false);
                      setInviteCode("");
                      setIsLogin((prev) => !prev);
                    }}
                    className="ml-1 font-bold text-primary hover:underline"
                  >
                    {isLogin ? "Regístrate aquí" : "Inicia sesión"}
                  </button>
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
