// /components/HeatmapAreaNatureza.tsx
'use client'
import React, { useMemo } from 'react'

type Cell = { area: string; natureza: string; qtd: number }

export default function HeatmapAreaNatureza({ data }: { data: Cell[] }) {
  const areas = useMemo(() => Array.from(new Set(data.map(d => d.area || '(sem area)'))).sort(), [data])
  const naturezas = useMemo(() => Array.from(new Set(data.map(d => d.natureza || '(sem natureza)'))).sort(), [data])
  const map = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of data) m.set(`${d.area}__${d.natureza}`, d.qtd)
    return m
  }, [data])
  const max = useMemo(() => Math.max(1, ...data.map(d => d.qtd)), [data])
  const alpha = (q: number) => Math.max(0.08, q / max)

  return (
    <div className="w-full overflow-auto">
      <div className="grid" style={{ gridTemplateColumns: `160px repeat(${naturezas.length}, minmax(80px,1fr))`, gap: 4 }}>
        <div></div>
        {naturezas.map(n => <div key={n} className="text-xs text-center text-gray-700">{n}</div>)}
        {areas.map(a => (
          <React.Fragment key={a}>
            <div className="text-xs pr-2 flex items-center justify-end text-gray-700">{a}</div>
            {naturezas.map(n => {
              const q = map.get(`${a}__${n}`) || 0
              return (
                <div key={a+"|"+n} className="rounded-sm flex items-center justify-center"
                     title={`${a} × ${n}: ${q}`}
                     style={{ backgroundColor: `rgba(0,0,0,${alpha(q)})`, height: 28 }}>
                  <span className="text-[11px] text-white/90">{q || ''}</span>
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">Mais escuro = mais ocorrências no período filtrado</div>
    </div>
  )
}
