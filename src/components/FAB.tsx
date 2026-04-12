"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export default function FAB() {
  return (
    <Link
      href="/add-expense"
      className="fixed bottom-28 right-6 w-16 h-16 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-40 group"
    >
      <Plus
        size={28}
        strokeWidth={2.2}
        className="group-active:rotate-90 transition-transform duration-300"
      />
    </Link>
  );
}
