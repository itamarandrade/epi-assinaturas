// components/DonutKpiCard.tsx
'use client';

import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type DonutKpiCardProps = {
  /** Título acima do gráfico */
  title: string;
  /** Parte do total que será destacada */
  count: number;
  /** Total (denominador) */
  total: number;
  /** Cor da parte destacada (ex.: '#0553fa') */
  color?: string;

  /** Altura do cartão em px (aplica na área do gráfico) */
  height?: number;

  /** Raios em px (referência do centro do gráfico) */
  innerRadius?: number;
  outerRadius?: number;

  /** Cor do “restante” (fatia cinza) */
  greyColor?: string;

  /** Formatações opcionais */
  formatCount?: (n: number) => string;
  formatPercent?: (pct: number) => string;

  /** Classes extras para o wrapper do cartão */
  className?: string;
  /** rótulo de acessibilidade do gráfico */
  ariaLabel?: string;
};

export default function DonutKpiCard({
  title,
  count,
  total,
  color = '#0553fa',
  height = 160,
  innerRadius = 50,
  outerRadius = 70,
  greyColor = '#e5e7eb',
  formatCount = (n) => n.toLocaleString('pt-BR'),
  formatPercent = (p) => `${p}%`,
  className = 'bg-white rounded-xl shadow p-4 text-center',
  ariaLabel = 'Indicador em gráfico de rosca',
}: DonutKpiCardProps) {
  const { pct, data } = useMemo(() => {
    const safeTotal = Math.max(0, total);
    const safeCount = Math.min(Math.max(0, count), safeTotal);

    const percent = safeTotal ? Math.round((safeCount / safeTotal) * 100) : 0;

    // Mantém duas fatias mesmo com total=0 (exibe anel “vazio”)
    const base = safeTotal
      ? [
          { name: title, value: safeCount, color },
          { name: 'Outros', value: Math.max(safeTotal - safeCount, 0), color: greyColor },
        ]
      : [
          { name: title, value: 0, color },
          { name: 'Outros', value: 1, color: greyColor },
        ];

    return { pct: percent, data: base };
  }, [title, count, total, color, greyColor]);

  return (
    <div className={className}>
      <h3 className="font-semibold mb-2">{title}</h3>

      <div className="relative" style={{ height }}>
        <div role="img" aria-label={ariaLabel} className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
                paddingAngle={2}
              >
                {data.map((d, i) => (
                  <Cell key={`${d.name}-${i}`} fill={d.color as string} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Centro (overlay) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold">{formatPercent(pct)}</span>
          <span className="text-sm text-gray-500">{formatCount(count)}</span>
        </div>
      </div>
    </div>
  );
}
