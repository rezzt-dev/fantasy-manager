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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 11, fill: '#9A9A9A' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9A9A9A' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            />
            <Tooltip
              formatter={(value: number) => [value.toLocaleString('es-ES'), 'Puntos']}
              contentStyle={{
                backgroundColor: '#1C1C1C',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                color: '#ECECEC',
              }}
              itemStyle={{ color: '#ECECEC' }}
              labelStyle={{ color: '#9A9A9A' }}
            />
            <Bar dataKey="puntos" fill="#ECECEC" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}
