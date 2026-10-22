"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action: login com email e senha.
 *
 * Fluxo:
 * 1. Valida campos obrigatórios.
 * 2. Chama supabase.auth.signInWithPassword.
 * 3. Em caso de erro, retorna o estado com a mensagem de erro.
 * 4. Em caso de sucesso, redireciona para a rota indicada em `redirectTo`
 *    ou para /app como fallback (o middleware irá redirecionar para
 *    /dashboard se a role for owner/admin).
 */
export async function loginAction(
  prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const redirectTo = formData.get("redirectTo")?.toString() || "/dashboard";

  // Validação básica no servidor (a UI também valida, mas server-side é obrigatório)
  if (!email || !password) {
    return { error: "E-mail e senha são obrigatórios." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mapeamento de erros do Supabase Auth para mensagens em português
    // sem revelar detalhes de segurança (ex: "usuário não existe")
    if (
      error.message.includes("Invalid login credentials") ||
      error.message.includes("invalid_credentials")
    ) {
      return { error: "E-mail ou senha incorretos." };
    }

    if (error.message.includes("Email not confirmed")) {
      return {
        error: "Confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.",
      };
    }

    if (error.message.includes("Too many requests")) {
      return {
        error: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      };
    }

    // Fallback para erros não mapeados
    console.error("Supabase Auth Error:", error.message, error);
    return { error: "Erro ao fazer login. Tente novamente." };
  }

  // Invalida o cache da rota de destino para garantir dados frescos
  revalidatePath("/", "layout");

  // O middleware irá redirecionar para /dashboard se a role for owner/admin
  redirect(redirectTo);
}
