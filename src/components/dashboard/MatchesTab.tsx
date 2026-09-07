'use client';

import { useState, useEffect, useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague, EnrichedMatch, MatchEvent, EnrichedMatchStatus, MatchLineupSide, MatchLineupPlayer } from '../../types/fantasy';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowRightLeft, Circle, AlertCircle, Trophy, Radio, Clock, CalendarDays, Goal, FileText, Users, ChevronRight, ChevronLeft, ChevronDown, RefreshCw, MapPin } from 'lucide-react';
import EmptyState from '../shared/EmptyState';
import SectionHeader from '../shared/SectionHeader';
import ErrorState from '../shared/ErrorState';
import { cn } from '../../lib/utils';

interface MatchesTabProps {
  league: FantasyLeague;
}

function MatchesSkeleton() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Partidos" description="Partidos de la jornada" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="space-y-5 p-4"><Skeleton className="h-5 w-32" /><div className="flex items-center justify-around"><Skeleton className="size-14" /><Skeleton className="h-10 w-24" /><Skeleton className="size-14" /></div><Skeleton className="h-5 w-full" /><Skeleton className="h-8 w-full" /></Card>)}
      </div>
    </div>
  );
}

function useLiveMinute(initialMinute: number | null, status: EnrichedMatchStatus, startTimestamp: number, stale = false) {
  const [minute, setMinute] = useState(initialMinute);

  useEffect(() => {
    setMinute(initialMinute);
    if (status !== 'live' || stale) return;

    const interval = setInterval(() => {
      setMinute((prev) => {
        if (prev !== null) return prev + 1;
        return null;
      });
    }, 60_000);

    return () => clearInterval(interval);
  }, [initialMinute, status, startTimestamp, stale]);

  return minute;
}

function statusVariant(status: EnrichedMatchStatus): 'default' | 'success' | 'warning' | 'danger' | 'secondary' {
  switch (status) {
    case 'live':
      return 'success';
    case 'halftime':
      return 'warning';
    case 'finished':
      return 'secondary';
    case 'pending':
      return 'default';
    case 'postponed':
    case 'canceled':
      return 'danger';
    default:
      return 'default';
  }
}

function phaseLabel(phase: EnrichedMatch['phase']): string {
  switch (phase) {
    case 'primera-parte':
      return '1ª parte';
    case 'descanso':
      return 'Descanso';
    case 'segunda-parte':
      return '2ª parte';
    case 'finalizado':
      return 'Finalizado';
    case 'pendiente':
      return 'Pendiente';
    default:
      return '';
  }
}

function TeamShield({ name, logoUrl, className }: { name: string; logoUrl: string; className?: string }) {
  const [error, setError] = useState(false);
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (error || !logoUrl) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center', className)} title={name}>
        <span className="text-xs font-bold text-content-tertiary">{initials || '?'}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex shrink-0 items-center justify-center', className)} title={name}>
      <img
        src={logoUrl}
        alt={name}
        className="h-full w-full object-contain"
        onError={() => setError(true)}
        loading="lazy"
      />
    </div>
  );
}

function EventIcon({ event }: { event: MatchEvent }) {
  if (event.type === 'goal') {
    return <Circle className="h-3.5 w-3.5 fill-foreground text-content" />;
  }
  if (event.type === 'card') {
    const isRed = event.detail?.includes('roja') || event.detail?.includes('doble');
    return <span className={cn('h-3.5 w-2.5 rounded-sm', isRed ? 'bg-negative' : 'bg-caution')} />;
  }
  if (event.type === 'substitution') {
    return <ArrowRightLeft className="h-3.5 w-3.5 text-info-text" />;
  }
  return null;
}

function MatchEventRow({ event }: { event: MatchEvent }) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-1 text-sm">
      <span className="w-10 shrink-0 text-right numeral text-content-tertiary">
        {event.minute !== null ? `${event.minute}'` : ''}
      </span>
      <EventIcon event={event} />
      <span className="font-medium text-content">{event.label}</span>
      {event.detail && <span className="text-content-tertiary">{event.detail}</span>}
    </div>
  );
}

