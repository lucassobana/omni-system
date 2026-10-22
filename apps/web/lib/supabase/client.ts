import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client para Client Components (browser).
 *
 * Cria uma nova instância a cada chamada — o @supabase/ssr gerencia
 * internamente o singleton via storage para evitar múltiplas instâncias.
 *
 * @example
 * // Em um Client Component:
 * const supabase = createClient();
 * const { data } = await supabase.from("profiles").select("*");
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
