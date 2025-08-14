import { supabaseAdmin } from '@/lib/supabase';
import { normalize } from '@/lib/normalize';

type Source = 'geral'|'epi';

/** Garante que o status (geral/epi) exista e retorna seu ID */
export async function ensureStatusKind(source: Source, raw: string): Promise<number> {
  const normalized = normalize(raw);
  const table = source === 'geral' ? 'status_geral_kind' : 'status_epi_kind';

  // 1) alias
  const a = await supabaseAdmin
    .from('status_alias')
    .select('kind_id')
    .eq('source', source)
    .eq('normalized', normalized)
    .maybeSingle();
  if (a.data) return a.data.kind_id as number;

  // 2) kind direto
  const k = await supabaseAdmin.from(table).select('id, normalized').eq('normalized', normalized).maybeSingle();
  let kindId = k.data?.id as number | undefined;
  if (!kindId) {
    // heurística de defaults
    const isVenc  = normalized.includes('VENCID');
    const isPend  = normalized.includes('PENDEN');
    const isFut   = normalized.includes('FUTUR');
    const isDia   = normalized.includes('EM_DIA');

    const severity = isVenc ? 10 : isPend ? 50 : isFut ? 60 : 100;
    const color    = isVenc ? '#ef4444' : isPend ? '#facc15' : isFut ? '#60a5fa' : '#22c55e';
    const is_apt   = source === 'geral' ? !(isVenc || isPend) : undefined;

    const ins = await supabaseAdmin.from(table)
      .insert({ name: raw, severity, color_hex: color, ...(source==='geral' ? { is_apt } : {}) })
      .select('id')
      .single();
    if (ins.error) throw ins.error;
    kindId = ins.data.id as number;
  }

  // 3) cria alias
  await supabaseAdmin.from('status_alias').insert({ source, raw_value: raw, kind_id: kindId }).throwOnError();
  return kindId!;
}
