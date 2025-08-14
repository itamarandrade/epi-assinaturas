'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';
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
        // garante top 10 por problemas (pend+venc)
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
            return pctB - pctA;   // maior % primeiro
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

  // totais da tabela de consultores
  const totaisConsultores = useMemo(() => {
    const emDia = tabelaConsultor.reduce((acc, r) => acc + r.emDia, 0);
    const pendente = tabelaConsultor.reduce((acc, r) => acc + r.pendente, 0);
    const vencido = tabelaConsultor.reduce((acc, r) => acc + r.vencido, 0);
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
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dadosDonut}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={100}
                labelLine={false}
                label={({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {dadosDonut.map((d, i) => (
                  <Cell key={`slice-${d.name || 'vazio'}-${i}`} fill={colorHash(d.name)} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 text-center">
            <div className="font-bold text-lg">{totalDonut}</div>
            <div className="text-sm text-gray-600">Colaboradores</div>
          </div>
        </div>

        {/* BAR VERTICAL (TOP 10) */}
        <div className="flex-1">
          <label className="text-sm font-medium center">Top Lojas (10)</label>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosBar} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="loja" width={120} />
              <Tooltip />
              <Bar dataKey="problemas" name="Problemas (Pend+Venc)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABELAS */}
      {!filtConsultor ? (
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Consultor</th>
              <th className="p-2 text-right">Em Dia</th>
              <th className="p-2 text-right">Pendente</th>
              <th className="p-2 text-right">Vencidos</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-right">% Em Dia</th>
            </tr>
          </thead>
          <tbody>
            {tabelaConsultor.map((r, i) => (
              <tr key={`consultor-${r.consultor || 'vazio'}-${i}`}>
                <td className="p-2">{r.consultor}</td>
                <td className="p-2 text-right">{r.emDia}</td>
                <td className="p-2 text-right">{r.pendente}</td>
                <td className="p-2 text-right">{r.vencido}</td>
                <td className="p-2 text-right">{r.emDia + r.pendente + r.vencido}</td>
                <td className="p-2 text-right font-semibold" style={{ color: getPctColor(r.pctEmDia) }}>
                  {r.pctEmDia}%
                </td>
              </tr>
            ))}
          </tbody>
          {/* TOTAIS */}
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td className="p-2 text-right">Totais</td>
              <td className="p-2 text-right">{totaisConsultores.emDia}</td>
              <td className="p-2 text-right">{totaisConsultores.pendente}</td>
              <td className="p-2 text-right">{totaisConsultores.vencido}</td>
              <td className="p-2 text-right">{totaisConsultores.total}</td>
              <td className="p-2 text-right" style={{ color: getPctColor(totaisConsultores.pctEmDiaGeral) }}>
                {totaisConsultores.pctEmDiaGeral}%
              </td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Loja</th>
              <th className="p-2 text-right">Em Dia</th>
              <th className="p-2 text-right">Pendente</th>
              <th className="p-2 text-right">Vencidos</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-right">% Em Dia</th>
            </tr>
          </thead>
          <tbody>
            {detalheLojaConsultor.map((r, i) => {
              const total = r.emDia + r.pendente + r.vencido;
              const pctEmDia = total ? +(100 * r.emDia / total).toFixed(1) : 0;
              return (
                <tr key={`loja-${r.loja || 'vazio'}-${i}`}>
                  <td className="p-2">{r.loja}</td>
                  <td className="p-2 text-right">{r.emDia}</td>
                  <td className="p-2 text-right">{r.pendente}</td>
                  <td className="p-2 text-right">{r.vencido}</td>
                  <td className="p-2 text-right">{total}</td>
                  <td className="p-2 text-right font-semibold" style={{ color: getPctColor(pctEmDia) }}>
                    {pctEmDia}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
