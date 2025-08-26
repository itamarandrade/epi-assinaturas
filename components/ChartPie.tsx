'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from 'recharts';

/* ================================
 * Tipos e utilitários
 * ================================ */

type Datum = { name: string; value: number; color?: string };

type DonutChartProps = {
  data: Datum[];

  height?: number;

  // Centro
  showTotalInCenter?: boolean;
  centerLabel?: string;
  totalFormatter?: (n: number) => string;

  // Tooltip
  showPercent?: boolean;   // no tooltip
  showValue?: boolean;     // no tooltip

  // Geometria (percentual do lado menor do gráfico)
  innerRadiusPct?: number; // ex.: 0.6
  outerRadiusPct?: number; // ex.: 0.82

  // Aparência
  highlightMax?: boolean;
  gradientByRank?: boolean;

  // Interação
  onSliceClick?: (d: Datum) => void;

  // A11y
  ariaLabel?: string;

  // Cores
  defaultColors?: string[];                // paleta padrão (cíclica)
  colorByKey?: Record<string, string>;     // mapeamento fixo por chave normalizada

  // Ordem
  fixedOrder?: string[];                   // ordem fixa de rótulos
  enforceStatusOrder?: boolean;            // força Em Dia > Pendente > Vencido quando presentes

  // Labels nas fatias (quebra em até 2 linhas + %)
  sliceLabel?: boolean | ((props: { name: string; value: number; percent: number; x: number; y: number; textAnchor?: string }) => React.ReactNode);

  // Legenda interna ao componente
  showLegend?: boolean;
  legendShowPercent?: boolean;             // mostra % ao lado do valor na legenda
  legendCols?: number;                     // nº de colunas na grade da legenda (default 1)
};

const DEFAULT_COLORS = [
  '#0553fa', // azul (padrão)
  '#22c55e', // verde
  '#facc15', // amarelo
  '#ef4444', // vermelho
  '#0ea5e9', // ciano
  '#a78bfa', // roxo
  '#f97316', // laranja
];

const NORM = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

const STATUS_COLOR_MAP: Record<string, string> = {
  EM_DIA: '#22c55e',
  PENDENTE: '#facc15',
  PENDENTES: '#facc15',
  VENCIDO: '#ef4444',
  VENCIDOS: '#ef4444',
};

const STATUS_ORDER = ['Em Dia', 'Pendente', 'Vencido'];
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

