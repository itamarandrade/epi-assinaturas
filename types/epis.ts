export type Filtro = {
  consultor?: string | null;
  loja?: string | null;
  busca?: string; // colaborador ou nome do EPI
};

export type StatusCount = { status_epi: string; qtde: number };

export type EpiPivotRow = {
  nome_epi: string;
  byStatus: Record<string, number>; // ex: { 'EM DIA': 12, 'PENDENTE': 3, 'VENCIDO': 1, 'ENTREGA FUTURA': 2 }
  total: number;
};

export type LojaProblema = {
  loja: string | null;
  pendentes: number;
  vencidos: number;
  problemas: number; // pendentes + vencidos
};
