"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase/client';
import { AppSession, mapSupabaseSessionToApp } from '@/src/types/types';

interface UseSessionResult {
  session: AppSession | null;
  loading: boolean;
  error: string | null;
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          setError(sessionError.message);
          setSession(null);
        } else if (data?.session) {
          const mapped = mapSupabaseSessionToApp(data.session);
          setSession(mapped);
          setError(null);
        } else {
          setSession(null);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Error al obtener la sesión');
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchSession();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (session) {
          const mapped = mapSupabaseSessionToApp(session);
          setSession(mapped);
          setError(null);
        } else {
          setSession(null);
          setError(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, loading, error };
}
