import { supabaseAdmin } from '@/lib/supabase';

export async function ensureEpi(nome: string): Promise<number> {
  const f = await supabaseAdmin.from('epi_item').select('id').eq('nome', nome).maybeSingle();
  if (f.data) return f.data.id as number;
  const ins = await supabaseAdmin.from('epi_item').insert({ nome }).select('id').single();
  if (ins.error) throw ins.error;
  return ins.data.id as number;
}
