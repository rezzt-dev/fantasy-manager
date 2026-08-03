'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { WeekSummary } from '../../lib/engine/track-record';

interface TrackRecordChartProps {
  weeks: WeekSummary[];
}

export default function TrackRecordChart({ weeks }: TrackRecordChartProps) {
  const data = weeks
    .filter((w) => w.settled > 0)
    .map((w) => ({
      name: `J${w.week}`,
      maeXp: w.maeXp,
      maeLegacy: w.maeLegacy,
      spearman: w.spearmanXp,
      top11: w.top11HitRate ? w.top11HitRate * 100 : null,
    }));

  if (data.length < 2) {
    return null;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
          <CartesianGrid stroke="rgba(236,236,236,0.06)" vertical={false} />
          <XAxis dataKey="name" stroke="rgba(236,236,236,0.25)" tick={{ fill: '#9a9a9a', fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(236,236,236,0.25)" tick={{ fill: '#9a9a9a', fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(28,28,28,0.95)',
              border: '1px solid rgba(236,236,236,0.08)',
              borderRadius: '0.75rem',
            }}
            itemStyle={{ color: '#ececec', fontSize: 12 }}
            labelStyle={{ color: '#9a9a9a', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#9a9a9a' }} />
          <Line type="monotone" dataKey="maeXp" name="MAE modelo" stroke="#ececec" strokeWidth={2} dot={{ r: 3, fill: '#ececec' }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="maeLegacy" name="MAE baseline" stroke="#6e6e6e" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#6e6e6e' }} />
          <Line type="monotone" dataKey="spearman" name="Spearman" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
