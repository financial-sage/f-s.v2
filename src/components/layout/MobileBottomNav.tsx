'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Menu,
  X,
  Wallet,
  Target,
  PiggyBank,
  ShoppingCart
} from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);

  const menuItems = [
    { href: '/budget', icon: Target, label: 'Presupuestos', color: '#22c55e' },
    { href: '/accounts', icon: Wallet, label: 'Cuentas', color: '#3b82f6' },
    { href: '/savings', icon: PiggyBank, label: 'Ahorros', color: '#f59e0b' },
    { href: '/categories-management', icon: ShoppingCart, label: 'Categorías', color: '#a855f7' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Overlay del menú */}
      {showMenu && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Panel del menú desplegable */}
      <div 
        className={`fixed bottom-16 left-0 right-0 border-t border-zinc-900/7.5 dark:border-white/7.5 z-50 lg:hidden transition-transform duration-300 backdrop-blur-xs dark:backdrop-blur-sm bg-white/(--bg-opacity-light) dark:bg-zinc-900/(--bg-opacity-dark) ${
          showMenu ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ "--bg-opacity-light": "50%", "--bg-opacity-dark": "20%" } as React.CSSProperties}
      >
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Más opciones</h3>
            <button 
              onClick={() => setShowMenu(false)}
              className="p-2 hover:bg-zinc-900/5 dark:hover:bg-white/5 rounded-lg transition-colors"
              type="button"
            >
              <X size={20} className="text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMenu(false)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl transition-all ${
                    active 
                      ? 'bg-zinc-900/10 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10' 
                      : 'bg-zinc-900/5 dark:bg-white/3 hover:bg-zinc-900/10 dark:hover:bg-white/5 border border-zinc-900/10 dark:border-white/10'
                  }`}
                >
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ 
                      backgroundColor: `${item.color}20`,
                      border: `1px solid ${item.color}40`
                    }}
                  >
                    <Icon 
                      size={24} 
                      strokeWidth={1.5}
                      style={{ color: item.color }}
                    />
                  </div>
                  <span className="text-xs font-medium text-zinc-900 dark:text-white text-center">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barra de navegación inferior */}
      <nav 
        className="fixed bottom-0 left-0 right-0 border-t border-zinc-900/7.5 dark:border-white/7.5 z-50 lg:hidden backdrop-blur-xs dark:backdrop-blur-sm bg-white/(--bg-opacity-light) dark:bg-zinc-900/(--bg-opacity-dark)"
        style={{ "--bg-opacity-light": "50%", "--bg-opacity-dark": "20%" } as React.CSSProperties}
      >
        <div className="grid grid-cols-3 h-16 px-2">
          {/* Botón de Menú */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex flex-col items-center justify-center gap-1 transition-colors"
            type="button"
          >
            <div 
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                showMenu ? 'bg-blue-500/20 border border-blue-500/30' : 'hover:bg-zinc-900/5 dark:hover:bg-white/5'
              }`}
            >
              <Menu 
                size={20} 
                strokeWidth={1.5}
                className={showMenu ? 'text-blue-500' : 'text-zinc-600 dark:text-zinc-400'}
              />
            </div>
            <span className={`text-[10px] font-medium ${showMenu ? 'text-blue-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
              Menú
            </span>
          </button>

          {/* Dashboard */}
          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center gap-1 transition-colors relative"
          >
            {isActive('/dashboard') && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-b-full" />
            )}
            <div 
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                isActive('/dashboard') ? 'bg-blue-500/20 border border-blue-500/30' : 'hover:bg-zinc-900/5 dark:hover:bg-white/5'
              }`}
            >
              <LayoutDashboard 
                size={20} 
                strokeWidth={1.5}
                style={{ color: isActive('/dashboard') ? '#3b82f6' : 'currentColor' }}
                className={isActive('/dashboard') ? '' : 'text-zinc-600 dark:text-zinc-400'}
              />
            </div>
            <span className={`text-[10px] font-medium ${isActive('/dashboard') ? 'text-blue-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
              Dashboard
            </span>
          </Link>

          {/* Seguimiento de Gastos */}
          <Link
            href="/expenses-tracking"
            className="flex flex-col items-center justify-center gap-1 transition-colors relative"
          >
            {isActive('/expenses-tracking') && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-purple-500 rounded-b-full" />
            )}
            <div 
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                isActive('/expenses-tracking') ? 'bg-purple-500/20 border border-purple-500/30' : 'hover:bg-zinc-900/5 dark:hover:bg-white/5'
              }`}
            >
              <Receipt 
                size={20} 
                strokeWidth={1.5}
                style={{ color: isActive('/expenses-tracking') ? '#a855f7' : 'currentColor' }}
                className={isActive('/expenses-tracking') ? '' : 'text-zinc-600 dark:text-zinc-400'}
              />
            </div>
            <span className={`text-[10px] font-medium ${isActive('/expenses-tracking') ? 'text-purple-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
              Gastos
            </span>
          </Link>
        </div>
      </nav>

      {/* Spacer para que el contenido no quede detrás de la barra */}
      <div className="h-16 lg:hidden" />
    </>
  );
}
