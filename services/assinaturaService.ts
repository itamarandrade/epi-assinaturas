import { supabase } from '@/lib/supabase';

export type GraficoData = { name: string; value: number };
export type RankingLoja = { loja: string; problemas: number };
export type RankingConsultor = {
  consultor: string;
  emDia: number;
  pendente: number;
  vencido: number;
};
export type DetalheLoja = {
  loja: string;
  emDia: number;
  pendente: number;
  vencido: number;
};

interface Filters { loja?: string; consultor?: string }

/** Helpers para aplicar filtros dinamicamente */
function applyFilters<Q>(query: Q, filters: Filters): Q {
  if (filters.loja)      (query as any).eq('loja', filters.loja);
  if (filters.consultor) (query as any).eq('consultor', filters.consultor);
  return query;
}

export async function getDetalhePorConsultorColaboradores(
  consultor: string
): Promise<DetalheLoja[]> {
  const { data, error } = await supabase
    .from('assinaturas_epi')
    .select('nome, status, loja')
    .eq('consultor', consultor);

  if (error) throw error;

  const únicos = Array.from(
    data.reduce((map, row) => {
      const key = `${row.nome}::${row.status}::${row.loja}`;
      if (!map.has(key)) map.set(key, row);
      return map;
    }, new Map<string, typeof data[number]>()).values()
  );

  const resumo = únicos.reduce((acc, { loja, status }) => {
    if (!acc[loja]) acc[loja] = { emDia: 0, pendente: 0, vencido: 0 };
    if (status === 'EM DIA')   acc[loja].emDia++;
    if (status === 'PENDENTE') acc[loja].pendente++;
    if (status === 'VENCIDO')  acc[loja].vencido++;
    return acc;
  }, {} as Record<string, { emDia: number; pendente: number; vencido: number }>);

  return Object.entries(resumo).map(([loja, vals]) => ({
    loja,
    ...vals,
  }));
}

/** Colaboradores distintos por status, opcionalmente filtrados */
export async function getResumoColaboradores(
  filters: Filters = {}
): Promise<GraficoData[]> {
  let q = supabase
    .from('assinaturas_epi')
    .select('nome, status, loja, consultor');
  q = applyFilters(q, filters);

  const { data, error } = await q;
  if (error) throw error;

  // 1 registro por nome+status
  const únicos = Array.from(
    data.reduce((m, r) => {
      const key = `${r.nome}::${r.status}`;
      if (!m.has(key)) m.set(key, r);
      return m;
    }, new Map<string, typeof data[0]>()).values()
  );

  const total = únicos.length;
  const agrupado = únicos.reduce((acc, { status }) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(agrupado).map(([name, value]) => ({
    name,
    value,
  }));
}

/** Ranking de lojas — apenas PENDENTE/VENCIDO — opcionalmente filtrado por consultor */
export async function getRankingLojaColaboradores(
  filters: Filters = {}
): Promise<RankingLoja[]> {
  let q = supabase
    .from('assinaturas_epi')
    .select('nome, status, loja');
  q = applyFilters(q, filters);
  q = (q as any).in('status', ['PENDENTE', 'VENCIDO']);

  const { data, error } = await q;
  if (error) throw error;

  const únicos = Array.from(
    data.reduce((m, r) => {
      const key = `${r.nome}::${r.loja}`;
      if (!m.has(key)) m.set(key, r);
      return m;
    }, new Map<string, typeof data[0]>()).values()
  );

  const cnt = únicos.reduce((acc, { loja }) => {
    acc[loja] = (acc[loja] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(cnt)
    .map(([loja, problemas]) => ({ loja, problemas }))
    .sort((a, b) => b.problemas - a.problemas);
}

/** Resumo por consultor — opcional filtro por loja */
export async function getResumoPorConsultorColaboradores(
  filters: Filters = {}
): Promise<RankingConsultor[]> {
  let q = supabase
    .from('assinaturas_epi')
    .select('nome, consultor, status, loja');
  q = applyFilters(q, filters);

  const { data, error } = await q;
  if (error) throw error;

  const únicos = Array.from(
    data.reduce((m, r) => {
      const key = `${r.nome}::${r.consultor}::${r.status}`;
      if (!m.has(key)) m.set(key, r);
      return m;
    }, new Map<string, typeof data[0]>()).values()
  );

  const resumo = únicos.reduce((acc, { consultor, status }) => {
    if (!acc[consultor]) acc[consultor] = { emDia: 0, pendente: 0, vencido: 0 };
    if (status === 'EM DIA')   acc[consultor].emDia++;
    if (status === 'PENDENTE') acc[consultor].pendente++;
    if (status === 'VENCIDO')  acc[consultor].vencido++;
    return acc;
  }, {} as Record<string, { emDia: number; pendente: number; vencido: number }>);

  return Object.entries(resumo).map(([consultor, vals]) => ({
    consultor,
    ...vals,
  }));
}
