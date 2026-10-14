"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function ensureSession() {
      const client = createClient();
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session) {
        setError("El enlace no es válido o ha caducado. Solicita uno nuevo.");
        setIsReady(false);
        return;
      }

      setIsReady(true);
    }

    void ensureSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Nueva contraseña"
      subtitle="Elige una contraseña segura para tu cuenta."
      quote="Un nuevo comienzo empieza con un paso simple."
      quoteLabel="Acceso Sage"
      footer={
        <p className="text-sm font-light text-on-surface-variant">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Volver al login
          </Link>
        </p>
      }
    >
      {!isReady ? (
        <div className="space-y-4 py-4 text-center">
          {error ? (
            <>
              <div className="rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
              <Button
                onClick={() => router.push("/forgot-password")}
                size="lg"
                className="w-full shadow-[0_8px_18px_rgba(43,52,55,0.18)]"
              >
                Solicitar nuevo enlace
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 py-8 text-sm font-light text-on-surface-variant">
              <LoaderCircle size={16} className="animate-spin" />
              Validando enlace...
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            required
            minLength={6}
          />

          <Input
            label="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            required
            minLength={6}
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
            {isLoading ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
