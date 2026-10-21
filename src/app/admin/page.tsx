import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  Crown,
  Home,
  Moon,
  Sparkles,
  Users,
  UserCheck2,
  HeartHandshake,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminUser } from "@/lib/admin";
import {
  getAdminInactiveList,
  getAdminOverview,
  getAdminPremiumList,
  getAdminRevenueSnapshot,
  getAdminVipList,
  searchAdminDirectory,
} from "@/lib/admin-metrics";
import { broadcastAppUpdateAdminAction } from "@/app/actions/admin";
import { isPushConfigured } from "@/lib/push";
import AdminSearchForm from "@/components/admin/AdminSearchForm";
import AdminVipToggle from "@/components/admin/AdminVipToggle";

async function getAuthorizedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isSuperAdminUser({ userId: user.id, email: user.email }))) {
    redirect("/");
  }

  return user;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function sourceLabel(source: string) {
  switch (source) {
    case "vip":
      return "VIP";
    case "stub":
      return "Stub";
    case "campaign":
      return "Campaña";
    case "paid":
      return "Pago";
    default:
      return "—";
  }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; push?: string }>;
}) {
  await getAuthorizedUser();
  const params = searchParams ? await searchParams : undefined;
  const q = params?.q?.trim() ?? "";
  const pushSent = params?.push === "sent";
  const pushReady = isPushConfigured();

  const [overview, premiumList, vipList, inactiveList, searchHits, revenue] =
    await Promise.all([
      getAdminOverview(),
      getAdminPremiumList(),
      getAdminVipList(),
      getAdminInactiveList(),
      q ? searchAdminDirectory(q) : Promise.resolve([]),
      getAdminRevenueSnapshot(),
    ]);

  function formatMoney(cents: number, currency: string) {
    try {
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: currency || "EUR",
      }).format(cents / 100);
    } catch {
      return `${(cents / 100).toFixed(2)} ${currency}`;
    }
  }

  const kpiCards = [
    {
      icon: Users,
      label: "Usuarios",
      value: overview.users,
      hint: "Perfiles registrados",
    },
    {
      icon: Home,
      label: "Familias",
      value: overview.families,
      hint: "Hogares creados",
    },
    {
      icon: Crown,
      label: "Premium",
      value: overview.premiumHouseholds,
      hint: `${overview.premiumVipHouseholds} por VIP`,
    },
    {
      icon: Sparkles,
      label: "VIP",
      value: overview.vipUsers,
      hint: "Amigos / testers",
    },
    {
      icon: Moon,
      label: "Inactivos",
      value: overview.inactiveUsers,
      hint: "Sin ningún gasto",
    },
  ] as const;

  async function notifyUpdate() {
    "use server";
    await broadcastAppUpdateAdminAction();
    redirect("/admin?push=sent");
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">
          Operaciones
        </p>
        <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
          Panel admin
        </h1>
        <p className="max-w-2xl text-sm text-on-surface-variant">
          Usuarios, Premium, VIP e inactivos. La recaudación llegará con Stripe.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpiCards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-outline-variant/25 bg-surface-lowest p-4 shadow-sm"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <card.icon size={18} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-on-surface">
              {card.value}
            </p>
            <p className="mt-1 text-[11px] text-on-surface-variant">{card.hint}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-outline-variant/25 bg-surface-lowest p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Wallet size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-on-surface">
            Recaudación Paddle
          </h2>
        </div>
        <p className="mb-4 text-xs text-on-surface-variant">
          Solo cobros reales (VIP y stub no cuentan). Mes en curso · Europe/Madrid.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-surface-low px-4 py-3">
            <p className="text-[11px] text-on-surface-variant">Este mes</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-on-surface">
              {formatMoney(revenue.monthRevenueCents, revenue.currency)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-low px-4 py-3">
            <p className="text-[11px] text-on-surface-variant">Suscripciones activas</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-on-surface">
              {revenue.activeSubscriptions}
            </p>
          </div>
          <div className="rounded-xl bg-surface-low px-4 py-3">
            <p className="text-[11px] text-on-surface-variant">MRR aprox.</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-on-surface">
              {formatMoney(revenue.mrrCentsApprox, revenue.currency)}
            </p>
          </div>
        </div>
        {revenue.recentTransactions.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-outline-variant/20">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-low text-[11px] uppercase tracking-wide text-on-surface-variant">
                <tr>
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Importe</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 font-semibold">Tx</th>
                </tr>
              </thead>
              <tbody>
                {revenue.recentTransactions.map((tx) => (
                  <tr
                    key={tx.transactionId}
                    className="border-t border-outline-variant/15"
                  >
                    <td className="px-3 py-2 text-on-surface-variant">
                      {formatDate(tx.billedAt)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatMoney(tx.amountCents, tx.currency)}
                    </td>
                    <td className="px-3 py-2">{tx.status}</td>
                    <td className="px-3 py-2 font-mono text-xs text-on-surface-variant">
                      {tx.transactionId.slice(0, 12)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-xs text-on-surface-variant">
            Aún no hay cobros Paddle registrados. Configura el webhook y los price
            IDs para empezar a ver ingresos aquí.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-outline-variant/25 bg-surface-lowest p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <HeartHandshake size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-on-surface">Embudo pareja</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Solo / esperando", value: overview.funnel.solo },
            { label: "Trial / pre-trial", value: overview.funnel.coupleTrial },
            { label: "Premium pareja", value: overview.funnel.couplePremium },
            { label: "Pausados", value: overview.funnel.couplePaused },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-surface-low px-4 py-3"
            >
              <p className="text-[11px] text-on-surface-variant">{item.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-on-surface">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-outline-variant/25 bg-surface-lowest p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <UserCheck2 size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-on-surface">
            Buscar usuario o familia
          </h2>
        </div>
        <Suspense fallback={<div className="h-11 animate-pulse rounded-xl bg-surface-low" />}>
          <AdminSearchForm />
        </Suspense>
        {q ? (
          <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-low text-[11px] uppercase tracking-wide text-on-surface-variant">
                <tr>
                  <th className="px-3 py-2 font-semibold">Resultado</th>
                  <th className="px-3 py-2 font-semibold">Email / código</th>
                  <th className="px-3 py-2 font-semibold">Premium</th>
                  <th className="px-3 py-2 font-semibold">VIP</th>
                  <th className="px-3 py-2 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {searchHits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-on-surface-variant"
                    >
                      Sin resultados para “{q}”.
                    </td>
                  </tr>
                ) : (
                  searchHits.map((hit, idx) => (
                    <tr
                      key={`${hit.kind}-${hit.userId ?? hit.familyId}-${idx}`}
                      className="border-t border-outline-variant/15"
                    >
                      <td className="px-3 py-2.5">
                        {hit.kind === "family"
                          ? "Familia"
                          : hit.fullName || "Usuario"}
                      </td>
                      <td className="px-3 py-2.5 text-on-surface-variant">
                        {hit.kind === "family"
                          ? hit.inviteCode
                          : hit.email || hit.inviteCode || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {hit.isPremiumHousehold
                          ? sourceLabel(hit.premiumSource ?? "unknown")
                          : "No"}
                      </td>
                      <td className="px-3 py-2.5">
                        {hit.kind === "user" ? (hit.isVip ? "Sí" : "No") : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {hit.kind === "user" && hit.userId ? (
                          <AdminVipToggle
                            userId={hit.userId}
                            isVip={Boolean(hit.isVip)}
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-on-surface">
          Hogares Premium ({premiumList.length}
          {overview.premiumHouseholds > premiumList.length ? "+" : ""})
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-outline-variant/25 bg-surface-lowest shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-low text-[11px] uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Código</th>
                <th className="px-3 py-2.5 font-semibold">Miembros</th>
                <th className="px-3 py-2.5 font-semibold">Hasta</th>
                <th className="px-3 py-2.5 font-semibold">Origen</th>
              </tr>
            </thead>
            <tbody>
              {premiumList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-on-surface-variant">
                    No hay hogares Premium.
                  </td>
                </tr>
              ) : (
                premiumList.map((row) => (
                  <tr
                    key={row.familyId}
                    className="border-t border-outline-variant/15"
                  >
                    <td className="px-3 py-2.5 font-mono tracking-wider">
                      {row.inviteCode ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-on-surface">
                        {row.memberNames.join(" · ")}
                      </span>
                      <span className="ml-1 text-[11px] text-on-surface-variant">
                        ({row.memberCount})
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-on-surface-variant">
                      {formatDate(row.premiumUntil)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          row.source === "vip"
                            ? "bg-accent/15 text-accent"
                            : "bg-surface-low text-on-surface-variant"
                        }`}
                      >
                        {sourceLabel(row.source)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-on-surface">
          VIP ({vipList.length}
          {overview.vipUsers > vipList.length ? "+" : ""})
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-outline-variant/25 bg-surface-lowest shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-low text-[11px] uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Nombre</th>
                <th className="px-3 py-2.5 font-semibold">Email</th>
                <th className="px-3 py-2.5 font-semibold">Familia</th>
                <th className="px-3 py-2.5 font-semibold">Actualizado</th>
                <th className="px-3 py-2.5 font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {vipList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-on-surface-variant">
                    Aún no hay VIP. Búscalos por email arriba.
                  </td>
                </tr>
              ) : (
                vipList.map((row) => (
                  <tr
                    key={row.userId}
                    className="border-t border-outline-variant/15"
                  >
                    <td className="px-3 py-2.5">{row.fullName || "—"}</td>
                    <td className="px-3 py-2.5 text-on-surface-variant">
                      {row.email || "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono tracking-wider">
                      {row.inviteCode || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-on-surface-variant">
                      {formatDate(row.updatedAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <AdminVipToggle userId={row.userId} isVip />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-on-surface">
          Inactivos ({inactiveList.length}
          {overview.inactiveUsers > inactiveList.length ? "+" : ""})
        </h2>
        <p className="text-xs text-on-surface-variant">
          Registrados sin ningún gasto propio (`paid_by`).
        </p>
        <div className="overflow-x-auto rounded-2xl border border-outline-variant/25 bg-surface-lowest shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-low text-[11px] uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Nombre</th>
                <th className="px-3 py-2.5 font-semibold">Email</th>
                <th className="px-3 py-2.5 font-semibold">Alta</th>
                <th className="px-3 py-2.5 font-semibold">Familia</th>
                <th className="px-3 py-2.5 font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {inactiveList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-on-surface-variant">
                    Todos los usuarios tienen al menos un gasto.
                  </td>
                </tr>
              ) : (
                inactiveList.map((row) => (
                  <tr
                    key={row.userId}
                    className="border-t border-outline-variant/15"
                  >
                    <td className="px-3 py-2.5">{row.fullName || "—"}</td>
                    <td className="px-3 py-2.5 text-on-surface-variant">
                      {row.email || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-on-surface-variant">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-on-surface-variant">
                      {row.familyId ? row.familyId.slice(0, 8) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <AdminVipToggle userId={row.userId} isVip={false} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <details className="rounded-2xl border border-outline-variant/25 bg-surface-lowest p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-on-surface">
          Herramientas
        </summary>
        <div className="mt-4 space-y-3">
          {pushSent ? (
            <p className="text-xs font-medium text-emerald-700">
              Aviso de actualización enviado a los dispositivos suscritos.
            </p>
          ) : null}
          <form action={notifyUpdate}>
            <button
              type="submit"
              disabled={!pushReady}
              className="inline-flex items-center gap-2 rounded-xl bg-surface-low px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Avisar actualización (push)
            </button>
          </form>
          {!pushReady ? (
            <p className="text-[11px] text-on-surface-variant">
              Push no configurado (faltan claves VAPID).
            </p>
          ) : null}
        </div>
      </details>
    </div>
  );
}
