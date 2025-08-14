// /app/ocorrencias/page.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  getAfastamentoStats,
  getFacets,
  getHeatAreaNatureza,
  getHeatHoraDia,
  getPorAgenteCausador,
  getPorEstacaoMaquina,
  getPorOperacao,
  getPorParteCorpo,
  getPorSituacaoGeradora,
  getPorTipo,
  getSerieDiaria,
  getTopUnidades,
  type Filtros
} from '@/services/ocorrenciasService'
import HeatmapAreaNatureza from '@/components/HeatmapAreaNatureza'
import HeatmapHoraDia from '@/components/HeatmapHoraDia'
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#111827','#22c55e','#f59e0b','#ef4444','#3b82f6','#10b981','#a855f7','#14b8a6','#6366f1','#f97316']

export default function PageOcorrencias() {
  const hoje = dayjs().endOf('day')
  const inicioMes = dayjs().startOf('month')

  const [filtros, setFiltros] = useState<Filtros>({ de: inicioMes.toISOString(), ate: hoje.toISOString() })
  const [facets, setFacets] = useState<any>({ unidades: [], areas: [], naturezas: [], operacoes: [], estacoes: [], situacoes: [], partes: [], agentes: [] })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // Dados
  const [serie, setSerie] = useState<{ dt: string; ocorrencias: number }[]>([])
  const [topUnidades, setTopUnidades] = useState<{ unidade: string; qtd: number }[]>([])
  const [porTipo, setPorTipo] = useState<{ tipo: string; qtd: number }[]>([])
  const [porOperacao, setPorOperacao] = useState<{ operacao: string; qtd: number }[]>([])
  const [porEstacao, setPorEstacao] = useState<{ estacao_maquina: string; qtd: number }[]>([])
  const [porSituacao, setPorSituacao] = useState<{ situacao_geradora: string; qtd: number }[]>([])
  const [porParte, setPorParte] = useState<{ parte_corpo: string; qtd: number }[]>([])
  const [porAgente, setPorAgente] = useState<{ agente_causador: string; qtd: number }[]>([])
  const [afast, setAfast] = useState<{ total_registros: number; total_dias: number; media_dias: number; mediana_dias: number } | null>(null)
  const [heatHoraDia, setHeatHoraDia] = useState<{ weekday:number; hour:number; qtd:number }[]>([])
  const [heatAreaNat, setHeatAreaNat] = useState<{ area:string; natureza:string; qtd:number }[]>([])

  useEffect(() => {
    (async () => {
      try {
        setErr(null)
        setFacets(await getFacets())
      } catch (e: any) {
        console.error(e)
        setErr(e?.message || JSON.stringify(e))
      }
    })()
  }, [])

  useEffect(() => {
    (async () => {
      setLoading(true)
      setErr(null)
      try {
        const [
          s, tu, t, op, em, sg, pc, ac, af, hhd, han
        ] = await Promise.all([
          getSerieDiaria(filtros),
          getTopUnidades(filtros, 10),
          getPorTipo(filtros),
          getPorOperacao(filtros),
          getPorEstacaoMaquina(filtros),
          getPorSituacaoGeradora(filtros),
          getPorParteCorpo(filtros),
          getPorAgenteCausador(filtros),
          getAfastamentoStats(filtros),
          getHeatHoraDia(filtros),
          getHeatAreaNatureza(filtros),
        ])
        setSerie(s); setTopUnidades(tu); setPorTipo(t); setPorOperacao(op); setPorEstacao(em)
        setPorSituacao(sg); setPorParte(pc); setPorAgente(ac); setAfast(af); setHeatHoraDia(hhd); setHeatAreaNat(han)
      } catch (e: any) {
        console.error(e)
        setErr(e?.message || JSON.stringify(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [JSON.stringify(filtros)])

  const totalPeriodo = useMemo(() => serie.reduce((acc, x) => acc + x.ocorrencias, 0), [serie])
  const resetFiltros = () => setFiltros({ de: inicioMes.toISOString(), ate: hoje.toISOString() })

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Ocorrências</h1>
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
          <b>Erro ao carregar:</b> {err}
        </div>
      )}

      {/* Filtros */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-4 lg:grid-cols-8 bg-white p-4 rounded-xl shadow">
        <div>
          <label className="text-sm">De</label>
          <input type="datetime-local" className="w-full border rounded p-2"
            value={filtros.de ? dayjs(filtros.de).format('YYYY-MM-DDTHH:mm') : ''}
            onChange={e => setFiltros(f => ({ ...f, de: e.target.value ? dayjs(e.target.value).toISOString() : undefined }))}
          />
        </div>
        <div>
          <label className="text-sm">Até</label>
          <input type="datetime-local" className="w-full border rounded p-2"
            value={filtros.ate ? dayjs(filtros.ate).format('YYYY-MM-DDTHH:mm') : ''}
            onChange={e => setFiltros(f => ({ ...f, ate: e.target.value ? dayjs(e.target.value).toISOString() : undefined }))}
          />
        </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-sm">Unidade</label>
          <select className="w-full border rounded p-2" value={filtros.unidade ?? ''} onChange={e => setFiltros(f => ({ ...f, unidade: e.target.value || undefined }))}>
            <option value="">Todas</option>
            {facets.unidades.map((v: string) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm">Área</label>
          <select className="w-full border rounded p-2" value={filtros.area ?? ''} onChange={e => setFiltros(f => ({ ...f, area: e.target.value || undefined }))}>
            <option value="">Todas</option>
            {facets.areas.map((v: string) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm">Natureza da Lesão</label>
          <select className="w-full border rounded p-2" value={filtros.natureza ?? ''} onChange={e => setFiltros(f => ({ ...f, natureza: e.target.value || undefined }))}>
            <option value="">Todas</option>
            {facets.naturezas.map((v: string) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
         <div>
          <label className="text-sm">Parte do Corpo</label>
          <select className="w-full border rounded p-2" value={filtros.parte_corpo ?? ''} onChange={e => setFiltros(f => ({ ...f, parte_corpo: e.target.value || undefined }))}>
            <option value="">Todas</option>
            {facets.partes.map((v: string) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-sm">Operação</label>
          <select className="w-full border rounded p-2" value={filtros.operacao ?? ''} onChange={e => setFiltros(f => ({ ...f, operacao: e.target.value || undefined }))}>
            <option value="">Todas</option>
            {facets.operacoes.map((v: string) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm">Estação/Máquina</label>
          <select className="w-full border rounded p-2" value={filtros.estacao_maquina ?? ''} onChange={e => setFiltros(f => ({ ...f, estacao_maquina: e.target.value || undefined }))}>
            <option value="">Todas</option>
            {facets.estacoes.map((v: string) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm">Situação Geradora</label>
          <select className="w-full border rounded p-2" value={filtros.situacao_geradora ?? ''} onChange={e => setFiltros(f => ({ ...f, situacao_geradora: e.target.value || undefined }))}>
            <option value="">Todas</option>
            {facets.situacoes.map((v: string) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm">Agente Causador</label>
          <select className="w-full border rounded p-2" value={filtros.agente_causador ?? ''} onChange={e => setFiltros(f => ({ ...f, agente_causador: e.target.value || undefined }))}>
            <option value="">Todos</option>
            {facets.agentes.map((v: string) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        </div>
        <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
        <div className="md:col-span-2 lg:col-span-4 flex gap-2 items-end">
          <button className="px-3 py-2 rounded bg-gray-900 text-white" onClick={() => setFiltros(f => ({ ...f }))}>Aplicar</button>
          <button className="px-3 py-2 rounded border" onClick={resetFiltros}>Limpar</button>
        </div>
      </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="text-sm text-gray-500">Total no período</div>
          <div className="text-2xl font-bold">{totalPeriodo}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="text-sm text-gray-500">Unidades (Top)</div>
          <div className="text-2xl font-bold">{topUnidades.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="text-sm text-gray-500">Dias afastados (total)</div>
          <div className="text-2xl font-bold">{afast?.total_dias ?? 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="text-sm text-gray-500">Afastamento (média / mediana)</div>
          <div className="text-2xl font-bold">
            {(afast?.media_dias ?? 0)} / {(afast?.mediana_dias ?? 0)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Série diária */}
       <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">Ocorrências por dia</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={serie || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dt" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="ocorrencias" stroke="#111827" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Unidades */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">Top Unidades</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={topUnidades || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="unidade" hide={(topUnidades?.length ?? 0) > 8} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="qtd" fill="#111827" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      </div>
      
      {/* Distribuições atemporais */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-2">Top Unidades</h2>
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porParte}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="parte_corpo" hide={(porParte?.length ?? 0) > 8} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="qtd" fill="#111827" />
            </BarChart>
        </ResponsiveContainer>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-2">Por Agende Causador</h2>
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={(porAgente || []).map(x => ({ ...x, agente_causador: x.agente_causador || '(sem agente)' }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agente_causador" hide={(porAgente?.length ?? 0) > 8} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="qtd" fill="#111827" />
            </BarChart>
        </ResponsiveContainer>
        </div>
    </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartPie title="Por Ocorrência (Tipo)" data={porTipo.map(x => ({ name: x.tipo || '(sem tipo)', value: x.qtd }))} />
        <ChartPie title="Por Operação" data={porOperacao.map(x => ({ name: x.operacao || '(sem operação)', value: x.qtd }))} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartPie title="Por Estação/Máquina" data={porEstacao.map(x => ({ name: x.estacao_maquina || '(sem estação)', value: x.qtd }))} />
        <ChartPie title="Por Situação Geradora" data={porSituacao.map(x => ({ name: x.situacao_geradora || '(sem situação)', value: x.qtd }))} />
    </div>
   

      {/* Heatmaps */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">Mapa de Calor — Área × Natureza da Lesão</h2>
        <HeatmapAreaNatureza data={heatAreaNat} />
      </div>

      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">Mapa de Calor — Hora × Dia (America/Sao_Paulo)</h2>
        <HeatmapHoraDia data={heatHoraDia} />
      </div>
    </div>
  )
}

/** PieChart reutilizável */
function ChartPie({ title, data }: { title: string, data: { name: string; value: number }[] }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data || []} dataKey="value" nameKey="name" outerRadius={90} label>
            {(data || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
