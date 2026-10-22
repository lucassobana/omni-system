import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Validar Sessão
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    // 2. Extrair dados da requisição
    const formData = await request.formData();
    const action = formData.get('action') as string | null; // 'entry' ou 'exit'
    const dataHoraStr = formData.get('data_hora') as string | null;
    const workRecordIdParam = formData.get('work_record_id') as string | null;
    const organizationIdParam = formData.get('organization_id') as string | null;
    const latStr = formData.get('latitude') as string | null;
    const lngStr = formData.get('longitude') as string | null;
    const usesVehicleStr = formData.get('uses_vehicle') as string | null;
    const usesVehicle = usesVehicleStr === 'true' || usesVehicleStr === '1';
    const vehicleReason = formData.get('vehicle_reason') as string | null;

    if (!dataHoraStr) {
      return NextResponse.json({ error: 'Data/hora não informada' }, { status: 400 });
    }

    const dataHora = new Date(dataHoraStr);
    const lat = latStr ? parseFloat(latStr) : null;
    const lng = lngStr ? parseFloat(lngStr) : null;

    // 4. Buscar se existe sessão em andamento em QUALQUER organização
    let openRecord = null;
    if (workRecordIdParam) {
      const { data: recById } = await supabase
        .from('work_records')
        .select('*, organizations(name)')
        .eq('id', workRecordIdParam)
        .eq('user_id', user.id)
        .maybeSingle();
      openRecord = recById;
    }

    if (!openRecord) {
      const { data: recByStatus } = await supabase
        .from('work_records')
        .select('*, organizations(name)')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();
      openRecord = recByStatus;
    }

    // Determina a ação se não foi fornecida explicitamente
    let punchAction = action;
    if (!punchAction) {
      punchAction = openRecord ? 'exit' : 'entry';
    }

    // ── ENTRADA ─────────────────────────────────────────────────────────────
    if (punchAction === 'entry') {
      if (openRecord) {
        const orgName = (openRecord.organizations as { name?: string } | null)?.name || 'outra organização';
        return NextResponse.json(
          { error: `Você já possui um ponto em andamento na organização "${orgName}". Registre a saída antes de iniciar nova entrada.` },
          { status: 400 }
        );
      }

      const targetOrgId = organizationIdParam || profile.organization_id;
      if (!targetOrgId) {
        return NextResponse.json({ error: 'Organização não selecionada' }, { status: 400 });
      }

      // Cria a Sessão (work_record) sem vínculo com escala
      const recordPayload: Record<string, unknown> = {
        organization_id: targetOrgId,
        user_id: user.id,
        shift_id: null,
        clock_in: dataHora.toISOString(),
        clock_in_lat: lat,
        clock_in_lng: lng,
        status: 'open',
        notes: usesVehicle
          ? 'USES_VEHICLE:true'
          : `USES_VEHICLE:false VEICULO_MOTIVO:${vehicleReason ? vehicleReason.trim() : 'Manutenção'}`,
      };

      let newRecord = null;
      const { data: recWithCol, error: insertError1 } = await supabase
        .from('work_records')
        .insert({
          ...recordPayload,
          uses_vehicle: usesVehicle,
        })
        .select()
        .single();

      if (!insertError1) {
        newRecord = recWithCol;
      } else if (insertError1.message.includes('uses_vehicle')) {
        const { data: recFallback, error: insertError2 } = await supabase
          .from('work_records')
          .insert(recordPayload)
          .select()
          .single();

        if (insertError2) {
          console.error('Erro ao criar sessão work_record:', insertError2);
          return NextResponse.json({ error: 'Erro ao criar sessão: ' + insertError2.message }, { status: 500 });
        }
        newRecord = recFallback;
      } else {
        console.error('Erro ao criar sessão work_record:', insertError1);
        return NextResponse.json({ error: 'Erro ao criar sessão: ' + insertError1.message }, { status: 500 });
      }

      // Cria a Marcação física de Entrada (time_punch) se a tabela existir
      try {
        await supabase.from('time_punches').insert({
          organization_id: targetOrgId,
          user_id: user.id,
          work_record_id: newRecord.id,
          punched_at: dataHora.toISOString(),
          type: 'ENTRY',
          source: 'web_sync',
        });
      } catch {
        // Tabela opcional
      }

      return NextResponse.json({ success: true, type: 'entrada', recordId: newRecord.id });
    }

    // ── SAÍDA ───────────────────────────────────────────────────────────────
    if (punchAction === 'exit') {
      if (!openRecord) {
        return NextResponse.json(
          { error: 'Não há ponto em andamento para encerrar.' },
          { status: 400 }
        );
      }

      const targetOrgId = openRecord.organization_id || profile.organization_id;

      // Bater saída física (time_punch) se a tabela existir
      try {
        await supabase.from('time_punches').insert({
          organization_id: targetOrgId,
          user_id: user.id,
          work_record_id: openRecord.id,
          punched_at: dataHora.toISOString(),
          type: 'EXIT',
          source: 'web_sync',
        });
      } catch {
        // Tabela opcional
      }

      // Calcula tempo trabalhado em minutos
      const clockInTime = new Date(openRecord.clock_in).getTime();
      const clockOutTime = dataHora.getTime();
      const breakMinutes = openRecord.break_minutes || 0;
      const workedMinutes = Math.max(0, Math.floor((clockOutTime - clockInTime) / 60000) - breakMinutes);

      // Atualiza o work_record com os dados apurados respeitando as colunas existentes no banco
      const { error: updateError } = await supabase
        .from('work_records')
        .update({
          clock_out: dataHora.toISOString(),
          clock_out_lat: lat ?? openRecord.clock_out_lat,
          clock_out_lng: lng ?? openRecord.clock_out_lng,
          worked_minutes: workedMinutes,
          status: 'closed',
        })
        .eq('id', openRecord.id);

      if (updateError) {
        console.error('Erro ao atualizar work_record na saída:', updateError);
        return NextResponse.json({ error: 'Erro ao registrar saída: ' + updateError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, type: 'saida', workedMinutes });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Erro na API de sync:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
