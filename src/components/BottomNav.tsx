"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, CreditCard, History, User } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  if (["/add-expense", "/login", "/register"].includes(pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-8 pb-8 pt-4 bg-white/80 backdrop-blur-xl rounded-t-[3rem] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center justify-center p-3 rounded-full transition-transform hover:scale-110 ${
              isActive
                ? "bg-surface-low text-primary"
                : "text-slate-400"
            }`}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.2 : 1.6}
            />
            <span className="sr-only">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
