// components/ChartBar.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface ChartBarProps {
  data: { loja: string; problemas: number }[]
  title: string
}

export function ChartBar({ data, title }: ChartBarProps) {
  return (
    <div className="bg-white rounded shadow p-4">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <XAxis type="number" allowDecimals={false} />
          <YAxis dataKey="loja" type="category" width={100} />
          <Tooltip />
          <Bar dataKey="problemas" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
