import { redirect } from "next/navigation";
import { Crown, Home, Receipt, Users, Zap, ZapOff, CalendarClock, UserCheck2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// ─── Auth guard ──────────────────────────────────────────────────────────────
async function getAuthorizedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmail = process.env.ADMIN_EMAIL;

  if (!user || !adminEmail || user.email !== adminEmail) {
    redirect("/");
  }

  return user;
}

// ─── Server Actions ───────────────────────────────────────────────────────────
async function activateCampaign(formData: FormData) {
  "use server";
  const maxUsers = Number(formData.get("maxUsers") ?? 100);
  const admin = createAdminClient();
  const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Deactivate all first, then activate (only one campaign active at a time)
  await admin.from("promotional_campaigns").update({ is_active: false } as never).neq("id", "");

  const { data: existing } = await admin
    .from("promotional_campaigns")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await admin
      .from("promotional_campaigns")
      .update({ is_active: true, current_users: 0, max_users: maxUsers, ends_at: endsAt } as never)
      .eq("id", existing.id);
  } else {
    await admin
      .from("promotional_campaigns")
      .insert({ is_active: true, current_users: 0, max_users: maxUsers, ends_at: endsAt } as never);
  }

  redirect("/admin");
}

async function deactivateCampaign() {
  "use server";
  const admin = createAdminClient();
  await admin.from("promotional_campaigns").update({ is_active: false } as never).neq("id", "");
  redirect("/admin");
}

// ─── Metrics ─────────────────────────────────────────────────────────────────
async function fetchMetrics() {
  const admin = createAdminClient();

  const [profiles, families, expenses, premium] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("families").select("*", { count: "exact", head: true }),
    admin.from("expenses").select("*", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_premium", true),
  ]);

  return {
    users: profiles.count ?? 0,
    families: families.count ?? 0,
    expenses: expenses.count ?? 0,
    premium: premium.error ? 0 : (premium.count ?? 0),
  };
}

// ─── Campaign fetch ───────────────────────────────────────────────────────────
interface Campaign {
  id: string;
  is_active: boolean;
  current_users: number;
  max_users: number;
  ends_at: string | null;
}

async function fetchCampaign(): Promise<Campaign | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("promotional_campaigns")
    .select("id, is_active, current_users, max_users, ends_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as Campaign;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function AdminPage() {
  await getAuthorizedUser();
  const [metrics, campaign] = await Promise.all([fetchMetrics(), fetchCampaign()]);

  const cards = [
    {
      icon: Users,
      label: "Usuarios registrados",
      value: metrics.users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      icon: Home,
      label: "Familias creadas",
      value: metrics.families,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: Receipt,
      label: "Gastos registrados",
      value: metrics.expenses,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: Crown,
      label: "Usuarios Premium",
      value: metrics.premium,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ] as const;

  const campaignProgress = campaign
    ? Math.min(100, Math.round((campaign.current_users / Math.max(campaign.max_users, 1)) * 100))
    : 0;

  const isExpired = campaign?.ends_at
    ? new Date(campaign.ends_at) < new Date()
    : false;

  const campaignIsActive = campaign?.is_active && !isExpired;

  return (
    <div className="space-y-10">

      {/* Header */}
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">
          SinDescuadre
        </p>
        <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-on-surface">
          Centro de Mando
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Métricas globales de la plataforma
        </p>
      </header>

      {/* Metric cards */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Métricas</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {cards.map(({ icon: Icon, label, value, color, bg }, index) => (
            <div
              key={label}
              className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both rounded-3xl bg-white p-5 shadow-sm border border-slate-100"
              style={{ animationDuration: "600ms", animationDelay: `${index * 80}ms` }}
            >
              <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full ${bg}`}>
                <Icon size={22} className={color} strokeWidth={1.8} />
              </div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
                {label}
              </p>
              <p className={`mt-1 text-4xl font-extrabold tracking-tight ${color}`}>
                {value.toLocaleString("es-MX")}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Campaign panel */}
      <section className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both rounded-3xl bg-white border border-slate-100 shadow-sm p-6"
        style={{ animationDuration: "600ms", animationDelay: "360ms" }}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-800">Campaña de Marketing Activa</h2>
            <p className="text-sm text-slate-500">
              Otorga Premium automáticamente a los primeros registros durante 24 h.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${
              campaignIsActive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {campaignIsActive ? "Activa" : isExpired && campaign?.is_active ? "Expirada" : "Inactiva"}
          </span>
        </div>

        {/* Campaign stats */}
        {campaign ? (
          <div className="mb-6 space-y-4">
            {/* Progress bar */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <UserCheck2 size={13} />
                  Cupos usados
                </span>
                <span className="font-bold text-slate-700">
                  {campaign.current_users} / {campaign.max_users}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    campaignProgress >= 100 ? "bg-rose-400" : "bg-emerald-400"
                  }`}
                  style={{ width: `${campaignProgress}%` }}
                />
              </div>
            </div>

            {/* End date */}
            {campaign.ends_at && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CalendarClock size={14} />
                <span>
                  {isExpired ? "Finalizó" : "Finaliza"} el{" "}
                  <strong className={isExpired ? "text-rose-600" : "text-slate-700"}>
                    {new Date(campaign.ends_at).toLocaleString("es-MX", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </strong>
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="mb-6 text-sm text-slate-400">No hay campañas registradas aún.</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {/* Activate form */}
          <form action={activateCampaign} className="flex items-center gap-2">
            <input
              name="maxUsers"
              type="number"
              min={1}
              max={10000}
              defaultValue={100}
              className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400"
              placeholder="Cupos"
            />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
            >
              <Zap size={14} />
              Activar (24 h)
            </button>
          </form>

          {/* Deactivate */}
          {campaignIsActive && (
            <form action={deactivateCampaign}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95"
              >
                <ZapOff size={14} />
                Desactivar
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <p className="text-center text-[10px] text-slate-400">
        Solo visible para administradores autorizados · SinDescuadre
      </p>
    </div>
  );
}
