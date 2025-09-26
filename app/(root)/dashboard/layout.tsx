"use client";

import { ReactNode, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase/client';

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            console.error('Error de autenticación detectado en la URL:', searchParams.get('error_description'));
            
            // Cierra la sesión del usuario para limpiar el estado roto.
            supabase.auth.signOut();
            
            // Redirige a la página de login.
            router.push('/'); 
        }
    }, [searchParams, router]);

    return (
        <div>
            {children}
        </div>
    );
}