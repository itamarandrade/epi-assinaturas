'use client'

import React, { useState, useEffect, ChangeEvent } from 'react'
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts'
import {
  getResumoEpis,
  getDetalhePorConsultor
} from '@/services/assinaturaService'

/** Tipos de dados */
interface GraficoData { name: string; value: number }
interface RankingLoja { loja: string; problemas: number }
interface RankingConsultor { consultor: string; emDia: number; pendente: number; vencido: number }
interface DetalheLoja { loja: string; emDia: number; pendente: number; vencido: number }

const COLORS = ['#22c55e', '#facc15', '#ef4444']

export default function HomeDashboard() {
  // estados
  const [dadosEPIs, setDadosEPIs] = useState<GraficoData[]>([])
  const [rankingLojas, setRankingLojas] = useState<RankingLoja[]>([])
  const [rankingConsultores, setRankingConsultores] = useState<RankingConsultor[]>([])
  const [detalheLojas, setDetalheLojas] = useState<DetalheLoja[]>([])

  // filtros
  const [filtroLoja, setFiltroLoja] = useState<string>('Todas')
  const [filtroConsultor, setFiltroConsultor] = useState<string>('Todos')

  // Re-fetch ao mudar filtros
  useEffect(() => {
    const lojaParam = filtroLoja === 'Todas' ? undefined : filtroLoja
    const consParam = filtroConsultor === 'Todos' ? undefined : filtroConsultor
    getResumoEpis(lojaParam, consParam)
      .then(({ grafico, ranking, resumo }) => {
        setDadosEPIs(grafico)
        setRankingLojas(ranking)
        setRankingConsultores(resumo)
      })
      .catch(console.error)
  }, [filtroLoja, filtroConsultor])

  // Detalhe por loja ao mudar consultor
  useEffect(() => {
    if (filtroConsultor !== 'Todos') {
      getDetalhePorConsultor(filtroConsultor)
        .then(setDetalheLojas)
        .catch(console.error)
    }
  }, [filtroConsultor])

  // opções para selects
  const lojasOptions = ['Todas', ...new Set(rankingLojas.map(r => r.loja))]
  const consultoresOptions = ['Todos', ...new Set(rankingConsultores.map(r => r.consultor))]

  // Top 10 lojas
  const topStores = rankingLojas
    .slice()
    .sort((a, b) => b.problemas - a.problemas)
    .slice(0, 10)

  // Label customizado para Pie (exibe valor e percentual)
  const renderPieLabel = ({ name, value, percent, cx, cy, midAngle, innerRadius, outerRadius }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="#000" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        <tspan x={x} dy="-0.5em" fontSize="0.75em">{name}</tspan>
        <tspan x={x} dy="1em" fontSize="0.75em">{value} ({(percent! * 100).toFixed(0)}%)</tspan>
      </text>
    )
  }

  // Consultores ordenados por % Em Dia desc
  const consultoresFiltrados = rankingConsultores
    .slice()
    .filter(r => filtroConsultor === 'Todos' || r.consultor === filtroConsultor)
    .sort((a, b) => {
      const pctA = a.emDia / (a.emDia + a.pendente + a.vencido || 1)
      const pctB = b.emDia / (b.emDia + b.pendente + b.vencido || 1)
      return pctB - pctA
    })

  // Detalhe por loja ordenado por % Em Dia desc
  const detalheOrdenado = detalheLojas
    .slice()
    .sort((a, b) => {
      const pctA = a.emDia / (a.emDia + a.pendente + a.vencido || 1)
      const pctB = b.emDia / (b.emDia + b.pendente + b.vencido || 1)
      return pctB - pctA
    })

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Painel Geral de EPIs</h1>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium">Loja</label>
          <select
            className="mt-1 p-2 border rounded"
            value={filtroLoja}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFiltroLoja(e.target.value)}
          >
            {lojasOptions.map(loja => <option key={loja} value={loja}>{loja}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Consultor</label>
          <select
            className="mt-1 p-2 border rounded"
            value={filtroConsultor}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFiltroConsultor(e.target.value)}
          >
            {consultoresOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PieChart de distribuição */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Distribuição de EPIs</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dadosEPIs}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={80}
                label={renderPieLabel}
                labelLine={false}
              >
                {dadosEPIs.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* BarChart top lojas */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Top 10 Lojas com Problemas</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topStores} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false}/>
              <YAxis dataKey="loja" type="category" width={100} interval={0}/>
              <Tooltip/>
              <Bar dataKey="problemas" fill="#ef4444"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABELAS SEPARADAS */}
      {filtroConsultor === 'Todos' ? (
        <div className="bg-white rounded shadow p-4 space-y-4">
          <h2 className="text-lg font-semibold">Resumo por Consultor</h2>
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b py-2 font-medium text-gray-700">
            <div className="w-1/4">Consultor</div>
            <div className="flex w-3/4 justify-between">
              <div className="w-1/5 text-center">Em Dia</div>
              <div className="w-1/5 text-center">Pendente</div>
              <div className="w-1/5 text-center">Vencido</div>
              <div className="w-1/5 text-center">Total</div>
              <div className="w-1/5 text-center">% Em Dia</div>
            </div>
          </div>
          {consultoresFiltrados.map(item => {
            const total = item.emDia + item.pendente + item.vencido
            const pct = total > 0 ? Math.round((item.emDia / total) * 100) : 0
            const bgc = pct >= 90 ? 'bg-green-400' : pct >= 80 ? 'bg-yellow-300' : pct >= 70 ? 'bg-orange-300' : 'bg-red-400'
            return (
              <div key={item.consultor} className="flex items-center justify-between border-t py-2">
                <div className="w-1/4 font-medium">{item.consultor}</div>
                <div className="flex w-3/4 justify-between">
                  <span className="w-1/5 text-center">{item.emDia}</span>
                  <span className="w-1/5 text-center">{item.pendente}</span>
                  <span className="w-1/5 text-center">{item.vencido}</span>
                  <span className="w-1/5 text-center">{total}</span>
                  <span className={`w-1/5 text-center text-white font-bold px-2 rounded ${bgc}`}>{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded shadow p-4 space-y-4">
          <h2 className="text-lg font-semibold">Detalhamento por Loja: {filtroConsultor}</h2>
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b py-2 font-medium text-gray-700">
            <div className="w-1/4">Loja</div>
            <div className="flex w-3/4 justify-between">
              <div className="w-1/5 text-center">Em Dia</div>
              <div className="w-1/5 text-center">Pendente</div>
              <div className="w-1/5 text-center">Vencido</div>
              <div className="w-1/5 text-center">Total</div>
              <div className="w-1/5 text-center">% Em Dia</div>
            </div>
          </div>
          {detalheOrdenado.map(item => {
            const total = item.emDia + item.pendente + item.vencido
            const pct = total > 0 ? Math.round((item.emDia / total) * 100) : 0
            const bgc = pct >= 90 ? 'bg-green-400' : pct >= 80 ? 'bg-yellow-300' : pct >= 70 ? 'bg-orange-300' : 'bg-red-400'
            return (
              <div key={item.loja} className="flex items-center justify-between border-t py-2">
                <div className="w-1/4 font-medium">{item.loja}</div>
                <div className="flex w-3/4 justify-between">
                  <span className="w-1/5 text-center">{item.emDia}</span>
                  <span className="w-1/5 text-center">{item.pendente}</span>
                  <span className="w-1/5 text-center">{item.vencido}</span>
                  <span className="w-1/5 text-center">{total}</span>
                  <span className={`w-1/5 text-center text-white font-bold px-2 rounded ${bgc}`}>{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
