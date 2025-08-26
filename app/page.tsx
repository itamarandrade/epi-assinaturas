'use client';

import React, { useState, useEffect, useMemo } from 'react';

import DonutChart from '@/components/ChartPie';
import SmartBarChart from '@/components/ChartBar';
import TabelaUniversal, { DataTableG } from '@/components/dataTable';
import type { Column } from '@/components/dataTable';

import {
  getResumoColaboradores,
  getRankingLojaColaboradores,
  getResumoPorConsultorColaboradores,
  getDetalhePorConsultorColaboradores,
  getOpcoesFiltros,
  type GraficoData,
  type RankingLoja,
  type RankingConsultor,
  type DetalheLoja,
} from '@/services/epiDashboardService';


type ConsultorRow = {
  consultor: string;
  emDia: number;
  pendente: number;
  vencido: number;
  total: number;
  pctEmDia: number;
};

type LojaRow = {
  loja: string;
  emDia: number;
  pendente: number;
  vencido: number;
  total: number;
  pctEmDia: number;
};

const nf = new Intl.NumberFormat('pt-BR');

const BASE_COLORS: Record<string, string> = {
  'EM DIA':   '#22c55e',
  'PENDENTE': '#facc15',
  'VENCIDO':  '#ef4444',
};
const PALETTE = ['#3b82f6','#a855f7','#f97316','#06b6d4','#84cc16','#e11d48','#6366f1','#14b8a6','#f59e0b'];
const colorHash = (label: string) => {
  if (BASE_COLORS[label]) return BASE_COLORS[label];
  let h = 0; for (let i=0;i<label.length;i++) h = (h*31 + label.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

type ConsultorComPct = RankingConsultor & { pctEmDia: number; pctPen: number; pctVenc: number };

export default function HomeDashboard() {
  const [filtLoja, setFiltLoja]           = useState<string>('');
  const [filtConsultor, setFiltConsultor] = useState<string>('');

  const [dadosDonut, setDadosDonut]       = useState<GraficoData[]>([]);
  const [dadosBar, setDadosBar]           = useState<RankingLoja[]>([]);
  const [tabelaConsultor, setTabelaConsultor] = useState<ConsultorComPct[]>([]);
  const [detalheLojaConsultor, setDetalheLojaConsultor] = useState<DetalheLoja[]>([]);
  const [opcoes, setOpcoes] = useState<{lojas: string[]; consultores: string[]}>({ lojas: [], consultores: [] });

  const logErr = (prefix: string, err: unknown) => {
    if (err && typeof err === 'object' && 'message' in (err as any)) {
      console.error(prefix, (err as any).message, err);
    } else {
      console.error(prefix, JSON.stringify(err));
    }
  };

  // 🔧 Adapta a fonte (ConsultorComPct[]) para o formato da tabela (ConsultorRow[])
  const rowsConsultor: ConsultorRow[] = useMemo(() => {
    return tabelaConsultor.map(r => ({
      consultor: r.consultor,
      emDia: r.emDia,
      pendente: r.pendente,
      vencido: r.vencido,
      total: r.emDia + r.pendente + r.vencido,
      pctEmDia: r.pctEmDia,
    }));
  }, [tabelaConsultor]);

  // carregar opções de filtro
  useEffect(() => {
    getOpcoesFiltros().then(setOpcoes).catch(console.error);
  }, []);

  // carregar dados quando filtros mudarem
  useEffect(() => {
    const filters = { loja: filtLoja || undefined, consultor: filtConsultor || undefined };

    getResumoColaboradores(filters)
      .then(setDadosDonut)
      .catch(e => logErr('Resumo', e));

    getRankingLojaColaboradores(filters)
      .then(rows => {
        const top10 = [...rows]
          .sort((a, b) => (b.problemas || 0) - (a.problemas || 0))
          .slice(0, 10);
        setDadosBar(top10);
      })
      .catch(e => logErr('Ranking Lojas', e));

    // resumo por consultor (lista todos; só filtra por loja)
    getResumoPorConsultorColaboradores({ loja: filters.loja })
      .then(raw => {
        const withPct = raw.map(r => {
          const total = r.emDia + r.pendente + r.vencido;
          return {
            ...r,
            pctEmDia: total ? +(100 * r.emDia / total).toFixed(1) : 0,
            pctPen:   total ? +(100 * r.pendente / total).toFixed(1) : 0,
            pctVenc:  total ? +(100 * r.vencido / total).toFixed(1) : 0,
          };
        }).sort((a, b) => b.pctEmDia - a.pctEmDia);
        setTabelaConsultor(withPct);
      })
      .catch(e => logErr('Resumo Consultor', e));

    if (filtConsultor) {
      getDetalhePorConsultorColaboradores(filtConsultor)
        .then(rows => {
          const sorted = rows.sort((a, b) => {
            const totalA = a.emDia + a.pendente + a.vencido;
            const totalB = b.emDia + b.pendente + b.vencido;
            const pctA   = totalA ? a.emDia / totalA : 0;
            const pctB   = totalB ? b.emDia / totalB : 0;
            return pctB - pctA;
          });
          setDetalheLojaConsultor(sorted);
        })
        .catch(e => logErr('Detalhe por Consultor', e));
    } else {
      setDetalheLojaConsultor([]);
    }
  }, [filtLoja, filtConsultor]);

  // dropdowns
  const lojas = (opcoes.lojas || [])
    .filter((l): l is string => !!l && l.trim() !== '')
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const consultores = (opcoes.consultores || [])
    .filter((c): c is string => !!c && c.trim() !== '')
    .filter((v, i, arr) => arr.indexOf(v) === i);

  // totais do donut
  const totalDonut = useMemo(
    () => dadosDonut.reduce((sum, s) => sum + s.value, 0),
    [dadosDonut]
  );

  // totais agregados (para cards externos; o rodapé da tabela é calculado pelo getTotals)
  const totaisConsultores = useMemo(() => {
    const emDia    = tabelaConsultor.reduce<number>((acc: number, r: ConsultorComPct) => acc + r.emDia, 0);
    const pendente = tabelaConsultor.reduce<number>((acc: number, r: ConsultorComPct) => acc + r.pendente, 0);
    const vencido  = tabelaConsultor.reduce<number>((acc: number, r: ConsultorComPct) => acc + r.vencido, 0);
    const total = emDia + pendente + vencido;
    const pctEmDiaGeral = total ? +(100 * emDia / total).toFixed(1) : 0;
    return { emDia, pendente, vencido, total, pctEmDiaGeral };
  }, [tabelaConsultor]);

  const getPctColor = (pct: number): string => {
    if (pct > 90) return BASE_COLORS['EM DIA'];
    if (pct >= 70) return BASE_COLORS['PENDENTE'];
    if (pct >= 50) return '#f97316';
    return BASE_COLORS['VENCIDO'];
  };

  // gradiente de vermelho para o ranking
  function getRedByValue(value: number, min: number, max: number) {
    if (max === min) return '#fca5a5';
    const ratio = (value - min) / (max - min);
    const start = [252, 202, 202]; // #fccaca
    const end = [185, 28, 28];     // #b91c1c
    const r = Math.round(start[0] + (end[0] - start[0]) * ratio);
    const g = Math.round(start[1] + (end[1] - start[1]) * ratio);
    const b = Math.round(start[2] + (end[2] - start[2]) * ratio);
    return `rgb(${r},${g},${b})`;
  }
  const valores = dadosBar.map(d => d.problemas || 0);
  const minVal = Math.min(...valores);
  const maxVal = Math.max(...valores);

  // =========================
  // DataTable: Colunas e Linhas
  // =========================
  const columnsConsultor: Column<ConsultorRow>[] = useMemo(() => ([
    { key: 'consultor', label: 'Consultor', align: 'left' },
    { key: 'emDia',     label: 'Em Dia',   align: 'right', render: (r: ConsultorRow) => nf.format(r.emDia) },
    { key: 'pendente',  label: 'Pendente', align: 'right', render: (r: ConsultorRow) => nf.format(r.pendente) },
    { key: 'vencido',   label: 'Vencidos', align: 'right', render: (r: ConsultorRow) => nf.format(r.vencido) },
    { key: 'total',     label: 'Total',    align: 'right', render: (r: ConsultorRow) => nf.format(r.total) },
    {
      key: 'pctEmDia',
      label: '% Em Dia',
      align: 'right',
      render: (r: ConsultorRow) => <span style={{ color: getPctColor(r.pctEmDia) }}>{r.pctEmDia}%</span>,
    },
  ]), []);

  const rowsLoja: LojaRow[] = useMemo(() => {
    return detalheLojaConsultor.map((r) => {
      const total = r.emDia + r.pendente + r.vencido;
      const pctEmDia = total ? +(100 * r.emDia / total).toFixed(1) : 0;
      return { loja: r.loja, emDia: r.emDia, pendente: r.pendente, vencido: r.vencido, total, pctEmDia };
    });
  }, [detalheLojaConsultor]);

  const columnsLoja: Column<LojaRow>[] = useMemo(() => ([
    { key: 'loja',      label: 'Loja',     align: 'left' },
    { key: 'emDia',     label: 'Em Dia',   align: 'right', render: (r: LojaRow) => nf.format(r.emDia) },
    { key: 'pendente',  label: 'Pendente', align: 'right', render: (r: LojaRow) => nf.format(r.pendente) },
    { key: 'vencido',   label: 'Vencidos', align: 'right', render: (r: LojaRow) => nf.format(r.vencido) },
    { key: 'total',     label: 'Total',    align: 'right', render: (r: LojaRow) => nf.format(r.total) },
    {
      key: 'pctEmDia',
      label: '% Em Dia',
      align: 'right',
      render: (r: LojaRow) => <span style={{ color: getPctColor(r.pctEmDia) }}>{r.pctEmDia}%</span>,
    },
  ]), []);

  return (
    <div className="space-y-6 p-4">
      {/* FILTROS */}
      <div className="flex gap-4 mb-4">
        <select className="border p-2" value={filtLoja} onChange={e => setFiltLoja(e.target.value)}>
          <option value="">Todas as lojas</option>
          {lojas.map((l, i) => (
            <option key={`loja-${i}-${l}`} value={l}>{l}</option>
          ))}
        </select>

        <select className="border p-2" value={filtConsultor} onChange={e => setFiltConsultor(e.target.value)}>
          <option value="">Todos os consultores</option>
          {consultores.map((c, i) => (
            <option key={`consultor-${i}-${c}`} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* DONUT + BAR */}
      <div className="flex gap-8">
        {/* DONUT */}
        <div className="flex-1 shadow-sm p-4 rounded-xl">
          <DonutChart
            data={dadosDonut}
            innerRadiusPct={0.6}
            outerRadiusPct={0.82}
            highlightMax={true}
            gradientByRank={true}
            onSliceClick={(d) => setFiltConsultor(d.name)}
            ariaLabel="Gráfico de rosca (donut) - Resumo de colaboradores"
            defaultColors={PALETTE}
            colorByKey={BASE_COLORS}
            fixedOrder={['EM DIA', 'PENDENTE', 'VENCIDO']}
            enforceStatusOrder={true}
            sliceLabel={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            showLegend={true}
            legendShowPercent={true}
            legendCols={2}
          />
        </div>

        {/* BAR HORIZONTAL (TOP 10) */}
        <div className="flex-1 shadow-sm p-4 rounded-xl">
          <SmartBarChart
            data={dadosBar}
            labelKey="loja"
            valueKey="problemas"
            valueColorScale={getRedByValue}
            valueColor="#ef4444"
            valueLabel="Problemas (Pend+Venc)"
            height={Math.max(300, dadosBar.length * 36)}
            orientation="horizontal"
            tipo="loja"
            title="Ranking de Lojas"
            formatValue={(n) => nf.format(Number(n) || 0)}
            width={30}
          />
        </div>
      </div>

      {/* TABELA DE CONSULTORES (com totais) */}
      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-3">Resumo por Consultor</h3>
        <DataTableG<ConsultorRow>
          title="Resumo por Consultor"
          columns={columnsConsultor}
          rows={rowsConsultor}
          striped
          compact
          stickyHeader
          borderType="row"
          showTotals
          getTotals={(rows: ConsultorRow[]) => {
            const sum = <K extends keyof ConsultorRow>(k: K) =>
              rows.reduce<number>((acc, r) => acc + (Number(r[k]) || 0), 0);

            const total = sum('total') || (sum('emDia') + sum('pendente') + sum('vencido'));
            const pctGeral = total ? Number(((sum('emDia') * 100) / total).toFixed(1)) : 0;

            return {
              consultor: 'Totais',
              emDia: nf.format(sum('emDia')),
              pendente: nf.format(sum('pendente')),
              vencido: nf.format(sum('vencido')),
              total: nf.format(total),
              pctEmDia: <span style={{ color: getPctColor(pctGeral) }}>{pctGeral}%</span>,
            };
          }}
        />
      </div>

      {/* TABELA DETALHE POR LOJA (quando um consultor for selecionado) */}
      {filtConsultor && (
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-3">Detalhe por Loja — {filtConsultor}</h3>
          <DataTableG<LojaRow>
            title={`Detalhe por Loja — ${filtConsultor}`}
            columns={columnsLoja}
            rows={rowsLoja}
            striped
            compact
            stickyHeader
            borderType="row"
          />
        </div>
      )}
    </div>
  );
}
