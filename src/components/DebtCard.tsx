import { calculateDebt } from "@/app/actions/debt";
import LiquidateButton from "@/components/LiquidateButton";
import { createClient } from "@/utils/supabase/server";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default async function DebtCard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: family } = user
    ? await supabase
        .from("families")
        .select("id")
        .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
        .maybeSingle()
    : { data: null };

  const familyId = family?.id ?? "";
  const currentUserId = user?.id ?? "";
  const { deudor_id, acreedor_id, monto } = await calculateDebt(familyId);

  const title = monto === 0
    ? "Están al día ✨"
    : currentUserId === deudor_id
      ? `Debes ${formatCurrency(monto)}`
      : currentUserId === acreedor_id
        ? `Te deben ${formatCurrency(monto)}`
        : `${formatCurrency(monto)} pendientes`;

  return (
    <section className="relative">
      <div className="space-y-6 rounded-2xl bg-surface-lowest p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div className="space-y-2">
          <span className="font-label text-xs font-medium uppercase tracking-widest text-on-surface-variant">
            Balance Pendiente
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface md:text-3xl">
            {title}
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          <LiquidateButton
            familyId={familyId}
            deudorId={deudor_id}
            acreedorId={acreedor_id}
            monto={monto}
          />
          <p className="font-body text-sm italic text-on-surface-variant opacity-80">
            {monto === 0 ? "Sin saldo pendiente" : "Actualizado con Supabase"}
          </p>
        </div>
      </div>
    </section>
  );
}
