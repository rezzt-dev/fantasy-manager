import type { TeamPlayer } from '../../types/fantasy';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { positionColor, getPositionName } from '../../lib/format';

interface PointsVsValueChartProps {
  teamPlayers: TeamPlayer[];
}

export default function PointsVsValueChart({ teamPlayers }: PointsVsValueChartProps) {
  const data = teamPlayers
    .filter((p) => p.playerMaster.marketValue > 0)
    .map((p) => ({
      x: p.playerMaster.points || p.playerMaster.lastSeasonPoints || 0,
      y: p.playerMaster.marketValue,
      z: p.playerMaster.positionId,
      name: p.playerMaster.nickname,
      position: p.playerMaster.position,
      positionId: p.playerMaster.positionId,
      team: p.playerMaster.team?.name || '',
    }));

  return (
    <div className="h-[320px] sm:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            type="number"
            dataKey="x"
            name="Puntos"
            tick={{ fontSize: 11, fill: '#9A9A9A' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Valor de mercado"
            tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
            tick={{ fontSize: 11, fill: '#9A9A9A' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          />
          <ZAxis type="number" dataKey="z" range={[60, 60]} />
          <Tooltip cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.12)' }} content={<CustomTooltip />} />
          <Scatter data={data}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={positionColor(entry.position, entry.positionId)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: unknown }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload as {
    name: string;
    x: number;
    y: number;
    position: string;
    positionId: number;
    team: string;
  };
  if (!p) return null;

  const positionName = p.position || getPositionName(p.positionId);

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#1C1C1C] p-2 shadow-none">
      <div className="font-semibold text-[#ECECEC]">{p.name}</div>
      <div className="text-xs text-[#9A9A9A]">{positionName} · {p.team}</div>
      <div className="mt-1 text-xs text-[#ECECEC]">
        <span className="font-medium">Puntos:</span> {p.x}
      </div>
      <div className="text-xs text-[#ECECEC]">
        <span className="font-medium">Valor:</span>{' '}
        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p.y)}
      </div>
    </div>
  );
}
