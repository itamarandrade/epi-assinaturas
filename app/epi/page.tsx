'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';

type Kind = { id: number; name: string; color_hex?: string | null };
type Colab = { id: number; nome: string; loja: string | null; consultor: string | null; status_geral_id: number | null };

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
  const [loading, setLoading] = useState(true);
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

        // status kinds (normalmente poucos)
        const { data: kindsData, error: kErr } =
          await supabaseAdmin.from('status_geral_kind').select('id,name,color_hex');
        if (kErr) throw new Error(kErr.message);
        setKinds((kindsData || []) as Kind[]);

        // colaboradores — TODOS, em chunks de 1000
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

  // Opções (combos) a partir do dataset completo — dedupe, trim e valores seguros
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

  // **AQUI estava o bug**: já incluímos '' aqui; não adicionar '' novamente no render.
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

  // Contagens por status (EM_DIA / PENDENTE / VENCIDO)
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

  // Tabela: aplica filtros internos e ordenação
  const tableRows = useMemo(() => {
    const base = filteredColabs.map(c => {
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

  if (loading) return <div className="p-6">Carregando…</div>;
  if (error)   return <div className="p-6 text-red-600">Erro: {error}</div>;

  const donutDefs = [
    { label: 'Em Dia',    key: 'EM_DIA',    count: statusCounts.emDia,    color: colorByNorm.get('EM_DIA') || '#22c55e' },
    { label: 'Pendentes', key: 'PENDENTE',  count: statusCounts.pendente, color: colorByNorm.get('PENDENTE') || '#facc15' },
    { label: 'Vencidos',  key: 'VENCIDO',   count: statusCounts.vencido,  color: colorByNorm.get('VENCIDO') || '#ef4444' },
  ] as const;

  return (
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

      {/* Donuts de status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <DonutCard
          key="donut-total"
          title={'Total de Colaboradores'}
          count={statusCounts.total}
          total={statusCounts.total}
          color={'#3b82f6'}
        />
        {donutDefs.map(d => (
          <DonutCard
            key={`donut-${d.key}`}
            title={d.label}
            count={d.count}
            total={statusCounts.total}
            color={d.color}
          />
        ))}
      </div>

      {/* Top 10 Lojas (Pendentes) */}
      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-2">Top 10 lojas com mais colaboradores pendentes</h3>
        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topLojasPendentes} layout="vertical" margin={{ left: 16, right: 24, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="loja" type="category" width={140} />
              <Tooltip />
              <Bar dataKey="count" fill={colorByNorm.get('PENDENTE') || '#facc15'} radius={[4,4,4,4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lista com filtros internos e ordenação */}
      <div className="bg-white rounded shadow p-4">
        <div className="flex flex-wrap gap-3 items-end mb-3">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Status</label>
            <select className="border px-2 py-1 rounded" value={listStatus} onChange={e=>setListStatus(e.target.value)}>
              {/* NÃO adicionar '' de novo, pois allStatus já começa com '' */}
              {allStatus.map(s => (
                <option key={`status-${s || 'ALL'}`} value={s}>
                  {s ? s.replace('_',' ') : 'Todos'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Consultor</label>
            <select className="border px-2 py-1 rounded" value={listConsultor} onChange={e=>setListConsultor(e.target.value)}>
              {allConsultores.map(c => (
                <option key={`list-consultor-${c || 'ALL'}`} value={c}>{c || 'Todos'}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Loja</label>
            <select className="border px-2 py-1 rounded" value={listLoja} onChange={e=>setListLoja(e.target.value)}>
              {allLojas.map(l => (
                <option key={`list-loja-${l || 'ALL'}`} value={l}>{l || 'Todas'}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col grow">
            <label className="text-xs text-gray-600">Busca</label>
            <input className="border px-2 py-1 rounded" value={listSearch} onChange={e=>setListSearch(e.target.value)} placeholder="Nome, consultor, loja…" />
          </div>

          <div className="flex items-end gap-2 ml-auto">
            <div className="flex flex-col">
              <label className="text-xs text-gray-600">Ordenar por</label>
              <select className="border px-2 py-1 rounded" value={sortBy} onChange={e=>setSortBy(e.target.value as any)}>
                <option value="consultor">Consultor</option>
                <option value="nome">Colaborador</option>
                <option value="loja">Loja</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600">Direção</label>
              <select className="border px-2 py-1 rounded" value={sortDir} onChange={e=>setSortDir(e.target.value as any)}>
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 border text-left">Consultor</th>
                <th className="px-2 py-1 border text-left">Colaborador</th>
                <th className="px-2 py-1 border text-left">Loja</th>
                <th className="px-2 py-1 border text-left">Status Geral</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={`row-${r.nome}-${i}`} className="hover:bg-gray-50">
                  <td className="px-2 py-1 border">{r.consultor}</td>
                  <td className="px-2 py-1 border">{r.nome}</td>
                  <td className="px-2 py-1 border">{r.loja}</td>
                  <td className="px-2 py-1 border">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: (colorByNorm.get(r.statusNorm) || '#e5e7eb') + '33',
                        color: colorByNorm.get(r.statusNorm) || '#374151',
                      }}
                    >
                      {r.statusName}
                    </span>
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr><td colSpan={4} className="px-2 py-8 text-center text-gray-500">Nenhum colaborador encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DonutCard({ title, count, total, color }:{
  title: string; count: number; total: number; color: string;
}) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  const data = [
    { name: title, value: count },
    { name: 'outros', value: Math.max(total - count, 0) },
  ];
  return (
    <div className="bg-white rounded shadow p-4 text-center">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="relative h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%" cy="50%"
              innerRadius={50}
              outerRadius={70}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
              paddingAngle={2}
            >
              <Cell fill={color} />
              <Cell fill={GREY} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold">{pct}%</span>
          <span className="text-sm text-gray-500">{count.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
