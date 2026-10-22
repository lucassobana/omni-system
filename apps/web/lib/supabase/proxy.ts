import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * updateSession — responsável por:
 * 1. Criar um Supabase client no contexto do middleware.
 * 2. Chamar getClaims() para verificar e renovar o token de sessão.
 * 3. Propagar os cookies atualizados tanto para a request (Server Components)
 *    quanto para a response (browser).
 *
 * Este arquivo é chamado pelo proxy.ts (middleware do Next.js).
 *
 * NÃO usar getSession() aqui — não valida o token e não é seguro
 * para tomada de decisão de autorização.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // IMPORTANTE: não colocar este client em uma variável global.
  // Sempre criar uma nova instância por request (Fluid compute).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Atualiza os cookies na request (para Server Components lerem)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Reconstrói a response com os cookies atualizados
          supabaseResponse = NextResponse.next({ request });
          // Propaga os cookies para o browser via response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          // Propaga headers adicionais (ex: PKCE challenge)
          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              supabaseResponse.headers.set(key, value)
            );
          }
        },
      },
    }
  );

  // getClaims() valida o JWT localmente via JWKS (sem chamada de rede
  // para projetos com chaves assimétricas). Necessário para renovar
  // o token de acesso quando ele expira.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
