"use client";

import { useRouter } from "next/navigation";
import { LogOut, Power } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/components/ui/cn";

interface SignOutButtonProps {
  subtle?: boolean;
  /** Compact icon button for headers */
  compact?: boolean;
  className?: string;
}

export default function SignOutButton({
  subtle = false,
  compact = false,
  className,
}: SignOutButtonProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200/80 bg-red-50/80 text-red-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-red-100 hover:text-red-700",
          className,
        )}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
      >
        <Power size={16} strokeWidth={2.1} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={cn(
        subtle
          ? "flex w-full items-center justify-center gap-2 rounded-full border border-red-100/80 bg-red-50/70 px-4 py-3 text-sm font-medium text-red-600 shadow-sm backdrop-blur-md transition hover:bg-red-50"
          : "flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-[0_8px_18px_rgba(43,52,55,0.16)] transition hover:brightness-110",
        className,
      )}
    >
      <LogOut size={18} />
      Cerrar sesión
    </button>
  );
}
