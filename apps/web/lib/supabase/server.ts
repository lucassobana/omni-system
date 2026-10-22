import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client para Server Components, Server Actions e Route Handlers.
 *
 * Deve ser chamado dentro de um contexto de request (Server Component,
 * Server Action ou Route Handler). Usa cookies() do Next.js para
 * ler e escrever a sessão do usuário.
 *
 * IMPORTANTE: Server Components não podem escrever cookies diretamente.
 * Para que os tokens de sessão sejam atualizados no browser, o proxy.ts
 * (middleware) deve ser configurado para interceptar e propagar os cookies.
 *
 * @example
 * // Em um Server Component ou Server Action:
 * const supabase = await createClient();
 * const { data: { user } } = await supabase.auth.getUser();
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components não podem escrever cookies.
            // O proxy.ts é responsável por propagar cookies de sessão
            // atualizados para o browser. Este catch é esperado.
          }
        },
      },
    }
  );
}
