import { LayoutDashboard } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      {/* Top navbar */}
      <header className="sticky top-0 z-50 border-b border-outline-variant/30 bg-surface-lowest/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <LayoutDashboard size={16} />
            </div>
            <div>
              <span className="font-headline text-base font-bold tracking-tight text-on-surface">
                SinDescuadre
              </span>
              <span className="ml-2 rounded-full bg-surface-low px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Admin
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-4">
            <SignOutButton
              compact
              className="border-outline-variant/40 bg-surface-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            />
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
