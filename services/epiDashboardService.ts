// /services/epiDashboardService.ts
import { supabaseAdmin as supabase } from '@/lib/supabase'

export type Filtros = { loja?: string; consultor?: string }

export type GraficoData = { name: string; value: number }
export type RankingLoja = { loja: string | null; problemas: number }
export type RankingConsultor = { consultor: string; emDia: number; pendente: number; vencido: number }
export type DetalheLoja = { loja: string; emDia: number; pendente: number; vencido: number }

const logErr = (p: string, e: unknown) =>
  console.error(p, e && typeof e === 'object' && 'message' in (e as any) ? (e as any).message : e)

// ============================
// Paginação base para agregação
// ============================
const PAGE = 1000

type BaseRow = {
  colaborador_id: number | null
  loja: string | null
  consultor: string | null
  status_geral: string | null
  status_epi?: string | null
}

async function fetchAllBase(f: Filtros): Promise<BaseRow[]> {
  let from = 0
  const rows: BaseRow[] = []

  while (true) {
    let q = supabase
      .from('vw_epis_colaboradores')
      .select('colaborador_id, loja, consultor, status_geral, status_epi')
      .range(from, from + PAGE - 1)

    if (f.loja) q = q.eq('loja', f.loja)
    if (f.consultor) q = q.eq('consultor', f.consultor)

    const { data, error } = await q
    if (error) { logErr('fetchAllBase', error); throw error }

    const batch = (data ?? []) as BaseRow[]
    rows.push(...batch)
    if (batch.length < PAGE) break
    from += PAGE
  }

  return rows
}

function dedupPorColaborador(rows: BaseRow[]): Map<number, BaseRow> {
  const byColab = new Map<number, BaseRow>()
  for (const r of rows) {
    if (r.colaborador_id == null) continue
    if (!byColab.has(r.colaborador_id)) byColab.set(r.colaborador_id, r)
  }
  return byColab
}

// ===============================
// 1) DONUT / KPIs por status GERAL
// ===============================
export async function getResumoColaboradores(f: Filtros): Promise<GraficoData[]> {
  const rows = await fetchAllBase(f)
  const byColab = dedupPorColaborador(rows)

  // Só considera os 3 status principais
  const CHAVES = ['EM DIA', 'PENDENTE', 'VENCIDO'] as const
  const acc = new Map<string, number>()

  for (const r of byColab.values()) {
    const st = String(r.status_geral ?? '').toUpperCase()
    if (CHAVES.includes(st as any)) {
      acc.set(st, (acc.get(st) ?? 0) + 1)
    }
  }

  // Garante ordem e presença de todos, mesmo que algum seja 0
  return [
    { name: 'EM DIA',   value: acc.get('EM DIA')   ?? 0 },
    { name: 'PENDENTE', value: acc.get('PENDENTE') ?? 0 },
    { name: 'VENCIDO',  value: acc.get('VENCIDO')  ?? 0 },
  ]
}

// ===============================================
// 2) RANKING LOJAS (por colaboradores com problema)
// ===============================================
export async function getRankingLojaColaboradores(f: Filtros): Promise<RankingLoja[]> {
  const rows = await fetchAllBase(f)
  const byColab = dedupPorColaborador(rows)

  const problemasPorLoja = new Map<string | null, number>()
  for (const r of byColab.values()) {
    const st = String(r.status_geral ?? '').toUpperCase()
    if (st === 'PENDENTE' || st === 'VENCIDO') {
      const key = r.loja ?? null
      problemasPorLoja.set(key, (problemasPorLoja.get(key) ?? 0) + 1)
    }
  }

  const all = Array.from(problemasPorLoja.entries())
    .map(([loja, problemas]) => ({ loja, problemas }))
    .sort((a, b) => b.problemas - a.problemas)

  return all.slice(0, 10) // TOP 10
}

// =========================================
// 3) RESUMO POR CONSULTOR (tabela principal)
// =========================================
export async function getResumoPorConsultorColaboradores(f: Filtros): Promise<RankingConsultor[]> {
  const rows = await fetchAllBase(f)
  const byColab = dedupPorColaborador(rows)

  const acc = new Map<string, RankingConsultor>()
  for (const r of byColab.values()) {
    const cons = (r.consultor && r.consultor.trim()) ? r.consultor.trim() : '—'
    const st = String(r.status_geral ?? '').toUpperCase()

    const row = acc.get(cons) || { consultor: cons, emDia: 0, pendente: 0, vencido: 0 }
    if (st === 'EM DIA') row.emDia += 1
    else if (st === 'PENDENTE') row.pendente += 1
    else if (st === 'VENCIDO') row.vencido += 1
    acc.set(cons, row)
  }

  return Array.from(acc.values())
}

// =================================================
// 4) DETALHE POR LOJA — para um consultor específico
// =================================================
export async function getDetalhePorConsultorColaboradores(consultor: string): Promise<DetalheLoja[]> {
  const rows = await fetchAllBase({ consultor })
  const byColab = dedupPorColaborador(rows)

  const acc = new Map<string, DetalheLoja>()
  for (const r of byColab.values()) {
    const loja = (r.loja && r.loja.trim()) ? r.loja.trim() : '—'
    const st = String(r.status_geral ?? '').toUpperCase()

    const row = acc.get(loja) || { loja, emDia: 0, pendente: 0, vencido: 0 }
    if (st === 'EM DIA') row.emDia += 1
    else if (st === 'PENDENTE') row.pendente += 1
    else if (st === 'VENCIDO') row.vencido += 1
    acc.set(loja, row)
  }

  return Array.from(acc.values())
}

// ================================
// 5) Opções dos dropdowns (filtros)
// ================================
export async function getOpcoesFiltros() {
  const [c, l] = await Promise.all([
    supabase.from('vw_epis_colaboradores').select('consultor').not('consultor', 'is', null),
    supabase.from('vw_epis_colaboradores').select('loja').not('loja', 'is', null),
  ])
  if (c.error) throw c.error
  if (l.error) throw l.error

  const consultores = Array.from(
    new Set((c.data ?? []).map(r => String((r as any).consultor).trim()).filter(Boolean))
  ).sort()

  const lojas = Array.from(
    new Set((l.data ?? []).map(r => String((r as any).loja).trim()).filter(Boolean))
  ).sort()

  return { consultores, lojas }
}

// =====================================================
// 6) Lista paginada (linhas da view base para a tabela)
// =====================================================
const BASE_SELECT = `
  id,
  colaborador_id,
  colaborador_nome,
  loja,
  consultor,
  epi_id,
  nome_epi,
  status_epi_id,
  status_epi,
  status_geral_id,
  status_geral,
  proximo_fornecimento,
  mes_fornecimento,
  quantidade,
  observacao,
  ativo,
  created_at
`;

export async function getColaboradorEpiPage(
  page: number,
  pageSize: number,
  f: Filtros
): Promise<{ rows: any[]; total: number }> {
  const from = (page - 1) * pageSize
  const to   = from + pageSize - 1

  let q = supabase
    .from('vw_epis_colaboradores')
    .select(BASE_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (f.loja)      q = q.eq('loja', f.loja)
  if (f.consultor) q = q.eq('consultor', f.consultor)

  const { data, error, count } = await q
  if (error) { logErr('vw_epis_colaboradores page', error); throw error }

  return { rows: data ?? [], total: count ?? 0 }
}
