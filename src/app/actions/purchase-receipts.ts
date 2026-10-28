"use server";

import { revalidatePath } from "next/cache";
import { isSuperAdminUser } from "@/lib/admin";
import {
  normalizeProductKey,
  type ReceiptLineDraft,
} from "@/lib/grocery";
import {
  requireRequestFamilyId,
  requireRequestUser,
} from "@/lib/request-context";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type PurchaseCompareLine = {
  name: string;
  nameKey: string;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
  previousUnitPrice: number | null;
  previousMerchant: string | null;
  previousDate: string | null;
  delta: number | null;
  deltaPct: number | null;
};

export type PurchaseCompareResult = {
  merchant: string | null;
  purchasedAt: string | null;
  total: number | null;
  lines: PurchaseCompareLine[];
  raised: number;
  lowered: number;
  same: number;
  firstSeen: number;
};

async function requireSuperAdminFamily() {
  const user = await requireRequestUser();
  const allowed = await isSuperAdminUser({
    userId: user.id,
    email: user.email,
  });
  if (!allowed) {
    throw new Error("Solo superadmin puede usar la comparativa de compras.");
  }
  const familyId = await requireRequestFamilyId(user.id);
  return { user, familyId };
}

export async function savePurchaseReceiptAction(input: {
  expenseId: string;
  fundId: string;
  merchant?: string | null;
  purchasedAt?: string | null;
  total?: number | null;
  currency?: string | null;
  lines: ReceiptLineDraft[];
}): Promise<{ ok: true; receiptId: string } | { ok: false; error: string }> {
  try {
    const { user, familyId } = await requireSuperAdminFamily();
    const admin = getSupabaseAdminClient();

    const lines = (input.lines ?? [])
      .map((line) => ({
        name: String(line.name ?? "").trim().slice(0, 160),
        quantity:
          line.quantity != null && Number.isFinite(line.quantity)
            ? Number(line.quantity)
            : null,
        unitPrice:
          line.unitPrice != null && Number.isFinite(line.unitPrice)
            ? Number(line.unitPrice)
            : null,
        lineTotal:
          line.lineTotal != null && Number.isFinite(line.lineTotal)
            ? Number(line.lineTotal)
            : null,
      }))
      .filter((line) => line.name.length > 0);

    if (lines.length === 0) {
      return { ok: false, error: "Sin líneas de ticket para guardar." };
    }

    const { data: fund } = await admin
      .from("family_funds")
      .select("id, is_grocery, family_id")
      .eq("id", input.fundId)
      .eq("family_id", familyId)
      .maybeSingle();

    if (!fund || !(fund as { is_grocery?: boolean }).is_grocery) {
      return { ok: false, error: "El bolsillo no está marcado como compra." };
    }

    const { data: receipt, error: receiptError } = await admin
      .from("purchase_receipts")
      .insert({
        family_id: familyId,
        expense_id: input.expenseId,
        fund_id: input.fundId,
        merchant: input.merchant?.trim() || null,
        purchased_at: input.purchasedAt?.slice(0, 10) || null,
        total:
          input.total != null && Number.isFinite(input.total)
            ? Number(input.total.toFixed(2))
            : null,
        currency: input.currency?.trim().toUpperCase() || null,
        created_by: user.id,
      } as never)
      .select("id")
      .single();

    if (receiptError || !receipt) {
      return {
        ok: false,
        error: receiptError?.message || "No se pudo guardar el ticket.",
      };
    }

    const receiptId = (receipt as { id: string }).id;
    const lineRows = lines.map((line, index) => ({
      receipt_id: receiptId,
      family_id: familyId,
      name: line.name,
      name_key: normalizeProductKey(line.name),
      quantity: line.quantity,
      unit_price: line.unitPrice,
      line_total: line.lineTotal,
      sort_order: index,
    }));

    const { error: linesError } = await admin
      .from("purchase_receipt_lines")
      .insert(lineRows as never);

    if (linesError) {
      await admin.from("purchase_receipts").delete().eq("id", receiptId);
      return { ok: false, error: linesError.message };
    }

    revalidatePath("/");
    revalidatePath("/history");
    return { ok: true, receiptId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo guardar el ticket.",
    };
  }
}

function normalizeDraftLines(lines: ReceiptLineDraft[]) {
  return (lines ?? [])
    .map((line) => ({
      name: String(line.name ?? "").trim().slice(0, 160),
      quantity:
        line.quantity != null && Number.isFinite(line.quantity)
          ? Number(line.quantity)
          : null,
      unitPrice:
        line.unitPrice != null && Number.isFinite(line.unitPrice)
          ? Number(line.unitPrice)
          : null,
      lineTotal:
        line.lineTotal != null && Number.isFinite(line.lineTotal)
          ? Number(line.lineTotal)
          : null,
    }))
    .filter((line) => line.name.length > 0);
}

