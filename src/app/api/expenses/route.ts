import { NextResponse } from "next/server";
import { buildExpenseInsert, type ExpenseFormPayer } from "@/lib/expenses";
import { createClient } from "@/utils/supabase/server";

interface CreateExpenseBody {
  amount: number;
  concept: string;
  payer: ExpenseFormPayer;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CreateExpenseBody>;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { data: family, error: familyError } = await supabase
      .from("families")
      .select("id, user_1_id, user_2_id")
      .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
      .maybeSingle();

    if (familyError || !family?.id) {
      return NextResponse.json(
        { error: "Debes pertenecer a una familia para registrar gastos." },
        { status: 400 }
      );
    }

    const partnerUserId =
      family.user_1_id === user.id
        ? family.user_2_id ?? user.id
        : family.user_1_id;

    if (body.payer === "pareja" && partnerUserId === user.id) {
      return NextResponse.json(
        { error: "No hay una pareja vinculada todavía." },
        { status: 400 }
      );
    }

    const payload = buildExpenseInsert({
      amount: Number(body.amount),
      concept: body.concept ?? "",
      payer: (body.payer ?? "medias") as ExpenseFormPayer,
      familyId: family.id,
      currentUserId: user.id,
      partnerUserId,
    });

    const { data, error } = await supabase
      .from("expenses")
      .insert(payload as never)
      .select("id, amount, concept")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, expense: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar el gasto.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
