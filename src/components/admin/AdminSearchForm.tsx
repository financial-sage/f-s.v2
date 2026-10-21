"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export default function AdminSearchForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        const next = q.trim();
        const url = next
          ? `/admin?q=${encodeURIComponent(next)}`
          : "/admin";
        router.push(url);
      }}
    >
      <label className="relative min-w-0 flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por email o código de familia"
          className="w-full rounded-xl border border-outline-variant/40 bg-surface-lowest py-2.5 pl-9 pr-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>
      <button
        type="submit"
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
      >
        Buscar
      </button>
    </form>
  );
}
