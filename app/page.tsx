'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';
import {
  getResumoColaboradores,
  getRankingLojaColaboradores,
  getResumoPorConsultorColaboradores,
  GraficoData,
  RankingLoja,
  RankingConsultor,
  getDetalhePorConsultorColaboradores,
  DetalheLoja,
} from '@/services/assinaturaService';

const COLORS: Record<string, string> = {
  'EM DIA':    '#22c55e',
  'PENDENTE':  '#facc15',
  'VENCIDO':   '#ef4444',
};
type ConsultorComPct = RankingConsultor & { pctEmDia: number };

export default function HomeDashboard() {
  const [filtLoja, setFiltLoja]         = useState<string>('');
  const [filtConsultor, setFiltConsultor] = useState<string>('');
  const [dadosDonut, setDadosDonut]     = useState<GraficoData[]>([]);
  const [dadosBar, setDadosBar]         = useState<RankingLoja[]>([]);
  const [tabelaConsultor, setTabelaConsultor] = useState<ConsultorComPct[]>([]);
  const [detalheLojaConsultor, setDetalheLojaConsultor] = useState<DetalheLoja[]>([]);
  

  // Carrega dados sempre que muda filtro
  useEffect(() => {
    const filters = { loja: filtLoja || undefined, consultor: filtConsultor || undefined };

    getResumoColaboradores(filters).then(setDadosDonut);
    getRankingLojaColaboradores(filters).then(setDadosBar);
    getResumoPorConsultorColaboradores(filters).then(raw => {
      // Calcula % EmDia e ordena decrescente
      const withPct = raw.map(r => {
        const total = r.emDia + r.pendente + r.vencido;
        return {
          ...r,
          pctEmDia:  total ? +(100 * r.emDia / total).toFixed(1) : 0,
          pctPen:    total ? +(100 * r.pendente / total).toFixed(1) : 0,
          pctVenc:   total ? +(100 * r.vencido / total).toFixed(1) : 0,
        };
      }).sort((a, b) => b.pctEmDia - a.pctEmDia);

      setTabelaConsultor(withPct);
    });
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
      });
  } else {
    setDetalheLojaConsultor([]);
  }
}, [filtLoja, filtConsultor]);

  // Dropdowns de filtro
  const lojas      = Array.from(new Set(dadosBar.map(d => d.loja)));
  const consultores= Array.from(new Set(tabelaConsultor.map(d => d.consultor)));

  // Totais do donut
  const totalDonut = dadosDonut.reduce((sum, s) => sum + s.value, 0);
  // 1) Calcule a altura com base na quantidade de lojas:

const getPctColor = (pct: number): string => {
  if (pct > 90) return COLORS['EM DIA'];        // verde
  if (pct >= 70) return COLORS['PENDENTE'];     // amarelo
  if (pct >= 50) return '#f97316';              // laranja (hex Tailwind orange-500)
  return COLORS['VENCIDO'];                     // vermelho
};
  return (
    <div className="space-y-6 p-4">
      {/* FILTROS */}
      <div className="flex gap-4 mb-4">
        <select
          className="border p-2"
          value={filtLoja}
          onChange={e => setFiltLoja(e.target.value)}
        >
          <option value="">Todas as lojas</option>
          {lojas.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <select
          className="border p-2"
          value={filtConsultor}
          onChange={e => setFiltConsultor(e.target.value)}
        >
          <option value="">Todos os consultores</option>
          {consultores.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* DOUGHNUT + BAR lado a lado */}
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
                
                label={({ percent=0 }) => `${(percent * 100).toFixed(0)}%`}
              >
                {dadosDonut.map((d, i) => (
                  <Cell key={i} fill={COLORS[d.name]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 text-center">
            <div className="font-bold text-lg">{totalDonut}</div>
            <div className="text-sm text-gray-600">colaboradores</div>
          </div>
        </div>

        {/* BAR VERTICAL */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={dadosBar}
              layout="vertical"
              margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
             >
              <XAxis
                type="number" 
                interval={0}
                 />
              <YAxis 
                type="category" 
                dataKey="loja"
                width={100} 
                 />
              <Tooltip />
              <Bar dataKey="problemas" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABELA CONSULTOR */}
      { !filtConsultor ? (
        /* tabela de consultores como antes */
       <table className="w-full table-auto border-collapse">
         <thead><tr className="bg-gray-100">
             <th className="p-2 text-left">Loja</th>
             <th className="p-2 text-right">Em Dia</th>
             <th className="p-2 text-right">Pendente</th>
             <th className="p-2 text-right">Vencidos</th>
             <th className="p-2 text-right">Total</th>
             <th className="p-2 text-right">% Em Dia</th>
           </tr></thead>
         <tbody>
           {tabelaConsultor.map(r => (
              
             <tr key={r.consultor}>
               <td className="p-2">{r.consultor}</td>
               <td className="p-2 text-right">{r.emDia}</td>
               <td className="p-2 text-right">{r.pendente}</td>
               <td className="p-2 text-right">{r.vencido}</td>
               <td className="p-2 text-right">{r.emDia + r.pendente + r.vencido}</td>
               <td
                  className="p-2 text-right font-semibold"
                  style={{ color: getPctColor(r.pctEmDia) }}
                >
                  {r.pctEmDia}%
                </td>
             </tr>
           ))}
         </tbody>
       </table>
     ) : (
       /* tabela de detalhe por loja para o consultor selecionado */
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
           {detalheLojaConsultor.map(r => {
             const total = r.emDia + r.pendente + r.vencido;
             const pctEmDia = total ? +(100 * r.emDia / total).toFixed(1) : 0;
             return (
               <tr key={r.loja}>
                 <td className="p-2">{r.loja}</td>
                 <td className="p-2 text-right">{r.emDia}</td>
                 <td className="p-2 text-right">{r.pendente}</td>
                 <td className="p-2 text-right">{r.vencido}</td>
                 <td className="p-2 text-right">{total}</td>
                 <td
                  className="p-2 text-right font-semibold"
                  style={{ color: getPctColor(pctEmDia) }}
                >
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
