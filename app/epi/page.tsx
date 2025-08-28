'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import DonutKpiCard from '@/components/DonutKpiCard';
import SmartBarChart from '@/components/ChartBar';
import { DataTableG } from '@/components/dataTable';
import type { Column } from '@/components/dataTable';

// 🆕 placeholders genéricos
import { Placeholder } from '@/components/placeholder';
import { LoadingSwitch } from '@/components/placeholder/LoadingSwitch';

type RowColab = {
  consultor: string;
  nome: string;
  loja: string;
  statusName: string;   // EX.: "EM DIA", "PENDENTE"…
  statusNorm: string;   // EX.: "EM_DIA", "PENDENTE"…
};

type Kind = { id: number; name: string; color_hex?: string | null };
type Colab = { id: number; nome: string; loja: string | null; consultor: string | null; status_geral_id: number | null };
const nf = new Intl.NumberFormat('pt-BR')

const STATUS_COLORS: Record<string, string> = {
  EM_DIA: "#22c55e",
  PENDENTE: "#f59e0b",
  VENCIDO: "#ef4444",
  DEVOLVIDO: "#3b82f6",
};

// Chip inline (dispensa Pill externo)
function StatusChip({ name, norm }: { name: string; norm: string }) {
  const color = STATUS_COLORS[norm] ?? "#374151";
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${color}22`, color }}
    >
      {name}
    </span>
  );
}

const NORM = (s?: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

const PAGE = 1000;
const GREY = '#e5e7eb';

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

async function selectAll<T>(table: string, columns: string, orderBy: string = 'id'): Promise<T[]> {
  let from = 0;
  let out: T[] = [];
  while (true) {
    const { data, error } = await supabaseAdmin
      .from(table as any)
      .select(columns as any)
      .order(orderBy, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`selectAll ${table}: ${error.message}`);
    const chunk = (data || []) as T[];
    out = out.concat(chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export default function ColaboradoresDashboard() {
  const [loading, setLoading] = useState(true);     // 🆕 será usado pelo LoadingSwitch
  const [error, setError] = useState<string | null>(null);

  const [kinds, setKinds] = useState<Kind[]>([]);
  const [colabs, setColabs] = useState<Colab[]>([]);

  // Filtros globais (afetam donuts, top10 e lista)
  const [filtConsultor, setFiltConsultor] = useState<string>('');
  const [filtLoja, setFiltLoja] = useState<string>('');

  // Filtros internos da lista
  const [listStatus, setListStatus] = useState<string>('');   // '', EM_DIA, PENDENTE, VENCIDO...
  const [listConsultor, setListConsultor] = useState<string>('');
  const [listLoja, setListLoja] = useState<string>('');
  const [listSearch, setListSearch] = useState<string>('');

  // Ordenação da lista
  const [sortBy, setSortBy] = useState<'consultor'|'nome'|'loja'|'status'>('consultor');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: kindsData, error: kErr } =
          await supabaseAdmin.from('status_geral_kind').select('id,name,color_hex');
        if (kErr) throw new Error(kErr.message);
        setKinds((kindsData || []) as Kind[]);

        const allColabs = await selectAll<Colab>(
          'colaborador',
          'id,nome,loja,consultor,status_geral_id'
        );
        setColabs(allColabs);
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const colorByNorm = useMemo(() => {
    const m = new Map<string, string>();
    kinds.forEach(k => m.set(NORM(k.name), k.color_hex || '#64748b'));
    if (!m.get('EM_DIA')) m.set('EM_DIA', '#22c55e');
    if (!m.get('PENDENTE')) m.set('PENDENTE', '#facc15');
    if (!m.get('VENCIDO')) m.set('VENCIDO', '#ef4444');
    return m;
  }, [kinds]);

  const kindById = useMemo(() => {
    const m = new Map<number, Kind>();
    kinds.forEach(k => m.set(k.id, k));
    return m;
  }, [kinds]);

  // Opções (combos)
  const allConsultores = useMemo(() => {
    const vals = colabs
      .map(c => (c.consultor ?? '').trim())
      .map(v => v === '' ? '—' : v);
    return ['', ...uniq(vals).sort()];
  }, [colabs]);

  const allLojas = useMemo(() => {
    const vals = colabs
      .map(c => (c.loja ?? '').trim())
      .map(v => v === '' ? '—' : v);
    return ['', ...uniq(vals).sort()];
  }, [colabs]);

  const allStatus = useMemo(() => {
    const vals = kinds.map(k => NORM(k.name)).filter(Boolean);
    return ['', ...uniq(vals)];
  }, [kinds]);

  // Aplica filtros globais
  const filteredColabs = useMemo(() => {
    return colabs.filter(c => {
      if (filtConsultor && (c.consultor?.trim() || '—') !== filtConsultor) return false;
      if (filtLoja && (c.loja?.trim() || '—') !== filtLoja) return false;
      return true;
    });
  }, [colabs, filtConsultor, filtLoja]);

  // Contagens por status
  const statusCounts = useMemo(() => {
    let em = 0, pe = 0, ve = 0;
    for (const c of filteredColabs) {
      const n = c.status_geral_id ? NORM(kindById.get(c.status_geral_id)?.name || '') : '';
      if (n === 'EM_DIA') em++;
      else if (n === 'PENDENTE') pe++;
      else if (n === 'VENCIDO') ve++;
    }
    return { emDia: em, pendente: pe, vencido: ve, total: filteredColabs.length };
  }, [filteredColabs, kindById]);

  // Top 10 lojas com mais colaboradores pendentes
  const topLojasPendentes = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filteredColabs) {
      const n = c.status_geral_id ? NORM(kindById.get(c.status_geral_id)?.name || '') : '';
      if (n === 'PENDENTE') {
        const key = (c.loja?.trim() || '—');
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([loja, count]) => ({ loja, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredColabs, kindById]);

  // Tabela: filtros internos + ordenação
  const tableRows: RowColab[] = useMemo(() => {
    const base: RowColab[] = filteredColabs.map(c => {
      const kind = c.status_geral_id ? kindById.get(c.status_geral_id) : undefined;
      const statusName = kind?.name || '—';
      const statusNorm = kind ? NORM(kind.name) : '';
      return {
        consultor: (c.consultor?.trim() || '—'),
        nome: c.nome,
        loja: (c.loja?.trim() || '—'),
        statusName,
        statusNorm,
      };
    });

    const fStatus = listStatus;
    const fConsult = listConsultor;
    const fLoja = listLoja;
    const fSearch = listSearch.trim().toLowerCase();

    let rows = base.filter(r => {
      if (fStatus && r.statusNorm !== fStatus) return false;
      if (fConsult && r.consultor !== fConsult) return false;
      if (fLoja && r.loja !== fLoja) return false;
      if (fSearch) {
        const hay = `${r.nome} ${r.consultor} ${r.loja} ${r.statusName}`.toLowerCase();
        if (!hay.includes(fSearch)) return false;
      }
      return true;
    });

    rows.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const cmp = (x: string, y: string) => x.localeCompare(y) * dir;
      switch (sortBy) {
        case 'consultor': return cmp(a.consultor, b.consultor) || cmp(a.nome, b.nome);
        case 'nome':      return cmp(a.nome, b.nome) || cmp(a.consultor, b.consultor);
        case 'loja':      return cmp(a.loja, b.loja) || cmp(a.consultor, b.consultor);
        case 'status':    return cmp(a.statusName, b.statusName) || cmp(a.consultor, b.consultor);
      }
    });

    return rows;
  }, [filteredColabs, kindById, listStatus, listConsultor, listLoja, listSearch, sortBy, sortDir]);

  // Colunas DataTable
  const columnsColab: Column<RowColab>[] = useMemo(() => ([
    {
      key: "consultor",
      label: "Consultor",
      sortable: true,
      filterType: 'select',
      filterOptions: allConsultores.filter(Boolean),
      getFilterValue: (r) => r.consultor || '—',
    },
    {
      key: "nome",
      label: "Colaborador",
      sortable: true,
      filterType: 'text',
    },
    {
      key: "loja",
      label: "Loja",
      sortable: true,
      align: "center",
      filterType: 'select',
      filterOptions: allLojas.filter(Boolean),
      getFilterValue: (r) => r.loja || '—',
    },
    {
      key: "statusName",
      label: "Status Geral",
      sortable: true,
      align: "center",
      render: (r: RowColab) => <StatusChip name={r.statusName} norm={r.statusNorm} />,
      filterType: 'multiselect',
      filterOptions: allStatus.filter(Boolean).map(s => ({ value: s, label: s.replace(/_/g,' ') })),
      getFilterValue: (r) => r.statusNorm,
    },
  ]), [allConsultores, allLojas, allStatus]);

  // sort mapping
  const dtSortBy = useMemo<keyof RowColab | undefined>(() => {
    if (sortBy === 'status') return 'statusName';
    return sortBy as keyof RowColab | undefined;
  }, [sortBy]);

  function handleDtSortBy(v: keyof RowColab) {
    if (v === 'statusName') setSortBy('status');
    else if (v === 'consultor' || v === 'nome' || v === 'loja') setSortBy(v);
  }

  // erro: mantém simples
  if (error) return (
    <div className="p-6 text-red-600">
      Erro: {error}
    </div>
  );

  // ✅ aplica placeholders com LoadingSwitch
  return (
    <LoadingSwitch
      isLoading={loading}
      placeholder={
        <div className="p-6 max-w-7xl mx-auto space-y-6" aria-busy="true">
          <Placeholder.TextLine w={260} h={28} />
          <Placeholder.Card>
            <div className="flex flex-wrap gap-4 items-end">
              <Placeholder.Filter />
              <Placeholder.Filter />
            </div>
          </Placeholder.Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KPIs/Donuts skeletons (4 cartões) */}
            <Placeholder.KpiRow count={4} />
            {/* Chart skeleton */}
            <Placeholder.Chart height={400} />
          </div>

          {/* Tabela skeleton com 4 colunas principais */}
          <Placeholder.Table cols={4} rows={12} schema="2fr 2fr 1fr 1fr" />
        </div>
      }
    >
      {/* CONTEÚDO REAL */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Dashboard — Colaboradores</h1>

        {/* Filtros globais */}
        <div className="bg-white rounded shadow p-4 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col">
            <label className="text-sm font-medium">Consultor</label>
            <select className="border px-3 py-2 rounded" value={filtConsultor} onChange={e=>setFiltConsultor(e.target.value)}>
              {allConsultores.map(c => (
                <option key={`filt-consultor-${c || 'ALL'}`} value={c}>{c || 'Todos'}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium">Loja</label>
            <select className="border px-3 py-2 rounded" value={filtLoja} onChange={e=>setFiltLoja(e.target.value)}>
              {allLojas.map(l => (
                <option key={`filt-loja-${l || 'ALL'}`} value={l}>{l || 'Todas'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Donuts de status + Top Lojas */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Você pode manter o primeiro como "Total" se preferir */}
            <DonutKpiCard
              title={'Em Dia'}
              count={statusCounts.total}
              total={statusCounts.total}
              color={'#3b82f6'}
            />
            {[
              { label: 'Em Dia', key: 'EM_DIA', count: statusCounts.emDia, color: colorByNorm.get('EM_DIA') || '#22c55e' },
              { label: 'Pendentes', key: 'PENDENTE', count: statusCounts.pendente, color: colorByNorm.get('PENDENTE') || '#facc15' },
              { label: 'Vencidos', key: 'VENCIDO', count: statusCounts.vencido, color: colorByNorm.get('VENCIDO') || '#ef4444' },
            ].map(d => (
              <DonutKpiCard
                key={`donut-${d.key}`}
                title={d.label}
                count={d.count}
                total={statusCounts.total}
                color={d.color}
              />
            ))}
          </div>

          <div className="bg-white rounded shadow p-4">
            <div className="h-[420px]">
              <SmartBarChart
                data={topLojasPendentes}
                labelKey="loja"
                valueKey="count"
                valueColor={colorByNorm.get('PENDENTE') || '#facc15'}
                title="Top 10 lojas com mais colaboradores pendentes"
                height={400}
                orientation="horizontal"
                width={45}
              />
            </div>
          </div>
        </div>

        {/* Lista com filtros internos e ordenação */}
        <div className="bg-white rounded shadow p-4">
          <DataTableG<RowColab>
            title="Colaboradores"
            columns={columnsColab}
            rows={tableRows}
            showSearch={false}
            borderType="cell"
            compact
            striped
            stickyHeader
            initialSortBy="consultor"
            initialSortDir="asc"
          />
        </div>
      </div>
    </LoadingSwitch>
  );
}
