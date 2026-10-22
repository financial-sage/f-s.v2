import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import packageJson from "../../../../../package.json";
import SupportTicketForm from "@/components/SupportTicketForm";

const APP_VERSION = packageJson.version;

export default function SupportPage() {
  return (
    <div className="relative flex h-dvh flex-col bg-page-gradient text-on-surface">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-page-glow" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto overscroll-y-contain no-scrollbar px-4 pb-28 pt-4">
        <header className="mb-4 flex items-center gap-2 px-1">
          <Link
            href="/profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-glass text-on-surface transition hover:bg-glass-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            aria-label="Volver a perfil"
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] font-light text-on-surface-variant">Perfil</p>
            <h1 className="text-[17px] font-medium tracking-tight text-on-surface">
              Soporte
            </h1>
          </div>
        </header>

        <section className="mb-3 overflow-hidden rounded-[1.85rem] border border-glass-border bg-glass p-4 shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
          <SupportTicketForm appVersion={APP_VERSION} />
        </section>

        <section className="mb-3 overflow-hidden rounded-[1.85rem] border border-glass-border bg-glass p-4 shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
          <h2 className="text-sm font-medium text-on-surface">Preguntas frecuentes</h2>
          <dl className="mt-3 space-y-3.5">
            <div>
              <dt className="text-sm font-medium text-on-surface">
                ¿Cómo invito a mi pareja?
              </dt>
              <dd className="mt-1 text-sm font-light text-on-surface-variant">
                En Perfil verás tu código de 6 caracteres. Tu pareja lo introduce al unirse a
                otro espacio.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-on-surface">¿Qué incluye Premium?</dt>
              <dd className="mt-1 text-sm font-light text-on-surface-variant">
                Se activa por hogar. Cualquier miembro puede desbloquear Premium para ambos.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-on-surface">
                ¿Cómo edito o borro un gasto?
              </dt>
              <dd className="mt-1 text-sm font-light text-on-surface-variant">
                Abre Historial, elige el movimiento y usa editar o eliminar cuando esté
                disponible.
              </dd>
            </div>
          </dl>
        </section>

        <p className="px-1 text-center text-[11px] font-light text-on-surface-variant">
          SinDescuadre · versión {APP_VERSION}
        </p>
      </div>
    </div>
  );
}
