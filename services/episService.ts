import { supabaseAdmin } from '@/lib/supabase'
import { EpiPivotRow, Filtro, LojaProblema, StatusCount } from '@/types/epis'

/**
 * Observação:
 * - Uso a view vw_epis_colaboradores (epis JOIN colaboradores) para permitir filtros por loja/consultor/busca.
 * - Se não existir, crie (veja SQL no final).
 */

function applyFiltro(query: any, filtro: Filtro) {
  if (filtro.loja)      query = query.eq('loja', filtro.loja)
  if (filtro.consultor) query = query.eq('consultor', filtro.consultor)
  if (filtro.busca && filtro.busca.trim()) {
    const s = filtro.busca.trim()
    query = query.or(`colaborador_nome.ilike.%${s}%,nome_epi.ilike.%${s}%`)
  }
  return query
}

/** 1) Total de EPIs (respeita filtros) */
export async function getTotalEpis(filtro: Filtro): Promise<number> {
  let query = supabaseAdmin
    .from('vw_epis_colaboradores')
    .select('id', { count: 'exact', head: true })

  query = applyFiltro(query, filtro)

  const { count, error } = await query
  if (error) throw error
  return count || 0
}

/** 2) Donut: contagem por TODOS os status (dinâmico) */
export async function getContagemPorStatus(filtro: Filtro): Promise<StatusCount[]> {
  let query = supabaseAdmin
    .from('vw_epis_colaboradores')
    .select('status_epi', { head: false })

  query = applyFiltro(query, filtro)

  const { data, error } = await query
  if (error) throw error

  const map = new Map<string, number>()
  for (const r of data ?? []) {
    const st = (r as any).status_epi ?? 'SEM STATUS'
    map.set(st, (map.get(st) || 0) + 1)
  }
  return Array.from(map.entries()).map(([status_epi, qtde]) => ({ status_epi, qtde }))
}

/** 3) Pivot: lista de EPIs com quantidades por status e total */
export async function getPivotEpiPorStatus(filtro: Filtro): Promise<EpiPivotRow[]> {
  let query = supabaseAdmin
    .from('vw_epis_colaboradores')
    .select('nome_epi,status_epi', { head: false })

  query = applyFiltro(query, filtro)

  const { data, error } = await query
  if (error) throw error

  const map = new Map<string, EpiPivotRow>()
  for (const r of data ?? []) {
    const nome = (r as any).nome_epi ?? '—'
    const st = (r as any).status_epi ?? 'SEM STATUS'
    const row = map.get(nome) || { 
        nome_epi: nome, 
        byStatus: Object.create(null) as Record<string, number>,
        total: 0 }
    row.byStatus[st] = (row.byStatus[st] || 0) + 1
    row.total++
    map.set(nome, row)
  }

  // Ordena por total desc
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

/** 4) Top 10 lojas com mais problemas (PENDENTE + VENCIDO) */
export async function getTopLojasProblemas(filtro: Filtro, limit = 10): Promise<LojaProblema[]> {
  let query = supabaseAdmin
    .from('vw_epis_colaboradores')
    .select('loja,status_epi', { head: false })

  query = applyFiltro(query, filtro)

  const { data, error } = await query
  if (error) throw error

  const map = new Map<string | null, LojaProblema>()
  for (const r of data ?? []) {
    const loja = (r as any).loja ?? null
    const st = String((r as any).status_epi || 'SEM STATUS')
    const row = map.get(loja) || { loja, pendentes: 0, vencidos: 0, problemas: 0 }
    if (st === 'PENDENTE') { row.pendentes++; row.problemas++; }
    if (st === 'VENCIDO')  { row.vencidos++;  row.problemas++; }
    map.set(loja, row)
  }

  return Array.from(map.values())
    .sort((a, b) => b.problemas - a.problemas)
    .slice(0, limit)
}
