import { redirect } from "next/navigation";
import { getCurrentFamilyState } from "@/app/actions/family";
import AddExpenseForm from "@/components/AddExpenseForm";

export const dynamic = "force-dynamic";

export default async function AddExpensePage() {
  const familyState = await getCurrentFamilyState();

  if (!familyState.userId) {
    redirect("/login");
  }

  if (!familyState.familyId) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <AddExpenseForm familyMemberCount={familyState.familyMemberCount} />
    </div>
  );
}
