"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { Header } from "@/src/components/layout/Header";
import MobileBottomNav from "@/src/components/layout/MobileBottomNav";
import Loader from "@/src/components/common/Loader";
import { usePathname } from "next/navigation";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Verificar el estado inicial de autenticación
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id || 'no user');
        
        // Si el evento es SIGNED_OUT, mostrar overlay de transición brevemente
        if (event === 'SIGNED_OUT') {
          setIsTransitioning(true);
          setUser(null);
          // Remover el overlay después de un breve momento para permitir la redirección
          setTimeout(() => {
            setIsTransitioning(false);
          }, 500);
        } else if (event === 'SIGNED_IN') {
          setUser(session?.user ?? null);
          setIsTransitioning(false);
        } else {
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Overlay de transición (logout o cambio de estado)
  if (isTransitioning) {
    return (
      <div 
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#09090b'
        }}
      >
        <Loader size={64} />
        <p className="text-sm text-white font-medium mt-4">Cerrando sesión...</p>
      </div>
    );
  }

  // Loading inicial
  if (loading) {
    return (
      <div 
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ 
          backgroundColor: '#09090b'
        }}
      >
        <Loader size={64} />
        <p className="text-sm text-zinc-300 font-medium mt-4">Cargando...</p>
      </div>
    );
  }

  // Si no hay usuario autenticado, mostrar solo el contenido (página de login)
  if (!user) {
    return <>{children}</>;
  }

  // Si hay usuario autenticado, mostrar el layout completo del dashboard
  return (
    <div className="w-full h-full overflow-hidden" style={{ background: "var(--background-gradient)" }}>
      <div className="h-full lg:ml-72 xl:ml-80 flex flex-col overflow-hidden">
        <Header />
        <div className="relative flex-1 flex flex-col overflow-y-auto overflow-x-hidden px-2 sm:px-4 lg:px-8 pt-14" style={{ background: "var(--background-gradient)" }}>
          <main className="flex-auto p-3 sm:p-6 lg:p-8 pb-20 lg:pb-8">
            {children}
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </div>
  );
}