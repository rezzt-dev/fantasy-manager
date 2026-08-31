'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import fantasyAPI from '../../lib/fantasy/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar, Clock, Trophy } from 'lucide-react';
import type { Match, WeekInfo, TeamCatalogEntry } from '../../types/fantasy';
import { cn } from '../../lib/utils';

interface NextMatchdayCardProps {
  week?: WeekInfo;
  matches?: Match[];
  leagueName?: string;
}

function teamInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Escudo del equipo con degradación: escudo oficial → iniciales del nombre →
 * interrogante. `/calendar` solo devuelve ids, así que el nombre llega del
 * catálogo de equipos (`/api/teams`).
 */
function TeamBadge({ team, fallbackId, className }: { team?: TeamCatalogEntry; fallbackId: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const name = team?.name ?? `Equipo ${fallbackId}`;

  if (failed || !team?.badgeColor) {
    return (
      <span
        className={cn('flex shrink-0 items-center justify-center text-[10px] font-bold text-content-tertiary', className)}
        title={name}
      >
        {team ? teamInitials(name) : '?'}
      </span>
    );
  }

  return (
    <img
      src={team.badgeColor}
      alt={name}
      title={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('shrink-0 object-contain', className)}
    />
  );
}

function TeamLabel({ team, fallbackId }: { team?: TeamCatalogEntry; fallbackId: number }) {
  const name = team?.name ?? `Equipo ${fallbackId}`;
  return (
    <span className="min-w-0 truncate font-medium" title={name}>
      {team?.shortName || name}
    </span>
  );
}

export default function NextMatchdayCard({ week, matches = [], leagueName }: NextMatchdayCardProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const { data: teams } = useQuery({
    queryKey: ['teams-catalog'],
    queryFn: () => fantasyAPI.getTeamsCatalog(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const teamsById = useMemo(() => new Map((teams ?? []).map((t) => [t.id, t])), [teams]);

  const closing = week?.closingWeekDate ? new Date(week.closingWeekDate).getTime() : null;
  const opening = week?.openingWeekDate ? new Date(week.openingWeekDate).getTime() : null;

  const countdown = useMemo(() => {
    if (!closing) return null;
    const diff = closing - now;
    if (diff <= 0) return { label: 'Cerrada', expired: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return { label: `${days}d ${hours}h`, expired: false };
    if (hours > 0) return { label: `${hours}h ${minutes}m`, expired: false };
    return { label: `${minutes}m`, expired: false };
  }, [closing, now]);

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => new Date(a.matchDate || a.date).getTime() - new Date(b.matchDate || b.date).getTime());
  }, [matches]);

  if (!week) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-content-tertiary" />
              Jornada {week.number ?? week.weekNumber ?? '—'}
            </CardTitle>
            <CardDescription>{leagueName}</CardDescription>
          </div>
          {countdown && (
            <Badge variant={countdown.expired ? 'secondary' : 'glow'} className="gap-1">
              <Clock className="h-3 w-3" />
              {countdown.expired ? 'Cerrada' : `Cierra en ${countdown.label}`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {opening && (
          <div className="flex items-center gap-2 text-xs text-content-tertiary">
            <Calendar className="h-3.5 w-3.5" />
            Abre: {new Date(opening).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        {closing && (
          <div className="flex items-center gap-2 text-xs text-content-tertiary">
            <Calendar className="h-3.5 w-3.5" />
            Cierra: {new Date(closing).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {sortedMatches.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-medium uppercase tracking-wider text-content-tertiary">Partidos destacados</div>
            {sortedMatches.slice(0, 3).map((match) => {
              const local = teamsById.get(match.localId);
              const visitor = teamsById.get(match.visitorId);
              const hasScore = match.localScore !== null && match.visitorScore !== null;

              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.09] bg-surface-raised/50 px-3 py-2 text-xs"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <TeamBadge team={local} fallbackId={match.localId} className="h-5 w-5" />
                    <TeamLabel team={local} fallbackId={match.localId} />
                    <span className="shrink-0 text-content-tertiary">
                      {hasScore ? `${match.localScore}-${match.visitorScore}` : 'vs'}
                    </span>
                    <TeamLabel team={visitor} fallbackId={match.visitorId} />
                    <TeamBadge team={visitor} fallbackId={match.visitorId} className="h-5 w-5" />
                  </div>
                  <span className="shrink-0 text-content-tertiary">
                    {new Date(match.matchDate || match.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
