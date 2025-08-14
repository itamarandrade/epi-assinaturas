'use client'

import { useEffect, useState } from 'react'
<<<<<<< HEAD
import { createSupabase } from '@/lib/supabase'
=======
import { supabaseAdmin } from '@/lib/supabase'
>>>>>>> e5a8b5a (epis ajustado e pagina de ocorrencias v1)
import { format, addMonths } from 'date-fns'
import Link from 'next/link'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  LineChart, Line
} from 'recharts'

type EpiEntry = {
  nome_epi: string
  status_epi: string
  status: string
  proximo_fornecimento: string | null
  mes_fornecimento: string
}

type Colaborador = {
  nome: string
  status: string
  loja: string
  consultor: string
  epis: EpiEntry[]
}

const COLORS = ['#22c55e', '#facc15', '#ef4444']

export default function EpiDashboard() {
  
  const [data, setData] = useState<Colaborador[]>([])
  const [filtros, setFiltros] = useState({
    loja: '',
    consultor: '',
    inicio: '',
    fim: ''
  })

  useEffect(() => {
    fetchData()
  }, [filtros])

  async function fetchData() {
<<<<<<< HEAD
    const supabase = createSupabase()
    let q = supabase.from('assinaturas_epi').select('*')
=======
    let q = supabaseAdmin.from('assinaturas_epi').select('*')
>>>>>>> e5a8b5a (epis ajustado e pagina de ocorrencias v1)
    if (filtros.loja)        q = q.eq('loja', filtros.loja)
    if (filtros.consultor)   q = q.eq('consultor', filtros.consultor)
    if (filtros.inicio)      q = q.gte('proximo_fornecimento', filtros.inicio)
    if (filtros.fim)         q = q.lte('proximo_fornecimento', filtros.fim)
    const { data: rows, error } = await q
    if (error) {
      console.error(error)
      return
    }
    setData(rows as Colaborador[])
  }
  const consultores = ['', ...Array.from(new Set(data.map(d => d.consultor))).sort()]
  const lojas       = ['', ...Array.from(new Set(data.map(d => d.loja))).sort()]

  // RAW data for cards & charts
  const total = data.length
  const counts = data.reduce<Record<string,number>>((acc, c) => {
    const s = c.status.toUpperCase()
    acc[s] = (acc[s]||0) + 1
    return acc
  }, {})

  // PieData Colaboradores
  const pieData = [
    { name: 'Em Dia',   value: counts['EM DIA'] || 0 },
    { name: 'Pendente', value: counts['PENDENTE'] || 0 },
    { name: 'Vencido',  value: counts['VENCIDO']  || 0 },
  ]

  // PieData EPIs (novo)
  const epiCounts = data.reduce<Record<string,number>>((acc, c) => {
    c.epis.forEach(e => {
      const s = e.status_epi.toUpperCase()
      acc[s] = (acc[s]||0) + 1
    })
    return acc
  }, {})
  
  const totalEpis = Object.values(epiCounts).reduce((sum, v) => sum + v, 0)


  // Top-10 lojas com mais EPIs vencidos, para line chart
  const evMap = data.reduce<Record<string,number>>((acc, c) => {
    c.epis.forEach(e => {
      if (e.status.toUpperCase() === 'VENCIDO') {
        acc[c.loja] = (acc[c.loja]||0) + 1
      }
    })
    return acc
  }, {})
  const lineData = Object.entries(evMap)
    .map(([loja, count]) => ({ loja, count }))
    .sort((a,b) => b.count - a.count)
    .slice(0, 10)

  // EPIs com entrega futura
  const hoje = new Date().toISOString().split('T')[0]
  const futureCount = data.reduce((sum, c) =>
    sum + c.epis.filter(e => e.proximo_fornecimento && e.proximo_fornecimento >= hoje).length
  , 0)

  // Previsão próximo mês
  const proxMes = format(addMonths(new Date(), 1), 'yyyy-MM')
  const nextMonthCount = data.reduce((sum, c) =>
    sum + c.epis.filter(e => e.mes_fornecimento === proxMes).length
  , 0)

  // Tabela: agrupamento se não há filtro
  const isFiltered = Boolean(
    filtros.loja || filtros.consultor || filtros.inicio || filtros.fim
  )
  // Dados ordenados e agrupados
  const sortedData = [...data].sort((a, b) =>
    a.consultor.localeCompare(b.consultor)
  )
  const grouped: Record<string, Colaborador[]> = {}
  sortedData.forEach(item => {
    const key = item.consultor || '—'
    grouped[key] = [...(grouped[key]||[]), item]
  })
  const consultorKeys = Object.keys(grouped).sort()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Dashboard EPIs</h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Filtrar por Consultor */}
        <div className="flex flex-col">
          <label className="text-sm font-medium">Consultor</label>
          <select
            className="border px-3 py-2 rounded"
            value={filtros.consultor}
            onChange={e => setFiltros({ ...filtros, consultor: e.target.value })}
          >
            {consultores.map(c => (
              <option key={c} value={c}>{c || 'Todos'}</option>
            ))}
          </select>
        </div>
          {/* Filtrar por Loja */}
        <div className="flex flex-col">
          <label className="text-sm font-medium">Loja</label>
          <select
            className="border px-3 py-2 rounded"
            value={filtros.loja}
            onChange={e => setFiltros({ ...filtros, loja: e.target.value })}
          >
            {lojas.map(l => (
              <option key={l} value={l}>{l || 'Todas'}</option>
            ))}
          </select>
        </div>
        {/* Período de Próx. Fornecimento */}
        <div className="flex flex-col">
          <label className="text-sm font-medium">De</label>
          <input
            type="date"
            className="border px-3 py-2 rounded"
            value={filtros.inicio}
            onChange={e => setFiltros({ ...filtros, inicio: e.target.value })}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium">Até</label>
          <input
            type="date"
            className="border px-3 py-2 rounded"
            value={filtros.fim}
            onChange={e => setFiltros({ ...filtros, fim: e.target.value })}
          />
        </div>
         {/* Botão Importar */}
        <Link href="/epi/upload">
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Importar
          </button>
        </Link>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <h3 className="font-semibold mb-2">Status Mercado</h3>
        {/* Top 3 Indicadores em Donuts */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {['EM DIA', 'PENDENTE', 'VENCIDO'].map((statusKey, i) => {
            const count = counts[statusKey] || 0
            const pct   = total ? Math.round((count / total) * 100) : 0
            const label = statusKey === 'EM DIA'
              ? 'Em Dia'
              : statusKey === 'PENDENTE'
                ? 'Pendentes'
                : 'Vencidos'

            // dados: fatia colorida + fatia cinza de “complemento”
            const donutData = [
              { name: label,   value: count },
              { name: 'other', value: total - count }
            ]

            return (
              <div key={statusKey} className="bg-white rounded shadow p-4 text-center">
                <h3 className="font-semibold mb-2">{label}</h3>
                <div className="relative h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        cx="50%" cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        <Cell key="c0" fill={COLORS[i]} />
                        <Cell key="c1" fill="#E5E7EB" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* percentual grande no centro */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold">{pct}%</span>
                    <span className="text-sm text-gray-500">{count.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>


        {/* 2) Status EPIs (novo) */}
        <div className="bg-white rounded shadow p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {Object.entries(epiCounts).map(([statusKey, count], i) => {
        const pct = totalEpis
          ? Math.round((count / totalEpis) * 100)
          : 0;
        // ajuste seus rótulos conforme os valores exatos de status_epi
        const label = statusKey.charAt(0) + statusKey.slice(1).toLowerCase();
        const color = COLORS[i % COLORS.length];

        const donutData = [
          { name: label,   value: count },
          { name: 'other', value: totalEpis - count }
        ];

        return (
          <div key={statusKey} className="text-center">
            <h3 className="text-sm font-medium mb-2">{label}</h3>
            <div className="relative h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    innerRadius={36}
                    outerRadius={52}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    <Cell key="c0" fill={color} />
                    <Cell key="c1" fill="#E5E7EB" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold">{pct}%</span>
                <span className="text-xs text-gray-500">{count.toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
        </div>

        {/* Top-10 EPIs vencidos por loja (progress bars) */}
      
      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-2">Top 10 Lojas por EPIs Vencidos</h3>

          {/* calcula o máximo pra normalizar as barras */}
          {(() => {
            const maxCount = Math.max(...lineData.map(d => d.count), 1)
            return (
              <div className="space-y-3">
                {lineData.map(({ loja, count }) => {
                  const pct = Math.round((count / maxCount) * 100)
                  return (
                    <div key={loja} className="flex items-center">
                      {/* label da loja */}
                      <span className="w-1/5 text-sm font-medium">{loja}</span>

                      {/* barra de fundo */}
                      <div className="relative w-3/5 h-4 bg-gray-200 rounded overflow-hidden mx-2">
                        {/* barra preenchida */}
                        <div
                          className="absolute top-0 left-0 h-full bg-red-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* percentual */}
                      <span className="w-1/5 text-sm font-medium">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

      </div>

      {/* Cards adicionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-600 text-white rounded shadow">
          <h3 className="font-semibold">EPIs com Entrega Futura</h3>
          <p className="text-2xl">{futureCount}</p>
        </div>
        <div className="p-4 bg-indigo-600 text-white rounded shadow">
          <h3 className="font-semibold">
            Previsão Próx. Mês ({format(addMonths(new Date(),1),'MMM/yyyy')})
          </h3>
          <p className="text-2xl">{nextMonthCount}</p>
        </div>
      </div>

      {/* Tabela de resultados */}
      {/* … */}
<div className="overflow-auto bg-white rounded shadow p-4">
  <h3 className="font-semibold mb-2">Colaboradores Detalhado</h3>
  <table className="min-w-full text-sm border">
    <thead className="bg-gray-100">
      <tr>
        <th className="px-2 py-1 border">Consultor</th>
        <th className="px-2 py-1 border">Colaborador</th>
        <th className="px-2 py-1 border">Status</th>
        <th className="px-2 py-1 border">Loja</th>
      </tr>
    </thead>
    <tbody>
      {isFiltered
        // modo FILTRADO: lista simples
        ? data.map((c, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-2 py-1 border">{c.consultor || '—'}</td>
              <td className="px-2 py-1 border">{c.nome}</td>
              <td className="px-2 py-1 border">{c.status}</td>
              <td className="px-2 py-1 border">{c.loja}</td>
            </tr>
          ))
        // modo AGRUPADO (nenhum filtro): agrupa por consultor
        : consultorKeys.map((consultor) =>
            grouped[consultor].map((c, idx) => (
              <tr key={`${consultor}-${idx}`} className="hover:bg-gray-50">
                {idx === 0 && (
                  <td
                    className="px-2 py-1 border"
                    rowSpan={grouped[consultor].length}
                  >
                    {consultor}
                  </td>
                )}
                <td className="px-2 py-1 border">{c.nome}</td>
                <td className="px-2 py-1 border">{c.status}</td>
                <td className="px-2 py-1 border">{c.loja}</td>
              </tr>
            ))
          )}
    </tbody>
  </table>
</div>
    </div>
  )
}
