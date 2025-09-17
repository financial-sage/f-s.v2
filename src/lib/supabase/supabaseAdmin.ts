import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export const supabaseAdmin = createAdminClient();

// Helper: check if a uid has admin role in profiles
export async function isUserAdmin(uid: string) {
  console.log('Checking admin for uid', uid, supabaseAdmin);

  if (!supabaseAdmin) return false;
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', uid)
    .limit(1)
    .maybeSingle();


  if (error || !data) return false;
  return (data as { role?: string }).role === 'admin';
}
