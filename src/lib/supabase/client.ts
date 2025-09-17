import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);

export async function isUserAdmin(uid: string) {

    if (!supabase) return false;
    const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', uid)
    .limit(1)
    .maybeSingle();
    
    console.log('Checking admin for uid', uid, data, error);

    if (error || !data) return false;
    return (data as { role?: string }).role === 'admin';
}