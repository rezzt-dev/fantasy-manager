/**
 * Tema único de gráficos.
 *
 * Recharts pinta SVG en el DOM, así que puede resolver variables CSS: todo lo
 * de aquí apunta a los tokens de `global.css` en vez de repetir hex sueltos.
 * Cambiar el sistema de diseño cambia los gráficos, sin tocarlos uno a uno.
 *
 * Principios aplicados (regla charts-and-data):
 * - Las series se distinguen por LUMINOSIDAD antes que por tono, porque la
 *   luminosidad se lee de forma fiable con cualquier daltonismo.
 * - La rejilla es de bajo contraste: no debe competir con los datos.
 * - Los ejes llevan siempre unidad y formato local (es-ES).
 */

const v = (token: string, alpha?: number) =>
  alpha === undefined ? `hsl(var(--${token}))` : `hsl(var(--${token}) / ${alpha})`;

export const chartTheme = {
  grid: v('ink-400'),
  axis: v('ink-500'),
  axisText: v('text-tertiary'),
  cursor: v('ink-500'),

  tooltip: {
    contentStyle: {
      backgroundColor: v('surface-overlay'),
      border: `1px solid ${v('ink-400')}`,
      borderRadius: 'var(--r-md)',
      boxShadow: 'var(--elev-3)',
      padding: '8px 10px',
      fontSize: 12,
    },
    itemStyle: { color: v('text-primary'), fontSize: 12, padding: '1px 0' },
    labelStyle: { color: v('text-tertiary'), fontSize: 11, marginBottom: 4 },
  },

  /**
   * Serie categórica. Ordenada de mayor a menor prominencia: la primera es la
   * que el usuario debe mirar. Sirve hasta 6 series; por encima de eso el
   * gráfico está mal elegido, no falta color.
   */
  series: [
    v('lime-500'), //  1 · el dato propio / la predicción del motor
    v('ink-800'), //   2 · referencia neutra (baseline, media de liga)
    v('inf-500'), //   3
    v('cau-500'), //   4
    v('pos-500'), //   5
    v('neg-500'), //   6
  ],

  /** Series con significado fijo. */
  semantic: {
    own: v('lime-500'),
    baseline: v('ink-700'),
    positive: v('pos-500'),
    negative: v('neg-500'),
    caution: v('cau-500'),
    info: v('inf-500'),
    neutral: v('ink-800'),
  },

  /** Colores por posición del campo, compartidos con las tarjetas de jugador. */
  position: {
    Portero: v('pos-gk'),
    Defensa: v('pos-df'),
    Centrocampista: v('pos-mf'),
    'Mediocentro Ofensivo': v('pos-mf'),
    Delantero: v('pos-fw'),
    Entrenador: v('pos-co'),
  } as Record<string, string>,

  font: {
    size: 11,
    family: "'JetBrains Mono', ui-monospace, monospace",
  },
} as const;

/** Props comunes de eje, para que ninguno se configure a mano. */
export const axisProps = {
  tick: { fontSize: chartTheme.font.size, fill: chartTheme.axisText },
  axisLine: { stroke: chartTheme.axis },
  tickLine: { stroke: chartTheme.axis },
} as const;
