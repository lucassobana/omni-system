import { createClient } from "@supabase/supabase-js";

/**
 * Cria um cliente do Supabase com a Service Role Key.
 * AVISO: Isso dá poderes de administrador para bypassar o RLS e acessar a API auth.admin.
 * NUNCA exponha esse cliente para o navegador (Client Components).
 * Use apenas em Server Actions ou Route Handlers.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY estão ausentes."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
