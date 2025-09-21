"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { Header } from "@/src/components/layout/Header";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Si el evento es SIGNED_OUT, asegurar que el usuario sea null
        if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  // Si no hay usuario autenticado, mostrar solo el contenido (página de login)
  if (!user) {
    return <>{children}</>;
  }

  // Si hay usuario autenticado, mostrar el layout completo del dashboard
  return (
    <div className="w-full">
      <div className="h-full lg:ml-72 xl:ml-80">
        <Header />
        <div className="relative flex h-full flex-col px-4 pt-14 sm:px-6 lg:px-8">
          <main className="flex-auto p-6 sm:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}