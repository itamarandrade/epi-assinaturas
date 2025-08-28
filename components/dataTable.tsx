'use client'

import React, { ReactNode, useMemo, useState, useRef, useEffect } from 'react'


/* =========================================================
 * 1) Tabela genérica (DataTableG) + Tipos utilitários
 * ========================================================= */
export type Column<T> = {
  key: Extract<keyof T, string>
  label: string
  align?: 'left' | 'right' | 'center'
  className?: string
  width?: number | string
  sortable?: boolean
  render?: (row: T) => ReactNode,
  filterType?: 'text' | 'select' | 'multiselect',
  filterOptions?: Array<{ value: string; label?: string }> | string[]
  getFilterValue?: (row: T) => string // valor usado na filtragem (se diferente do campo)
}

type BorderType = 'none' | 'row' | 'cell'

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]

  // extras (título, busca, sticky, estilos, bordas)
  title?: string
  showSearch?: boolean
  stickyHeader?: boolean
  compact?: boolean
  striped?: boolean
  borderType?: BorderType

  // ordenação (controlada ou interna)
  sortBy?: Extract<keyof T, string>
  setSortBy?: (k: Extract<keyof T, string>) => void
  sortDir?: 'asc' | 'desc'
  setSortDir?: (d: 'asc' | 'desc') => void
  initialSortBy?: Extract<keyof T, string>
  initialSortDir?: 'asc' | 'desc'

  // totais (tfoot)
  showTotals?: boolean
  getTotals?: (rows: T[]) => Partial<Record<Extract<keyof T, string>, ReactNode>>

  // UI
  emptyMessage?: string

  // ações
  onRowClick?: (row: T) => void
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const alignClass: Record<'left' | 'right' | 'center', string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

function compareValues(a: unknown, b: unknown, dir: 'asc' | 'desc') {
  const va = typeof a === 'string' ? a.toUpperCase() : (a as any)
  const vb = typeof b === 'string' ? b.toUpperCase() : (b as any)
  let cmp = 0
  if (va == null && vb != null) cmp = -1
  else if (va != null && vb == null) cmp = 1
  else if (va < vb) cmp = -1
  else if (va > vb) cmp = 1
  return dir === 'asc' ? cmp : -cmp
}