function resolveUnitPrice(input: {
  unitPrice: number | null;
  lineTotal: number | null;
  quantity: number | null;
}): number | null {
  if (input.unitPrice != null) return input.unitPrice;
  if (input.lineTotal != null && input.quantity != null && input.quantity > 0) {
    return Math.round((input.lineTotal / input.quantity) * 100) / 100;
  }
  return input.lineTotal;
}

async function loadPreviousPrices(params: {
  familyId: string;
  fundId: string;
  keys: string[];
  excludeReceiptId?: string | null;
  beforeCreatedAt?: string | null;
}) {
  const previousByKey = new Map<
    string,
    { unitPrice: number | null; merchant: string | null; date: string | null }
  >();
  if (params.keys.length === 0) return previousByKey;

  const admin = getSupabaseAdminClient();
  let query = admin
    .from("purchase_receipt_lines")
    .select(
      "receipt_id, name_key, unit_price, line_total, quantity, created_at, purchase_receipts!inner(merchant, purchased_at, fund_id, family_id)"
    )
    .eq("family_id", params.familyId)
    .eq("purchase_receipts.fund_id", params.fundId)
    .in("name_key", params.keys)
    .order("created_at", { ascending: false })
    .limit(300);

  if (params.beforeCreatedAt) {
    query = query.lt("created_at", params.beforeCreatedAt);
  }

  const { data: priorLines } = await query;

  for (const row of priorLines ?? []) {
    const r = row as {
      receipt_id?: string;
      name_key?: string;
      unit_price?: number | null;
      line_total?: number | null;
      quantity?: number | null;
      purchase_receipts?:
        | {
            merchant?: string | null;
            purchased_at?: string | null;
          }
        | {
            merchant?: string | null;
            purchased_at?: string | null;
          }[];
    };
    if (
      params.excludeReceiptId &&
      r.receipt_id &&
      r.receipt_id === params.excludeReceiptId
    ) {
      continue;
    }
    const key = String(r.name_key ?? "");
    if (!key || previousByKey.has(key)) continue;
    const receipt = Array.isArray(r.purchase_receipts)
      ? r.purchase_receipts[0]
      : r.purchase_receipts;
    previousByKey.set(key, {
      unitPrice: resolveUnitPrice({
        unitPrice:
          r.unit_price != null && Number.isFinite(Number(r.unit_price))
            ? Number(r.unit_price)
            : null,
        lineTotal:
          r.line_total != null && Number.isFinite(Number(r.line_total))
            ? Number(r.line_total)
            : null,
        quantity:
          r.quantity != null && Number.isFinite(Number(r.quantity))
            ? Number(r.quantity)
            : null,
      }),
      merchant: receipt?.merchant ?? null,
      date: receipt?.purchased_at ?? null,
    });
  }

  return previousByKey;
}

function buildCompareResult(input: {
  merchant?: string | null;
  purchasedAt?: string | null;
  total?: number | null;
  drafts: ReturnType<typeof normalizeDraftLines>;
  previousByKey: Map<
    string,
    { unitPrice: number | null; merchant: string | null; date: string | null }
  >;
}): PurchaseCompareResult {
  let raised = 0;
  let lowered = 0;
  let same = 0;
  let firstSeen = 0;

  const lines: PurchaseCompareLine[] = input.drafts.map((line) => {
    const nameKey = normalizeProductKey(line.name);
    const current = resolveUnitPrice(line);
    const prev = input.previousByKey.get(nameKey);
    const previousUnitPrice = prev?.unitPrice ?? null;
    let delta: number | null = null;
    let deltaPct: number | null = null;
    if (current != null && previousUnitPrice != null) {
      delta = Math.round((current - previousUnitPrice) * 100) / 100;
      if (Math.abs(previousUnitPrice) > 0.009) {
        deltaPct = Math.round((delta / previousUnitPrice) * 1000) / 10;
      }
      if (Math.abs(delta) < 0.009) same += 1;
      else if (delta > 0) raised += 1;
      else lowered += 1;
    } else {
      firstSeen += 1;
    }
    return {
      name: line.name,
      nameKey,
      quantity: line.quantity,
      unitPrice: current,
      lineTotal: line.lineTotal,
      previousUnitPrice,
      previousMerchant: prev?.merchant ?? null,
      previousDate: prev?.date ?? null,
      delta,
      deltaPct,
    };
  });

  return {
    merchant: input.merchant?.trim() || null,
    purchasedAt: input.purchasedAt?.slice(0, 10) || null,
    total: input.total ?? null,
    lines,
    raised,
    lowered,
    same,
    firstSeen,
  };
}

