import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL\n" +
      "Copy apps/web/.env.local.example to apps/web/.env.local and fill in the values."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY\n" +
      "Copy apps/web/.env.local.example to apps/web/.env.local and fill in the values."
  );
}

/**
 * Singleton Supabase browser client.
 * Import this in any Client Component or Server Action that needs DB access.
 *
 * @example
 * import { supabase } from "@/lib/supabase";
 * const { data } = await supabase.from("table").select("*");
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
