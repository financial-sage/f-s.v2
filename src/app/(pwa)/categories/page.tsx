import { redirect } from "next/navigation";
import { getCurrentFamilyState } from "@/app/actions/family";
import CategoriesManager from "@/components/CategoriesManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const familyState = await getCurrentFamilyState();

  if (!familyState.userId) {
    redirect("/login");
  }

  if (!familyState.familyId) {
    redirect("/onboarding");
  }

  return <CategoriesManager familyId={familyState.familyId} />;
}

