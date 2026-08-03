import type { StandingEntry } from '../../types/fantasy';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

interface TeamValueChartProps {
  standing: StandingEntry[];
  ownTeamId: number;
}

export default function TeamValueChart({ standing, ownTeamId }: TeamValueChartProps) {
  const data = [...standing]
    .sort((a, b) => b.team.teamValue - a.team.teamValue)
    .map((entry) => ({
      name: truncate(entry.team.manager?.managerName || `Equipo ${entry.team.id}`, 12),
      valor: entry.team.teamValue,
      esPropio: Number(entry.team.id) === ownTeamId,
    }));

  return (
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
            tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
            tick={{ fontSize: 11, fill: '#9A9A9A' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          />
          <Tooltip
            formatter={(value: number) => [
              new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value),
              'Valor de plantilla',
            ]}
            contentStyle={{
              backgroundColor: '#1C1C1C',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              color: '#ECECEC',
            }}
            itemStyle={{ color: '#ECECEC' }}
            labelStyle={{ color: '#9A9A9A' }}
          />
          <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.esPropio ? '#ECECEC' : '#6E6E6E'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}
