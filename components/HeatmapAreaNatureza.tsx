// /components/HeatmapAreaNatureza.tsx
'use client'

import React, { useMemo, useState } from 'react'

type Cell = { area: string | null | undefined; natureza: string | null | undefined; qtd: number | null | undefined }

type Props = {
  data: Cell[]
  /** Ordena as linhas (áreas) pelo total decrescente */
  sortRowsByTotal?: boolean
  /** Paleta de cores */
  palette?: 'sunset' | 'red' | 'blue' | 'teal'
  /** Clique na célula (ex.: drilldown/filtrar) */
  onCellClick?: (cell: { area: string; natureza: string; qtd: number }) => void
}

/** micro helper para montar classes sem depender de libs */
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export default function HeatmapAreaNatureza({
  data,
  sortRowsByTotal = true,
  palette = 'sunset',
  onCellClick,
}: Props) {
  // normaliza dados para string/number confiáveis
  const normalized = useMemo(
    () =>
      data.map((d) => ({
        area: d.area ?? '(sem área)',
        natureza: d.natureza ?? '(sem natureza)',
        qtd: Number(d.qtd ?? 0),
      })),
    [data]
  )

  // chaves únicas
  const areasRaw = useMemo(
    () => Array.from(new Set(normalized.map((d) => d.area))),
    [normalized]
  )
  const naturezas = useMemo(
    () => Array.from(new Set(normalized.map((d) => d.natureza))),
    [normalized]
  )

  // mapa (area__natureza) -> qtd
  const map = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of normalized) m.set(`${d.area}__${d.natureza}`, d.qtd)
    return m
  }, [normalized])

  // totais por linha
  const rowTotals = useMemo(() => {
    const t = new Map<string, number>()
    for (const a of areasRaw) {
      let sum = 0
      for (const n of naturezas) sum += map.get(`${a}__${n}`) || 0
      t.set(a, sum)
    }
    return t
  }, [areasRaw, naturezas, map])

  const areas = useMemo(() => {
    if (!sortRowsByTotal) return [...areasRaw].sort()
    return [...areasRaw].sort((a, b) => (rowTotals.get(b)! - rowTotals.get(a)! || a.localeCompare(b)))
  }, [areasRaw, rowTotals, sortRowsByTotal])

  const max = useMemo(() => Math.max(1, ...normalized.map((d) => d.qtd)), [normalized])
  const min = 0

  // ======= Paletas e interpolação =======
  const PALETTES: Record<NonNullable<Props['palette']>, [string, string, string]> = {
    sunset: ['#34d399', '#fbbf24', '#ef4444'], // verde -> amarelo -> vermelho
    red: ['#fee2e2', '#fca5a5', '#b91c1c'],
    blue: ['#dbeafe', '#60a5fa', '#1e3a8a'],
    teal: ['#ccfbf1', '#5eead4', '#115e59'],
  }

  function hexToRgb(hex: string) {
    const h = hex.replace('#', '')
    const bigint = parseInt(h, 16)
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
  }
  function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t
  }
  function mix(c1: string, c2: string, t: number) {
    const A = hexToRgb(c1),
      B = hexToRgb(c2)
    const r = Math.round(lerp(A.r, B.r, t))
    const g = Math.round(lerp(A.g, B.g, t))
    const b = Math.round(lerp(A.b, B.b, t))
    return `rgb(${r}, ${g}, ${b})`
  }
  function colorScale(t: number) {
    const [c0, c1, c2] = PALETTES[palette]
    if (t <= 0.5) return mix(c0, c1, t / 0.5)
    return mix(c1, c2, (t - 0.5) / 0.5)
  }
  function cellColor(q: number) {
    const t = (q - min) / (max - min || 1)
    const eased = Math.pow(t, 0.8) // ligeiro boost
    return colorScale(eased)
  }

  // hover
  const [hoverRow, setHoverRow] = useState<string | null>(null)
  const [hoverCol, setHoverCol] = useState<string | null>(null)

  const [g0, g1, g2] = PALETTES[palette]
  const legendGradient = `linear-gradient(90deg, ${g0}, ${g1}, ${g2})`

  return (
    <div className="w-full">
      <div className="overflow-auto rounded-xl border border-gray-200 bg-white">
        <div
          className="grid text-sm"
          style={{
            gridTemplateColumns: `200px repeat(${naturezas.length}, minmax(90px,1fr))`,
          }}
        >
          {/* canto vazio */}
          <div
            className="sticky top-0 z-20 bg-white"
            style={{ boxShadow: 'inset -1px -1px 0 0 rgba(0,0,0,0.05)' }}
          />
          {/* cabeçalhos */}
          {naturezas.map((n) => (
            <div
              key={`h-${n}`}
              className={cx(
                'sticky top-0 z-20 px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-slate-600 bg-white'
              )}
              style={{ boxShadow: 'inset -1px -1px 0 0 rgba(0,0,0,0.05)' }}
              onMouseEnter={() => setHoverCol(n)}
              onMouseLeave={() => setHoverCol(null)}
            >
              {n}
            </div>
          ))}

          {/* linhas */}
          {areas.map((a) => (
            <React.Fragment key={`row-${a}`}>
              <div
                className={cx(
                  'sticky left-0 z-10 bg-white px-3 py-2 pr-4 text-right text-[12px] text-slate-700',
                  hoverRow === a && 'bg-slate-50'
                )}
                style={{ boxShadow: 'inset -1px -1px 0 0 rgba(0,0,0,0.05)' }}
                onMouseEnter={() => setHoverRow(a)}
                onMouseLeave={() => setHoverRow(null)}
              >
                {a}
                <span className="ml-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                  {rowTotals.get(a)}
                </span>
              </div>

              {naturezas.map((n) => {
                const q = map.get(`${a}__${n}`) || 0
                const bg = q > 0 ? cellColor(q) : 'rgba(0,0,0,0.04)'
                const isHot = hoverRow === a || hoverCol === n

                return (
                  <button
                    key={`${a}|${n}`}
                    type="button"
                    className={cx(
                      'relative h-9 select-none rounded-md outline-none transition-[transform,box-shadow]',
                      'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400',
                      isHot && 'scale-[1.015]'
                    )}
                    style={{ background: bg, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }}
                    title={`${a} × ${n}: ${q}`}
                    aria-label={`${a} por ${n}: ${q}`}
                    onMouseEnter={() => {
                      setHoverRow(a)
                      setHoverCol(n)
                    }}
                    onMouseLeave={() => {
                      setHoverRow(null)
                      setHoverCol(null)
                    }}
                    onClick={() => onCellClick?.({ area: a, natureza: n, qtd: q })}
                  >
                    <span
                      className={cx(
                        'absolute inset-0 flex items-center justify-center text-[11px] font-medium',
                        q === 0 ? 'text-slate-500/60' : 'text-white drop-shadow-sm'
                      )}
                    >
                      {q || ''}
                    </span>
                  </button>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* legenda */}
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
        <span className="whitespace-nowrap">Baixa</span>
        <div className="h-2 w-48 rounded-full" style={{ background: legendGradient }} />
        <span className="whitespace-nowrap">Alta</span>
        <span className="ml-3 text-slate-400">({min} – {max})</span>
        <span className="ml-auto text-[11px] text-slate-500">
          Passe o mouse para destacar.
        </span>
      </div>
    </div>
  )
}
