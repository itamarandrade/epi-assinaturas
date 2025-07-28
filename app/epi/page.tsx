// Estrutura reformulada do projeto Next.js com App Router e Supabase

// app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [dados, setDados] = useState<any[]>([])
  const [filtros, setFiltros] = useState({ status: '', loja: '', consultor: '' })
  const router = useRouter()

  useEffect(() => {
    buscarDados()
  }, [filtros])

  const buscarDados = async () => {
    let query = supabase.from('assinaturas_epi').select('*')
    if (filtros.status) query = query.eq('status', filtros.status)
    if (filtros.loja) query = query.eq('loja', filtros.loja)
    if (filtros.consultor) query = query.eq('consultor', filtros.consultor)
    const { data } = await query
    setDados(data || [])
  }

  const totais = {
    total: dados.length,
    pendentes: dados.filter(d => d.status.toLowerCase() === 'pendente').length,
    em_dia: dados.filter(d => d.status.toLowerCase() === 'em dia').length,
    vencidos: dados.filter(d => d.status.toLowerCase() === 'vencido').length
  }

  const lojas = Array.from(new Set(dados.map(d => d.loja))).sort()
  const consultores = Array.from(new Set(dados.map(d => d.consultor))).sort()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Painel de Assinaturas</h1>
        <button
          onClick={() => router.push('/epi/upload')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Importar Dados
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card title="Total de Funcionários" count={totais.total} color="bg-slate-600" />
        <Card title="Pendentes" count={totais.pendentes} color="bg-yellow-500" />
        <Card title="Em Dia" count={totais.em_dia} color="bg-green-600" />
        <Card title="Vencidos" count={totais.vencidos} color="bg-red-600" />
      </div>

      <div className="flex gap-4 mb-6">
        <select
          className="border px-3 py-2 rounded"
          onChange={e => setFiltros({ ...filtros, status: e.target.value })}
        >
          <option value="">Status</option>
          <option value="EM DIA">Em Dia</option>
          <option value="PENDENTE">Pendente</option>
          <option value="VENCIDO">Vencido</option>
        </select>
        <select
          className="border px-3 py-2 rounded"
          onChange={e => setFiltros({ ...filtros, loja: e.target.value })}
        >
          <option value="">Loja</option>
          {lojas.map(loja => <option key={loja}>{loja}</option>)}
        </select>
        <select
          className="border px-3 py-2 rounded"
          onChange={e => setFiltros({ ...filtros, consultor: e.target.value })}
        >
          <option value="">Consultor</option>
          {consultores.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border">Nome</th>
              <th className="px-3 py-2 border">Status</th>
              <th className="px-3 py-2 border">Loja</th>
              <th className="px-3 py-2 border">Consultor</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d, i) => (
              <tr key={i}>
                <td className="px-3 py-1 border">{d.nome}</td>
                <td className="px-3 py-1 border">{d.status}</td>
                <td className="px-3 py-1 border">{d.loja}</td>
                <td className="px-3 py-1 border">{d.consultor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Card({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <div className={`p-4 rounded text-white shadow ${color}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  )
}

// Restante da estrutura permanece igual
