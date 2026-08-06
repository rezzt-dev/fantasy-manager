'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar, Clock, MapPin, Trophy } from 'lucide-react';
import type { Match, WeekInfo } from '../../types/fantasy';

interface NextMatchdayCardProps {
  week?: WeekInfo;
  matches?: Match[];
  leagueName?: string;
}

export default function NextMatchdayCard({ week, matches = [], leagueName }: NextMatchdayCardProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

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
              <Trophy className="h-4 w-4 text-muted-foreground" />
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Abre: {new Date(opening).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        {closing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Cierra: {new Date(closing).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {sortedMatches.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Partidos destacados</div>
            {sortedMatches.slice(0, 3).map((match) => (
              <div key={match.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-surface-2/50 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{match.localId} vs {match.visitorId}</span>
                </div>
                <span className="text-muted-foreground">
                  {new Date(match.matchDate || match.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
