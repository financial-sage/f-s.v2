"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, X, LoaderCircle } from "lucide-react";
import {
  CheckoutEventNames,
  initializePaddle,
  type Paddle,
} from "@paddle/paddle-js";
import { Portal } from "@/components/ui/Portal";
import {
  confirmPaddleCheckoutAction,
  getPaddleCheckoutPayloadAction,
} from "@/app/actions/paddle";
import type { PaddlePlanId } from "@/lib/paddle/config";

type Props = {
  open: boolean;
  onClose: () => void;
  inviteCode?: string | null;
};

const PLANS: {
  id: PaddlePlanId;
  label: string;
  period: string;
  hint: string;
  featured?: boolean;
}[] = [
  {
    id: "monthly",
    label: "Mensual",
    period: "/ mes",
    hint: "Cancela cuando quieras",
  },
  {
    id: "yearly",
    label: "Anual",
    period: "/ año",
    hint: "Un pago al año · recomendado",
    featured: true,
  },
];

function planPriceId(plan: PaddlePlanId): string | null {
  if (plan === "monthly") {
    return process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY?.trim() || null;
  }
  return process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY?.trim() || null;
}

export default function PremiumPaywallModal({ open, onClose, inviteCode }: Props) {
  const router = useRouter();
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [initError, setInitError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [priceLabels, setPriceLabels] = useState<
    Partial<Record<PaddlePlanId, string>>
  >({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingPlan, setPendingPlan] = useState<PaddlePlanId | null>(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!open) return;

    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();
    const env =
      process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
        ? "production"
        : "sandbox";
    const monthlyId = planPriceId("monthly");
    const yearlyId = planPriceId("yearly");

    if (!token || !monthlyId || !yearlyId) {
      setInitError(
        "Paddle aún no está configurado. Pronto podrás suscribirte desde aquí."
      );
      return;
    }

    let cancelled = false;
    setPricesLoading(true);
    setSuccessMsg("");

    initializePaddle({
      token,
      environment: env,
      eventCallback: (event) => {
        if (event.name !== CheckoutEventNames.CHECKOUT_COMPLETED) return;

        const transactionId = event.data?.transaction_id;
        if (!transactionId) return;

        setActivating(true);
        setSuccessMsg("Pago recibido. Activando Premium…");

        void confirmPaddleCheckoutAction(transactionId)
          .then(() => {
            setSuccessMsg("¡Premium activado!");
            onClose();
            router.refresh();
            // Hard reload so store + chips pick up entitlement.
            window.setTimeout(() => {
              window.location.href = "/";
            }, 400);
          })
          .catch((err) => {
            console.error("[paddle] confirm failed", err);
            setActivating(false);
            setCheckoutError(
              err instanceof Error
                ? err.message
                : "Pago OK, pero no pudimos activar Premium. Recarga en unos segundos o revisa el webhook."
            );
          });
      },
    })
      .then(async (instance) => {
        if (cancelled || !instance) return;
        setPaddle(instance);

        try {
          const preview = await instance.PricePreview({
            items: [
              { priceId: monthlyId, quantity: 1 },
              { priceId: yearlyId, quantity: 1 },
            ],
          });

          const next: Partial<Record<PaddlePlanId, string>> = {};
          for (const item of preview.data.details.lineItems) {
            const formatted =
              item.formattedTotals?.total ||
              item.formattedUnitTotals?.total ||
              null;
            if (!formatted) continue;
            if (item.price.id === monthlyId) next.monthly = formatted;
            if (item.price.id === yearlyId) next.yearly = formatted;
          }
          if (!cancelled) setPriceLabels(next);
        } catch (err) {
          console.warn("[paddle] price preview failed", err);
        } finally {
          if (!cancelled) setPricesLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInitError("No se pudo cargar el checkout. Inténtalo de nuevo.");
          setPricesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, onClose, router]);

  if (!open) return null;

  function startCheckout(plan: PaddlePlanId) {
    setCheckoutError("");
    setPendingPlan(plan);
    startTransition(async () => {
      try {
        const payload = await getPaddleCheckoutPayloadAction(plan);
        if (!paddle) {
          throw new Error("Checkout no listo. Espera un segundo e inténtalo.");
        }

        // Keep our sheet open underneath; Overlay handles the payment UI.
        // Premium unlock happens on checkout.completed via eventCallback.
        paddle.Checkout.open({
          items: [{ priceId: payload.priceId, quantity: 1 }],
          customer: payload.email ? { email: payload.email } : undefined,
          customData: payload.customData,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo abrir el checkout.";
        console.error("[paddle] checkout failed", err);
        setCheckoutError(message);
      } finally {
        setPendingPlan(null);
      }
    });
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
        <button
          type="button"
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          aria-label="Cerrar"
          onClick={onClose}
        />
        <div className="relative z-[1] w-full max-w-md overflow-hidden rounded-[1.75rem] border border-glass-border bg-surface-lowest p-5 shadow-[var(--glass-shadow-lg)] animate-in fade-in slide-in-from-bottom-4 duration-300 sm:slide-in-from-bottom-0 sm:zoom-in-95">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1.5 text-on-surface-variant hover:bg-surface-low"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>

          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
            <Crown size={22} />
          </div>

          <h2 className="text-xl font-light tracking-tight text-on-surface">
            SinDescuadre Premium
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            Te suscribes tú. Si invitas a tu pareja al hogar, ambos disfrutan
            Premium sin un segundo cobro.
          </p>

          {inviteCode ? (
            <p className="mt-3 rounded-2xl bg-surface-low px-3 py-2 text-center font-mono text-sm tracking-[0.2em] text-on-surface">
              {inviteCode}
            </p>
          ) : null}

          {initError ? (
            <p className="mt-4 rounded-2xl bg-surface-low px-3 py-3 text-sm text-on-surface-variant">
              {initError}
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {PLANS.map((plan) => {
                const amount = priceLabels[plan.id];
                return (
                  <button
                    key={plan.id}
                    type="button"
                    disabled={isPending || !paddle}
                    onClick={() => startCheckout(plan.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition disabled:opacity-60 ${
                      plan.featured
                        ? "border-primary/40 bg-primary/8"
                        : "border-outline-variant/30 bg-surface-low"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-on-surface">
                        {plan.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-on-surface-variant">
                        {plan.hint}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
                      {pendingPlan === plan.id || (pricesLoading && !amount) ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <span className="text-right">
                          <span className="tabular-nums">
                            {amount ?? "—"}
                          </span>
                          <span className="text-xs font-light text-on-surface-variant">
                            {plan.period}
                          </span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {successMsg ? (
            <p className="mt-3 text-[11px] font-medium text-emerald-700">
              {successMsg}
            </p>
          ) : null}

          {checkoutError ? (
            <p className="mt-3 text-[11px] text-red-600">{checkoutError}</p>
          ) : null}

          {activating ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant">
              <LoaderCircle size={14} className="animate-spin" />
              Activando tu hogar…
            </div>
          ) : null}

          <p className="mt-4 text-[11px] leading-relaxed text-on-surface-variant">
            El pago lo gestiona Paddle de forma segura. Puedes cancelar cuando
            quieras desde el correo de confirmación de Paddle.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-full border border-outline-variant/40 bg-surface-low px-4 py-3 text-sm font-semibold text-on-surface"
          >
            Ahora no
          </button>
        </div>
      </div>
    </Portal>
  );
}
