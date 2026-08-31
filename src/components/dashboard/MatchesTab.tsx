'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague, EnrichedMatch, MatchEvent, EnrichedMatchStatus, MatchLineupSide, MatchLineupPlayer } from '../../types/fantasy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowRightLeft, Circle, AlertCircle, Trophy, Radio, Clock, CalendarDays, Goal, FileText, Users, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';
import KpiCard from '../shared/KpiCard';
import SectionHeader from '../shared/SectionHeader';
import ErrorState from '../shared/ErrorState';
import { cn } from '../../lib/utils';

interface MatchesTabProps {
  league: FantasyLeague;
}

function MatchesSkeleton() {
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <SectionHeader title="Partidos" description="Partidos de la jornada" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function useLiveMinute(initialMinute: number | null, status: EnrichedMatchStatus, startTimestamp: number) {
  const [minute, setMinute] = useState(initialMinute);

  useEffect(() => {
    setMinute(initialMinute);
    if (status !== 'live') return;

    const interval = setInterval(() => {
      setMinute((prev) => {
        if (prev !== null) return prev + 1;
        const elapsed = Math.floor((Date.now() / 1000 - startTimestamp) / 60);
        return elapsed;
      });
    }, 60_000);

    return () => clearInterval(interval);
  }, [initialMinute, status, startTimestamp]);

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
        <span className="text-xs font-bold text-muted-foreground">{initials || '?'}</span>
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
    return <Circle className="h-3.5 w-3.5 fill-foreground text-foreground" />;
  }
  if (event.type === 'card') {
    const isRed = event.detail?.includes('roja') || event.detail?.includes('doble');
    return <span className={cn('h-3.5 w-2.5 rounded-sm', isRed ? 'bg-rose-500' : 'bg-amber-400')} />;
  }
  if (event.type === 'substitution') {
    return <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-300" />;
  }
  return null;
}

function MatchEventRow({ event }: { event: MatchEvent }) {
  return (
    <div className="flex items-center gap-2 py-1 text-xs">
      <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">
        {event.minute !== null ? `${event.minute}'` : ''}
      </span>
      <EventIcon event={event} />
      <span className="font-medium text-foreground">{event.label}</span>
      {event.detail && <span className="truncate text-muted-foreground">{event.detail}</span>}
    </div>
  );
}

function extractGoalAuthor(detail?: string): string {
  if (!detail) return 'Jugador';
  return detail.split(' · ')[0].split(' (')[0].trim() || 'Jugador';
}

