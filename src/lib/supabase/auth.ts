import { supabase } from './client';

export interface Profile {
  id: string;
  role?: string;
  updated_at?: string;
  username?: string;
  full_name?: string;
}

/**
 * Verifica si un usuario tiene rol de administrador
 */
export async function isUserAdmin(uid: string): Promise<boolean> {
  if (!uid) return false;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', uid)
    .limit(1)
    .maybeSingle();
  
  if (error || !data) return false;
  return data.role === 'admin';
}

/**
 * Obtiene el perfil de un usuario
 */
export async function getUserProfile(uid: string): Promise<Profile | null> {
  if (!uid) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

/**
 * Actualiza el perfil de un usuario
 */
export async function updateUserProfile(uid: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', uid)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Profile;
}
