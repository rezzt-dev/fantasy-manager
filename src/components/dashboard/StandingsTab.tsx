'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague, StandingEntry } from '../../types/fantasy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import ErrorState from '../shared/ErrorState';
import SectionHeader from '../shared/SectionHeader';
import EmptyState from '../shared/EmptyState';
import { Trophy, ArrowUp, ArrowDown, Minus, Crown, Medal } from 'lucide-react';

interface StandingsTabProps {
  league: FantasyLeague;
}

export default function StandingsTab({ league }: StandingsTabProps) {
  const leagueId = league.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['standing', leagueId],
    queryFn: () => fantasyAPI.getStanding(leagueId),
    enabled: !!leagueId,
  });

  if (isLoading) return <StandingsSkeleton />;
  if (error) return <ErrorState title="Error cargando clasificación" description={error.message} onRetry={refetch} />;

  const standings = data || [];

  if (standings.length === 0) {
    return (
      <EmptyState
        title="Sin clasificación"
        description="No hay datos de clasificación disponibles para esta liga."
      />
    );
  }

  const topThree = standings.slice(0, 3);
  const leaderPoints = standings[0]?.points ?? 0;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <SectionHeader
        title="Clasificación"
        description={`Ranking de managers en ${league.name}`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {topThree.map((entry, idx) => (
          <PodiumCard key={entry.team.id} entry={entry} position={entry.position} rank={idx} />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            Tabla general
          </CardTitle>
          <CardDescription>{standings.length} equipos en competición</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20 text-center">Pos</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Valor</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Distancia</TableHead>
                  <TableHead className="text-center">Tendencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((entry) => (
                  <StandingRow key={entry.team.id} entry={entry} leaderPoints={leaderPoints} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PodiumCard({ entry, position, rank }: { entry: StandingEntry; position: number; rank: number }) {
  const isUser = entry.team.manager?.id && String(entry.team.managerId) === entry.team.manager.id;

  const rankConfig = [
    { gradient: 'from-[#f59e0b]/20 to-[#d97706]/5', border: 'border-[#f59e0b]/30', icon: <Crown className="h-6 w-6 text-[#f59e0b]" />, label: '1º' },
    { gradient: 'from-[#94a3b8]/20 to-[#64748b]/5', border: 'border-[#94a3b8]/30', icon: <Medal className="h-6 w-6 text-[#94a3b8]" />, label: '2º' },
    { gradient: 'from-[#b45309]/20 to-[#78350f]/5', border: 'border-[#b45309]/30', icon: <Medal className="h-6 w-6 text-[#b45309]" />, label: '3º' },
  ][rank];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: rank * 0.1 }}
      className={`relative overflow-hidden rounded-2xl border ${rankConfig.border} bg-gradient-to-br ${rankConfig.gradient} p-5`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background/80 text-xl font-bold text-foreground">
          {rankConfig.icon}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-foreground">{entry.team.manager?.managerName || 'Equipo'}</div>
          <div className="text-xs text-muted-foreground">{entry.points} puntos</div>
        </div>
      </div>
      {isUser && (
        <Badge variant="outline" className="absolute right-4 top-4 text-[10px]">Tú</Badge>
      )}
    </motion.div>
  );
}

function StandingRow({ entry, leaderPoints }: { entry: StandingEntry; leaderPoints: number }) {
  const movement = entry.previousPosition - entry.position;
  const isUser = entry.team.manager?.id && String(entry.team.managerId) === entry.team.manager.id;

  return (
    <TableRow className={isUser ? 'bg-white/[0.03]' : undefined}>
      <TableCell className="text-center">
        {entry.position <= 3 ? (
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] font-bold text-foreground">
            {entry.position === 1 ? <Crown className="h-4 w-4" /> : entry.position}
          </div>
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center font-bold text-muted-foreground">{entry.position}</span>
        )}
      </TableCell>
      <TableCell>
        <div className="font-semibold text-foreground">{entry.team.manager?.managerName || 'Equipo'}</div>
        {isUser && <Badge variant="outline" className="mt-1 text-[10px]">Tú</Badge>}
      </TableCell>
      <TableCell className="text-right font-bold font-display text-foreground">{entry.points}</TableCell>
      <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(entry.team.teamValue)}
      </TableCell>
      <TableCell className="text-center hidden sm:table-cell text-muted-foreground">
        {entry.position === 1 ? '-' : `-${leaderPoints - entry.points}`}
      </TableCell>
      <TableCell className="text-center">
        <MovementIndicator movement={movement} />
      </TableCell>
    </TableRow>
  );
}

function MovementIndicator({ movement }: { movement: number }) {
  if (movement > 0) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
        <ArrowUp className="h-3 w-3" />
        {movement}
      </div>
    );
  }

  if (movement < 0) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-400">
        <ArrowDown className="h-3 w-3" />
        {Math.abs(movement)}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 text-xs font-semibold text-muted-foreground">
      <Minus className="h-3 w-3" />
    </div>
  );
}

function StandingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
