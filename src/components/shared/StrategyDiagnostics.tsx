import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';
import type { StrategyReport } from '../../types/strategy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { positionShortName } from '../../lib/format';

const number = (value: number) => {
  if (Math.abs(value) < 1e-12) return '0'; // Residuo de coma flotante, no señal.
  return value.toLocaleString('es-ES', Math.abs(value) < 0.001
    ? { notation: 'scientific', maximumSignificantDigits: 2 }
    : { maximumFractionDigits: 3 });
};
const percent = (value: number | null) => value === null ? 'Sin muestra suficiente' : `${number(value * 100)} %`;
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${number(Math.abs(value))}`;
const statusLabels = { available: 'Disponible', stale: 'Datos caducados', unavailable: 'Cobertura incompleta', 'not-configured': 'Sin configurar' };

export default function StrategyDiagnostics({ report }: { report: StrategyReport }) {
  const [order, setOrder] = useState<'mean' | 'downside'>('mean');
  const [onlyOwn, setOnlyOwn] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const players = useMemo(() => report.players.filter((p) => !onlyOwn || p.owned).sort((a, b) => {
    if (order === 'mean') return b.xp - a.xp;
    // Missing uncertainty is not equivalent to a guaranteed expected score.
    if (!a.distribution) return b.distribution ? 1 : b.xp - a.xp;
    if (!b.distribution) return -1;
    return b.distribution.lower - a.distribution.lower || b.xp - a.xp;
  }), [report.players, order, onlyOwn]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" aria-hidden="true" />Laboratorio de estrategia</CardTitle>
        <CardDescription>Compara la media con el riesgo y comprueba cuánto cambia cada pronóstico. Los rangos y probabilidades son exploratorios, pendientes de calibración. Un 0 % o 100 % histórico no implica certeza futura.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.additionalAbsences.length > 0 && <div className="rounded-lg border border-border bg-surface-raised p-4 text-sm space-y-2">
          <p className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Contraste de bajas · API-Football</p>
          <p className="text-content-secondary">Estos avisos no modifican automáticamente el once. Contrástalos con la alineación confirmada.</p>
          {report.additionalAbsences.map((absence) => <p key={absence.playerId}>{absence.name}: {absence.status === 'missing' ? 'baja comunicada' : 'duda'} · {absence.reason}</p>)}
        </div>}
        <div className="flex flex-wrap gap-2" aria-label="Orden y alcance del análisis">
          <Button size="touch" variant={order === 'mean' ? 'secondary' : 'outline'} aria-pressed={order === 'mean'} onClick={() => setOrder('mean')}>Mayor media</Button>
          <Button size="touch" variant={order === 'downside' ? 'secondary' : 'outline'} aria-pressed={order === 'downside'} onClick={() => setOrder('downside')}>Mayor suelo histórico (P10)</Button>
          <Button size="touch" variant="outline" aria-pressed={onlyOwn} onClick={() => setOnlyOwn(!onlyOwn)}>{onlyOwn ? 'Mi plantilla' : 'Plantilla y candidatos'}</Button>
        </div>
        {players.length === 0 ? <p className="text-sm text-content-secondary">No hay jugadores para este alcance. Cambia el filtro o recarga las recomendaciones.</p> :
          <div className="grid gap-3 md:grid-cols-2">
            {(expanded ? players : players.slice(0, 4)).map((player) => <article key={player.playerId} className="rounded-lg border border-border p-4 space-y-3 [.density-dense_&]:p-3">
              <div className="flex justify-between gap-3">
                <div><h3 className="font-semibold">{player.name}</h3><p className="text-xs text-content-secondary">{positionShortName(null, player.positionId)} · {player.owned ? 'Tu plantilla' : 'Candidato analizado'}</p></div>
                <p className="numeral text-lg shrink-0">{number(player.xp)} <span className="text-xs text-content-secondary">xP</span></p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-content-secondary">Rango histórico P10–P90</dt><dd className="numeral">{player.distribution ? `${number(player.distribution.lower)} a ${number(player.distribution.upper)} pts` : 'Sin muestra suficiente'}</dd></div>
                <div><dt className="text-content-secondary">P(puntos ≥ 5), estimada</dt><dd className="numeral">{percent(player.distribution?.probabilityAtLeast5 ?? null)}</dd></div>
                <div><dt className="text-content-secondary">Titularidad estimada</dt><dd className="numeral">{percent(player.pStarter)}</dd></div>
                <div><dt className="text-content-secondary">Por un minuto adicional</dt><dd className="numeral">{player.xpPerMinute === null ? 'No estimable' : `${signed(player.xpPerMinute)} xP`}</dd></div>
              </dl>
              {player.comparison && <p className="text-sm text-content-secondary">Frente a {player.comparison.name}: <span className="numeral text-content">{signed(player.comparison.deltaXp)} xP</span>. P(superarlo): <span className="numeral">{percent(player.comparison.probabilityBetter)}</span>{player.comparison.probabilityTie !== null && <>; P(empate): <span className="numeral">{percent(player.comparison.probabilityTie)}</span></>}. Comparación individual, no mejora del once.</p>}
              <details className="text-xs text-content-secondary">
                <summary className="min-h-11 cursor-pointer flex items-center">Muestra, sensibilidad y datos utilizados</summary>
                {player.distribution && <p className="numeral">{player.distribution.samples} jornadas; muestra efectiva {number(player.distribution.effectiveSamples)}.</p>}
                {player.opponentSensitivity && <p>Rival +10 Elo: <span className="numeral">{signed(player.opponentSensitivity.stronger)} xP</span>; rival −10 Elo: <span className="numeral">{signed(player.opponentSensitivity.weaker)} xP</span>.</p>}
                <ul className="list-disc pl-4 space-y-1">{player.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
              </details>
            </article>)}
          </div>}
        {players.length > 4 && <Button size="touch" variant="outline" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Mostrar menos' : `Ver los ${players.length} jugadores`}</Button>}
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer flex items-center font-semibold">Fuentes y límites del análisis</summary>
          <ul className="space-y-3 my-3">{report.sources.map((source) => <li key={source.name}>
            <p className="flex gap-2 items-center">{source.status === 'available' ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> : <MinusCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}<span>{source.name} · {statusLabels[source.status]}</span></p>
            <p className="text-content-secondary">{source.detail}{source.fetchedAt && <> Consulta: {new Date(source.fetchedAt).toLocaleString('es-ES')}.</>}</p>
          </li>)}</ul>
          <ul className="list-disc pl-4 space-y-2 text-content-secondary">{report.limitations.map((limit) => <li key={limit}>{limit}</li>)}</ul>
        </details>
      </CardContent>
    </Card>
  );
}