/** Tooltip seguro (compatível com várias versões) */
type TooltipPayloadItem = { name?: string | number; value?: number | string; color?: string; payload?: any; };
type SafeTooltipContentProps = { active?: boolean; label?: string | number; payload?: TooltipPayloadItem[]; };
type CustomTooltipExtra = { total: number; showPercent?: boolean; showValue?: boolean; };
const CustomTooltip: React.FC<SafeTooltipContentProps & CustomTooltipExtra> = ({
  active, payload, label, total, showPercent = true, showValue = true,
}) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const name = String(p?.name ?? label ?? '');
  const valueNum = Number(p?.value ?? 0);
  const pct = total > 0 ? (valueNum / total) * 100 : 0;

  return (
    <div style={{
      background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
      padding: '8px 10px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{name}</div>
      {showValue && <div>Valor: <strong>{valueNum}</strong></div>}
      {showPercent && <div>Percentual: <strong>{pct.toFixed(1)}%</strong></div>}
    </div>
  );
};

/** Renderer padrão para label com quebra em até 2 linhas + % (computando % a partir do total) */
function defaultSliceLabelRenderer(props: any, total: number) {
  const { name, value, x, y, textAnchor } = props;
  const valueNum = Number(value ?? 0);
  const percent = total > 0 ? (valueNum / total) : 0;

  // quebra “inteligente” em até 2 linhas
  const words = String(name).trim().split(/\s+/);
  const maxLen = 14;
  const line1: string[] = [];
  const line2: string[] = [];

  for (const w of words) {
    const cur = line1.join(' ');
    if ((cur.length ? cur.length + 1 : 0) + w.length <= maxLen) line1.push(w);
    else line2.push(w);
  }
  const L1 = line1.join(' ');
  const L2 = line2.join(' ');

  return (
    <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fontSize={12} fill="#111827">
      <tspan x={x} dy={0}>{L1}</tspan>
      {L2 && <tspan x={x} dy={14}>{L2}</tspan>}
      <tspan x={x} dy={14}>{`${(percent * 100).toFixed(0)}%`}</tspan>
    </text>
  );
}

/* ================================
 * Componente
 * ================================ */

export default function DonutChart({
  data,

  height = 260,

  showTotalInCenter = true,
  centerLabel = 'Total',
  totalFormatter,

  showPercent = true,
  showValue = true,

  innerRadiusPct = 0.6,
  outerRadiusPct = 0.82,

  highlightMax = true,
  gradientByRank = true,

  onSliceClick,

  ariaLabel = 'Gráfico de rosca (donut)',

  defaultColors = DEFAULT_COLORS,
  colorByKey,

  fixedOrder,
  enforceStatusOrder = true,

  sliceLabel,

  showLegend = false,
  legendShowPercent = false,
  legendCols = 1,
}: DonutChartProps) {

  const prepared = useMemo(() => {
    let rows = [...data];

    // Ordem padrão para status, se aplicável
    let orderToUse = fixedOrder;
    if (!orderToUse && enforceStatusOrder) {
      const labelsNorm = rows.map(r => NORM(String(r.name)));
      const hasStatus = ['EM_DIA', 'PENDENTE', 'PENDENTES', 'VENCIDO', 'VENCIDOS'].some(k => labelsNorm.includes(k));
      if (hasStatus) orderToUse = STATUS_ORDER;
    }

    if (orderToUse?.length) {
      const map = new Map(rows.map(r => [r.name, r]));
      rows = orderToUse.map(name => map.get(name) ?? { name, value: 0 });
    }

    const keyColor = { ...STATUS_COLOR_MAP, ...(colorByKey || {}) };

    rows = rows.map((d, i) => {
      const norm = NORM(String(d.name));
      const mapped = keyColor[norm];
      return { ...d, color: d.color || mapped || defaultColors[i % defaultColors.length] };
    });

    const sorted = [...rows].sort((a, b) => b.value - a.value);
    const maxVal = sorted[0]?.value ?? 0;
    const rankMap = new Map(sorted.map((d, idx) => [d.name, idx]));

    return { rows, maxVal, rankMap };
  }, [data, defaultColors, colorByKey, enforceStatusOrder, fixedOrder]);

  const total = useMemo(() => sum(prepared.rows.map(d => d.value)), [prepared.rows]);

  const getOpacity = (d: Datum) => {
    const rank = prepared.rankMap.get(d.name) ?? 0;
    const base = gradientByRank ? Math.max(0.4, 1 - rank * 0.15) : 1;
    if (highlightMax && d.value === prepared.maxVal) return 1;
    return base;
  };

  const labelProp =
    typeof sliceLabel === 'function'
      ? (props: any) => sliceLabel({ name: props?.name, value: props?.value, percent: total ? (Number(props?.value || 0) / total) : 0, x: props?.x, y: props?.y, textAnchor: props?.textAnchor })
      : sliceLabel
        ? (props: any) => defaultSliceLabelRenderer(props, total)
        : undefined;

  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 30, right: 30, bottom: 30, left: 30 }}>
          <Pie
            data={prepared.rows}
            dataKey="value"
            nameKey="name"
            innerRadius={`${innerRadiusPct * 100}%`}
            outerRadius={`${outerRadiusPct * 100}%`}
            startAngle={90}
            endAngle={-270}
            isAnimationActive
            paddingAngle={prepared.rows.length > 1 ? 1 : 0}
            labelLine={false}
            label={labelProp}
            onClick={(e) => {
              if (onSliceClick && e && typeof e === 'object' && 'name' in (e as any)) {
                onSliceClick(e as Datum);
              }
            }}
          >
            {prepared.rows.map((d, i) => (
              <Cell key={`cell-${d.name}-${i}`} fill={d.color!} opacity={getOpacity(d)} />
            ))}
          </Pie>

          {/* Centro fixo */}
          {showTotalInCenter && (
            <g pointerEvents="none">
              {centerLabel ? (
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="#6b7280" fontSize={12} dy={-8}>
                  {centerLabel}
                </text>
              ) : null}
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="#111827" fontSize={18} fontWeight={700} dy={centerLabel ? 10 : 0}>
                {totalFormatter ? totalFormatter(total) : String(total)}
              </text>
            </g>
          )}

          <Tooltip
            cursor={{ fill: 'transparent' }}
            content={<CustomTooltip total={total} showPercent={showPercent} showValue={showValue} />}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legenda interna ao componente (valor inteiro e, opcionalmente, %) */}
      {showLegend && (
        <div className="mt-3">
          <ul
            className="grid gap-1 text-sm"
            style={{ gridTemplateColumns: `repeat(${legendCols}, minmax(0, 1fr))` }}
          >
            {prepared.rows.map((d) => {
              const pct = total ? (d.value / total) * 100 : 0;
              return (
                <li key={String(d.name)} className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded" style={{ background: d.color }} />
                  <span className="text-gray-800">
                    {d.name}
                    {' — '}
                    <strong>{d.value.toLocaleString('pt-BR')}</strong>
                    {legendShowPercent && (
                      <> ({pct.toFixed(1)}%)</>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
