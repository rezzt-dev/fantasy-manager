import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface PositionDistributionChartProps {
  distribution: Record<number, { name: string; count: number; color: string }>;
}

export default function PositionDistributionChart({ distribution }: PositionDistributionChartProps) {
  const data = Object.values(distribution).sort((a, b) => b.count - a.count);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="h-[280px] sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, name]}
              contentStyle={{
                backgroundColor: '#1C1C1C',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                color: '#ECECEC',
              }}
              itemStyle={{ color: '#ECECEC' }}
              labelStyle={{ color: '#9A9A9A' }}
            />
            <Legend wrapperStyle={{ color: '#9A9A9A' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col justify-center space-y-3">
        {data.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-surface-2 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm font-medium text-card-foreground">{item.name}</span>
            </div>
            <span className="text-sm font-bold text-brand">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
