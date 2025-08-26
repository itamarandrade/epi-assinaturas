// /components/HeatmapHoraDia.tsx
'use client'
import React, { useMemo, useState } from 'react'

export type Heat = { weekday: number; hour: number; qtd: number }

type Props = {
  data: Heat[]
  palette?: 'sunset' | 'red' | 'blue' | 'teal'
  onCellClick?: (cell: { weekday: number; hour: number; qtd: number }) => void
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function cx(...p: Array<string | false | null | undefined>) {
  return p.filter(Boolean).join(' ')
}

export default function HeatmapHoraDia({
  data,
  palette = 'sunset',
  onCellClick,
}: Props) {
  const { grid, max } = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array(24).fill(0))
    let m = 0
    for (const { weekday, hour, qtd } of data) {
      if (weekday == null || hour == null) continue
      const q = Number(qtd || 0)
      g[weekday][hour] = q
      if (q > m) m = q
    }
    return { grid: g, max: Math.max(1, m) }
  }, [data])

  const PALETTES: Record<NonNullable<Props['palette']>, [string, string, string]> = {
    sunset: ['#34d399', '#fbbf24', '#ef4444'],
    red: ['#fee2e2', '#fca5a5', '#b91c1c'],
    blue: ['#dbeafe', '#60a5fa', '#1e3a8a'],
    teal: ['#ccfbf1', '#5eead4', '#115e59'],
  }

  function hexToRgb(hex: string) { const h = hex.replace('#',''); const n = parseInt(h,16); return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 } }
  function lerp(a:number,b:number,t:number){return a+(b-a)*t}
  function mix(c1:string,c2:string,t:number){ const A=hexToRgb(c1),B=hexToRgb(c2); return `rgb(${Math.round(lerp(A.r,B.r,t))}, ${Math.round(lerp(A.g,B.g,t))}, ${Math.round(lerp(A.b,B.b,t))})` }
  function colorScale(t:number){ const [c0,c1,c2]=PALETTES[palette]; return t<=.5?mix(c0,c1,t/.5):mix(c1,c2,(t-.5)/.5) }
  function cellColor(q:number){ const eased=Math.pow(q/(max||1),.8); return q>0?colorScale(eased):'rgba(0,0,0,0.04)' }

  const [hoverRow, setHoverRow] = useState<number | null>(null)
  const [hoverCol, setHoverCol] = useState<number | null>(null)

  const [g0,g1,g2]=PALETTES[palette]
  const legendGradient = `linear-gradient(90deg, ${g0}, ${g1}, ${g2})`

  return (
    <div className="w-full">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div
          className="grid text-sm"
          style={{ gridTemplateColumns: `90px repeat(24, 1fr)` }}
        >
          {/* canto vazio */}
          <div className="sticky top-0 z-20 bg-white" style={{ boxShadow: 'inset -1px -1px 0 0 rgba(0,0,0,0.06)' }} />
          {/* cabeçalho horas */}
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={`h-${h}`}
              className="sticky top-0 z-20 px-1 py-1 text-center text-[11px] font-medium uppercase tracking-wide text-slate-600 bg-white"
              style={{ boxShadow: 'inset -1px -1px 0 0 rgba(0,0,0,0.06)' }}
              onMouseEnter={() => setHoverCol(h)}
              onMouseLeave={() => setHoverCol(null)}
            >
              {h.toString().padStart(2, '0')}
            </div>
          ))}

          {/* linhas */}
          {grid.map((row, d) => (
            <React.Fragment key={`row-${d}`}>
              <div
                className={cx(
                  'sticky left-0 z-10 bg-white px-2 py-2 pr-3 text-right text-[12px] text-slate-700',
                  hoverRow === d && 'bg-slate-50'
                )}
                style={{ boxShadow: 'inset -1px -1px 0 0 rgba(0,0,0,0.06)' }}
                onMouseEnter={() => setHoverRow(d)}
                onMouseLeave={() => setHoverRow(null)}
              >
                {DIAS[d]}
              </div>

              {row.map((q, h) => {
                const bg = cellColor(q)
                const isHot = hoverRow === d || hoverCol === h
                return (
                  <button
                    key={`${d}|${h}`}
                    type="button"
                    className={cx(
                      'relative h-8 select-none rounded-md outline-none transition-[transform,box-shadow]',
                      'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400',
                      isHot && 'scale-[1.02]'
                    )}
                    style={{ background: bg, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }}
                    title={`${DIAS[d]} ${h.toString().padStart(2, '0')}:00 → ${q} ocorrência(s)`}
                    aria-label={`${DIAS[d]} às ${h} horas: ${q} ocorrência(s)`}
                    onMouseEnter={() => { setHoverRow(d); setHoverCol(h) }}
                    onMouseLeave={() => { setHoverRow(null); setHoverCol(null) }}
                    onClick={() => onCellClick?.({ weekday: d, hour: h, qtd: q })}
                  >
                    {/* mostra número apenas se > 0 */}
                    {q > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-white drop-shadow-sm">
                        {q}
                      </span>
                    )}
                  </button>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* legenda */}
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
        <span>Baixa</span>
        <div className="h-2 w-full max-w-[260px] rounded-full" style={{ background: legendGradient }} />
        <span>Alta</span>
        <span className="ml-3 text-slate-400">(0 – {max})</span>
      </div>
    </div>
  )
}