export async function getPurchaseCompareForLinesAction(input: {
  fundId: string;
  merchant?: string | null;
  purchasedAt?: string | null;
  total?: number | null;
  lines: ReceiptLineDraft[];
}): Promise<
  { ok: true; compare: PurchaseCompareResult } | { ok: false; error: string }
> {
  try {
    const { familyId } = await requireSuperAdminFamily();
    const drafts = normalizeDraftLines(input.lines);
    const keys = [
      ...new Set(drafts.map((line) => normalizeProductKey(line.name)).filter(Boolean)),
    ];
    const previousByKey = await loadPreviousPrices({
      familyId,
      fundId: input.fundId,
      keys,
    });

    return {
      ok: true,
      compare: buildCompareResult({
        merchant: input.merchant,
        purchasedAt: input.purchasedAt,
        total: input.total,
        drafts,
        previousByKey,
      }),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo comparar.",
    };
  }
}

/** Expense ids that have a saved grocery ticket (superadmin trial). */
export async function listPurchaseReceiptExpenseIdsAction(): Promise<string[]> {
  try {
    const { familyId } = await requireSuperAdminFamily();
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("purchase_receipts")
      .select("expense_id")
      .eq("family_id", familyId)
      .not("expense_id", "is", null)
      .limit(500);
    if (error) return [];
    return [
      ...new Set(
        (data ?? [])
          .map((row) => String((row as { expense_id?: string | null }).expense_id ?? ""))
          .filter(Boolean)
      ),
    ];
  } catch {
    return [];
  }
}

/** Ticket detail + price deltas for a history expense. */
export async function getPurchaseReceiptDetailForExpenseAction(
  expenseId: string
): Promise<
  | { ok: true; compare: PurchaseCompareResult; receiptId: string }
  | { ok: false; error: string }
> {
  try {
    const { familyId } = await requireSuperAdminFamily();
    const admin = getSupabaseAdminClient();
    const id = String(expenseId ?? "").trim();
    if (!id) return { ok: false, error: "Gasto no válido." };

    const { data: receipt, error: receiptError } = await admin
      .from("purchase_receipts")
      .select("id, fund_id, merchant, purchased_at, total, created_at")
      .eq("family_id", familyId)
      .eq("expense_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (receiptError || !receipt) {
      return { ok: false, error: "No hay ticket guardado para este gasto." };
    }

    const receiptRow = receipt as {
      id: string;
      fund_id?: string | null;
      merchant?: string | null;
      purchased_at?: string | null;
      total?: number | null;
      created_at?: string | null;
    };

    const { data: lineRows, error: linesError } = await admin
      .from("purchase_receipt_lines")
      .select("name, quantity, unit_price, line_total, sort_order")
      .eq("receipt_id", receiptRow.id)
      .order("sort_order", { ascending: true });

    if (linesError) {
      return { ok: false, error: linesError.message };
    }

    const drafts = normalizeDraftLines(
      (lineRows ?? []).map((row) => {
        const r = row as {
          name?: string;
          quantity?: number | null;
          unit_price?: number | null;
          line_total?: number | null;
        };
        return {
          name: String(r.name ?? ""),
          quantity: r.quantity ?? null,
          unitPrice: r.unit_price ?? null,
          lineTotal: r.line_total ?? null,
        };
      })
    );

    const keys = [
      ...new Set(drafts.map((line) => normalizeProductKey(line.name)).filter(Boolean)),
    ];

    const previousByKey = receiptRow.fund_id
      ? await loadPreviousPrices({
          familyId,
          fundId: receiptRow.fund_id,
          keys,
          excludeReceiptId: receiptRow.id,
          beforeCreatedAt: receiptRow.created_at ?? null,
        })
      : new Map();

    return {
      ok: true,
      receiptId: receiptRow.id,
      compare: buildCompareResult({
        merchant: receiptRow.merchant,
        purchasedAt: receiptRow.purchased_at,
        total:
          receiptRow.total != null && Number.isFinite(Number(receiptRow.total))
            ? Number(receiptRow.total)
            : null,
        drafts,
        previousByKey,
      }),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo cargar el ticket.",
    };
  }
}
