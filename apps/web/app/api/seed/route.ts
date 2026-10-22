import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Rota GET para facilitar a chamada pelo navegador
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Faltam as variáveis de ambiente do Supabase (URL ou SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  // Cria um cliente com a Service Role Key para ignorar as políticas RLS
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Criar Organização Teste
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: "Empresa Teste",
        slug: "empresa-teste",
      })
      .select()
      .single();

    if (orgError) {
      // Se já existir, podemos tentar buscar para continuar o script
      if (orgError.code === '23505') { // Unique violation
        console.log("Organização já existe, continuando...");
      } else {
        throw new Error(`Erro ao criar organização: ${orgError.message}`);
      }
    }

    const org = orgData || (await supabaseAdmin.from("organizations").select().eq("slug", "empresa-teste").single()).data;

    if (!org) {
       throw new Error("Não foi possível criar nem encontrar a organização.");
    }

    // 2. Criar Usuários no Auth do Supabase
    const usersToCreate = [
      { email: "admin@omni.com", password: "password123", role: "owner" },
      { email: "funcionario@omni.com", password: "password123", role: "member" },
    ];

    for (const u of usersToCreate) {
      // Tenta criar o usuário
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true, // Auto-confirmar email
      });

      let userId = authData.user?.id;

      if (authError) {
        // Se o email já existe, buscamos o usuário
        if (authError.message.includes("Email address already registered by another user") || authError.status === 422) {
            console.log(`Usuário ${u.email} já existe. Buscando ID...`);
            // Nota: Para simplificar no seed, pegaremos da base (se não for possível pegar por listUsers, usaremos admin)
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = users.find(x => x.email === u.email);
            if (existingUser) {
                userId = existingUser.id;
            } else {
                throw new Error(`Erro ao listar usuários: não achou ${u.email}`);
            }
        } else {
            throw new Error(`Erro ao criar usuário ${u.email}: ${authError.message}`);
        }
      }

      // 3. Inserir ou atualizar na tabela Profiles
      if (userId) {
        const profileData = {
          id: userId,
          organization_id: org.id,
          role: u.role,
          full_name: u.role === "owner" ? "Administrador" : "Funcionário de Teste",
        };

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert(profileData); // Usa upsert caso já exista

        if (profileError) {
          throw new Error(`Erro ao criar perfil para ${u.email}: ${profileError.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Seed executado com sucesso!",
      organization: org,
      users: usersToCreate.map(u => u.email)
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
