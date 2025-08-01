'use client'

import { useEffect, useState } from 'react'
import { createSupabase } from '@/lib/supabase'
import { format, addMonths } from 'date-fns'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend
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
    const supabase = createSupabase()
    let q = supabase.from('assinaturas_epi').select('*')
    if (filtros.loja)        q = q.eq('loja', filtros.loja)
    if (filtros.consultor)   q = q.eq('consultor', filtros.consultor)
    if (filtros.inicio)      q = q.gte('proximo_fornecimento', filtros.inicio)
    if (filtros.fim)         q = q.lte('proximo_fornecimento', filtros.fim)
    const { data: rows, error } = await q
    if (error) {
      console.error(error)
      return
    }
   // Converta `rows` (tipo any[]) para seu tipo, se desejar...
    setData(rows as Colaborador[])
  }

  // Opções de filtro
  const lojas      = ['', ...Array.from(new Set(data.map(d => d.loja))).sort()]
  const consultores = ['', ...Array.from(new Set(data.map(d => d.consultor))).sort()]

  // Indicadores colaboradores
  const total = data.length
  const counts = data.reduce<Record<string,number>>((acc, c) => {
    const s = c.status.toUpperCase()
    acc[s] = (acc[s]||0) + 1
    return acc
  }, {})
  const pieData = [
    { name: 'Em Dia',   value: counts['EM DIA'] || 0 },
    { name: 'Pendente', value: counts['PENDENTE'] || 0 },
    { name: 'Vencido',  value: counts['VENCIDO']  || 0 },
  ]

  // EPIs vencidos por loja
  const evMap = data.reduce<Record<string,number>>((acc, c) => {
    c.epis.forEach(e => {
      if (e.status.toUpperCase() === 'VENCIDO') {
        acc[c.loja] = (acc[c.loja]||0) + 1
      }
    })
    return acc
  }, {})
  const barData = Object.entries(evMap).map(([loja, count]) => ({ loja, count }))

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Dashboard EPIs</h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <select
          className="border px-3 py-2 rounded"
          value={filtros.loja}
          onChange={e => setFiltros({ ...filtros, loja: e.target.value })}
        >
          <option value="">Todas Lojas</option>
          {lojas.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select
          className="border px-3 py-2 rounded"
          value={filtros.consultor}
          onChange={e => setFiltros({ ...filtros, consultor: e.target.value })}
        >
          <option value="">Todos Consultores</option>
          {consultores.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="date"
          className="border px-3 py-2 rounded"
          value={filtros.inicio}
          onChange={e => setFiltros({ ...filtros, inicio: e.target.value })}
        />
        <input
          type="date"
          className="border px-3 py-2 rounded"
          value={filtros.fim}
          onChange={e => setFiltros({ ...filtros, fim: e.target.value })}
        />
      </div>

      {/* Cards de indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-600 text-white rounded shadow">
          <h2 className="font-semibold">Total Colaboradores</h2>
          <p className="text-2xl">{total}</p>
        </div>
        <div className="p-4 bg-green-600 text-white rounded shadow">
          <h2 className="font-semibold">% Em Dia</h2>
          <p className="text-2xl">
            {total ? Math.round((counts['EM DIA']||0)/total*100) : 0}%
          </p>
        </div>
        <div className="p-4 bg-yellow-500 text-white rounded shadow">
          <h2 className="font-semibold">% Pendentes</h2>
          <p className="text-2xl">
            {total ? Math.round((counts['PENDENTE']||0)/total*100) : 0}%
          </p>
        </div>
        <div className="p-4 bg-red-600 text-white rounded shadow">
          <h2 className="font-semibold">% Vencidos</h2>
          <p className="text-2xl">
            {total ? Math.round((counts['VENCIDO']||0)/total*100) : 0}%
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pizza de status */}
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-2">Status Colaboradores</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                outerRadius={60} label
              >
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* BarChart EPIs vencidos por loja */}
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-2">EPIs Vencidos por Loja</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="loja" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cards adicionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-600 text-white rounded shadow">
          <h3 className="font-semibold">EPIs com Entrega Futura</h3>
          <p className="text-2xl">{futureCount}</p>
        </div>
        <div className="p-4 bg-indigo-600 text-white rounded shadow">
          <h3 className="font-semibold">Previsão Próx. Mês ({format(addMonths(new Date(),1),'MMM/yyyy')})</h3>
          <p className="text-2xl">{nextMonthCount}</p>
        </div>
      </div>

      {/* Tabela de resultados */}
      <div className="overflow-auto bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-2">Colaboradores Detalhado</h3>
        <table className="min-w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1 border">Colaborador</th>
              <th className="px-2 py-1 border">Status</th>
              <th className="px-2 py-1 border">Loja</th>
              <th className="px-2 py-1 border">Consultor</th>
              <th className="px-2 py-1 border">Próx. Fornecimento</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-2 py-1 border">{c.nome}</td>
                <td className="px-2 py-1 border">{c.status}</td>
                <td className="px-2 py-1 border">{c.loja}</td>
                <td className="px-2 py-1 border">{c.consultor}</td>
                <td className="px-2 py-1 border">
                  {c.epis
                    .map(e => e.proximo_fornecimento)
                    .filter(Boolean)
                    .sort()[0] || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
