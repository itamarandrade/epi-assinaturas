// /services/ocorrenciasService.ts
import { supabaseAdmin } from '@/lib/supabase'

export type Filtros = {
  de?: string
  ate?: string
  unidade?: string
  area?: string
  natureza?: string
  operacao?: string
  estacao_maquina?: string
  situacao_geradora?: string
  parte_corpo?: string
  agente_causador?: string
}

const rpc = async <T=any>(fn: string, params: any): Promise<T> => {
  const { data, error } = await supabaseAdmin.rpc(fn, params)
  if (error) {
    const msg = `${fn}: ${error.message}${error.details ? ' — ' + error.details : ''}${error.hint ? ' — ' + error.hint : ''}`
    throw new Error(msg)
  }
  return (data ?? []) as T
}

const p = (f: Filtros) => ({
  p_de: f.de ?? null,
  p_ate: f.ate ?? null,
  p_unidade: f.unidade ?? null,
  p_area: f.area ?? null,
  p_ocorrencia: null, // (mantido para futuros filtros por tipo)
  p_natureza: f.natureza ?? null,
  p_operacao: f.operacao ?? null,
  p_estacao_maquina: f.estacao_maquina ?? null,
  p_situacao_geradora: f.situacao_geradora ?? null,
  p_parte_corpo: f.parte_corpo ?? null,
  p_agente_causador: f.agente_causador ?? null,
})

export async function getSerieDiaria(f: Filtros) {
  return rpc<{ dt: string; ocorrencias: number }[]>('oc_serie_diaria', {
    p_de: f.de ?? null, 
    p_ate: f.ate ?? null, 
    p_unidade: f.unidade ?? null, 
    p_area: f.area ?? null,
    p_ocorrencia: null, 
    p_natureza: f.natureza ?? null,
  })
}

export async function getTopUnidades(f: Filtros, limite = 10) {
  return rpc<{ unidade: string; qtd: number }[]>('oc_top_unidades', {
    p_de: f.de ?? null, 
    p_ate: f.ate ?? null,
    p_unidade: f.unidade ?? null,
    p_area: f.area ?? null, 
    p_limite: limite,
  })
}

export async function getPorTipo(f: Filtros) {
  const { data, error } = await supabaseAdmin.rpc('oc_por_tipo', {
    p_de: f.de ?? null,
    p_ate: f.ate ?? null,
    p_unidade: f.unidade ?? null,
    p_area: f.area ?? null,
  })
  if (error) throw error
  return (data ?? []) as { tipo: string; qtd: number }[]
}

export async function getPorOperacao(f: Filtros) {
  const { data, error } = await supabaseAdmin.rpc('oc_por_operacao', {
    p_de: f.de ?? null,
    p_ate: f.ate ?? null,
    p_unidade: f.unidade ?? null,
    p_area: f.area ?? null,
  })
  if (error) throw error
  return (data ?? []) as { operacao: string; qtd: number }[]
}

export async function getPorEstacaoMaquina(f: Filtros) {
  const { data, error } = await supabaseAdmin.rpc('oc_por_estacao_maquina', {
    p_de: f.de ?? null,
    p_ate: f.ate ?? null,
    p_unidade: f.unidade ?? null,
    p_area: f.area ?? null,
  })
  if (error) throw error
  return (data ?? []) as { estacao_maquina: string; qtd: number }[]
}

export async function getPorSituacaoGeradora(f: Filtros) {
  const { data, error } = await supabaseAdmin.rpc('oc_por_situacao_geradora', {
    p_de: f.de ?? null,
    p_ate: f.ate ?? null,
    p_unidade: f.unidade ?? null,
    p_area: f.area ?? null,
  })
  if (error) throw error
  return (data ?? []) as { situacao_geradora: string; qtd: number }[]
}

export async function getPorParteCorpo(f: Filtros) {
  const { data, error } = await supabaseAdmin.rpc('oc_por_parte_corpo', {
    p_de: f.de ?? null,
    p_ate: f.ate ?? null,
    p_unidade: f.unidade ?? null,
    p_area: f.area ?? null,
  })
  if (error) throw error
  return (data ?? []) as { parte_corpo: string; qtd: number }[]
}

export async function getPorAgenteCausador(f: Filtros) {
  const { data, error } = await supabaseAdmin.rpc('oc_por_agente_causador', {
    p_de: f.de ?? null,
    p_ate: f.ate ?? null,
    p_unidade: f.unidade ?? null,
    p_area: f.area ?? null,
  })
  if (error) throw error
  return (data ?? []) as { agente_causador: string; qtd: number }[]
}

export async function getAfastamentoStats(f: Filtros) {
  const { data, error } = await supabaseAdmin.rpc('oc_afastamento_stats', {
    p_de: f.de ?? null,
    p_ate: f.ate ?? null,
    p_unidade: f.unidade ?? null,
    p_area: f.area ?? null,
  })
  if (error) throw error
  return (data?.[0]) ?? { total_registros: 0, total_dias: 0, media_dias: 0, mediana_dias: 0 }
}

export async function getHeatHoraDia(f: Filtros) {
  const { data, error } = await supabaseAdmin.rpc('oc_heat_hora_dia', {
    p_de: f.de ?? null,
    p_ate: f.ate ?? null,
    p_unidade: f.unidade ?? null,
    p_area: f.area ?? null,
  })
  if (error) throw error
  return (data ?? []) as { weekday: number; hour: number; qtd: number }[]
}

export async function getHeatAreaNatureza(f: Filtros) {
  const { data, error } = await supabaseAdmin.rpc('oc_heat_area_natureza', {
    p_de: f.de ?? null,
    p_ate: f.ate ?? null,
    p_unidade: f.unidade ?? null,
    p_area: f.area ?? null,
    p_natureza: f.natureza ?? null,
  })
  if (error) throw error
  return (data ?? []) as { area: string; natureza: string; qtd: number }[]
}

export async function getFacets() {
  // pega listas distintas diretamente da tabela
  const cols = ['unidade','area','natureza_lesao','operacao','estacao_maquina','situacao_geradora','parte_corpo','agente_causador']
  const [u,a,n,o,em,sg,pc,ac] = await Promise.all(cols.map(c => supabaseAdmin.from('ocorrencias').select(c).not(c,'is',null)))
  const uniq = (res: any, key: string) =>
    Array.from(new Set((res.data ?? []).map((r: any) => r[key]).filter(Boolean))).sort()
  return {
    unidades: uniq(u, 'unidade'),
    areas: uniq(a, 'area'),
    naturezas: uniq(n, 'natureza_lesao'),
    operacoes: uniq(o, 'operacao'),
    estacoes: uniq(em, 'estacao_maquina'),
    situacoes: uniq(sg, 'situacao_geradora'),
    partes: uniq(pc, 'parte_corpo'),
    agentes: uniq(ac, 'agente_causador'),
  }
}
