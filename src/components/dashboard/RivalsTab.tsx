'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague, TeamPlayer } from '../../types/fantasy';
import type { RivalTeam } from '../../types/analysis';
import { getClauseProtection } from '../../lib/clause-availability';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import PlayerAvatar from '../shared/PlayerAvatar';
import PlayerStatusBadge from '../shared/PlayerStatusBadge';
import Currency from '../shared/Currency';
import ErrorState from '../shared/ErrorState';
import SectionHeader from '../shared/SectionHeader';
import { Shield, ShieldCheck, Lock, Gavel, Users } from 'lucide-react';
import { positionShortName, positionBgClass } from '../../lib/format';

interface RivalsTabProps {
  league: FantasyLeague;
}

export default function RivalsTab({ league }: RivalsTabProps) {
  const teamId = league.team.id;
  const leagueId = league.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['league-analysis', leagueId, teamId],
    queryFn: () => fantasyAPI.getLeagueAnalysis(leagueId, teamId),
    enabled: !!teamId,
  });

  const rivals: RivalTeam[] = data?.analysis?.rivals || [];
  const ownMoney: number = data?.analysis?.money?.teamMoney ?? 0;

  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const selectedRival = useMemo(
    () => rivals.find((r) => String(r.teamId) === selectedTeamId) || rivals[0],
    [rivals, selectedTeamId],
  );

  if (isLoading) return <RivalsSkeleton />;
  if (error) return <ErrorState title="Error cargando rivales" description={error.message} onRetry={refetch} />;

  if (rivals.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Rivales" description="Plantillas de los otros miembros de la liga." />
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No se han podido cargar las plantillas de los rivales.
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableCount = selectedRival
    ? selectedRival.players.filter((p) => getClauseProtection(p).status === 'available').length
    : 0;
  const buyoutableCount = selectedRival
    ? selectedRival.players.filter(
        (p) => getClauseProtection(p).status === 'available' && p.buyoutClause > 0 && p.buyoutClause <= ownMoney,
      ).length
    : 0;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Rivales"
        description="Plantillas de la liga y disponibilidad para clausulazo (bloqueados y blindados no se pueden clausular)."
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {selectedRival?.managerName || 'Rival'}
              </CardTitle>
              <CardDescription>
                {selectedRival ? (
                  <>
                    {selectedRival.players.length} jugadores · {availableCount} disponibles ·{' '}
                    {buyoutableCount} a tu alcance (<Currency value={ownMoney} /> disponibles)
                  </>
                ) : (
                  'Selecciona un rival'
                )}
              </CardDescription>
            </div>
            <Select value={String(selectedRival?.teamId ?? '')} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-full sm:w-56 bg-surface-2 border-white/[0.08] text-foreground">
                <SelectValue placeholder="Elige rival" />
              </SelectTrigger>
              <SelectContent>
                {rivals.map((rival) => (
                  <SelectItem key={rival.teamId} value={String(rival.teamId)}>
                    {rival.managerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px] normal-case tracking-normal"></TableHead>
                  <TableHead className="normal-case tracking-normal">Jugador</TableHead>
                  <TableHead className="normal-case tracking-normal">Posición</TableHead>
                  <TableHead className="normal-case tracking-normal">Estado</TableHead>
                  <TableHead className="normal-case tracking-normal">Puntos</TableHead>
                  <TableHead className="normal-case tracking-normal">Valor mercado</TableHead>
                  <TableHead className="normal-case tracking-normal">Cláusula</TableHead>
                  <TableHead className="normal-case tracking-normal">Protección</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...(selectedRival?.players || [])]
                  .sort((a, b) => a.playerMaster.positionId - b.playerMaster.positionId)
                  .map((player) => (
                    <RivalPlayerRow key={player.playerTeamId} player={player} ownMoney={ownMoney} />
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RivalPlayerRow({ player, ownMoney }: { player: TeamPlayer; ownMoney: number }) {
  const p = player.playerMaster;
  const points = p.points || p.lastSeasonPoints || 0;
  const posColor = positionBgClass(p.position || '', p.positionId);
  const protection = getClauseProtection(player);
  const canBuyout =
    protection.status === 'available' && player.buyoutClause > 0 && player.buyoutClause <= ownMoney;

  return (
    <TableRow>
      <TableCell className="py-2 px-2 sm:px-4">
        <PlayerAvatar player={p} size="md" showPosition />
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <div className="font-semibold text-foreground">{p.nickname}</div>
        <div className="text-xs text-muted-foreground">{p.team?.name || 'Sin equipo'}</div>
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <Badge variant="secondary" className={`font-display font-bold tracking-wide text-white ${posColor} border-0`}>
          {positionShortName(p.position, p.positionId)}
        </Badge>
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <PlayerStatusBadge status={p.playerStatus} />
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4 font-semibold text-foreground">{points}</TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <Currency value={p.marketValue} className="text-muted-foreground" />
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <div className="flex items-center gap-2">
          <Currency value={player.buyoutClause} />
          {canBuyout && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
              title="Puedes pagar su cláusula ahora mismo"
            >
              <Gavel className="h-3 w-3" /> Clausulable
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <ProtectionBadge player={player} />
      </TableCell>
    </TableRow>
  );
}

function ProtectionBadge({ player }: { player: TeamPlayer }) {
  const protection = getClauseProtection(player);

  if (protection.status === 'shielded') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-400">
        <ShieldCheck className="h-3 w-3" /> Blindado
      </span>
    );
  }

  if (protection.status === 'locked') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400"
        title="Cláusula bloqueada (subida reciente o protección de 2 semanas tras un clausulazo)"
      >
        <Lock className="h-3 w-3" /> Protegido hasta {formatDate(protection.until)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
      <Shield className="h-3 w-3" /> Disponible
    </span>
  );
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return iso;
  return new Date(time).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function RivalsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}
