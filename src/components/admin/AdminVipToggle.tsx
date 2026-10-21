"use client";

import { useTransition } from "react";
import { setUserVipAction } from "@/app/actions/admin";

type Props = {
  userId: string;
  isVip: boolean;
};

export default function AdminVipToggle({ userId, isVip }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await setUserVipAction(userId, !isVip);
        });
      }}
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
        isVip
          ? "border border-outline-variant/40 bg-surface-low text-on-surface-variant hover:bg-surface-container"
          : "bg-primary text-on-primary hover:brightness-110"
      }`}
    >
      {pending ? "…" : isVip ? "Quitar VIP" : "Hacer VIP"}
    </button>
  );
}
