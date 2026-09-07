'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  FlaskConical,
  Gauge,
  Info,
  MinusCircle,
  Scale,
  Sigma,
  StickyNote,
  Swords,
  Timer,
  XCircle,
} from 'lucide-react';
import type { StrategyPlayer, StrategyReport, StrategySource } from '../../types/strategy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import EmptyState from './EmptyState';
import { positionShortName, positionTextClass, getPositionName } from '../../lib/format';
import { cn } from '../../lib/utils';

/* ────────────────────────────────────────────────────────────────────────────
   Laboratorio de estrategia.

   La sección no existe para enseñar «otra cifra por jugador»: existe para que
   se vea la INCERTIDUMBRE de cada pronóstico. Por eso el eje horizontal es uno
   solo y es COMPARTIDO por todas las filas —una banda P10–P90 solo significa
   algo al lado de la banda del compañero, en la misma escala— y por eso la
   media (xP) es un marcador sobre esa banda y no un número suelto.

   Reglas del sistema que gobiernan lo de aquí abajo:
   - El acento «Verde Campo» es la voz del motor sobre la serie propia: marca
     los jugadores DE TU PLANTILLA. Los candidatos de mercado van en neutro.
   - El color nunca va solo: cada estado lleva icono o signo, y toda cifra del
     gráfico está también escrita como texto.
   - Ningún valor propio: superficies, filetes, radios y duraciones salen de
     los tokens.
   ──────────────────────────────────────────────────────────────────────────── */

/* ── Formato ─────────────────────────────────────────────────────────────── */

/** Cifra fina (sensibilidades, deltas). Mantiene el criterio original: por
 *  debajo de 0,001 se escribe en notación científica en vez de redondear a
 *  cero, porque «0» afirmaría que no hay efecto. */
const num = (value: number) => {
  if (Math.abs(value) < 1e-12) return '0'; // Residuo de coma flotante, no señal.
  return value.toLocaleString(
    'es-ES',
    Math.abs(value) < 0.001
      ? { notation: 'scientific', maximumSignificantDigits: 2 }
      : { maximumFractionDigits: 3 },
  );
};

/** Puntos, con un decimal: la resolución que el modelo puede defender. */
const pts = (value: number) =>
  value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const signed = (value: number) => `${value >= 0 ? '+' : '−'}${num(Math.abs(value))}`;

/** Probabilidad. `null` no es 0: es «no hay muestra para decirlo». */
const percent = (value: number | null | undefined, fallback = 'sin muestra') => {
  if (value === null || value === undefined) return fallback;
  if (value > 0 && value < 0.005) return '< 1 %';
  if (value < 1 && value > 0.995) return '> 99 %';
  return `${(value * 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })} %`;
};

/* ── Escala compartida ───────────────────────────────────────────────────── */

interface Scale {
  min: number;
  max: number;
  ticks: number[];
  /** Posición de un valor dentro del eje, en porcentaje. */
  at: (value: number) => number;
}

/** Paso «redondo» (1, 2, 5 × 10ⁿ) para que las marcas del eje sean legibles. */
function niceStep(range: number, target: number) {
  const raw = range / Math.max(1, target);
  const magnitude = 10 ** Math.floor(Math.log10(raw || 1));
  const normalized = raw / magnitude;
  const step = normalized >= 7.5 ? 10 : normalized >= 3.5 ? 5 : normalized >= 1.5 ? 2 : 1;
  return step * magnitude;
}

/**
 * Construye el eje a partir de TODOS los jugadores del alcance, no solo de los
 * visibles: si la escala cambiara al pulsar «ver todos», las bandas ya leídas
 * cambiarían de tamaño sin que cambien los datos.
 */
