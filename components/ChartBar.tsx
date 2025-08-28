// components/SmartBarChart.tsx
'use client';

import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LabelList, Legend,Cell
} from 'recharts';

type Orientation = 'vertical' | 'horizontal';

type SeriesItem = {
  key: string;
  label: string;
  color?: string;
  stackId?: string | number;
  showValue?: boolean;
  colorScale?: (v: number, min: number, max: number, index: number) => string;

};

type SmartBarChartProps<T extends Record<string, any>> = {
  data: T[];
  /** ex.: 'loja' */
  labelKey: keyof T;

  /** === MODO 1: uma série só */
  valueKey?: keyof T;
  valueLabel?: string;
  valueColor?: string;
  valueColorScale?: (v: number, min: number, max: number, index: number) => string;

  /** === MODO 2: várias séries */
  series?: SeriesItem[];

  orientation?: Orientation;
  tipo?: 'loja' | 'outro';
  height?: number;
  formatValue?: (n: number) => string;
  title?: string;
  showLegend?: boolean;
  width?: number;
};
// [update] helpers de min/max
function getMinMax<T extends Record<string, any>>(arr: T[], key: keyof T) {
  let min = Infinity, max = -Infinity;
  for (const it of arr) {
    const v = Number(it[key]) || 0;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!isFinite(min)) min = 0;
  if (!isFinite(max)) max = 0;
  return { min, max };
}
export default function SmartBarChart<T extends Record<string, any>>({
  data,
  labelKey,
  valueKey,
  valueLabel,
  valueColor = '#ef4444',
  series,
  orientation = 'vertical',
  tipo = 'outro',
  height = 280,
  formatValue = (n) => String(n),
  title,
  showLegend = true,
  width = 300,
  valueColorScale,
}: SmartBarChartProps<T>) {
  const prepared = useMemo(() => {
    const arr = Array.isArray(data) ? [...data] : [];
    return tipo === 'loja' ? arr.slice(0, 10) : arr;
  }, [data, tipo]);

  const isVertical = orientation === 'vertical';
  const multi = Array.isArray(series) && series.length > 0;

  return (
    <div className="bg-white p-4 rounded-xl">
      {title && <h3 className="text-base font-semibold mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={prepared}
          layout={isVertical ? 'horizontal' : 'vertical'}
          margin={{ top: 10, right: 18, bottom: isVertical ? 30 : 10, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {isVertical ? (
            <>
              <XAxis
                dataKey={labelKey as string}
                type="category"
                interval={0}
                tick={{ fontSize: 12 }}
                angle={prepared.length > 8 ? -20 : 0}
                textAnchor={prepared.length > 8 ? 'end' : 'middle'}
              />
              <YAxis type="number" allowDecimals={false} domain={[0, (dataMax: number) => dataMax * 1]} />
            </>
          ) : (
            <>
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                dataKey={labelKey as string}
                type="category"
                interval={0}
                width={width}
                tick={{ fontSize: 12 }}
              />
            </>
          )}

          <Tooltip
            formatter={(v: any) => formatValue(Number(v))}
            labelFormatter={(l) => String(l)}
          />
          {multi && showLegend && (
            <Legend wrapperStyle={{ fontSize: 12 }} verticalAlign="top" align="right" />
          )}

          {!multi && valueKey && (
            <Bar
              dataKey={valueKey as string}
              name={valueLabel ?? String(valueKey)}
              fill={valueColor}
              radius={isVertical ? [4, 4, 0, 0] : [0, 4, 4, 0]}
            >
              {/* cor por valor (opcional) */}
                {valueColorScale && (() => {
                  const { min, max } = getMinMax(prepared, valueKey);
                  return prepared.map((row, i) => (
                    <Cell
                      key={`cell-1-${i}`}
                      fill={valueColorScale(Number(row[valueKey]) || 0, min, max, i)}
                    />
                  ));
                })()}
              <LabelList
                dataKey={valueKey as string}
                position={isVertical ? 'top' : 'right'}
                offset={8}
                formatter={(v: any) => formatValue(Number(v))}
                style={{ fontSize: 12, fontWeight: 600 }}
                fill='#000'
              />
            </Bar>
          )}

          {/* [update] dentro do JSX – MULTI SÉRIES */}
          {multi && series!.map((s, idx) => {
            const mm = s.colorScale ? getMinMax(prepared, s.key as keyof T) : null;
            return (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color ?? ['#ef4444', '#facc15', '#22c55e', '#3b82f6'][idx % 4]}
                radius={isVertical ? [4, 4, 0, 0] : [0, 4, 4, 0]}
                stackId={s.stackId}
              >
                {s.colorScale && prepared.map((row, i) => (
                  <Cell
                    key={`cell-${s.key}-${i}`}
                    fill={s.colorScale!(Number(row[s.key]) || 0, mm!.min, mm!.max, i)}
                  />
                ))}
                {s.showValue !== false && (
                  <LabelList
                    dataKey={s.key}
                    position={isVertical ? 'top' : 'right'}
                    offset={8}
                    formatter={(v: any) => formatValue(Number(v))}
                    style={{ fontSize: 12, fontWeight: 600 }}
                    fill='#000'
                  />
                )}
              </Bar>
            );
          })}

        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
