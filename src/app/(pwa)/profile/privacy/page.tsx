import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function PrivacyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const backHref = user ? "/profile" : "/login";
  const backLabel = user ? "Perfil" : "Login";
  const backAria = user ? "Volver a perfil" : "Volver al login";

  return (
    <div className="relative flex h-dvh flex-col bg-page-gradient text-on-surface">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-page-glow" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto overscroll-y-contain no-scrollbar px-4 pb-10 pt-4">
        <header className="mb-4 flex items-center gap-2 px-1">
          <Link
            href={backHref}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-glass text-on-surface transition hover:bg-glass-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            aria-label={backAria}
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] font-light text-on-surface-variant">{backLabel}</p>
            <h1 className="text-[17px] font-medium tracking-tight text-on-surface">
              Privacidad
            </h1>
          </div>
        </header>

        <article className="space-y-3">
          <section className="overflow-hidden rounded-[1.85rem] border border-glass-border bg-glass p-4 shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
            <h2 className="text-sm font-medium text-on-surface">Qué datos usamos</h2>
            <p className="mt-1.5 text-sm font-normal leading-relaxed text-on-surface/80">
              SinDescuadre guarda la información necesaria para tu cuenta y tu espacio
              familiar: correo, nombre, gastos, ingresos, cuentas, bolsillos y ajustes del
              hogar. Esa información sirve para mostrarte tu realidad financiera y, si
              compartes espacio, coordinarla con tu pareja.
            </p>
          </section>

          <section className="overflow-hidden rounded-[1.85rem] border border-glass-border bg-glass p-4 shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
            <h2 className="text-sm font-medium text-on-surface">Modo pareja</h2>
            <p className="mt-1.5 text-sm font-normal leading-relaxed text-on-surface/80">
              En un espacio compartido, ambos miembros pueden ver lo que el producto marca
              como visible para el hogar (por ejemplo cuentas compartidas o con
              visibilidad familiar). Lo marcado como privado permanece solo para su dueño.
            </p>
          </section>

          <section className="overflow-hidden rounded-[1.85rem] border border-glass-border bg-glass p-4 shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
            <h2 className="text-sm font-medium text-on-surface">Dónde se guarda</h2>
            <p className="mt-1.5 text-sm font-normal leading-relaxed text-on-surface/80">
              Los datos se almacenan en infraestructura de autenticación y base de datos
              (Supabase) y en el hosting de la aplicación. No vendemos tus datos
              financieros.
            </p>
          </section>

          <section className="overflow-hidden rounded-[1.85rem] border border-glass-border bg-glass p-4 shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
            <h2 className="text-sm font-medium text-on-surface">Sesión y cookies</h2>
            <p className="mt-1.5 text-sm font-normal leading-relaxed text-on-surface/80">
              Usamos cookies estrictamente necesarias para mantener tu sesión iniciada
              (autenticación). No usamos cookies de publicidad ni de analítica de
              terceros. En el inicio de sesión pedimos tu aceptación antes de continuar.
            </p>
          </section>

          <section className="overflow-hidden rounded-[1.85rem] border border-glass-border bg-glass p-4 shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
            <h2 className="text-sm font-medium text-on-surface">Tus derechos</h2>
            <p className="mt-1.5 text-sm font-normal leading-relaxed text-on-surface/80">
              Puedes pedir acceso, corrección o borrado de tu cuenta escribiendo a{" "}
              <a
                href="mailto:soporte@sindescuadre.app"
                className="font-medium text-on-surface underline decoration-[#c4a574]/60 underline-offset-2 hover:decoration-[#c4a574]"
              >
                soporte@sindescuadre.app
              </a>
              .
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
