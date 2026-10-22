"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Inbox, LoaderCircle } from "lucide-react";
import {
  updateSupportTicketStatusAction,
  type SupportTicketRow,
} from "@/app/actions/support";

type Props = {
  tickets: SupportTicketRow[];
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: SupportTicketRow["status"]) {
  switch (status) {
    case "new":
      return "Nueva";
    case "read":
      return "Leída";
    case "resolved":
      return "Resuelta";
    default:
      return status;
  }
}

export default function AdminSupportTickets({ tickets }: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(
    tickets.find((t) => t.status === "new")?.id ?? tickets[0]?.id ?? null
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setStatus(id: string, status: SupportTicketRow["status"]) {
    setPendingId(id);
    startTransition(async () => {
      await updateSupportTicketStatusAction(id, status);
      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-outline-variant/25 bg-surface-lowest p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Inbox size={16} className="text-primary" />
        <h2 className="text-sm font-semibold text-on-surface">
          Soporte ({tickets.length})
        </h2>
      </div>

      {tickets.length === 0 ? (
        <p className="text-[13px] font-light text-on-surface-variant">
          No hay incidencias abiertas.
        </p>
      ) : (
        <ul className="space-y-2">
          {tickets.map((ticket) => {
            const open = expandedId === ticket.id;
            const busy = pending && pendingId === ticket.id;
            return (
              <li
                key={ticket.id}
                className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-low/60"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((prev) =>
                      prev === ticket.id ? null : ticket.id
                    )
                  }
                  className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-on-surface">
                      {ticket.ticket_number}
                      <span className="ml-2 font-light text-on-surface-variant">
                        · {statusLabel(ticket.status)}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-[12px] font-light text-on-surface-variant">
                      {ticket.email}
                      {ticket.location ? ` · ${ticket.location}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-light text-on-surface-variant">
                    {formatWhen(ticket.created_at)}
                  </span>
                </button>

                {open ? (
                  <div className="border-t border-outline-variant/15 px-3 pb-3 pt-2">
                    <p className="whitespace-pre-wrap text-[13px] font-light leading-relaxed text-on-surface/90">
                      {ticket.message}
                    </p>
                    <dl className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-light text-on-surface-variant">
                      <div>
                        <dt>App</dt>
                        <dd className="font-medium text-on-surface">
                          {ticket.app_version ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt>Pantalla</dt>
                        <dd className="truncate font-medium text-on-surface">
                          {ticket.location ?? "—"}
                        </dd>
                      </div>
                    </dl>
                    {ticket.user_agent ? (
                      <p className="mt-2 break-all text-[10px] font-light text-on-surface-variant/80">
                        {ticket.user_agent}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ticket.status === "new" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setStatus(ticket.id, "read")}
                          className="rounded-full border border-outline-variant/30 px-3 py-1 text-[11px] font-medium text-on-surface disabled:opacity-50"
                        >
                          {busy ? (
                            <LoaderCircle size={12} className="animate-spin" />
                          ) : (
                            "Marcar leída"
                          )}
                        </button>
                      ) : null}
                      {ticket.status !== "resolved" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setStatus(ticket.id, "resolved")}
                          className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary disabled:opacity-50"
                        >
                          Resolver
                        </button>
                      ) : null}
                      {ticket.status === "resolved" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setStatus(ticket.id, "read")}
                          className="rounded-full border border-outline-variant/30 px-3 py-1 text-[11px] font-medium text-on-surface disabled:opacity-50"
                        >
                          Reabrir
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
