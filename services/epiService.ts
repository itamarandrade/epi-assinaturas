import { supabaseAdmin } from '@/lib/supabase'

export type StatusResumo = { name: string; value: number; color: string; severity: number }
export type TopLoja = { loja: string; vencidos: number }
export type ColabResumo = {
  colaborador_id: number
  nome: string
  loja: string
  consultor: string
  counts: Record<string, number> // status → qtde
  total: number
}

/** Donut: EPIs por status (dinâmico) */
export async function getEpiStatusResumo(filters?: { loja?: string; consultor?: string }): Promise<StatusResumo[]> {
  let q = supabaseAdmin
    .from('colaborador_epi')
    .select(`
      id, ativo,
      status:status_epi_id ( id, name, color_hex, severity ),
      colaborador:colaborador_id ( loja, consultor )
    `)
    .eq('ativo', true)

  if (filters?.loja)      q = q.eq('colaborador.loja', filters.loja)
  if (filters?.consultor) q = q.eq('colaborador.consultor', filters.consultor)

  const { data, error } = await q
  if (error) throw error

  const map = new Map<string, { v: number; color: string; sev: number }>()
  for (const r of (data as any[])) {
    const name  = r.status?.name ?? '—'
    const color = r.status?.color_hex ?? '#94a3b8'
    const sev   = r.status?.severity ?? 100
    const curr  = map.get(name) || { v: 0, color, sev }
    curr.v++
    map.set(name, curr)
  }
  return Array.from(map, ([name, o]) => ({ name, value: o.v, color: o.color, severity: o.sev }))
    .sort((a, b) => a.severity - b.severity)
}

/** Top 10 lojas com mais EPIs vencidos */
export async function getTop10VencidosPorLoja(filters?: { consultor?: string }): Promise<TopLoja[]> {
  let q = supabaseAdmin
    .from('colaborador_epi')
    .select(`
      id, ativo,
      status:status_epi_id ( name ),
      colaborador:colaborador_id ( loja, consultor )
    `)
    .eq('ativo', true)

  const { data, error } = await q
  if (error) throw error

  const m = new Map<string, number>()
  for (const r of (data as any[])) {
    if (filters?.consultor && r.colaborador?.consultor !== filters.consultor) continue
    const isVenc = (r.status?.name || '').toUpperCase().includes('VENCID')
    if (!isVenc) continue
    const loja = r.colaborador?.loja || '—'
    m.set(loja, (m.get(loja) || 0) + 1)
  }
  return Array.from(m, ([loja, vencidos]) => ({ loja, vencidos }))
    .sort((a, b) => b.vencidos - a.vencidos)
    .slice(0, 10)
}

/** Lista de colaboradores com resumo de EPIs por status */
export async function getColaboradoresResumoEpi(filters?: { loja?: string; consultor?: string }): Promise<ColabResumo[]> {
  let q = supabaseAdmin
    .from('colaborador_epi')
    .select(`
      id, ativo,
      status:status_epi_id ( name ),
      colaborador:colaborador_id ( id, nome, loja, consultor )
    `)
    .eq('ativo', true)

  if (filters?.loja)      q = q.eq('colaborador.loja', filters.loja)
  if (filters?.consultor) q = q.eq('colaborador.consultor', filters.consultor)

  const { data, error } = await q
  if (error) throw error

  const byColab = new Map<number, ColabResumo>()
  for (const r of (data as any[])) {
    const c = r.colaborador
    if (!c) continue
    const id = c.id as number
    const st = (r.status?.name || '—')
    if (!byColab.has(id)) {
      byColab.set(id, { colaborador_id: id, nome: c.nome, loja: c.loja, consultor: c.consultor, counts: {}, total: 0 })
    }
    const row = byColab.get(id)!
    row.counts[st] = (row.counts[st] || 0) + 1
    row.total++
  }
  return Array.from(byColab.values()).sort((a, b) => a.nome.localeCompare(b.nome))
}

/** opções de filtro (globais) */
export async function getFilterOptions(): Promise<{ lojas: string[]; consultores: string[]; statuses: { name: string; color: string }[] }> {
  const [lojasRes, consRes, stsRes] = await Promise.all([
    supabaseAdmin.from('colaborador').select('loja').neq('loja', '').order('loja'),
    supabaseAdmin.from('colaborador').select('consultor').neq('consultor', '').order('consultor'),
    supabaseAdmin.from('status_epi_kind').select('name,color_hex').order('severity'),
  ])
  const lojas = Array.from(new Set((lojasRes.data || []).map(r => r.loja))).filter(Boolean)
  const consultores = Array.from(new Set((consRes.data || []).map(r => r.consultor))).filter(Boolean)
  const statuses = (stsRes.data || []).map(s => ({ name: s.name as string, color: (s as any).color_hex as string }))
  return { lojas, consultores, statuses }
}