function GoalRow({ event, isHome }: { event: MatchEvent; isHome: boolean | null }) {
  return (
    <div className={cn('flex items-center gap-1.5 text-xs', isHome === false ? 'flex-row-reverse' : '')}>
      <span className="font-medium text-foreground">{extractGoalAuthor(event.detail)}</span>
      <span className="text-muted-foreground">{event.minute}'</span>
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
        <MapPin className={cn('h-3.5 w-3.5', isHome ? 'text-emerald-400' : 'text-indigo-400')} />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {isHome ? 'Local' : 'Visitante'}
        </span>
      </div>

      <div>
        <div className={cn('text-sm font-semibold text-foreground', isHome ? 'text-left' : 'text-right')}>
          {side.teamName}
        </div>
        {side.formation && (
          <div className={cn('text-xs text-muted-foreground', isHome ? 'text-left' : 'text-right')}>
            Formación {side.formation}
          </div>
        )}
        {side.coach && (
          <div className={cn('text-xs text-muted-foreground', isHome ? 'text-left' : 'text-right')}>
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
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Suplentes</span>
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
  const liveMinute = useLiveMinute(match.minute, match.status, match.startTimestamp);
  const hasLineups = !!match.lineups && match.lineups.home.starters.length > 0 && match.lineups.away.starters.length > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0">
        <div className="border-b border-white/[0.06] p-5">
            <DialogHeader className="gap-3">
              <DialogTitle className="sr-only">
                {match.home.name} vs {match.away.name}
              </DialogTitle>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Badge variant={statusVariant(match.status)} className="text-[10px]">
                  {match.status === 'live' && liveMinute !== null ? `${liveMinute}'` : match.statusLabel}
                </Badge>
                {match.phase !== 'desconocido' && match.phase !== 'pendiente' && (
                  <Badge variant="outline-muted" className="text-[10px]">
                    {phaseLabel(match.phase)}
                  </Badge>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {match.kickoffFormatted}
                </span>
              </div>

              <div className="flex items-center justify-center gap-3 sm:gap-6">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <TeamShield name={match.home.name} logoUrl={match.home.logoUrl} className="h-14 w-14 sm:h-16 sm:w-16" />
                  <span className="text-center text-sm font-semibold text-foreground">{match.home.name}</span>
                  <Badge variant="outline-muted" className="text-[10px]">Local</Badge>
                </div>

                <div className="flex shrink-0 flex-col items-center gap-1">
                  <div className="flex items-center gap-2 text-4xl font-bold tabular-nums text-foreground sm:text-5xl">
                    <span>{match.home.score ?? '-'}</span>
                    <span className="text-muted-foreground">:</span>
                    <span>{match.away.score ?? '-'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {match.status === 'live' && liveMinute !== null ? `Minuto ${liveMinute}` : match.statusLabel}
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <TeamShield name={match.away.name} logoUrl={match.away.logoUrl} className="h-14 w-14 sm:h-16 sm:w-16" />
                  <span className="text-center text-sm font-semibold text-foreground">{match.away.name}</span>
                  <Badge variant="outline-muted" className="text-[10px]">Visitante</Badge>
                </div>
              </div>
            </DialogHeader>
          </div>

          <Tabs defaultValue="summary" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mx-5 mt-4 w-fit">
              <TabsTrigger value="summary" className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="lineups" className="gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" />
                Alineaciones
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] px-5 pb-5 sm:h-[460px]">
              <TabsContent value="summary" className="mt-4 space-y-4">
                {match.summary && (
                  <div className="rounded-xl border border-white/[0.06] bg-surface-2/40 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      Resumen del partido
                      {match.summary.source === 'generated' && (
                        <span className="ml-auto text-[10px] opacity-70">generado automáticamente</span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">{match.summary.text}</p>
                  </div>
                )}

                {match.squadPlayers.length > 0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-surface-2/40 p-4">
                    <div className="mb-2 text-xs font-medium text-muted-foreground">Jugadores de tu plantilla</div>
                    <div className="flex flex-wrap gap-1.5">
                      {match.squadPlayers.map((p) => (
                        <Badge key={p.playerId} variant={p.isHome ? 'default' : 'secondary'} className="text-[10px]">
                          {p.nickname} · {p.position}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-white/[0.06] bg-surface-2/40 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Goal className="h-3.5 w-3.5" />
                    Eventos
                  </div>
                  {match.events.length > 0 ? (
                    <div className="grid gap-1 sm:grid-cols-2">
                      {match.events.map((event, idx) => (
                        <MatchEventRow key={idx} event={event} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin eventos registrados todavía.</p>
                  )}
                </div>

                {match.notes.length > 0 && (
                  <div className="text-xs text-amber-200/80">
                    {match.notes.map((n, i) => (
                      <p key={i} className="flex items-start gap-1.5">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        {n}
                      </p>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="lineups" className="mt-4">
                {hasLineups ? (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/[0.06] bg-surface-2/40 p-4">
                      <LineupSide side={match.lineups!.home} isHome />
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-surface-2/40 p-4">
                      <LineupSide side={match.lineups!.away} isHome={false} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/[0.06] bg-surface-2/40 p-8 text-center">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium text-foreground">Alineaciones no disponibles</p>
                    <p className="text-xs text-muted-foreground">
                      SofaScore solo publica alineaciones confirmadas cerca del inicio del partido.
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

function MatchCard({ match, onOpen }: { match: EnrichedMatch; onOpen: () => void }) {
  const liveMinute = useLiveMinute(match.minute, match.status, match.startTimestamp);
  // Todos los partidos abren detalle: incluso los pendientes tienen ficha
  // (hora, alineaciones probables cuando existen, jugadores de la plantilla).
  const isClickable = true;
  const goals = match.events.filter((e) => e.type === 'goal' && e.minute !== null);

  return (
    <Card
      className={cn(
        'overflow-hidden transition-colors',
        match.important && 'border-foreground/10 bg-surface-2/30',
        isClickable && 'hover:bg-surface-2/50 cursor-pointer',
      )}
    >
      <CardContent className="p-0">
        <button
          onClick={isClickable ? onOpen : undefined}
          disabled={!isClickable}
          className={cn(
            'flex w-full flex-col items-center gap-3 p-4 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:text-left [.density-dense_&]:p-3',
            !isClickable && 'cursor-default',
          )}
        >
          {/* Estado + fase + hora */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground sm:justify-start">
            <Badge variant={statusVariant(match.status)} className="text-[10px]">
              {match.status === 'live' && liveMinute !== null ? `${liveMinute}'` : match.statusLabel}
            </Badge>
            {match.phase !== 'desconocido' && match.phase !== 'pendiente' && (
              <Badge variant="outline-muted" className="text-[10px]">
                {phaseLabel(match.phase)}
              </Badge>
            )}
            <span className="flex items-center gap-1">
              {match.status === 'live' ? (
                <Radio className="h-3 w-3 text-emerald-400" />
              ) : match.status === 'finished' ? (
                <Clock className="h-3 w-3" />
              ) : (
                <CalendarDays className="h-3 w-3" />
              )}
              {match.kickoffFormatted}
            </span>
          </div>

          {/* Marcador central */}
          <div className="flex flex-1 items-center justify-center gap-3 sm:gap-5">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:items-end">
              <TeamShield name={match.home.name} logoUrl={match.home.logoUrl} className="h-12 w-12 sm:h-14 sm:w-14" />
              <span className="truncate text-sm font-semibold text-foreground">{match.home.name}</span>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-0.5">
              <div className="flex items-center gap-1.5 text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                <span className="min-w-[1.5ch] text-center">{match.home.score ?? '-'}</span>
                <span className="text-muted-foreground">:</span>
                <span className="min-w-[1.5ch] text-center">{match.away.score ?? '-'}</span>
              </div>
              {isClickable && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  Ver detalle <ChevronRight className="h-3 w-3" />
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:items-start">
              <TeamShield name={match.away.name} logoUrl={match.away.logoUrl} className="h-12 w-12 sm:h-14 sm:w-14" />
              <span className="truncate text-sm font-semibold text-foreground">{match.away.name}</span>
            </div>
          </div>

          {/* Jugadores implicados + goles */}
          <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:items-end">
            {goals.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                {goals.slice(0, 3).map((event, idx) => (
                  <GoalRow key={idx} event={event} isHome={event.isHome} />
                ))}
                {goals.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{goals.length - 3}</span>
                )}
              </div>
            )}

            {match.important && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
                {match.squadPlayers.slice(0, 3).map((p) => (
                  <Badge
                    key={p.playerId}
                    variant="default"
                    className="max-w-[120px] truncate text-[10px] [.density-dense_&]:text-[9px]"
                    title={`${p.nickname} · ${p.teamName}`}
                  >
                    {p.nickname}
                  </Badge>
                ))}
                {match.squadPlayers.length > 3 && (
                  <Badge variant="secondary" className="text-[10px]">
                    +{match.squadPlayers.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </button>
      </CardContent>
    </Card>
  );
}

function MatchSection({
  title,
  matches,
  expanded,
  onToggle,
  onOpenMatch,
}: {
  title: string;
  matches: EnrichedMatch[];
  expanded: boolean;
  onToggle: () => void;
  onOpenMatch: (match: EnrichedMatch) => void;
}) {
  if (matches.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <button onClick={onToggle} className="flex w-full items-center justify-between text-left">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{matches.length} partido{matches.length !== 1 ? 's' : ''}</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            {expanded ? 'Ocultar' : 'Ver'}
          </Button>
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} onOpen={() => onOpenMatch(match)} />
          ))}
        </CardContent>
      )}
    </Card>
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
        size="icon-sm"
        aria-label="Jornada anterior"
        disabled={!canGoBack}
        onClick={() => canGoBack && onChange(weeks[index - 1])}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select value={String(week)} onValueChange={(value) => onChange(Number(value))}>
        <SelectTrigger className="w-40">
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
        size="icon-sm"
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
      const liveCount = query.state.data?.matches.filter((m) => m.status === 'live').length ?? 0;
      return liveCount > 0 ? 60_000 : false;
    },
  });

  const [showImportant, setShowImportant] = useState(true);
  const [showNormal, setShowNormal] = useState(true);
  const [detailMatch, setDetailMatch] = useState<EnrichedMatch | null>(null);

  if (isLoading) return <MatchesSkeleton />;
  if (error) return <ErrorState title="Error cargando partidos" description={error.message} onRetry={refetch} />;
  if (!data) return null;

  const { important, normal, week, notes, currentWeek, availableWeeks } = data;
  const isPastWeek = week < currentWeek;
  const isSwitchingWeek = isFetching && selectedWeek !== undefined && selectedWeek !== week;
  const liveCount = data.matches.filter((m) => m.status === 'live').length;
  const finishedCount = data.matches.filter((m) => m.status === 'finished').length;
  const importantCount = important.length;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <SectionHeader
        title="Partidos"
        description={`Jornada ${week}${isPastWeek ? ' (finalizada)' : ''} · ${league.name}`}
        action={
          <WeekSelector
            week={week}
            currentWeek={currentWeek}
            availableWeeks={availableWeeks}
            onChange={(value) => setSelectedWeek(value)}
          />
        }
      />

      {isSwitchingWeek && (
        <div className="text-xs text-muted-foreground">Cargando jornada {selectedWeek}…</div>
      )}

      {isPastWeek && (
        <Card className="border-white/[0.06] bg-surface-2/30">
          <CardContent className="flex items-start gap-2 pt-4 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Estás viendo una jornada pasada. Los jugadores marcados como «tuyos» son los de tu
            plantilla actual, no los que tenías esa jornada.
          </CardContent>
        </Card>
      )}

      {notes.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4">
            {notes.map((note) => (
              <p key={note} className="flex items-start gap-2 text-sm text-amber-200/90">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {note}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<Radio className="h-5 w-5" />} label="En vivo" value={liveCount} sub="partidos" />
        <KpiCard icon={<Trophy className="h-5 w-5" />} label="Finalizados" value={finishedCount} sub="partidos" />
        <KpiCard icon={<CalendarDays className="h-5 w-5" />} label="Importantes" value={importantCount} sub="con jugadores tuyos" />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="Pendientes"
          value={data.matches.length - liveCount - finishedCount}
          sub="partidos"
        />
      </div>

      <MatchSection
        title="Partidos importantes"
        matches={important}
        expanded={showImportant}
        onToggle={() => setShowImportant((s) => !s)}
        onOpenMatch={setDetailMatch}
      />

      <MatchSection
        title="Resto de la jornada"
        matches={normal}
        expanded={showNormal}
        onToggle={() => setShowNormal((s) => !s)}
        onOpenMatch={setDetailMatch}
      />

      {detailMatch && (
        <MatchDetailDialog
          match={detailMatch}
          open={!!detailMatch}
          onClose={() => setDetailMatch(null)}
        />
      )}
    </div>
  );
}
