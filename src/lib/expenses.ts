export type ExpenseFormPayer = "yo" | "pareja" | "medias";
export type ExpenseSplitType =
  | "personal"
  | "p2p_debt"
  | "shared"
  | "shared_equal"
  | "shared_custom"
  | "fund_transfer"
  | "settlement";

interface BuildExpenseInsertInput {
  amount: number;
  concept: string;
  payer: ExpenseFormPayer;
  familyId: string;
  currentUserId: string;
  partnerUserId: string;
  expenseDate?: string;
}

export function buildExpenseInsert({
  amount,
  concept,
  payer,
  familyId,
  currentUserId,
  partnerUserId,
  expenseDate,
}: BuildExpenseInsertInput) {
  const normalizedAmount = Number(amount);
  const normalizedConcept = concept.trim();

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("El importe debe ser mayor que cero.");
  }

  if (!normalizedConcept) {
    throw new Error("El concepto es obligatorio.");
  }

  const basePayload = {
    family_id: familyId,
    amount: Number(normalizedAmount.toFixed(2)),
    concept: normalizedConcept,
    expense_date: expenseDate ?? new Date().toISOString().slice(0, 10),
  };

  switch (payer) {
    case "yo":
      return {
        ...basePayload,
        paid_by: currentUserId,
        split_type: "personal" as ExpenseSplitType,
        payer_share_pct: 100,
      };

    case "pareja":
      return {
        ...basePayload,
        paid_by: partnerUserId,
        split_type: "personal" as ExpenseSplitType,
        payer_share_pct: 100,
      };

    case "medias":
      return {
        ...basePayload,
        paid_by: currentUserId,
        split_type: "shared_equal" as ExpenseSplitType,
        payer_share_pct: 50,
      };

    default:
      throw new Error("Tipo de pago inválido.");
  }
}
