import type { StandingEntry } from '../../types/fantasy';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface StandingsChartProps {
  standing: StandingEntry[];
}

export default function StandingsChart({ standing }: StandingsChartProps) {
  const data = [...standing]
    .sort((a, b) => a.position - b.position)
    .map((entry) => ({
      name: truncate(entry.team.manager?.managerName || `Equipo ${entry.team.id}`, 12),
      puntos: entry.points,
      valor: entry.team.teamValue,
    }));

  return (
    <div className="space-y-4">
      <div className="h-[280px] sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 32, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--ink-400))" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 11, fill: 'hsl(var(--text-tertiary))' }}
              axisLine={{ stroke: 'hsl(var(--ink-400))' }}
              tickLine={{ stroke: 'hsl(var(--ink-400))' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--text-tertiary))' }}
              axisLine={{ stroke: 'hsl(var(--ink-400))' }}
              tickLine={{ stroke: 'hsl(var(--ink-400))' }}
            />
            <Tooltip
              formatter={(value: number) => [value.toLocaleString('es-ES'), 'Puntos']}
              contentStyle={{
                backgroundColor: 'hsl(var(--surface-overlay))',
                border: '1px solid hsl(var(--ink-400))',
                borderRadius: 8,
                color: 'hsl(var(--text-primary))',
              }}
              itemStyle={{ color: 'hsl(var(--text-primary))' }}
              labelStyle={{ color: 'hsl(var(--text-tertiary))' }}
            />
            <Bar dataKey="puntos" fill="hsl(var(--ink-800))" radius={[3, 3, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}
