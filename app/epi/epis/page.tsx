'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, XAxis, YAxis, CartesianGrid, Bar
} from 'recharts'
import {
  getContagemPorStatus,
  getPivotEpiPorStatus,
  getTopLojasProblemas,
  getTotalEpis
} from '@/services/episService'
import { EpiPivotRow, Filtro, LojaProblema, StatusCount } from '@/types/epis'

/** Paleta de cores e hashing por status para cores estáveis entre renders */
const PALETTE = [
  '#22c55e', '#facc15', '#ef4444', '#3b82f6', '#a855f7', '#f97316',
  '#06b6d4', '#84cc16', '#e11d48', '#6366f1', '#14b8a6', '#f59e0b'
]
function colorForStatus(status: string) {
  let h = 0
  for (let i = 0; i < status.length; i++) h = (h * 31 + status.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export default function EpisPage() {
  const [filtro, setFiltro] = useState<Filtro>({})
  const [total, setTotal] = useState(0)
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([])
  const [pivot, setPivot] = useState<EpiPivotRow[]>([])
  const [topLojas, setTopLojas] = useState<LojaProblema[]>([])

  useEffect(() => {
    (async () => {
      const [t, sc, pv, tl] = await Promise.all([
        getTotalEpis(filtro),
        getContagemPorStatus(filtro),
        getPivotEpiPorStatus(filtro),
        getTopLojasProblemas(filtro)
      ])
      setTotal(t)
      setStatusCounts(sc)
      setPivot(pv)
      setTopLojas(tl)
    })().catch(console.error)
  }, [filtro])

  // Set dinâmico de status para montar a tabela pivot e a legenda do donut
  const allStatuses = useMemo(() => {
    const set = new Set<string>()
    statusCounts.forEach(s => set.add(s.status_epi))
    pivot.forEach(row => Object.keys(row.byStatus).forEach(st => set.add(st)))
    return Array.from(set.values()).sort()
  }, [statusCounts, pivot])

  const donutData = useMemo(
    () => statusCounts.map(s => ({ name: s.status_epi, value: s.qtde })),
    [statusCounts]
  )

  // KPIs por status (cards)
  const kpiMap = useMemo(() => {
    const m = new Map<string, number>()
    statusCounts.forEach(s => m.set(s.status_epi, s.qtde))
    return m
  }, [statusCounts])

  return (
    <div className="p-4 space-y-6">
      {/* (Opcional) Área de filtros — plugue selects globais aqui */}
      {/* <Filtros onChange={setFiltro} /> */}

      {/* 1) KPI: Total de EPIs + KPIs por status */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KpiCard label="Total de EPIs" value={total} />
        {allStatuses.map(st => (
          <KpiCard key={st} label={st} value={kpiMap.get(st) || 0} color={colorForStatus(st)} />
        ))}
      </section>

      {/* 2) Donut com todos os status */}
      <section className="h-[320px] p-3 rounded-xl border shadow-sm">
        <div className="text-base font-medium mb-2">Distribuição por Status</div>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              dataKey="value"
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
            >
              {donutData.map(d => (
                <Cell key={d.name} fill={colorForStatus(d.name)} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </section>

      {/* 3) Lista pivot: EPIs × todos os status + total */}
      <section className="rounded-xl border shadow-sm">
        <div className="p-3 text-base font-medium">EPIs por Status</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">EPI</th>
                {allStatuses.map(st => (
                  <th key={st} className="px-3 py-2 text-left">{st}</th>
                ))}
                <th className="px-3 py-2 text-left">Total</th>
              </tr>
            </thead>
            <tbody>
              {pivot.map(row => (
                <tr key={row.nome_epi} className="border-t">
                  <td className="px-3 py-2">{row.nome_epi}</td>
                  {allStatuses.map(st => (
                    <td key={st} className="px-3 py-2">
                      {row.byStatus[st] ?? 0}
                    </td>
                  ))}
                  <td className="px-3 py-2 font-medium">{row.total}</td>
                </tr>
              ))}
              {pivot.length === 0 && (
                <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={allStatuses.length + 2}>Sem dados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4) Top 10 lojas com mais problemas (PENDENTE + VENCIDO) */}
      <section className="p-3 rounded-xl border shadow-sm">
        <div className="text-base font-medium mb-2">Top 10 Lojas com Problemas</div>
        <div className="h-[360px]">
          <ResponsiveContainer>
            <BarChart data={topLojas}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="loja" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="pendentes" name="Pendentes" />
              <Bar dataKey="vencidos"  name="Vencidos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="p-4 rounded-xl border shadow-sm">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-2xl font-semibold" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  )
}