function buildScale(players: StrategyPlayer[]): Scale {
  const values: number[] = [];
  for (const player of players) {
    values.push(player.xp);
    if (player.distribution) values.push(player.distribution.lower, player.distribution.upper);
  }
  const finite = values.filter((value) => Number.isFinite(value));
  const low = finite.length ? Math.min(...finite) : 0;
  const high = finite.length ? Math.max(...finite) : 10;
  const span = high - low || Math.max(1, Math.abs(high) || 1);
  const step = niceStep(span * 1.2, 4);
  const min = Math.floor((low - span * 0.08) / step) * step;
  const max = Math.ceil((high + span * 0.08) / step) * step;
  const width = max - min || 1;

  const ticks: number[] = [];
  for (let tick = min; tick <= max + step / 2; tick += step) {
    // El acumulado en coma flotante deja 4,999999996: se redondea al paso.
    ticks.push(Number((Math.round(tick / step) * step).toFixed(6)) + 0);
  }

  return {
    min,
    max,
    ticks,
    at: (value) => ((value - min) / width) * 100,
  };
}

/* ── Piezas ──────────────────────────────────────────────────────────────── */

/** Rejilla y columnas de una fila. La regla del eje usa la MISMA plantilla,
 *  que es lo único que garantiza que las marcas caigan sobre las bandas. */
const ROW_COLUMNS = 'sm:grid-cols-[minmax(0,14.5rem)_minmax(0,1fr)_4.5rem]';

/** Micro-dato de la línea de resumen: etiqueta, cifra y, si es una
 *  probabilidad, una barra de 28 px que la hace comparable de un vistazo. */
function MicroStat({
  label,
  value,
  ratio,
  tone = 'bg-content-secondary',
}: {
  label: string;
  value: string;
  ratio?: number | null;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="text-content-tertiary">{label}</dt>
      <dd className="numeral font-medium text-content-secondary">{value}</dd>
      {ratio !== null && ratio !== undefined && (
        <span className="h-1 w-7 shrink-0 overflow-hidden rounded-full bg-white/[0.1]" aria-hidden="true">
          <span
            className={cn('block h-full rounded-full', tone)}
            style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }}
          />
        </span>
      )}
    </div>
  );
}

/**
 * Banda de incertidumbre de un jugador sobre el eje compartido.
 *
 * La banda es el rango P10–P90, el filete vertical la mediana y el punto la
 * media (xP) del modelo. El punto es de acento cuando el jugador es tuyo
 * —serie propia— y neutro cuando es un candidato de mercado.
 */