function extractGoalAuthor(detail?: string): string {
  if (!detail) return 'Jugador';
  return detail.split(' · ')[0].split(' (')[0].trim() || 'Jugador';
}

function GoalRow({ event, isHome }: { event: MatchEvent; isHome: boolean | null }) {
  return (
    <div className={cn('flex items-start gap-1.5 text-xs text-content-secondary', isHome === false && 'justify-end text-right')}>
      <Goal className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
      <span>{extractGoalAuthor(event.detail)} <span className="numeral whitespace-nowrap text-content-tertiary">{event.minute !== null ? `${event.minute}′` : ''}</span>{event.label.toLowerCase().includes('propia') && ' (p. p.)'}</span>
    </div>
  );
}

const POSITION_ORDER = ['G', 'D', 'M', 'F'] as const;
const POSITION_LABELS: Record<string, string> = {
  G: 'Portero',
  D: 'Defensas',
  M: 'Mediocentros',
  F: 'Delanteros',
};

function groupPlayersByPosition(players: MatchLineupPlayer[]) {
  const groups: Record<string, MatchLineupPlayer[]> = { G: [], D: [], M: [], F: [] };
  for (const player of players) {
    const raw = (player.position ?? 'M').toUpperCase();
    const key = POSITION_ORDER.find((k) => raw.startsWith(k)) ?? 'M';
    groups[key].push(player);
  }
  return groups;
}

