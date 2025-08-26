// components/placeholder/index.tsx
'use client'
import { SimpleSkeleton } from '@/components/ui/SimpleSkeleton'
import React from 'react'

export const Placeholder = {
  /** Contêiner branco com sombra, para manter consistência visual */
  Card: ({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={`bg-white rounded-xl shadow p-4 ${className}`} aria-busy="true">{children}</div>
  ),

  /** Título / linha de texto */
  TextLine: ({ w = 160, h = 16 }: { w?: number; h?: number }) =>
    <SimpleSkeleton className="mb-2" style={{ width: w, height: h }} />,

  /** Filtros (label + input “fantasma”) */
  Filter: ({ labelW = 80, inputW = 220 }: { labelW?: number; inputW?: number }) => (
    <div className="flex items-center gap-2">
      <SimpleSkeleton className="h-4" style={{ width: labelW }} />
      <SimpleSkeleton className="h-10 rounded-lg" style={{ width: inputW }} />
    </div>
  ),

  /** Conjunto de filtros horizontal com espaçamento */
  FiltersRow: ({ count = 2 }: { count?: number }) => (
    <div className="flex gap-4 mb-4">
      {Array.from({ length: count }).map((_, i) => <Placeholder.Filter key={i} />)}
    </div>
  ),

  /** Gráfico genérico (mantém espaço — evita layout shift) */
  Chart: ({ height = 260, showLegend = true }: { height?: number; showLegend?: boolean }) => (
    <Placeholder.Card>
      <Placeholder.TextLine w={180} h={20} />
      <SimpleSkeleton className="mb-4" style={{ height: 1 }} />
      <SimpleSkeleton className="w-full" style={{ height }} />
      {showLegend && (
        <div className="mt-4 flex gap-4">
          <SimpleSkeleton className="h-4 w-24" />
          <SimpleSkeleton className="h-4 w-24" />
          <SimpleSkeleton className="h-4 w-24" />
        </div>
      )}
    </Placeholder.Card>
  ),

  /** “Rosca” / donut genérico */
  Donut: ({ size = 240, cols = 2 }: { size?: number; cols?: 1 | 2 }) => (
    <Placeholder.Card>
      <Placeholder.TextLine w={200} h={20} />
      <SimpleSkeleton className="mb-4" style={{ height: 1 }} />
      <div className="grid grid-cols-1">
        <SimpleSkeleton className="mx-auto rounded-full" style={{ width: size, height: size }} />
        <div className={`mt-4 grid grid-cols-${cols} gap-2`}>
          {Array.from({ length: 4 }).map((_, i) => <SimpleSkeleton key={i} className="h-4 w-28" />)}
        </div>
      </div>
    </Placeholder.Card>
  ),

  /** Tabela genérica (cabeçalho + N linhas + totais opcionais) */
  Table: ({
    cols = 6, rows = 8, withTotals = true,
    schema = '2fr repeat(4,1fr) 1fr',
  }: { cols?: number; rows?: number; withTotals?: boolean; schema?: string }) => (
    <Placeholder.Card>
      <div className="mb-3 flex items-center justify-between">
        <Placeholder.TextLine w={220} h={24} />
        <SimpleSkeleton className="h-6 w-24" />
      </div>
      <div className="border-b pb-2" style={{ display: 'grid', gridTemplateColumns: schema, gap: '0.75rem' }}>
        {Array.from({ length: cols }).map((_, i) => <SimpleSkeleton key={i} className="h-4 w-20" />)}
      </div>
      <div className="mt-2 space-y-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} style={{ display: 'grid', gridTemplateColumns: schema, gap: '0.75rem' }}>
            {Array.from({ length: cols }).map((_, c) => (
              <SimpleSkeleton key={c} className="h-5" />
            ))}
          </div>
        ))}
      </div>
      {withTotals && (
        <div className="mt-3 border-t pt-2" style={{ display: 'grid', gridTemplateColumns: schema, gap: '0.75rem' }}>
          {Array.from({ length: cols }).map((_, i) => <SimpleSkeleton key={i} className="h-5" />)}
        </div>
      )}
    </Placeholder.Card>
  ),

  /** cartões KPI simples */
  KpiRow: ({ count = 4 }: { count?: number }) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Placeholder.Card key={i}>
          <Placeholder.TextLine w={100} h={16} />
          <SimpleSkeleton className="h-8 w-24 rounded-md" />
        </Placeholder.Card>
      ))}
    </div>
  ),
}