// app/page.tsx (DASHBOARD VISUAL DINÂMICO)
'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { getResumoEpis } from '@/services/assinaturaService'

const COLORS = ['#22c55e', '#facc15', '#ef4444']

export default function HomeDashboard() {
  const [dadosEPIs, setDadosEPIs] = useState<{ name: string; value: number }[]>([])
  const [rankingLojas, setRankingLojas] = useState<{ loja: string; problemas: number }[]>([])
  const [rankingConsultores, setRankingConsultores] = useState<{ consultor: string; emDia: number; pendente: number; vencido: number }[]>([])
  const [filtroLoja, setFiltroLoja] = useState('Todas')
  const [filtroConsultor, setFiltroConsultor] = useState('Todos')
  

 useEffect(() => {
  getResumoEpis().then(({ grafico, ranking, resumo }) => {
    setDadosEPIs(grafico)
    setRankingLojas(ranking)
    setRankingConsultores(resumo)
  })
}, [filtroLoja, filtroConsultor]) // adiciona filtros como dependência

  const consultoresFiltrados = rankingConsultores.filter(item =>
    (filtroConsultor === 'Todos' || item.consultor === filtroConsultor)
  )

  const lojas = ['Todas', ...new Set(rankingLojas.map(l => l.loja))]
  const consultores = ['Todos', ...new Set(rankingConsultores.map(c => c.consultor))]

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Painel Geral</h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Filtrar por Loja</label>
          <select value={filtroLoja} onChange={e => setFiltroLoja(e.target.value)} className="mt-1 p-2 border rounded">
            {lojas.map(loja => <option key={loja}>{loja}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Filtrar por Consultor</label>
          <select value={filtroConsultor} onChange={e => setFiltroConsultor(e.target.value)} className="mt-1 p-2 border rounded">
            {consultores.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Sessão EPIs */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Módulo de EPIs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <CardGrafico titulo="EPIs" dados={dadosEPIs} />
          <div className="bg-white rounded shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Ranking de Lojas com Mais Problemas de EPIs</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={rankingLojas} layout="vertical">
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="loja" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="problemas" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela resumo por consultor */}
        <div className="bg-white rounded shadow p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Resumo por Consultor</h3>
          <div className="overflow-auto">
            <table className="min-w-full text-sm text-center">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">Consultor</th>
                  <th className="p-2">Em Dia</th>
                  <th className="p-2">Pendente</th>
                  <th className="p-2">Vencido</th>
                  <th className="p-2">Total</th>
                  <th className="p-2">%</th>
                </tr>
              </thead>
              <tbody>
                {consultoresFiltrados.map(({ consultor, emDia, pendente, vencido }) => {
                  const total = emDia + pendente + vencido
                  const percentual = Math.round((emDia / total) * 100)
                  const cor = percentual >= 90 ? 'bg-green-400' : percentual >= 80 ? 'bg-yellow-300' : percentual >= 70 ? 'bg-orange-300' : 'bg-red-400'
                  return (
                    <tr key={consultor} className="border-b">
                      <td className="p-2 font-medium">{consultor}</td>
                      <td className="p-2">{emDia}</td>
                      <td className="p-2">{pendente}</td>
                      <td className="p-2">{vencido}</td>
                      <td className="p-2">{total}</td>
                      <td className={`p-2 text-white font-bold ${cor}`}>{percentual}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Sessão Ocorrências */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Módulo de Ocorrências</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardGrafico titulo="Ocorrências" dados={[{ name: 'Resolvidas', value: 70 }, { name: 'Pendentes', value: 25 }, { name: 'Críticas', value: 5 }]} />
        </div>
      </section>
    </div>
  )
}

function CardGrafico({ titulo, dados }: { titulo: string; dados: { name: string; value: number }[] }) {
  return (
    <div className="bg-white rounded shadow p-4">
      <h2 className="text-lg font-semibold mb-2">{titulo}</h2>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={dados}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {dados.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