function LineupSide({ side, isHome }: { side: MatchLineupSide; isHome: boolean }) {
  const groups = groupPlayersByPosition(side.starters);

  return (
    <div className={cn('flex flex-col gap-4', isHome ? 'items-start' : 'items-end')}>
      <div className={cn('flex items-center gap-2', isHome ? '' : 'flex-row-reverse')}>
        <MapPin className={cn('h-3.5 w-3.5', isHome ? 'text-positive-text' : 'text-info-text')} />
        <span className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
          {isHome ? 'Local' : 'Visitante'}
        </span>
      </div>

      <div>
        <div className={cn('text-sm font-semibold text-content', isHome ? 'text-left' : 'text-right')}>
          {side.teamName}
        </div>
        {side.formation && (
          <div className={cn('text-xs text-content-tertiary', isHome ? 'text-left' : 'text-right')}>
            Formación {side.formation}
          </div>
        )}
        {side.coach && (
          <div className={cn('text-xs text-content-tertiary', isHome ? 'text-left' : 'text-right')}>
            Entrenador: {side.coach}
          </div>
        )}
      </div>

      <div className={cn('flex w-full flex-col gap-3', isHome ? 'items-start' : 'items-end')}>
        {POSITION_ORDER.map((key) => {
          const list = groups[key];
          if (list.length === 0) return null;
          return (
            <div key={key} className={cn('flex w-full flex-col gap-1', isHome ? 'items-start' : 'items-end')}>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-content-tertiary">
                {POSITION_LABELS[key]}
              </span>
              <div className={cn('flex flex-wrap gap-1', isHome ? '' : 'flex-row-reverse')}>
                {list.map((player, idx) => (
                  <Badge
                    key={idx}
                    variant="outline-muted"
                    className="text-[11px]"
                    title={player.number ? `Dorsal ${player.number}` : undefined}
                  >
                    {player.shortName ?? player.name}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {side.bench.length > 0 && (
        <div className={cn('flex w-full flex-col gap-1', isHome ? 'items-start' : 'items-end')}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-content-tertiary">Suplentes</span>
          <div className={cn('flex flex-wrap gap-1', isHome ? '' : 'flex-row-reverse')}>
            {side.bench.map((player, idx) => (
              <Badge key={idx} variant="outline-muted" className="text-[11px] opacity-80">
                {player.shortName ?? player.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchDetailDialog({ match, open, onClose }: { match: EnrichedMatch; open: boolean; onClose: () => void }) {
  const liveMinute = useLiveMinute(match.minute, match.status, match.startTimestamp, match.dataStale);
  const hasLineups = !!match.lineups && match.lineups.home.starters.length > 0 && match.lineups.away.starters.length > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="flex h-[90dvh] max-h-[800px] w-[calc(100%-2rem)] max-w-2xl gap-0 [&>button]:size-11 flex-col overflow-hidden p-0">
        <div className="border-b border-border p-5">
            <DialogHeader className="gap-4 pr-0 pt-8">
              <DialogTitle className="sr-only">
                {match.home.name} vs {match.away.name}
              </DialogTitle>
              <DialogDescription className="sr-only">Marcador, eventos y alineaciones del partido.</DialogDescription>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-content-tertiary">
                <MatchStatus match={match} minute={liveMinute} />
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {match.kickoffFormatted}
                </span>
              </div>

              <div className="flex items-center justify-center gap-3 sm:gap-6">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <TeamShield name={match.home.name} logoUrl={match.home.logoUrl} className="h-14 w-14 sm:h-16 sm:w-16" />
                  <span className="text-center text-sm font-semibold text-content">{match.home.name}</span>
                  <Badge variant="outline-muted" className="text-[10px]">Local</Badge>
                </div>

                <MatchScore match={match} />

                <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <TeamShield name={match.away.name} logoUrl={match.away.logoUrl} className="h-14 w-14 sm:h-16 sm:w-16" />
                  <span className="text-center text-sm font-semibold text-content">{match.away.name}</span>
                  <Badge variant="outline-muted" className="text-[10px]">Visitante</Badge>
                </div>
              </div>
            </DialogHeader>
          </div>

          <Tabs defaultValue="summary" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mx-5 mt-4 h-auto w-fit">
              <TabsTrigger value="summary" className="min-h-11 gap-1.5 text-sm">
                <FileText className="h-3.5 w-3.5" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="lineups" className="min-h-11 gap-1.5 text-sm">
                <Users className="h-3.5 w-3.5" />
                Alineaciones
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="min-h-0 flex-1 px-5">
              <TabsContent value="summary" className="my-4 space-y-4">
                {match.summary && (
                  <div className="rounded-lg border border-border bg-surface-raised/40 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-content-tertiary">
                      <FileText className="h-3.5 w-3.5" />
                      Resumen del partido{match.dataSource === 'espn' ? ' · ESPN' : match.dataSource === 'sofascore' ? ' · SofaScore' : ''}
                      {match.summary.source === 'generated' && (
                        <span className="ml-auto text-[10px] opacity-80">generado automáticamente</span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-content">{match.summary.text}</p>
                  </div>
                )}

                {match.squadPlayers.length > 0 && (
                  <div className="rounded-lg border border-border bg-surface-raised/40 p-4">
                    <div className="mb-2 text-xs font-medium text-content-tertiary">Jugadores de tu plantilla</div>
                    <div className="flex flex-wrap gap-1.5">
                      {match.squadPlayers.map((p) => (
                        <Badge key={p.playerId} variant={p.isHome ? 'default' : 'secondary'} className="text-[10px]">
                          {p.nickname} · {p.position}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-surface-raised/40 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-content-tertiary">
                    <Goal className="h-3.5 w-3.5" />
                    Eventos
                  </div>
                  {match.events.length > 0 ? (
                    <div className="divide-y divide-border">
                      {match.events.map((event, idx) => (
                        <div key={idx} className="py-2"><span className="text-xs text-content-tertiary">{event.isHome === true ? match.home.name : event.isHome === false ? match.away.name : "Partido"}</span><MatchEventRow event={event} /></div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-content-tertiary">Sin eventos registrados todavía.</p>
                  )}
                </div>

                {match.notes.length > 0 && (
                  <div className="text-xs text-caution-text">
                    {match.notes.map((n, i) => (
                      <p key={i} className="flex items-start gap-1.5">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        {n}
                      </p>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="lineups" className="my-4">
                {hasLineups ? (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-surface-raised/40 p-4">
                      <LineupSide side={match.lineups!.home} isHome />
                    </div>
                    <div className="rounded-lg border border-border bg-surface-raised/40 p-4">
                      <LineupSide side={match.lineups!.away} isHome={false} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-surface-raised/40 p-8 text-center">
                    <Users className="mx-auto h-8 w-8 text-content-tertiary" />
                    <p className="mt-2 text-sm font-medium text-content">Alineaciones no disponibles</p>
                    <p className="text-xs text-content-tertiary">
                      Las alineaciones suelen publicarse cerca del inicio. Reintenta la carga; si el partido ya empezó, la fuente puede no haberlas facilitado.
                    </p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MatchStatus({ match, minute }: { match: EnrichedMatch; minute: number | null }) {
  return (
    <Badge variant={statusVariant(match.status)} className="gap-1.5">
      {match.status === 'live' && <Radio className="size-3.5" aria-hidden="true" />}
      {match.statusLabel}{match.status === 'live' && minute !== null ? ` · ${minute}′` : ''}
      {match.status === 'live' && phaseLabel(match.phase) ? ` · ${phaseLabel(match.phase)}` : ''}
    </Badge>
  );
}

function MatchScore({ match }: { match: EnrichedMatch }) {
  const scheduled = match.status === 'pending';
  const time = match.startTimestamp > 0
    ? new Date(match.startTimestamp * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })
    : 'Por confirmar';
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <span className={cn('numeral whitespace-nowrap font-semibold text-content', scheduled ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl')}>
        {scheduled ? time : `${match.home.score ?? '–'} : ${match.away.score ?? '–'}`}
      </span>
      <span className="text-xs text-content-tertiary">{scheduled ? 'Hora peninsular' : match.status === 'finished' ? 'Resultado final' : 'Marcador'}</span>
    </div>
  );
}

function MatchCard({ match, onOpen }: { match: EnrichedMatch; onOpen: () => void }) {
  const liveMinute = useLiveMinute(match.minute, match.status, match.startTimestamp, match.dataStale);
  const goals = match.events.filter((event) => event.type === 'goal');
  return (
    <Card variant="interactive" className="h-full overflow-hidden">
      <button onClick={onOpen} aria-label={`Ver partido: ${match.home.name} contra ${match.away.name}`} className="group flex h-full w-full flex-col text-left">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 [.density-dense_&]:py-2">
          <MatchStatus match={match} minute={liveMinute} />
          <span className="flex items-center gap-1.5 text-xs text-content-tertiary"><CalendarDays className="size-3.5" />{match.kickoffFormatted}</span>
        </div>
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-3 gap-y-4 p-4 sm:p-5 [.density-dense_&]:p-3">
          <div className="flex min-w-0 flex-col items-center gap-2 text-center">
            <TeamShield name={match.home.name} logoUrl={match.home.logoUrl} className="size-12 sm:size-14" />
            <span className="min-h-10 text-sm font-semibold leading-5 text-content">{match.home.name}</span>
          </div>
          <div className="pt-3"><MatchScore match={match} /></div>
          <div className="flex min-w-0 flex-col items-center gap-2 text-center">
            <TeamShield name={match.away.name} logoUrl={match.away.logoUrl} className="size-12 sm:size-14" />
            <span className="min-h-10 text-sm font-semibold leading-5 text-content">{match.away.name}</span>
          </div>
          {goals.length > 0 && <div className="col-span-3 grid grid-cols-2 gap-4 border-t border-border pt-3">
            {[true, false].map((home) => <div key={String(home)} className="space-y-1.5">
              {goals.filter((event) => event.isHome === home).map((event, idx) => <GoalRow key={idx} event={event} isHome={home} />)}
            </div>)}
            {goals.filter((event) => event.isHome === null).map((event, idx) => <GoalRow key={`unknown-${idx}`} event={event} isHome={null} />)}
          </div>}
        </div>
        <div className="mt-auto flex w-full flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-sunken px-4 py-3">
          <span className="flex min-w-0 flex-1 items-start gap-2 text-xs text-content-secondary">
            {match.important ? <><Users className="mt-0.5 size-3.5 shrink-0" /><span><span className="font-medium text-content">Tu plantilla · </span>{match.squadPlayers.map((p) => p.nickname).join(', ')}</span></> : <><FileText className="size-3.5 shrink-0" />Resumen y alineaciones</>}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-content">Ver partido<ChevronRight className="size-4" /></span>
          {match.dataStale && <span className="flex w-full items-center gap-1.5 text-xs text-caution-text"><AlertCircle className="size-3.5" />Datos pendientes de actualizar</span>}
        </div>
      </button>
    </Card>
  );
}

function MatchSection({ title, matches, expanded, onToggle, onOpenMatch }: {
  title: string; matches: EnrichedMatch[]; expanded: boolean;
  onToggle: () => void; onOpenMatch: (match: EnrichedMatch) => void;
}) {
  const id = useId();
  if (matches.length === 0) return null;
  const groups = [
    { title: 'En juego', matches: matches.filter((m) => m.status === 'live' || m.status === 'halftime') },
    { title: 'Próximos partidos', matches: matches.filter((m) => m.status === 'pending') },
    { title: 'Resultados', matches: matches.filter((m) => m.status === 'finished') },
    { title: 'Otros estados', matches: matches.filter((m) => ['postponed', 'canceled', 'unknown'].includes(m.status)) },
  ].filter((group) => group.matches.length > 0);
  return (
    <section className="space-y-4" aria-labelledby={`${id}-title`}>
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3"><h2 id={`${id}-title`} className="font-display text-xl font-semibold tracking-tight">{title}</h2><Badge variant="secondary" className="numeral">{matches.length}</Badge></div>
        <Button variant="ghost" size="touch" onClick={onToggle} aria-expanded={expanded} aria-controls={id}>
          {expanded ? 'Ocultar' : 'Mostrar'}<ChevronDown className={cn('ml-2 size-4', expanded && 'rotate-180')} />
        </Button>
      </div>
      <div id={id} hidden={!expanded} className="space-y-6">
        {groups.map((group) => <div key={group.title} className="space-y-3">
          <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-content-tertiary">{group.title}<span className="numeral">· {group.matches.length}</span></h3>
          <div className="grid gap-4 xl:grid-cols-2">{group.matches.map((match) => <MatchCard key={match.id} match={match} onOpen={() => onOpenMatch(match)} />)}</div>
        </div>)}
      </div>
    </section>
  );
}

function WeekSelector({
  week,
  currentWeek,
  availableWeeks,
  onChange,
}: {
  week: number;
  currentWeek: number;
  availableWeeks: number[];
  onChange: (week: number) => void;
}) {
  const weeks = availableWeeks.length > 0 ? availableWeeks : [week];
  const index = weeks.indexOf(week);
  const canGoBack = index > 0;
  const canGoForward = index >= 0 && index < weeks.length - 1;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon-touch"
        aria-label="Jornada anterior"
        disabled={!canGoBack}
        onClick={() => canGoBack && onChange(weeks[index - 1])}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select value={String(week)} onValueChange={(value) => onChange(Number(value))}>
        <SelectTrigger className="h-11 w-40 numeral">
          <SelectValue placeholder="Jornada" />
        </SelectTrigger>
        <SelectContent>
          {[...weeks].reverse().map((w) => (
            <SelectItem key={w} value={String(w)}>
              Jornada {w}
              {w === currentWeek ? ' (actual)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon-touch"
        aria-label="Jornada siguiente"
        disabled={!canGoForward}
        onClick={() => canGoForward && onChange(weeks[index + 1])}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function MatchesTab({ league }: MatchesTabProps) {
  // `undefined` = jornada actual (la decide el servidor); al elegir otra en el
  // selector se fija el número y se consulta esa jornada.
  const [selectedWeek, setSelectedWeek] = useState<number | undefined>(undefined);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['matches', league.id, league.team.id, selectedWeek ?? 'current'],
    queryFn: () => fantasyAPI.getMatches(league.id, league.team.id, selectedWeek),
    placeholderData: (previous) => previous,
    refetchInterval: (query) => {
      const liveCount = query.state.data?.matches.filter((m) => (m.status === 'live' || m.status === 'halftime')).length ?? 0;
      return liveCount > 0 ? 60_000 : 300_000;
    },
  });

  const [showImportant, setShowImportant] = useState(true);
  const [showNormal, setShowNormal] = useState(true);
  const [detailMatch, setDetailMatch] = useState<EnrichedMatch | null>(null);

  if (isLoading) return <MatchesSkeleton />;
  if (error) return (
      <ErrorState
        title="No hemos podido cargar los partidos"
        description="Los marcadores en vivo vienen de una fuente externa que limita las peticiones. Espera unos segundos y reintenta."
        detail={error.message}
        onRetry={refetch}
      />
    );
  if (!data) return null;

  const { important, normal, week, notes, currentWeek, availableWeeks } = data;
  const isPastWeek = week < currentWeek;
  const isSwitchingWeek = isFetching && selectedWeek !== undefined && selectedWeek !== week;
  const liveCount = data.matches.filter((m) => (m.status === 'live' || m.status === 'halftime')).length;
  const finishedCount = data.matches.filter((m) => m.status === 'finished').length;
  const importantCount = important.length;

  return (
    <div className="space-y-6">
      <SectionHeader
        as="h1"
        eyebrow={`Partidos · jornada ${week}${isPastWeek ? ' (finalizada)' : ''}`}
        title="Dónde están jugando los tuyos"
        description="Marcadores, próximos encuentros y el seguimiento de tu plantilla, en un solo lugar."
        action={
          <div className="flex flex-wrap items-center gap-2"><WeekSelector
            week={week}
            currentWeek={currentWeek}
            availableWeeks={availableWeeks}
            onChange={(value) => { setDetailMatch(null); setSelectedWeek(value); }}
          /><Button variant="outline" size="icon-touch" aria-label="Actualizar partidos" disabled={isFetching} onClick={() => refetch()}><RefreshCw className="size-4" /></Button></div>
        }
      />

      {isSwitchingWeek && (
        <div role="status" className="text-xs text-content-tertiary">Cargando jornada {selectedWeek}…</div>
      )}

      {isPastWeek && (
        <Card className="border-border bg-surface-raised">
          <CardContent className="flex items-start gap-2 pt-4 text-sm text-content-tertiary">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Estás viendo una jornada pasada. Los jugadores marcados como «tuyos» son los de tu
            plantilla actual, no los que tenías esa jornada.
          </CardContent>
        </Card>
      )}

      {notes.length > 0 && (
        <Card className="border-caution/40 bg-caution-quiet">
          <CardContent className="pt-4">
            {notes.map((note) => (
              <p key={note} className="flex items-start gap-2 text-sm text-caution-text">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {note}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'En juego', count: liveCount, icon: Radio },
          { label: 'Pendientes', count: data.matches.filter((m) => m.status === 'pending').length, icon: Clock },
          { label: 'Finalizados', count: finishedCount, icon: Trophy },
          { label: 'Con tus jugadores', count: importantCount, icon: Users },
        ].map(({ label, count, icon: Icon }) => <Card key={label} variant="sunken" className="flex items-center gap-3 p-4 [.density-dense_&]:p-3">
          <Icon className="size-5 shrink-0 text-content-tertiary" />
          <div><div className="numeral text-2xl font-semibold">{count}</div><div className="text-xs text-content-tertiary">{label}</div></div>
        </Card>)}
      </div>

      {data.matches.length === 0 && <EmptyState icon={<CalendarDays />} title="No hay partidos en esta jornada" description="El calendario todavía no está disponible. Puedes elegir otra jornada o volver a consultarlo." action={<Button variant="outline" size="touch" onClick={() => refetch()}>Volver a cargar</Button>} />}

      <MatchSection
        title="Tu plantilla en juego"
        matches={important}
        expanded={showImportant}
        onToggle={() => setShowImportant((s) => !s)}
        onOpenMatch={setDetailMatch}
      />

      <MatchSection
        title={important.length ? "Resto de la jornada" : "Todos los partidos"}
        matches={normal}
        expanded={showNormal}
        onToggle={() => setShowNormal((s) => !s)}
        onOpenMatch={setDetailMatch}
      />

      {detailMatch && (
        <MatchDetailDialog
          match={data.matches.find((match) => match.id === detailMatch.id) ?? detailMatch}
          open={!!detailMatch}
          onClose={() => setDetailMatch(null)}
        />
      )}
    </div>
  );
}
