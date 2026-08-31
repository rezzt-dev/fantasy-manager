'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { motionTokens, staggerDelay } from '../../lib/motion';
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
  if (error) return (
      <ErrorState
        title="No hemos podido leer la clasificación"
        description="La API oficial no ha devuelto la tabla de tu liga. Reintenta en unos segundos."
        detail={error.message}
        onRetry={refetch}
      />
    );

  const standings = data || [];

  if (standings.length === 0) {
    return (
      <EmptyState
        icon={<Trophy />}
        title="La clasificación aún no existe"
        description="La tabla se genera cuando se liquida la primera jornada de la liga. Vuelve después del próximo cierre."
      />
    );
  }

  const topThree = standings.slice(0, 3);
  const leaderPoints = standings[0]?.points ?? 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        as="h1"
        eyebrow="Clasificación"
        title="Cómo va la liga"
        description={`Puntos acumulados de cada manager de ${league.name} y cuánto se ha movido cada uno desde la jornada anterior.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {topThree.map((entry, idx) => (
          <PodiumCard key={entry.team.id} entry={entry} position={entry.position} rank={idx} />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-content-tertiary" />
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

  // El podio se distingue por PESO, no por tres degradados de colores
  // distintos: el primero lleva superficie elevada y borde de acento, y del
  // segundo al tercero baja el contraste. Así se lee el orden aunque no se
  // distingan los colores.
  const rankConfig = [
    {
      surface: 'border-accent/30 bg-accent-quiet',
      icon: <Crown className="h-5 w-5 text-accent" aria-hidden="true" />,
      label: 'Líder de la liga',
    },
    {
      surface: 'border-white/[0.14] bg-surface-raised',
      icon: <Medal className="h-5 w-5 text-content-secondary" aria-hidden="true" />,
      label: 'Segundo puesto',
    },
    {
      surface: 'border-white/[0.09] bg-surface',
      icon: <Medal className="h-5 w-5 text-content-tertiary" aria-hidden="true" />,
      label: 'Tercer puesto',
    },
  ][rank];

  const t = motionTokens();

  return (
    // Las tres plazas del podio SÍ se escalonan: son tres piezas y el orden es
    // el contenido —primero, segundo, tercero—, así que la cascada dice lo
    // mismo que la tarjeta. El paso sale del token `loose` (70 ms), no de un
    // `rank * 0.1` que dejaba al tercero llegando 200 ms tarde con una curva
    // por defecto del framework.
    <motion.div
      initial={{ opacity: 0, y: t.move.md }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: t.sec.base,
        delay: staggerDelay(rank, 'loose'),
        ease: t.ease.out,
      }}
      className={`relative overflow-hidden rounded-lg border p-5 ${rankConfig.surface} ${rank === 0 ? 'shadow-3' : 'shadow-1'}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas/60">
          {rankConfig.icon}
          <span className="sr-only">{rankConfig.label}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-display font-semibold text-content">
            {entry.team.manager?.managerName || 'Equipo'}
          </p>
          <p className="mt-0.5 text-xs text-content-tertiary">
            <span className="numeral text-content-secondary">{entry.points}</span> puntos
          </p>
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
    <TableRow className={isUser ? 'bg-white/[0.05]' : undefined}>
      <TableCell className="text-center">
        {entry.position <= 3 ? (
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] font-bold text-content">
            {entry.position === 1 ? <Crown className="h-4 w-4" /> : entry.position}
          </div>
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center font-bold text-content-tertiary">{entry.position}</span>
        )}
      </TableCell>
      <TableCell>
        <div className="font-semibold text-content">{entry.team.manager?.managerName || 'Equipo'}</div>
        {isUser && <Badge variant="outline" className="mt-1 text-[10px]">Tú</Badge>}
      </TableCell>
      <TableCell className="text-right font-bold font-display text-content">{entry.points}</TableCell>
      <TableCell className="text-right hidden sm:table-cell text-content-tertiary">
        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(entry.team.teamValue)}
      </TableCell>
      <TableCell className="text-center hidden sm:table-cell text-content-tertiary">
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
      <div className="inline-flex items-center gap-1 rounded-full bg-positive-quiet px-2 py-0.5 text-xs font-semibold text-positive-text">
        <ArrowUp className="h-3 w-3" />
        {movement}
      </div>
    );
  }

  if (movement < 0) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-negative-quiet px-2 py-0.5 text-xs font-semibold text-negative-text">
        <ArrowDown className="h-3 w-3" />
        {Math.abs(movement)}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-xs font-semibold text-content-tertiary">
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
