import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ─── Rotas públicas ────────────────────────────────────────────────────────
// Rotas que NÃO requerem autenticação.
// ─── Rotas públicas ────────────────────────────────────────────────────────
// Rotas que NÃO requerem autenticação (recursos estáticos, login e cadastro).
const PUBLIC_ROUTES = [
  "/login",
  "/cadastro",
  "/api/seed",
  "/manifest.json",
  "/sw.js",
];

// ─── Rotas privadas por destino de role ───────────────────────────────────
// /dashboard → área gerencial (owner e admin)
// /app       → área do funcionário (member)
const MANAGER_ROUTES = /^\/dashboard(\/.*)?$/;
const MEMBER_ROUTES  = /^\/app(\/.*)?$/;

/**
 * Middleware do Next.js — proxy de autenticação e autorização.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Corrige requisições relativas de chunks do Turbopack (ex: /app/static/chunks/ -> /_next/static/chunks/)
  if (pathname.includes("/static/chunks/")) {
    const chunkPath = pathname.substring(pathname.indexOf("/static/chunks/"));
    return NextResponse.rewrite(new URL(`/_next${chunkPath}`, request.url));
  }

  // ── 1. Inicializa o response base ──────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request });

  // ── 2. Cria o client Supabase para o middleware ────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              supabaseResponse.headers.set(key, value)
            );
          }
        },
      },
    }
  );

  // ── 3. Renova o token (DEVE ser chamado antes de qualquer redirect) ────
  const { data: claims } = await supabase.auth.getClaims();
  const isAuthenticated = !!claims?.claims;

  // ── 4. Rota raiz "/": redireciona para /dashboard ou /login ────────────
  if (pathname === "/") {
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = isAuthenticated ? "/dashboard" : "/login";
    targetUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(targetUrl);
  }

  // ── 5. Se já está logado e tenta acessar /login → vai para o dashboard ───
  if (pathname === "/login" && isAuthenticated) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/dashboard";
    dashUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(dashUrl);
  }

  // ── 6. Rotas públicas: deixa passar sem verificação de role ───────────
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return supabaseResponse;
  }

  // ── 7. Não autenticado tentando rota privada → /login ─────────────────
  if (!isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 6. Busca a role do usuário autenticado ─────────────────────────────
  // Fazemos uma query direta na tabela profiles usando o service client.
  // O RLS garante que o usuário só vê o próprio profile.
  const userId = claims!.claims.sub;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const role = profile?.role as "owner" | "admin" | "manager" | "member" | undefined;

  // ── 7. Redirecionamento baseado em role ────────────────────────────────

  // member tentando acessar área gerencial → redireciona para /app (bater ponto)
  if (role === "member" && MANAGER_ROUTES.test(pathname)) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/app";
    appUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(appUrl);
  }

  // admin tentando acessar área do funcionário (/app) → admin NÃO bate ponto
  if ((role === "admin" || role === "owner") && MEMBER_ROUTES.test(pathname)) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/dashboard/admin";
    dashUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(dashUrl);
  }

  // manager tentando acessar área do funcionário (/app) → gerente NÃO bate ponto
  if (role === "manager" && MEMBER_ROUTES.test(pathname)) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/dashboard";
    dashUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(dashUrl);
  }

  // manager tentando acessar rotas globais de admin (ex: /dashboard/admin) → redireciona para /dashboard para ir ao seu slug
  if (role === "manager" && pathname.startsWith("/dashboard/admin")) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/dashboard";
    dashUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(dashUrl);
  }

  // ── 8. Acesso permitido → continua com response (cookies atualizados) ─
  return supabaseResponse;
}

// ─── Configuração do matcher ──────────────────────────────────────────────
// Executa o middleware em todas as rotas exceto arquivos estáticos,
// imagens otimizadas, manifest, service worker e favicon — evita overhead desnecessário.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|static/chunks|favicon.ico|sw\\.js|manifest\\.json|images/|.*\\.(?:js|map|css|svg|png|jpg|jpeg|gif|webp|ico|json)$).*)",
  ],
};
