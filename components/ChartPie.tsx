// components/ChartPie.tsx
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  PieLabelRenderProps,
} from 'recharts'
const COLORS = ['#22c55e', '#facc15', '#ef4444']

interface ChartPieProps {
  data: { name: string; value: number }[]
  title: string
}

export function ChartPie({ data, title }: ChartPieProps) {
  const label = (e: PieLabelRenderProps) => `${e.name}\n${e.value}`
  return (
    <div className="bg-white rounded shadow p-4">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={80}
            label={label}
            paddingAngle={4}          // “explode” leve entre fatias
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
