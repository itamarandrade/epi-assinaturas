'use client'

import React, { useEffect, useMemo, useState } from 'react'
import DonutChart from '@/components/ChartPie'
import {
  getContagemPorStatus,
  getPivotEpiPorStatus,
  getTopLojasProblemas,
  getTotalEpis
} from '@/services/episService'
import { EpiPivotRow, Filtro, LojaProblema, StatusCount } from '@/types/epis'
import SmartBarChart from '@/components/ChartBar'
import { DataTableG } from '@/components/dataTable'
import type { Column } from '@/components/dataTable'

// 🆕 placeholders genéricos
import { Placeholder } from '@/components/placeholder'
import { LoadingSwitch } from '@/components/placeholder/LoadingSwitch'

const nf = new Intl.NumberFormat('pt-BR')
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

  // 🆕 controle de loading/erro
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [total, setTotal] = useState(0)
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([])
  const [pivot, setPivot] = useState<EpiPivotRow[]>([])
  const [topLojas, setTopLojas] = useState<LojaProblema[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setErro(null)
        const [t, sc, pv, tl] = await Promise.all([
          getTotalEpis(filtro),
          getContagemPorStatus(filtro),
          getPivotEpiPorStatus(filtro),
          getTopLojasProblemas(filtro),
        ])
        if (!alive) return
        setTotal(t)
        setStatusCounts(sc)
        setPivot(pv)
        setTopLojas(tl)
      } catch (e: any) {
        if (!alive) return
        setErro(e?.message || 'Erro ao carregar dados')
      } finally {
        alive && setLoading(false)
      }
    })()
    return () => { alive = false }
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

  // ---------- TABELA PIVOT COM DATATABLE ----------
  type RowPivot = { epi: string; Total: number } & Record<string, number>

  const rowsPivot = useMemo<RowPivot[]>(() => {
    return pivot.map((row) => {
      const o: Record<string, any> = { epi: row.nome_epi, Total: row.total }
      allStatuses.forEach((st) => {
        o[st] = row.byStatus[st] ?? 0
      })
      return o as RowPivot
    })
  }, [pivot, allStatuses])

  const columnsPivot = useMemo<Column<RowPivot>[]>(() => {
    const cols: Column<RowPivot>[] = [
      { key: 'epi', label: 'EPI', sortable: true },
      ...allStatuses.map<Column<RowPivot>>((st) => ({
        key: st as keyof RowPivot,
        label: st,
        sortable: true,
        align: 'right',
        render: (r) => nf.format(Number((r as any)[st]) || 0),
      })),
      {
        key: 'Total',
        label: 'Total',
        sortable: true,
        align: 'right',
        render: (r) => nf.format(Number((r as any).Total) || 0),
      },
    ]
    return cols
  }, [allStatuses])

  const getTotalsPivot = (allRows: RowPivot[]) => {
    const sumCol = (k: string) =>
      allRows.reduce((acc, r) => acc + (Number((r as any)[k]) || 0), 0)

    const totals: Partial<Record<keyof RowPivot, React.ReactNode>> = {
      epi: 'Totais',
      Total: nf.format(sumCol('Total')),
    }
    for (const st of allStatuses) {
      totals[st as keyof RowPivot] = nf.format(sumCol(st))
    }
    return totals as Partial<Record<Extract<keyof RowPivot, string>, React.ReactNode>>
  }
  // ---------- FIM TABELA PIVOT ----------

  if (erro) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <strong>Erro:</strong> {erro}
        </div>
      </div>
    )
  }

  return (
    <LoadingSwitch
      isLoading={loading}
      placeholder={
        <div className="p-6 max-w-7xl mx-auto space-y-6" aria-busy="true">
          {/* Filtros (quando criar) */}
          {/* <Placeholder.Card><div className="flex gap-4"><Placeholder.Filter /><Placeholder.Filter /></div></Placeholder.Card> */}
          <Placeholder.TextLine w={220} h={20} />
          {/* KPIs (total + por status) */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* 1 total + 5 status (ajuste conforme necessário) */}
            <Placeholder.KpiRow count={6} />
          </div>
          {/* Donut + Top lojas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Placeholder.Chart height={300} />
            <Placeholder.Chart height={400} />
          </div>
          {/* Tabela pivot */}
          <Placeholder.Table cols={Math.max(3, allStatuses.length + 2)} rows={10} schema={`2fr repeat(${allStatuses.length},1fr) 1fr`} />
        </div>
      }
    >
      {/* --- CONTEÚDO REAL --- */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* (Opcional) Área de filtros — plugue selects globais aqui */}
        {/* <Filtros onChange={setFiltro} /> */}

        {/* 1) KPI: Total de EPIs + KPIs por status */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KpiCard label="Total de EPIs" value={total} />
          {allStatuses.map(st => (
            <KpiCard key={st} label={st} value={kpiMap.get(st) || 0} color={colorForStatus(st)} />
          ))}
        </div>

        {/* 2) Donut com todos os status + Top Lojas */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className="h-[auto] shadow-sm rounded-xl p-3 bg-white">
            <h3 className="font-semibold mb-2">Distribuição por Status</h3>
            <DonutChart
              data={donutData}
              colorByKey={{}}
              defaultColors={PALETTE}
              ariaLabel="Distribuição de EPIs por status"
              height={300}
              fixedOrder={allStatuses}
              enforceStatusOrder={true}
              sliceLabel
              showLegend={true}
              legendCols={2}
            />
          </div>

          {/* Top 10 lojas com mais problemas (PENDENTE + VENCIDO) */}
          <section className="bg-white rounded-xl shadow-sm p-3">
            <div className="h-[450px]">
              <SmartBarChart
                title='10 Lojas com Maior Déficit de EPIs'
                data={topLojas}
                labelKey="loja"
                orientation="vertical"
                tipo="loja"
                series={[
                  {
                    key: 'pendentes',
                    label: 'Pendentes',
                    color: 'rgba(255, 238, 0, 1)',
                    showValue: true,
                  },
                  {
                    key: 'vencidos',
                    label: 'Vencidos',
                    color: '#ff0000ff',
                    showValue: true,
                  },
                ]}
                height={400}
                formatValue={(n) => nf.format(Number(n) || 0)}
                width={150}
              />
            </div>
          </section>
        </div>

        {/* 3) Lista pivot: EPIs × todos os status + total (DataTable) */}
        <section className="rounded-xl shadow-sm bg-white">
          <div className="p-3 text-base font-medium">EPIs por Status</div>
          <DataTableG<RowPivot>
            columns={columnsPivot}
            rows={rowsPivot}
            borderType="cell"
            compact
            stickyHeader
            striped
            initialSortBy="Total"
            initialSortDir="desc"
            showTotals
            getTotals={getTotalsPivot}
          />
        </section>
      </div>
    </LoadingSwitch>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="p-4 rounded-xl shadow-sm bg-white">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-2xl font-semibold" style={color ? { color } : undefined}>
        {nf.format(Number(value) || 0)}
      </div>
    </div>
  )
}
