import { supabaseAdmin } from '@/lib/supabase';

export async function upsertColaborador(payload: {
  nome: string; loja?: string; consultor?: string;
  status_geral_id?: number|null; data_status?: string|null; data_admissao?: string|null;
}): Promise<number> {
  // como estamos “do zero”, vamos inserir simples; se quiser "merge", ajuste UNIQUE e use upsert
  const ins = await supabaseAdmin.from('colaborador')
    .insert({
      nome: payload.nome,
      loja: payload.loja || null,
      consultor: payload.consultor || null,
      status_geral_id: payload.status_geral_id ?? null,
      data_status: payload.data_status ?? null,
      data_admissao: payload.data_admissao ?? null
    })
    .select('id')
    .single();
  if (ins.error) throw ins.error;
  return ins.data.id as number;
}

export async function findColaboradorId(nome: string, loja?: string|null, consultor?: string|null): Promise<number|null> {
  const q = await supabaseAdmin.from('colaborador')
    .select('id')
    .eq('nome', nome)
    .eq('loja', loja || null)
    .eq('consultor', consultor || null)
    .maybeSingle();
  return q.data?.id ?? null;
}
