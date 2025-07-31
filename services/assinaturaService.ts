import { supabase } from '@/lib/supabase'

export async function getResumoEpis() {
  const { data, error } = await supabase.from('assinaturas_epi').select('*')
  if (error) throw error

  // Gráfico de status geral
  const grafico = [
    { name: 'Em Dia', value: data.filter(d => d.status === 'EM DIA').length },
    { name: 'Pendentes', value: data.filter(d => d.status === 'PENDENTE').length },
    { name: 'Vencidos', value: data.filter(d => d.status === 'VENCIDO').length },
  ]

  // Ranking de lojas com mais problemas (pendentes + vencidos)
  const rankingMap: Record<string, number> = {}
  data.forEach(({ loja, status }) => {
    if (status !== 'EM DIA') {
      rankingMap[loja] = (rankingMap[loja] || 0) + 1
    }
  })
  const ranking = Object.entries(rankingMap).map(([loja, problemas]) => ({ loja, problemas }))

  // Resumo por consultor
  const resumoMap: Record<string, { emDia: number, pendente: number, vencido: number }> = {}
  data.forEach(({ consultor, status }) => {
    if (!resumoMap[consultor]) {
      resumoMap[consultor] = { emDia: 0, pendente: 0, vencido: 0 }
    }
    if (status === 'EM DIA') resumoMap[consultor].emDia++
    if (status === 'PENDENTE') resumoMap[consultor].pendente++
    if (status === 'VENCIDO') resumoMap[consultor].vencido++
  })
  const resumo = Object.entries(resumoMap).map(([consultor, valores]) => ({
    consultor,
    ...valores
  }))

  return { grafico, ranking, resumo }
}
