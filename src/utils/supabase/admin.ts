// Re-exports the shared admin client so both import paths work:
//   import { createAdminClient } from "@/utils/supabase/admin"
//   import { getSupabaseAdminClient } from "@/lib/supabase/server"
export { getSupabaseAdminClient as createAdminClient } from "@/lib/supabase/server";
