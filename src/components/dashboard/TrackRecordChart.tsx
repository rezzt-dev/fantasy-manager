'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { WeekSummary } from '../../lib/engine/track-record';
import { chartTheme, axisProps } from '../../lib/chart-theme';

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
    <figure className="h-80 w-full">
      <figcaption className="sr-only">
        Evolución por jornada del error medio del modelo frente al baseline y de la
        correlación de sus predicciones con los puntos reales. Cuanto más bajo el
        error y más alta la correlación, mejor.
      </figcaption>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
          <CartesianGrid stroke={chartTheme.grid} vertical={false} />
          <XAxis dataKey="name" {...axisProps} tickLine={false} axisLine={false} />
          <YAxis {...axisProps} tickLine={false} axisLine={false} />
          <Tooltip {...chartTheme.tooltip} />
          <Legend wrapperStyle={{ fontSize: 12, color: chartTheme.axisText, paddingTop: 8 }} />

          {/* El baseline va discontinuo además de en gris: la comparación
              «modelo vs. baseline» tiene que leerse sin depender del color. */}
          <Line
            type="monotone"
            dataKey="maeXp"
            name="MAE del modelo"
            stroke={chartTheme.semantic.own}
            strokeWidth={2}
            dot={{ r: 3, fill: chartTheme.semantic.own }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="maeLegacy"
            name="MAE del baseline"
            stroke={chartTheme.semantic.baseline}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3, fill: chartTheme.semantic.baseline }}
          />
          <Line
            type="monotone"
            dataKey="spearman"
            name="Correlación (Spearman)"
            stroke={chartTheme.semantic.info}
            strokeWidth={2}
            strokeDasharray="1 3"
            dot={{ r: 3, fill: chartTheme.semantic.info }}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
