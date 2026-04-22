"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface SignOutButtonProps {
  subtle?: boolean;
}

export default function SignOutButton({ subtle = false }: SignOutButtonProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={
        subtle
          ? "shadow-sm flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50/80 px-4 py-3 font-semibold text-red-600 transition hover:bg-red-100"
          : "shadow-sm flex w-full items-center justify-center gap-2 rounded-full bg-sage px-4 py-3 font-semibold text-white transition hover:brightness-110"
      }
    >
      <LogOut size={18} />
      Cerrar sesión
    </button>
  );
}
