import { supabaseAdmin } from '@/lib/supabase';

export async function upsertColaboradorEpi(payload: {
  colaborador_id: number;
  epi_id: number;
  status_epi_id: number;
  proximo_fornecimento?: string|null;
  quantidade?: number|null;
  observacao?: string|null;
}) {
  // inativa vínculo anterior (se existir)
  await supabaseAdmin.from('colaborador_epi')
    .update({ ativo: false })
    .eq('colaborador_id', payload.colaborador_id)
    .eq('epi_id', payload.epi_id)
    .eq('ativo', true);

  // insere ativo
  await supabaseAdmin.from('colaborador_epi').insert({
    colaborador_id: payload.colaborador_id,
    epi_id: payload.epi_id,
    status_epi_id: payload.status_epi_id,
    proximo_fornecimento: payload.proximo_fornecimento ?? null,
    quantidade: payload.quantidade ?? null,
    observacao: payload.observacao ?? null,
    ativo: true,
  }).throwOnError();
}
