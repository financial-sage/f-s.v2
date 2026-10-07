import { Check, Clock } from "lucide-react";

interface ExpenseDebtStatusProps {
  isSettled?: boolean;
  fundColor?: string | null;
  fundName?: string | null;
}

/** Status chip for shared debts: pocket color + pending/settled icon. */
export function ExpenseDebtStatus({
  isSettled = false,
  fundColor,
  fundName,
}: ExpenseDebtStatusProps) {
  return (
    <span className="inline-flex items-center gap-1">
      {fundColor ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: fundColor }}
          title={fundName ?? "Bolsillo"}
          aria-label={fundName ?? "Bolsillo"}
        />
      ) : null}
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${
          isSettled
            ? "bg-emerald-50 text-emerald-600"
            : "bg-orange-50 text-orange-600"
        }`}
        title={isSettled ? "Liquidado" : "Pendiente"}
        aria-label={isSettled ? "Liquidado" : "Pendiente"}
      >
        {isSettled ? (
          <Check size={10} strokeWidth={2.5} />
        ) : (
          <Clock size={10} strokeWidth={2.5} />
        )}
      </span>
    </span>
  );
}

export function isFundSettlementConcept(concept?: string | null) {
  return String(concept ?? "").startsWith("Liquidación de deuda");
}
