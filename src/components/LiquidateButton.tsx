"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, LoaderCircle } from "lucide-react";
import { settleDebt } from "@/app/actions/debt";

interface LiquidateButtonProps {
  familyId: string;
  deudorId: string | null;
  acreedorId: string | null;
  monto: number;
}

export default function LiquidateButton({
  familyId,
  deudorId,
  acreedorId,
  monto,
}: LiquidateButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending || !deudorId || !acreedorId || monto <= 0}
      onClick={() => {
        startTransition(async () => {
          if (!deudorId || !acreedorId || monto <= 0) {
            return;
          }

          await settleDebt({
            deudor_id: deudorId,
            acreedor_id: acreedorId,
            monto,
            family_id: familyId,
          });

          router.refresh();
        });
      }}
      className="flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-2 text-lg font-semibold text-on-primary shadow-md transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isPending ? (
        <LoaderCircle size={20} className="animate-spin" />
      ) : (
        <Banknote size={22} />
      )}
      {isPending ? "Liquidando..." : "Liquidar"}
    </button>
  );
}