function RangeTrack({ player, scale }: { player: StrategyPlayer; scale: Scale }) {
  const distribution = player.distribution;
  const left = distribution ? scale.at(distribution.lower) : 0;
  const right = distribution ? scale.at(distribution.upper) : 0;

  const description = distribution
    ? `${player.name}: media ${pts(player.xp)} puntos, mediana ${pts(distribution.median)}, rango P10–P90 de ${pts(distribution.lower)} a ${pts(distribution.upper)} puntos.`
    : `${player.name}: media ${pts(player.xp)} puntos, sin rango histórico por muestra insuficiente.`;

  return (
    <div className="relative h-8 w-full" role="img" aria-label={description}>
      {/* Rejilla: la misma que rotula la regla de arriba, muy tenue para que no
          compita con el dato. */}
      {scale.ticks.map((tick) => (
        <span
          key={tick}
          className="absolute inset-y-1 w-px bg-white/[0.05]"
          style={{ left: `${scale.at(tick)}%` }}
          aria-hidden="true"
        />
      ))}
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.06]" aria-hidden="true" />

      {distribution ? (
        <>
          {/* La banda va en neutro a propósito. El acento es la voz del motor y
              se reserva al PUNTO de la media: seis bandas de acento seguidas
              dejarían de leerse como acento y taparían el dato que importa. */}
          <span
            className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full border border-white/[0.12] bg-white/[0.06]"
            style={{ left: `${left}%`, width: `${Math.max(0.6, right - left)}%` }}
            aria-hidden="true"
          />
          <span
            className="absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-content-secondary"
            style={{ left: `${scale.at(distribution.median)}%` }}
            aria-hidden="true"
          />
        </>
      ) : (
        /* Sin muestra no se dibuja una banda estrecha —parecería un pronóstico
           certísimo—: se dibuja un trazo discontinuo que dice «no se sabe». */
        <span
          className="absolute top-1/2 h-px w-full -translate-y-1/2 border-t border-dashed border-white/[0.10]"
          aria-hidden="true"
        />
      )}

      <span
        className={cn(
          'absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface',
          player.owned ? 'bg-accent' : 'bg-ink-800',
        )}
        style={{ left: `${scale.at(player.xp)}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

/** Barra divergente centrada en cero: para efectos que pueden restar o sumar. */
function DivergingBar({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? Math.min(1, Math.abs(value) / max) : 0;
  const positive = value >= 0;
  return (
    <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
      <span className="absolute inset-y-0 left-1/2 w-px bg-white/[0.14]" />
      <span
        className={cn('absolute inset-y-0 rounded-full', positive ? 'left-1/2 bg-positive' : 'right-1/2 bg-negative')}
        style={{ width: `${ratio * 50}%` }}
      />
    </span>
  );
}

/** Bloque del panel desplegado. */
function DetailBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/[0.09] bg-surface-raised/50 p-3">
      <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-content-tertiary">
        <span className="[&>svg]:size-3 [&>svg]:shrink-0" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h4>
      {children}
    </section>
  );
}

function DataLine({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-xs">
      <span className="text-content-tertiary">{label}</span>
      <span className="numeral text-right font-medium text-content">
        {value}
        {hint && <span className="ml-1 font-sans text-[10px] font-normal text-content-tertiary">{hint}</span>}
      </span>
    </div>
  );
}

/* ── Fuentes ─────────────────────────────────────────────────────────────── */

const SOURCE_STATUS: Record<
  StrategySource['status'],
  { label: string; Icon: typeof CheckCircle2; tone: string }
> = {
  available: { label: 'Disponible', Icon: CheckCircle2, tone: 'text-positive-text' },
  stale: { label: 'Datos caducados', Icon: Clock, tone: 'text-caution-text' },
  unavailable: { label: 'Cobertura incompleta', Icon: XCircle, tone: 'text-negative-text' },
  'not-configured': { label: 'Sin configurar', Icon: MinusCircle, tone: 'text-content-tertiary' },
};

/* ── Componente ──────────────────────────────────────────────────────────── */

type Order = 'mean' | 'floor' | 'chance';

const ORDERS: { value: Order; label: string; short: string }[] = [
  { value: 'mean', label: 'Mayor media (xP)', short: 'Media' },
  { value: 'floor', label: 'Mayor suelo histórico (P10)', short: 'Suelo P10' },
  { value: 'chance', label: 'Mayor P(puntos ≥ 5)', short: 'P(≥ 5)' },
];

const POSITIONS = [1, 2, 3, 4] as const;

export default function StrategyDiagnostics({ report }: { report: StrategyReport }) {
  const [order, setOrder] = useState<Order>('mean');
  const [onlyOwn, setOnlyOwn] = useState(true);
  const [position, setPosition] = useState<number | 'all'>('all');
  const [expanded, setExpanded] = useState(false);
  const [openRows, setOpenRows] = useState<string[]>([]);

  const scoped = useMemo(
    () => report.players.filter((player) => !onlyOwn || player.owned),
    [report.players, onlyOwn],
  );

  /** Solo se ofrecen las demarcaciones que existen en el alcance actual: un
   *  filtro que siempre devuelve cero resultados es una trampa, no un filtro. */
  const availablePositions = useMemo(
    () => POSITIONS.filter((id) => scoped.some((player) => player.positionId === id)),
    [scoped],
  );

  const players = useMemo(() => {
    const filtered = scoped.filter((player) => position === 'all' || player.positionId === position);
    return [...filtered].sort((a, b) => {
      if (order === 'mean') return b.xp - a.xp;
      // Una distribución ausente NO equivale a un pronóstico garantizado: cae
      // al final del orden por riesgo en vez de competir con las medidas.
      if (order === 'floor') {
        if (!a.distribution) return b.distribution ? 1 : b.xp - a.xp;
        if (!b.distribution) return -1;
        return b.distribution.lower - a.distribution.lower || b.xp - a.xp;
      }
      if (!a.distribution) return b.distribution ? 1 : b.xp - a.xp;
      if (!b.distribution) return -1;
      return (
        b.distribution.probabilityAtLeast5 - a.distribution.probabilityAtLeast5 || b.xp - a.xp
      );
    });
  }, [scoped, position, order]);

  const scale = useMemo(() => buildScale(players), [players]);

  const summary = useMemo(() => {
    const measured = players.filter((player) => player.distribution);
    const byMean = [...players].sort((a, b) => b.xp - a.xp)[0] ?? null;
    const byFloor =
      [...measured].sort((a, b) => b.distribution!.lower - a.distribution!.lower)[0] ?? null;
    return { total: players.length, measured: measured.length, byMean, byFloor };
  }, [players]);

  const sourcesUp = report.sources.filter((source) => source.status === 'available').length;
  const visible = expanded ? players : players.slice(0, 6);
  const positionFilterId = 'strategy-lab-position';

  const toggleRow = (playerId: string) =>
    setOpenRows((current) =>
      current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId],
    );

  return (
    <Card>
      <CardHeader className="gap-2 border-b border-white/[0.09]">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 shrink-0 text-content-tertiary" aria-hidden="true" />
              Laboratorio de estrategia
            </CardTitle>
            <CardDescription className="mt-1 max-w-[68ch]">
              Cada jugador sobre un mismo eje de puntos: la banda es el rango histórico P10–P90 y el
              punto, la media que predice el motor. Ancha significa impredecible, no mala.
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge variant="warning" icon={<AlertTriangle />}>
              Sin calibrar
            </Badge>
            <Badge
              variant={sourcesUp === report.sources.length ? 'success' : 'outline-muted'}
              icon={sourcesUp === report.sources.length ? <CheckCircle2 /> : <Info />}
            >
              <span className="numeral">
                {sourcesUp}/{report.sources.length}
              </span>
              <span>fuentes</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5 [.density-dense_&]:space-y-4 [.density-dense_&]:pt-4">
        {/* Contraste de bajas: llega de otra fuente y NO modifica el once por su
            cuenta, así que se presenta como aviso, no como dato del modelo. */}
        {report.additionalAbsences.length > 0 && (
          <div role="status" className="rounded-lg border border-caution/25 bg-caution-quiet p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-content">
              <AlertTriangle className="h-4 w-4 shrink-0 text-caution-text" aria-hidden="true" />
              Contraste de bajas · API-Football
            </p>
            <p className="mt-1 text-xs leading-relaxed text-content-secondary">
              Estos avisos no modifican automáticamente el once ni los minutos previstos. Contrástalos
              con la alineación confirmada antes de mover nada.
            </p>
            <ul className="mt-3 space-y-1.5">
              {report.additionalAbsences.map((absence) => (
                <li
                  key={absence.playerId}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-content-secondary"
                >
                  <span className="font-semibold text-content">{absence.name}</span>
                  <Badge
                    variant={absence.status === 'missing' ? 'danger' : 'warning'}
                    size="sm"
                    icon={absence.status === 'missing' ? <XCircle /> : <AlertTriangle />}
                  >
                    {absence.status === 'missing' ? 'Baja comunicada' : 'Duda'}
                  </Badge>
                  <span className="text-content-tertiary">{absence.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Resumen del alcance. Cuatro hechos derivados de lo que hay en
            pantalla, no métricas nuevas: cuántos se analizan, cuántos tienen
            muestra suficiente y quién manda en cada criterio. */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/[0.09] bg-white/[0.06] lg:grid-cols-4">
          <SummaryTile label="En el análisis" value={`${summary.total}`} sub="jugadores del alcance" />
          <SummaryTile
            label="Con rango histórico"
            value={`${summary.measured}`}
            sub={`de ${summary.total} · ≥ 5 jornadas`}
          />
          <SummaryTile
            label="Mayor media"
            value={summary.byMean ? pts(summary.byMean.xp) : '—'}
            sub={summary.byMean ? summary.byMean.name : 'sin jugadores'}
            unit="xP"
          />
          <SummaryTile
            label="Mayor suelo (P10)"
            value={summary.byFloor ? pts(summary.byFloor.distribution!.lower) : '—'}
            sub={summary.byFloor ? summary.byFloor.name : 'sin muestra suficiente'}
            unit="pts"
          />
        </div>

        {/* Controles. Dos decisiones distintas —cómo ordenar y qué mirar— van
            en dos grupos etiquetados, no en una fila de botones indistinguibles. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <fieldset className="min-w-0">
              <legend className="eyebrow mb-1.5">Ordenar por</legend>
              <div className="inline-flex flex-wrap gap-1 rounded-lg border border-white/[0.09] bg-surface-raised p-1">
                {ORDERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={order === option.value}
                    aria-label={option.label}
                    onClick={() => setOrder(option.value)}
                    className={cn(
                      'h-9 rounded-md px-3 text-sm font-medium transition-colors duration-fast ease-out sm:h-8',
                      order === option.value
                        ? 'bg-surface-overlay text-content shadow-1'
                        : 'text-content-tertiary hover:text-content',
                    )}
                  >
                    {option.short}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="min-w-0">
              <legend className="eyebrow mb-1.5">Alcance</legend>
              <div className="inline-flex gap-1 rounded-lg border border-white/[0.09] bg-surface-raised p-1">
                {[
                  { value: true, label: 'Mi plantilla' },
                  { value: false, label: 'Con candidatos' },
                ].map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    aria-pressed={onlyOwn === option.value}
                    onClick={() => setOnlyOwn(option.value)}
                    className={cn(
                      'h-9 rounded-md px-3 text-sm font-medium transition-colors duration-fast ease-out sm:h-8',
                      onlyOwn === option.value
                        ? 'bg-surface-overlay text-content shadow-1'
                        : 'text-content-tertiary hover:text-content',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {availablePositions.length > 1 && (
              <fieldset className="min-w-0">
                <legend className="eyebrow mb-1.5" id={positionFilterId}>
                  Demarcación
                </legend>
                <div className="flex flex-wrap gap-1.5" aria-labelledby={positionFilterId}>
                  <PositionChip active={position === 'all'} onClick={() => setPosition('all')}>
                    Todas
                  </PositionChip>
                  {availablePositions.map((id) => (
                    <PositionChip
                      key={id}
                      active={position === id}
                      onClick={() => setPosition(id)}
                      className={position === id ? undefined : positionTextClass(null, id)}
                      label={getPositionName(id)}
                    >
                      {positionShortName(null, id)}
                    </PositionChip>
                  ))}
                </div>
              </fieldset>
            )}
          </div>

          <p className="text-xs text-content-tertiary lg:pb-2" aria-live="polite">
            <span className="numeral text-content-secondary">{players.length}</span>{' '}
            {players.length === 1 ? 'jugador' : 'jugadores'} en la lista
          </p>
        </div>

        {players.length === 0 ? (
          <EmptyState
            compact
            icon={<FlaskConical />}
            title="No hay jugadores en este alcance"
            description="Ninguno de tus filtros deja jugadores dentro del análisis. Amplía el alcance a los candidatos o quita el filtro de demarcación."
            action={
              <Button
                size="touch"
                variant="outline"
                onClick={() => {
                  setPosition('all');
                  setOnlyOwn(false);
                }}
              >
                Quitar filtros
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {/* Leyenda de los glifos del eje. Sin ella la banda es un adorno. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-content-tertiary">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-6 rounded-full border border-white/[0.12] bg-white/[0.06]"
                  aria-hidden="true"
                />
                Rango P10–P90
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-px bg-content-secondary" aria-hidden="true" />
                Mediana
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface" aria-hidden="true" />
                Media (xP) de tu plantilla
              </span>
              {!onlyOwn && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-ink-800 ring-2 ring-surface" aria-hidden="true" />
                  Media (xP) de un candidato
                </span>
              )}
            </div>

            {/* Regla del eje. Comparte plantilla de rejilla con las filas: es lo
                único que garantiza que la marca «5» caiga sobre el 5 de cada
                banda. En móvil las filas se apilan y la regla sobra. */}
            <div className="hidden px-3 sm:flex sm:items-center sm:gap-3">
              <div className={cn('grid w-full items-center gap-4', ROW_COLUMNS)}>
                <span className="eyebrow">Puntos esperados</span>
                <div className="relative h-4">
                  {scale.ticks.map((tick) => (
                    <span
                      key={tick}
                      className="numeral absolute top-0 -translate-x-1/2 text-[10px] text-content-tertiary"
                      style={{ left: `${scale.at(tick)}%` }}
                    >
                      {tick.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
                    </span>
                  ))}
                </div>
                <span className="text-right text-[10px] uppercase tracking-wider text-content-tertiary">
                  Media
                </span>
              </div>
              <span className="w-4 shrink-0" aria-hidden="true" />
            </div>

            <ul className="space-y-2">
              {visible.map((player, index) => {
                const open = openRows.includes(player.playerId);
                const panelId = `strategy-lab-${player.playerId}`;
                const distribution = player.distribution;

                return (
                  <li
                    key={player.playerId}
                    className={cn(
                      'overflow-hidden rounded-lg border bg-surface transition-colors duration-fast ease-out',
                      open ? 'border-white/[0.14] bg-surface-raised/40' : 'border-white/[0.09] hover:border-white/[0.14]',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleRow(player.playerId)}
                      aria-expanded={open}
                      aria-controls={panelId}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left [.density-dense_&]:py-2"
                    >
                      <div className={cn('flex min-w-0 flex-1 flex-col gap-2 sm:grid sm:items-center sm:gap-4', ROW_COLUMNS)}>
                        {/* Identidad. En móvil comparte fila con la cifra para
                            que el eje ocupe el ancho completo debajo. */}
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="numeral w-4 shrink-0 text-right text-[11px] text-content-tertiary">
                            {index + 1}
                          </span>
                          <span
                            className={cn(
                              'inline-flex h-5 shrink-0 items-center rounded-sm border border-white/[0.09] bg-white/[0.05] px-1.5 font-display text-[10px] font-bold',
                              positionTextClass(null, player.positionId),
                            )}
                          >
                            {positionShortName(null, player.positionId)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-content">
                              {player.name}
                            </span>
                            <span className="block truncate text-[11px] text-content-tertiary">
                              {player.owned ? 'Tu plantilla' : 'Candidato analizado'}
                            </span>
                          </span>
                          <span className="shrink-0 text-right sm:hidden">
                            <span className="numeral block text-lg font-semibold leading-none text-content">
                              {pts(player.xp)}
                            </span>
                            <span className="block text-[10px] text-content-tertiary">xP</span>
                          </span>
                        </div>

                        <div className="min-w-0">
                          <RangeTrack player={player} scale={scale} />
                          <dl className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                            <MicroStat
                              label="P10–P90"
                              value={
                                distribution
                                  ? `${pts(distribution.lower)} – ${pts(distribution.upper)}`
                                  : 'sin muestra'
                              }
                            />
                            <MicroStat
                              label="P(≥ 5)"
                              value={percent(distribution?.probabilityAtLeast5 ?? null)}
                              ratio={distribution?.probabilityAtLeast5 ?? null}
                              tone="bg-info"
                            />
                            <MicroStat
                              label="Titular"
                              value={percent(player.pStarter)}
                              ratio={player.pStarter}
                              tone="bg-positive"
                            />
                          </dl>
                        </div>

                        <div className="hidden text-right sm:block">
                          <span className="numeral block text-xl font-semibold leading-none text-content">
                            {pts(player.xp)}
                          </span>
                          <span className="block text-[10px] uppercase tracking-wider text-content-tertiary">
                            xP
                          </span>
                        </div>
                      </div>

                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-content-tertiary transition-transform duration-base ease-out',
                          open && 'rotate-180',
                        )}
                        aria-hidden="true"
                      />
                    </button>

                    {open && (
                      <div
                        id={panelId}
                        role="region"
                        aria-label={`Detalle del análisis de ${player.name}`}
                        className="animate-fade-in border-t border-white/[0.09] p-3"
                      >
                        <div className="grid gap-2 sm:grid-cols-2">
                          <DetailBlock title="Contexto del pronóstico" icon={<Timer />}>
                            <DataLine
                              label="Minutos previstos"
                              value={
                                player.expectedMinutes === null
                                  ? 'sin estimación'
                                  : `${Math.round(player.expectedMinutes)}′`
                              }
                            />
                            <DataLine label="Titularidad estimada" value={percent(player.pStarter)} />
                            <DataLine
                              label="Por un minuto más"
                              value={player.xpPerMinute === null ? 'no estimable' : `${signed(player.xpPerMinute)} xP`}
                            />
                            <p className="mt-1.5 text-[11px] leading-relaxed text-content-tertiary">
                              Sensibilidad local: no incluye el cambio de rol que suele acompañar a un
                              cambio de minutos.
                            </p>
                          </DetailBlock>

                          {player.opponentSensitivity && (
                            <DetailBlock title="Sensibilidad al rival" icon={<Gauge />}>
                              {(() => {
                                const { stronger, weaker } = player.opponentSensitivity;
                                /* La barra NO se escala contra la otra perturbación: si lo
                                   hiciera, dos efectos de 0,3 puntos sobre una media de 8
                                   pintarían la barra entera y parecerían enormes. Se escala
                                   contra el 20 % de la propia xP del jugador, que es la
                                   pregunta real: cuánto le mueve el rival lo que se espera
                                   de él. Una barra llena significa «≥ 20 % de su media». */
                                const reference = Math.max(
                                  Math.abs(player.xp) * 0.2,
                                  Math.abs(stronger),
                                  Math.abs(weaker),
                                  1e-9,
                                );
                                const share = (value: number) =>
                                  Math.abs(player.xp) < 0.05
                                    ? null
                                    : `${value >= 0 ? '+' : '−'}${Math.abs((value / player.xp) * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
                                return (
                                  <div className="space-y-2">
                                    {[
                                      { label: 'Rival +10 Elo', value: stronger },
                                      { label: 'Rival −10 Elo', value: weaker },
                                    ].map((row) => (
                                      <div key={row.label}>
                                        <div className="flex items-baseline justify-between gap-3 text-xs">
                                          <span className="text-content-tertiary">{row.label}</span>
                                          <span
                                            className={cn(
                                              'numeral font-medium',
                                              row.value > 0
                                                ? 'text-positive-text'
                                                : row.value < 0
                                                  ? 'text-negative-text'
                                                  : 'text-content',
                                            )}
                                          >
                                            {signed(row.value)} xP
                                            {share(row.value) && (
                                              <span className="ml-1.5 font-sans text-[10px] font-normal text-content-tertiary">
                                                ({share(row.value)})
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                        <DivergingBar value={row.value} max={reference} />
                                      </div>
                                    ))}
                                    <p className="text-[11px] leading-relaxed text-content-tertiary">
                                      Recálculo real del modelo perturbando el Elo del rival, sin
                                      probabilidad asociada. La barra está a escala de ±20 % de su media.
                                    </p>
                                  </div>
                                );
                              })()}
                            </DetailBlock>
                          )}

                          {player.comparison && (
                            <DetailBlock title={`Frente a ${player.comparison.name}`} icon={<Swords />}>
                              <DataLine
                                label="Diferencia de media"
                                value={
                                  <span
                                    className={
                                      player.comparison.deltaXp >= 0 ? 'text-positive-text' : 'text-negative-text'
                                    }
                                  >
                                    {signed(player.comparison.deltaXp)} xP
                                  </span>
                                }
                              />
                              <DataLine
                                label="P(superarlo)"
                                value={percent(player.comparison.probabilityBetter)}
                              />
                              {player.comparison.probabilityTie !== null && (
                                <DataLine label="P(empate)" value={percent(player.comparison.probabilityTie)} />
                              )}
                              <DataLine
                                label="Jornadas comparables"
                                value={String(player.comparison.pairedSamples)}
                              />
                              <p className="mt-1.5 text-[11px] leading-relaxed text-content-tertiary">
                                Comparación individual sobre jornadas compartidas: no es la mejora del
                                once, que depende del resto de la alineación.
                              </p>
                            </DetailBlock>
                          )}

                          {distribution && (
                            <DetailBlock title="Muestra histórica" icon={<Sigma />}>
                              <DataLine label="Jornadas usadas" value={String(distribution.samples)} />
                              <DataLine
                                label="Muestra efectiva"
                                value={num(distribution.effectiveSamples)}
                                hint="tras ponderar"
                              />
                              <DataLine label="Mediana" value={`${pts(distribution.median)} pts`} />
                              <div className="mt-2">
                                <span
                                  className="block h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
                                  aria-hidden="true"
                                >
                                  <span
                                    className="block h-full rounded-full bg-content-secondary"
                                    style={{
                                      width: `${Math.round(
                                        Math.min(1, distribution.effectiveSamples / Math.max(1, distribution.samples)) * 100,
                                      )}%`,
                                    }}
                                  />
                                </span>
                                <p className="mt-1.5 text-[11px] leading-relaxed text-content-tertiary">
                                  Las jornadas recientes pesan más, así que la muestra efectiva es menor
                                  que el número de jornadas.
                                </p>
                              </div>
                            </DetailBlock>
                          )}

                          {player.notes.length > 0 && (
                            <DetailBlock title="Notas del modelo" icon={<StickyNote />}>
                              <ul className="space-y-1 text-xs leading-relaxed text-content-secondary">
                                {player.notes.map((note, noteIndex) => (
                                  <li key={noteIndex} className="flex gap-2">
                                    <span className="text-content-tertiary" aria-hidden="true">
                                      ·
                                    </span>
                                    <span>{note}</span>
                                  </li>
                                ))}
                              </ul>
                            </DetailBlock>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {players.length > 6 && (
              <Button
                size="touch"
                variant="outline"
                className="w-full"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? 'Mostrar solo los 6 primeros' : `Ver los ${players.length} jugadores`}
              </Button>
            )}
          </div>
        )}

        {/* Fuentes y límites. No es letra pequeña opcional: es lo que impide
            leer estas probabilidades como si estuvieran calibradas. */}
        <section className="rounded-lg border border-white/[0.09] bg-surface-raised/40">
          <div className="flex items-start gap-3 border-b border-white/[0.09] p-4">
            <Scale className="mt-0.5 h-4 w-4 shrink-0 text-content-tertiary" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-content-secondary">
              Rangos y probabilidades son <span className="font-semibold text-content">exploratorios</span> y
              están pendientes de calibración: salen del histórico ponderado de cada jugador trasladado a
              su xP actual. Un 0 % o 100 % observado no implica imposibilidad ni certeza, y un cambio de
              rol invalida el histórico.
            </p>
          </div>

          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div>
              <h4 className="eyebrow mb-2">Fuentes</h4>
              <ul className="space-y-2.5">
                {report.sources.map((source) => {
                  const { label, Icon, tone } = SOURCE_STATUS[source.status];
                  return (
                    <li key={source.name} className="text-xs">
                      <p className="flex items-center gap-2">
                        <Icon className={cn('h-3.5 w-3.5 shrink-0', tone)} aria-hidden="true" />
                        <span className="font-medium text-content">{source.name}</span>
                        <span className={cn('text-[11px]', tone)}>{label}</span>
                      </p>
                      <p className="mt-0.5 pl-[22px] leading-relaxed text-content-tertiary">
                        {source.detail}
                        {source.fetchedAt && (
                          <>
                            {' '}
                            Consulta:{' '}
                            <span className="numeral">
                              {new Date(source.fetchedAt).toLocaleString('es-ES')}
                            </span>
                            .
                          </>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <h4 className="eyebrow mb-2">Límites del análisis</h4>
              <ul className="space-y-1.5 text-xs leading-relaxed text-content-tertiary">
                {report.limitations.map((limit) => (
                  <li key={limit} className="flex gap-2">
                    <span aria-hidden="true">·</span>
                    <span>{limit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

/* ── Piezas locales ──────────────────────────────────────────────────────── */

function SummaryTile({
  label,
  value,
  sub,
  unit,
}: {
  label: string;
  value: string;
  sub: string;
  unit?: string;
}) {
  return (
    <div className="bg-surface p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-content-tertiary">{label}</p>
      <p className="numeral mt-1 text-xl font-semibold leading-none text-content [.density-dense_&]:text-lg">
        {value}
        {unit && <span className="ml-1 font-sans text-[11px] font-normal text-content-tertiary">{unit}</span>}
      </p>
      <p className="mt-1 truncate text-[11px] text-content-tertiary" title={sub}>
        {sub}
      </p>
    </div>
  );
}

function PositionChip({
  active,
  onClick,
  children,
  className,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        'h-11 rounded-md border px-3 font-display text-xs font-bold transition-colors duration-fast ease-out sm:h-10',
        active
          ? 'border-white/[0.14] bg-surface-overlay text-content'
          : 'border-white/[0.09] bg-surface-raised hover:border-white/[0.14]',
        !active && className,
      )}
    >
      {children}
    </button>
  );
}