export function DataTableG<T>({
  columns,
  rows,
  title,
  showSearch = false,
  stickyHeader = false,
  compact = false,
  striped = false,
  borderType = 'row',
  sortBy,
  setSortBy,
  sortDir,
  setSortDir,
  initialSortBy,
  initialSortDir = 'asc',
  showTotals = false,
  getTotals,
  emptyMessage = 'Nenhum registro encontrado.',
  onRowClick,
}: DataTableProps<T>) {
  // estados internos quando não-controlado
  const [localSortBy, setLocalSortBy] = useState<Extract<keyof T, string> | undefined>(initialSortBy)
  const [localSortDir, setLocalSortDir] = useState<'asc' | 'desc'>(initialSortDir)
  const [query, setQuery] = useState<string>('')
  const [colFilters, setColFilters] = useState<Record<string, string>>({})
  const [colMultiFilters, setColMultiFilters] = useState<Record<string, string[]>>({})
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const effectiveSortBy: Extract<keyof T, string> | undefined = sortBy ?? localSortBy
  const effectiveSortDir: 'asc' | 'desc' = sortDir ?? localSortDir

function useClickOutside(
  ref: { current: HTMLElement | null },
  onClose: () => void
) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      const el = ref.current
      if (!el) return
      if (!el.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onClose])
}

  // filtro de busca + filtros por coluna
  const filteredRows: T[] = useMemo(() => {
    let base = rows

    // 🔽 aplica filtros por coluna
const hasColumnFilters = columns.some(c => c.filterType)
if (hasColumnFilters) {
  base = base.filter((r: T) => {
    for (const c of columns) {
      if (!c.filterType) continue
      const key = String(c.key)
      const rawVal = c.getFilterValue ? c.getFilterValue(r) : (r as any)[c.key]
      const rawStr = (rawVal ?? '').toString()
      const text = rawStr.toLowerCase()

      if (c.filterType === 'multiselect') {
        const selected = colMultiFilters[key] ?? []
        if (selected.length > 0 && !selected.includes(rawStr)) return false
        continue
      }

      const fv = colFilters[key] ?? ''
      if (!fv) continue
      const needle = fv.toLowerCase()

      if (c.filterType === 'select') {
        if (needle && text !== needle) return false
      } else {
        if (needle && !text.includes(needle)) return false
      }
    }
    return true
  })
}


    // 🔽 busca global (se habilitada)
    if (!showSearch || !query.trim()) return base
    const q = query.trim().toLowerCase()
    return base.filter((r: T) =>
      columns.some((c: Column<T>) => {
        const val = c.render ? c.render(r) : (r as any)[c.key]
        const text =
          typeof val === 'string'
            ? val
            : typeof val === 'number'
            ? String(val)
            : (val as any)?.toString?.() ?? ''
        return text.toLowerCase().includes(q)
      })
    )
  }, [rows, columns, showSearch, query, colFilters, colMultiFilters])

  // ordenação
  const sortedRows: T[] = useMemo(() => {
    if (!effectiveSortBy) return filteredRows
    const col = columns.find((c: Column<T>) => c.key === effectiveSortBy)
    if (!col) return filteredRows
    const out = [...filteredRows]
    out.sort((ra: T, rb: T) =>
      compareValues((ra as any)[col.key], (rb as any)[col.key], effectiveSortDir)
    )
    return out
  }, [filteredRows, effectiveSortBy, effectiveSortDir, columns])

  // estilo de bordas
  const tableBorder =
    borderType === 'cell' ? 'border border-gray-200' : borderType === 'row' ? 'border-collapse' : ''
  const rowBorder = borderType === 'row' ? 'border-t border-gray-200' : ''

  // sort handlers
  function handleSort(col: Column<T>) {
    if (!col.sortable) return
    const key = col.key
    const isControlled = !!setSortBy || !!setSortDir
    if (isControlled) {
      const nextDir: 'asc' | 'desc' =
        (sortBy ?? initialSortBy) === key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc'
      setSortBy?.(key)
      setSortDir?.(nextDir)
    } else {
      const nextDir: 'asc' | 'desc' =
        localSortBy === key ? (localSortDir === 'asc' ? 'desc' : 'asc') : 'asc'
      setLocalSortBy(key)
      setLocalSortDir(nextDir)
    }
  }
  
  function sortIndicator(col: Column<T>) {
    const active = effectiveSortBy === col.key
    if (!active) return null
    return <span className="ml-1 select-none">{effectiveSortDir === 'asc' ? '▲' : '▼'}</span>
  }

  const totalsMap = useMemo<
    Partial<Record<Extract<keyof T, string>, ReactNode>> | undefined
  >(
    () => (showTotals && getTotals && sortedRows.length > 0 ? getTotals(sortedRows) : undefined),
    [showTotals, getTotals, sortedRows]
  )

  return (
    <div className="w-full">
      {(title || showSearch) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? <h4 className="font-semibold">{title}</h4> : <div />}
          {showSearch && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      )}

      <div className="overflow-auto rounded-md border border-gray-200">
        <table className={cx('w-full text-sm', tableBorder)}>
          <thead className={cx('bg-gray-50', stickyHeader && 'sticky top-0 z-10')}>
  {/* 1) TÍTULOS + ORDENAR */}
  <tr>
    {columns.map((col: Column<T>) => {
      const thAlign = alignClass[col.align ?? 'left']
      return (
        <th
          key={String(col.key)}
          className={cx('px-3 py-2 font-medium text-gray-700 whitespace-nowrap', thAlign, col.className)}
          style={col.width ? { width: col.width } : undefined}
        >
          <button
            type="button"
            className={cx('inline-flex items-center', col.sortable && 'cursor-pointer')}
            onClick={() => handleSort(col)}
            title={col.sortable ? 'Ordenar' : undefined}
          >
            <span>{col.label}</span>
            {col.sortable && sortIndicator(col)}
          </button>
        </th>
      )
    })}
  </tr>

  {/* 2) LINHA DE FILTROS (text | select | multiselect dropdown) */}
  {columns.some(c => c.filterType) && (
    <tr>
      {columns.map((col: Column<T>) => {
        const key = String(col.key)
        const val = colFilters[key] ?? ''
        const multiVals = colMultiFilters[key] ?? []
        const optsRaw = Array.isArray(col.filterOptions) ? col.filterOptions : []
        const opts = optsRaw.map(o => typeof o === 'string' ? { value: o, label: o } : o)

        const ddRef = useRef<HTMLDivElement>(null)
        useClickOutside(ddRef, () => setOpenDropdown(prev => (prev === key ? null : prev)))

        const allSelected = opts.length > 0 && multiVals.length === opts.length

        function toggle(v: string) {
          setColMultiFilters(prev => {
            const cur = prev[key] ?? []
            return { ...prev, [key]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }
          })
        }
        function selectAll() {
          setColMultiFilters(prev => ({ ...prev, [key]: opts.map(o => o.value) }))
        }
        function clearAll() {
          setColMultiFilters(prev => ({ ...prev, [key]: [] }))
        }

        return (
          <th key={`filter-${key}`} className="px-3 pb-2 align-top">
            {col.filterType === 'text' && (
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder="Filtrar…"
                value={val}
                onChange={e => setColFilters(f => ({ ...f, [key]: e.target.value }))}
              />
            )}

            {col.filterType === 'select' && (
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={val}
                onChange={e => setColFilters(f => ({ ...f, [key]: e.target.value }))}
              >
                <option value="">Todos</option>
                {opts.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label ?? opt.value}
                  </option>
                ))}
              </select>
            )}

            {col.filterType === 'multiselect' && (
              <div className="relative" ref={ddRef}>
                <button
                  type="button"
                  className="w-full border rounded px-2 py-1 text-sm flex items-center justify-between"
                  onClick={() => setOpenDropdown(prev => (prev === key ? null : key))}
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === key}
                  title="Filtrar (múltiplas opções)"
                >
                  <span className="truncate">
                    {multiVals.length === 0
                      ? 'Todos'
                      : multiVals.length === 1
                        ? (opts.find(o => o.value === multiVals[0])?.label ?? multiVals[0])
                        : `${multiVals.length} selecionados`}
                  </span>
                  <span className="ml-2 text-gray-500">▾</span>
                </button>

                {openDropdown === key && (
                  <div
                    role="listbox"
                    className="absolute z-20 mt-1 w-64 max-h-64 overflow-auto rounded border border-gray-200 bg-white shadow"
                  >
                    <div className="sticky top-0 bg-white border-b border-gray-100 p-2 flex items-center gap-3 text-sm">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => (allSelected ? clearAll() : selectAll())}
                        />
                        <span>Selecionar todos</span>
                      </label>
                      {multiVals.length > 0 && (
                        <button
                          type="button"
                          className="ml-auto text-blue-600 underline"
                          onClick={clearAll}
                        >
                          limpar
                        </button>
                      )}
                    </div>

                    <ul className="p-2 space-y-1">
                      {opts.map(opt => {
                        const checked = multiVals.includes(opt.value)
                        return (
                          <li key={opt.value}>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(opt.value)}
                              />
                              <span className="truncate">{opt.label ?? opt.value}</span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </th>
        )
      })}
    </tr>
  )}
</thead>


          <tbody className={compact ? 'text-[13px]' : ''}>
            {sortedRows.length > 0 ? (
              sortedRows.map((row: T, i: number) => (
                <tr
                  key={i}
                  className={cx(rowBorder, striped && i % 2 === 1 ? 'bg-gray-50/60' : '', onRowClick && 'hover:bg-gray-100 cursor-pointer')}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col: Column<T>) => {
                    const tdAlign = alignClass[col.align ?? 'left']
                    const content = col.render ? col.render(row) : (row as any)[col.key]
                    return (
                      <td
                        key={String(col.key)}
                        className={cx('px-3 py-2 align-middle', tdAlign, col.className)}
                        style={col.width ? { width: col.width } : undefined}
                      >
                        {content as ReactNode}
                      </td>
                    )
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>

          {totalsMap && (
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                {columns.map((col: Column<T>) => {
                  const tdAlign = alignClass[col.align ?? 'left']
                  const k = col.key as Extract<keyof T, string>   // ✅ mantém o tipo literal
                  return (
                    <td key={String(col.key)} className={cx('px-3 py-2', tdAlign, col.className)}>
                      {totalsMap?.[k] ?? ''}                       {/* ✅ nada de String(col.key) */}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

/* =========================================================
 * 2) Variações (TabelaUniversal)
 * ========================================================= */
export type RowConsultor = {
  consultor: string
  emDia: number
  pendente: number
  vencido: number
  total: number
  pctEmDia: number
}

export type Status = 'EM DIA' | 'PENDENTE' | 'VENCIDO' | 'DEVOLVIDO' | 'ENTREGA FUTURA' | string

export type RowColab = {
  consultor: string
  colaborador: string
  loja: string
  status_geral: Status
}

export type RowEpi = {
  epi: string
  devolvido: number
  emDia: number
  entregaFutura: number
  pendente: number
  vencido: number
  total: number
}

type PropsConsultores = {
  variant: 'consultores'
  title?: string
  rows: RowConsultor[]
}

type PropsColaboradores = {
  variant: 'colaboradores'
  title?: string
  rows: RowColab[]
  lojas: string[]
  consultores: string[]
}

type PropsEpis = {
  variant: 'epis'
  title?: string
  rows: RowEpi[]
}

type TabelaUniversalProps = PropsConsultores | PropsColaboradores | PropsEpis

const nf = new Intl.NumberFormat('pt-BR')

function pctColor(p: number) {
  if (p > 90) return '#16a34a'
  if (p >= 70) return '#f59e0b'
  return '#ef4444'
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<string, { bg: string; fg: string }> = {
    'EM DIA': { bg: 'bg-green-100', fg: 'text-green-700' },
    PENDENTE: { bg: 'bg-amber-100', fg: 'text-amber-700' },
    VENCIDO: { bg: 'bg-red-100', fg: 'text-red-700' },
    DEVOLVIDO: { bg: 'bg-slate-100', fg: 'text-slate-600' },
    'ENTREGA FUTURA': { bg: 'bg-blue-100', fg: 'text-blue-700' },
  }
  const cls = map[status] ?? { bg: 'bg-gray-100', fg: 'text-gray-700' }
  return <span className={`inline-flex items-center rounded-full ${cls.bg} ${cls.fg} px-2 py-0.5 text-xs font-medium`}>{status}</span>
}

function TabelaConsultores({ rows, title = 'Resumo por Consultor' }: PropsConsultores) {
  const columns: Column<RowConsultor>[] = useMemo(() => ([
    { key: 'consultor', label: 'Consultor', sortable: true },
    { key: 'emDia',     label: 'Em Dia',   align: 'right', sortable: true, render: (r: RowConsultor) => nf.format(r.emDia) },
    { key: 'pendente',  label: 'Pendente', align: 'right', sortable: true, render: (r: RowConsultor) => nf.format(r.pendente) },
    { key: 'vencido',   label: 'Vencidos', align: 'right', sortable: true, render: (r: RowConsultor) => nf.format(r.vencido) },
    { key: 'total',     label: 'Total',    align: 'right', sortable: true, render: (r: RowConsultor) => nf.format(r.total) },
    {
      key: 'pctEmDia',
      label: '% Em Dia',
      align: 'right',
      sortable: true,
      render: (r: RowConsultor) => <span style={{ color: pctColor(r.pctEmDia) }}>{r.pctEmDia}%</span>,
    },
  ]), [])

  return (
    <DataTableG<RowConsultor>
      title={title}
      columns={columns}
      rows={rows}
      striped
      compact
      stickyHeader
      borderType="row"
      initialSortBy="consultor"
      initialSortDir="asc"
      showTotals
      getTotals={(rows: RowConsultor[]) => {
        const sum = <K extends keyof RowConsultor>(k: K) =>
          rows.reduce<number>((acc: number, r: RowConsultor) => acc + Number(r[k] ?? 0), 0)

        const total = sum('total') || (sum('emDia') + sum('pendente') + sum('vencido'))
        const pct = total ? Number(((sum('emDia') * 100) / total).toFixed(1)) : 0

        return {
          consultor: 'Totais',
          emDia: nf.format(sum('emDia')),
          pendente: nf.format(sum('pendente')),
          vencido: nf.format(sum('vencido')),
          total: nf.format(total),
          pctEmDia: <span style={{ color: pctColor(pct) }}>{pct}%</span>,
        }
      }}
    />
  )
}

/* ===============================
 * VARIAÇÃO: COLABORADORES (multi)
 * =============================== */

// Normaliza qualquer status vindo do banco (EM_DIA -> EM DIA, trims, maiúsculas)
function normalizeStatus(s: unknown): Status {
  const txt = String(s ?? '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
  return (txt || '') as Status
}

function TabelaColaboradores({ rows, lojas, consultores, title = '' }: PropsColaboradores) {
  // Deriva automaticamente os status disponíveis a partir dos dados (e mantém uma ordem amigável)
  const AVAILABLE_STATUSES: Status[] = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) set.add(normalizeStatus(r.status_geral))
    const derived = Array.from(set) as Status[]
    const desiredOrder: Status[] = ['EM DIA','PENDENTE','VENCIDO','DEVOLVIDO','ENTREGA FUTURA']
    // ordena pelos conhecidos primeiro, depois os demais
    const known = derived.filter(d => desiredOrder.includes(d as Status))
    const unknown = derived.filter(d => !desiredOrder.includes(d as Status)).sort()
    const ordered = [...desiredOrder.filter(d => known.includes(d)), ...unknown]
    return ordered.length ? (ordered as Status[]) : desiredOrder
  }, [rows])

  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>([])
  const [fConsultor, setFConsultor] = useState<string>('Todos')
  const [fLoja, setFLoja] = useState<string>('Todas')
  const [busca, setBusca] = useState<string>('')
  const [sortBy, setSortBy] = useState<keyof RowColab>('consultor')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const allSelected = selectedStatuses.length === AVAILABLE_STATUSES.length

  function toggleStatus(s: Status) {
    setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function toggleAllStatuses() {
    setSelectedStatuses(allSelected ? [] : [...AVAILABLE_STATUSES])
  }

  const filtered: RowColab[] = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const selectedNorm = new Set(selectedStatuses.map(normalizeStatus))
    return rows
      .filter((r: RowColab) => {
        // ✅ Se nada marcado => todos
        const st = normalizeStatus(r.status_geral)
        const statusOk = selectedNorm.size === 0 || selectedNorm.has(st)
        if (!statusOk) return false
        if (fConsultor !== 'Todos' && r.consultor !== fConsultor) return false
        if (fLoja !== 'Todas' && r.loja !== fLoja) return false
        if (!q) return true
        const hay = `${r.colaborador} ${r.consultor} ${r.loja}`.toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => {
        const va = (a as any)[sortBy]
        const vb = (b as any)[sortBy]
        const cmp = va === vb ? 0 : va > vb ? 1 : -1
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [rows, selectedStatuses, fConsultor, fLoja, busca, sortBy, sortDir])

  const columns: Column<RowColab>[] = useMemo(() => ([
    { key: 'consultor',   label: 'Consultor',   sortable: true },
    { key: 'colaborador', label: 'Colaborador', sortable: true },
    { key: 'loja',        label: 'Loja',        sortable: true },
    { key: 'status_geral',label: 'Status Geral',sortable: true, render: (r: RowColab) => <StatusPill status={normalizeStatus(r.status_geral)} /> },
  ]), [])

  return (
    <div className="space-y-3">
      {/* filtros */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {/* ✅ Multiselect por checkboxes (dinâmico) */}
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Status (marque 1+)</label>
          <div className="flex items-center gap-3 mb-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allSelected} onChange={toggleAllStatuses} />
              <span>Selecionar todos</span>
            </label>
            {selectedStatuses.length > 0 && (
              <button
                type="button"
                className="text-xs underline text-blue-600"
                onClick={() => setSelectedStatuses([])}
                title="Limpar seleção"
              >
                limpar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {AVAILABLE_STATUSES.map((s) => (
              <label key={s} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(s)}
                  onChange={() => toggleStatus(s)}
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Consultor</label>
          <select className="w-full border rounded px-2 py-2" value={fConsultor} onChange={(e) => setFConsultor(e.target.value)}>
            <option>Todos</option>
            {consultores.map((c: string) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Loja</label>
          <select className="w-full border rounded px-2 py-2" value={fLoja} onChange={(e) => setFLoja(e.target.value)}>
            <option>Todas</option>
            {lojas.map((l: string) => <option key={l}>{l}</option>)}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Busca</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Nome, consultor, loja..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {/* ordenação */}
        <div className="grid grid-cols-2 gap-3 md:col-span-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Ordenar por</label>
            <select
              className="w-full border rounded px-2 py-2"
              value={String(sortBy)}
              onChange={(e) => setSortBy(e.target.value as keyof RowColab)}
            >
              <option value="consultor">Consultor</option>
              <option value="colaborador">Colaborador</option>
              <option value="loja">Loja</option>
              <option value="status_geral">Status Geral</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Direção</label>
            <select
              className="w-full border rounded px-2 py-2"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as 'asc'|'desc')}
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>
        </div>
      </div>

      <DataTableG<RowColab>
        title={title}
        columns={columns}
        rows={filtered}
        striped
        compact
        stickyHeader
        borderType="row"
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortDir={sortDir}
        setSortDir={setSortDir}
      />
    </div>
  )
}

function TabelaEpis({ rows, title = 'EPIs por Status' }: PropsEpis) {
  const columns: Column<RowEpi>[] = useMemo(() => ([
    { key: 'epi',           label: 'EPI',            sortable: true },
    { key: 'devolvido',     label: 'DEVOLVIDO',      align: 'right', sortable: true, render: (r: RowEpi) => nf.format(r.devolvido) },
    { key: 'emDia',         label: 'EM DIA',         align: 'right', sortable: true, render: (r: RowEpi) => nf.format(r.emDia) },
    { key: 'entregaFutura', label: 'ENTREGA FUTURA', align: 'right', sortable: true, render: (r: RowEpi) => nf.format(r.entregaFutura) },
    { key: 'pendente',      label: 'PENDENTE',       align: 'right', sortable: true, render: (r: RowEpi) => nf.format(r.pendente) },
    { key: 'vencido',       label: 'VENCIDO',        align: 'right', sortable: true, render: (r: RowEpi) => nf.format(r.vencido) },
    { key: 'total',         label: 'Total',          align: 'right', sortable: true, render: (r: RowEpi) => nf.format(r.total) },
  ]), [])

  return (
    <DataTableG<RowEpi>
      title={title}
      columns={columns}
      rows={rows}
      striped
      compact
      stickyHeader
      borderType="row"
      initialSortBy="epi"
      showTotals
      getTotals={(rows: RowEpi[]) => {
        const sum = <K extends keyof RowEpi>(k: K) =>
          rows.reduce<number>((acc: number, r: RowEpi) => acc + Number(r[k] ?? 0), 0)

        const totals = {
          devolvido: sum('devolvido'),
          emDia: sum('emDia'),
          entregaFutura: sum('entregaFutura'),
          pendente: sum('pendente'),
          vencido: sum('vencido'),
          total: sum('total') || (sum('devolvido') + sum('emDia') + sum('entregaFutura') + sum('pendente') + sum('vencido')),
        }

        return {
          epi: 'Totais',
          devolvido: nf.format(totals.devolvido),
          emDia: nf.format(totals.emDia),
          entregaFutura: nf.format(totals.entregaFutura),
          pendente: nf.format(totals.pendente),
          vencido: nf.format(totals.vencido),
          total: nf.format(totals.total),
        }
      }}
    />
  )
}

/* =========================
 * Type guards para narrowing
 * ========================= */
function isConsultores(p: TabelaUniversalProps): p is PropsConsultores {
  return p.variant === 'consultores'
}
function isColaboradores(p: TabelaUniversalProps): p is PropsColaboradores {
  return p.variant === 'colaboradores'
}

export default function TabelaUniversal(props: TabelaUniversalProps) {
  if (isConsultores(props)) return <TabelaConsultores {...props} />
  if (isColaboradores(props)) return <TabelaColaboradores {...props} />
  return <TabelaEpis {...props} />
}
