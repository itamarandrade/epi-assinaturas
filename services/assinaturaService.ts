import { supabase } from '@/lib/supabase'

/**
 * Tipo para dados do gráfico de status geral de EPIs
 */
export type GraficoData = { name: string; value: number }

/**
 * Tipo para ranking de lojas com problemas
 */
export type RankingLoja = { loja: string; problemas: number }

/**
 * Tipo para resumo por consultor
 */
export type RankingConsultor = {
  consultor: string
  emDia: number
  pendente: number
  vencido: number
}

/**
 * Tipo para detalhamento por loja de um consultor
 */
export type DetalheLoja = {
  loja: string
  emDia: number
  pendente: number
  vencido: number
}

/**
 * Retorna dados agregados de EPIs:
 * - grafico: distribui "Em Dia", "Pendentes", "Vencidos"
 * - ranking: top lojas com problemas (pendentes + vencidos)
 * - resumo: por consultor com contagem de cada status
 */
export async function getResumoEpis(loja?: string|null, consultor?: string|null): Promise<{
  
  grafico: GraficoData[]
  ranking: RankingLoja[]
  resumo: RankingConsultor[]
}> {
  let query = supabase.from('assinaturas_epi').select('*')
  if (loja)      query = query.eq('loja', loja)
  if (consultor) query = query.eq('consultor', consultor)
  const { data, error } = await supabase.from('assinaturas_epi').select('*')
  if (error) throw error

  // Gráfico de status geral
  const grafico: GraficoData[] = [
    { name: 'Em Dia',   value: data.filter(d => d.status === 'EM DIA').length },
    { name: 'Pendentes', value: data.filter(d => d.status === 'PENDENTE').length },
    { name: 'Vencidos',  value: data.filter(d => d.status === 'VENCIDO').length },
  ]

  // Ranking de lojas com mais problemas (pendentes + vencidos)
  const rankingMap: Record<string, number> = {}
  data.forEach(({ loja, status }) => {
    if (status !== 'EM DIA') {
      rankingMap[loja] = (rankingMap[loja] || 0) + 1
    }
  })
  const ranking: RankingLoja[] = Object.entries(rankingMap)
    .map(([loja, problemas]) => ({ loja, problemas }))
    .sort((a, b) => b.problemas - a.problemas)

  // Resumo por consultor
  const resumoMap: Record<string, { emDia: number; pendente: number; vencido: number }> = {}
  data.forEach(({ consultor, status }) => {
    if (!resumoMap[consultor]) {
      resumoMap[consultor] = { emDia: 0, pendente: 0, vencido: 0 }
    }
    if (status === 'EM DIA')    resumoMap[consultor].emDia++
    if (status === 'PENDENTE') resumoMap[consultor].pendente++
    if (status === 'VENCIDO')  resumoMap[consultor].vencido++
  })
  const resumo: RankingConsultor[] = Object.entries(resumoMap)
    .map(([consultor, valores]) => ({ consultor, ...valores }))
    .sort((a, b) => (b.pendente + b.vencido) - (a.pendente + a.vencido))

  return { grafico, ranking, resumo }
}

/**
 * Retorna o detalhamento por loja de um consultor específico:
 * cada item contém o total de EPIs "Em Dia", "Pendente" e "Vencido" na loja
 */
export async function getDetalhePorConsultor(
  consultor: string
): Promise<DetalheLoja[]> {
  const { data, error } = await supabase
    .from('assinaturas_epi')
    .select('loja, epis')
    .eq('consultor', consultor)
  if (error) throw error

  // Agrupa por loja
  const map: Record<string, { emDia: number; pendente: number; vencido: number }> = {}
  data.forEach(row => {
    const loja = String(row.loja)
    if (!map[loja]) {
      map[loja] = { emDia: 0, pendente: 0, vencido: 0 }
    }
    ;(row.epis as any[]).forEach(e => {
      const status = String(e.status).toUpperCase()
      if (status === 'EM DIA')     map[loja].emDia++
      else if (status === 'PENDENTE') map[loja].pendente++
      else if (status === 'VENCIDO')  map[loja].vencido++
    })
  })

  // Converte em array ordenado por total de problemas (pendentes + vencidos)
  return Object.entries(map)
    .map(([loja, cnt]) => ({ loja, ...cnt }))
    .sort((a, b) => (b.pendente + b.vencido) - (a.pendente + a.vencido))
}
