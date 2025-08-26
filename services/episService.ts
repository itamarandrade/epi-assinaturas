import { supabaseAdmin } from '@/lib/supabase'
import { EpiPivotRow, Filtro, LojaProblema, StatusCount } from '@/types/epis'

function applyFiltro(query: any, filtro: Filtro) {
  if (filtro.loja)      query = query.eq('loja', filtro.loja)
  if (filtro.consultor) query = query.eq('consultor', filtro.consultor)
  if (filtro.busca && filtro.busca.trim()) {
    const s = filtro.busca.trim()
    query = query.or(`colaborador_nome.ilike.%${s}%,nome_epi.ilike.%${s}%`)
  }
  return query
}

/* ------------------------- paginação na VIEW ------------------------- */
const PAGE = 1000

async function fetchAllFromView<T = any>(
  select: string,
  filtro: Filtro
): Promise<T[]> {
  const out: T[] = []
  let from = 0
  while (true) {
    let q = supabaseAdmin
      .from('vw_epis_colaboradores')
      .select(select)
      .order('id', { ascending: true })        // precisa ter 'id' na view
      .range(from, from + PAGE - 1)

    q = applyFiltro(q, filtro)

    const { data, error } = await q
    if (error) throw error
    const rows = (data ?? []) as T[]
    out.push(...rows)

    if (rows.length < PAGE) break
    from += PAGE
  }
  return out
}

/** 1) Total de EPIs (respeita filtros) – OK, count é no banco */
export async function getTotalEpis(filtro: Filtro): Promise<number> {
  let query = supabaseAdmin
    .from('vw_epis_colaboradores')
    .select('id', { count: 'exact', head: true })

  query = applyFiltro(query, filtro)

  const { count, error } = await query
  if (error) throw error
  return count || 0
}

/** 2) Donut: contagem por TODOS os status (com paginação) */
export async function getContagemPorStatus(filtro: Filtro): Promise<StatusCount[]> {
  const rows = await fetchAllFromView<any>('status_epi', filtro)

  const map = new Map<string, number>()
  for (const r of rows) {
    const st = (r as any).status_epi ?? 'SEM STATUS'
    map.set(st, (map.get(st) || 0) + 1)
  }

  return Array.from(map.entries())
    .map(([status_epi, qtde]) => ({ status_epi, qtde }))
}

/** 3) Pivot: EPIs × status (com paginação) */
export async function getPivotEpiPorStatus(filtro: Filtro): Promise<EpiPivotRow[]> {
  const rows = await fetchAllFromView<any>('nome_epi,status_epi', filtro)

  const map = new Map<string, EpiPivotRow>()
  for (const r of rows) {
    const nome = (r as any).nome_epi ?? '—'
    const st = (r as any).status_epi ?? 'SEM STATUS'
    const row = map.get(nome) || {
      nome_epi: nome,
      byStatus: Object.create(null) as Record<string, number>,
      total: 0,
    }
    row.byStatus[st] = (row.byStatus[st] || 0) + 1
    row.total++
    map.set(nome, row)
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

/** 4) Top 10 lojas com mais problemas (PENDENTE + VENCIDO) (com paginação) */
export async function getTopLojasProblemas(filtro: Filtro, limit = 10): Promise<LojaProblema[]> {
  const rows = await fetchAllFromView<any>('loja,status_epi', filtro)

  const map = new Map<string | null, LojaProblema>()
  for (const r of rows) {
    const loja = (r as any).loja ?? null
    const st = String((r as any).status_epi || 'SEM STATUS').toUpperCase()
    const row = map.get(loja) || { loja, pendentes: 0, vencidos: 0, problemas: 0 }
    if (st === 'PENDENTE') { row.pendentes++; row.problemas++; }
    if (st === 'VENCIDO')  { row.vencidos++;  row.problemas++; }
    map.set(loja, row)
  }

  return Array.from(map.values())
    .sort((a, b) => b.problemas - a.problemas)
    .slice(0, limit)
}
