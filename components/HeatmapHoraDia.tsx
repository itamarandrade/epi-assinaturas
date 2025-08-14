// /components/HeatmapHoraDia.tsx
'use client'
import React from 'react'

export type Heat = { weekday: number; hour: number; qtd: number }
const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'] // Postgres: 0=Dom

function scale(v: number, max: number) {
  if (max <= 0) return 0
  return Math.max(0.08, v / max)
}

export default function HeatmapHoraDia({ data }: { data: Heat[] }) {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0))
  let max = 0
  for (const { weekday, hour, qtd } of data) {
    if (weekday == null || hour == null) continue
    grid[weekday][hour] = qtd
    if (qtd > max) max = qtd
  }
  return (
    <div className="w-full">
      <div className="grid grid-cols-[60px_repeat(24,minmax(16px,1fr))] gap-1">
        <div></div>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="text-xs text-center">{h}</div>
        ))}
        {grid.map((row, d) => (
          <React.Fragment key={d}>
            <div className="text-xs pr-2 flex items-center justify-end">{dias[d]}</div>
            {row.map((q, h) => (
              <div
                key={h}
                className="rounded-sm"
                title={`${dias[d]} ${h}:00 → ${q} ocorrência(s)`}
                style={{ backgroundColor: `rgba(0,0,0,${scale(q, max)})`, height: 18 }}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">Mais escuro = mais ocorrências</div>
    </div>
  )
}
