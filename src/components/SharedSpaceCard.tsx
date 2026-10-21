"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, Users, X } from "lucide-react";
import { Portal } from "@/components/ui/Portal";

type PartnerInfo = {
  id: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
};

type SharedSpaceCardProps = {
  spaceTitle: string;
  hasPartner: boolean;
  partnerDisplayName: string;
  partner: PartnerInfo | null;
  inviteCode: string;
  joinForm: ReactNode;
};

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "FS"
  );
}

export default function SharedSpaceCard({
  spaceTitle,
  hasPartner,
  partnerDisplayName,
  partner,
  inviteCode,
  joinForm,
}: SharedSpaceCardProps) {
  const [open, setOpen] = useState(false);
  const initials = getInitials(partner?.fullName || partnerDisplayName);

  return (
    <>
      <section className="mb-3 overflow-hidden rounded-[1.85rem] border border-glass-border bg-glass p-4 shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
        {hasPartner && partner ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-start gap-3 text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
              <Users size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium tracking-tight text-on-surface">
                  {spaceTitle}
                </h3>
                <ChevronRight size={16} className="shrink-0 text-on-surface-variant" />
              </div>
              <p className="mt-1 text-sm font-light text-on-surface-variant">
                Espacio compartido con {partnerDisplayName}
              </p>
            </div>
          </button>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
              <Users size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium tracking-tight text-on-surface">
                {spaceTitle}
              </h3>
              <p className="mt-1 text-sm font-light text-on-surface-variant">
                Espacio individual. Cuando quieras, puedes invitar a alguien con este
                código.
              </p>
              <div className="mt-3 rounded-2xl border border-glass-border bg-glass-strong px-4 py-3 backdrop-blur-md">
                <p className="text-[11px] font-light text-on-surface-variant">
                  Código de invitación
                </p>
                <p className="mt-1 font-mono text-xl font-medium tracking-[0.2em] text-primary">
                  {inviteCode}
                </p>
              </div>
              {joinForm}
            </div>
          </div>
        )}
      </section>

      {open && partner ? (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
            <button
              type="button"
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-[2px]"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="partner-modal-title"
              className="relative z-[1] w-full max-w-sm overflow-hidden rounded-[1.65rem] border border-glass-border bg-surface-lowest p-5 shadow-[var(--glass-shadow-lg)] animate-in fade-in slide-in-from-bottom-3 duration-300 sm:slide-in-from-bottom-0 sm:zoom-in-95"
            >
              <div
                className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#c4a574]/55 to-transparent"
                aria-hidden
              />

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 rounded-full p-1.5 text-on-surface-variant transition hover:bg-surface-low"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>

              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#c4a574]/90">
                Tu pareja
              </p>

              <div className="mt-4 flex items-center gap-3.5">
                {partner.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={partner.avatarUrl}
                    alt={partner.fullName}
                    className="h-14 w-14 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-glass-border"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-container text-lg font-medium text-on-primary-container shadow-sm ring-2 ring-glass-border">
                    {initials}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h2
                    id="partner-modal-title"
                    className="truncate text-base font-light tracking-tight text-on-surface"
                  >
                    {partner.fullName}
                  </h2>
                  {partner.email ? (
                    <p className="mt-0.5 truncate text-sm font-light text-on-surface-variant">
                      {partner.email}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm font-light text-on-surface-variant">
                      Correo no disponible
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Portal>
      ) : null}
    </>
  );
}
