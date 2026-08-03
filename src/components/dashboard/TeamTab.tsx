'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague, TeamPlayer } from '../../types/fantasy';
import type { StarterInfo } from '../../types/analysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
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
import PlayerDetailDialog from '../shared/PlayerDetailDialog';
import ErrorState from '../shared/ErrorState';
import SectionHeader from '../shared/SectionHeader';
import FilterBar from '../shared/FilterBar';
import { StaggerContainer, StaggerItem } from '../ui/motion';
import { ArrowUpDown, Users } from 'lucide-react';
import { positionShortName, positionBgClass, getPositionName } from '../../lib/format';

interface TeamTabProps {
  league: FantasyLeague;
}

type SortKey = 'nickname' | 'position' | 'points' | 'marketValue' | 'buyoutClause';

export default function TeamTab({ league }: TeamTabProps) {
  const teamId = league.team.id;
  const leagueId = league.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['team', leagueId, teamId],
    queryFn: () => fantasyAPI.getTeamData(leagueId, teamId),
    enabled: !!teamId,
  });

  const { data: analysisData } = useQuery({
    queryKey: ['league-analysis', leagueId, teamId],
    queryFn: () => fantasyAPI.getLeagueAnalysis(leagueId, teamId),
    enabled: !!teamId,
  });
  const starterInfo: Record<string, StarterInfo> = analysisData?.analysis?.starterInfo || {};
  const signalsByPlayer: Record<string, import('../../types/fantasy').ExternalSignal[]> = analysisData?.analysis?.externalSignals || {};

  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('points');
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);

  const players = data?.players || [];

  const filteredPlayers = useMemo(() => {
    let list = [...players];

    if (positionFilter !== 'all') {
      list = list.filter((p) => getPositionName(p.playerMaster.positionId) === positionFilter);
    }

    if (statusFilter !== 'all') {
      list = list.filter((p) => p.playerMaster.playerStatus === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.playerMaster.nickname.toLowerCase().includes(q) ||
          p.playerMaster.name.toLowerCase().includes(q) ||
          p.playerMaster.team?.name.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      let valueA: number | string;
      let valueB: number | string;

      switch (sortKey) {
        case 'nickname':
          valueA = a.playerMaster.nickname;
          valueB = b.playerMaster.nickname;
          break;
        case 'position':
          valueA = a.playerMaster.positionId;
          valueB = b.playerMaster.positionId;
          break;
        case 'points':
          valueA = a.playerMaster.points || a.playerMaster.lastSeasonPoints || 0;
          valueB = b.playerMaster.points || b.playerMaster.lastSeasonPoints || 0;
          break;
        case 'marketValue':
          valueA = a.playerMaster.marketValue;
          valueB = b.playerMaster.marketValue;
          break;
        case 'buyoutClause':
          valueA = a.buyoutClause;
          valueB = b.buyoutClause;
          break;
        default:
          valueA = 0;
          valueB = 0;
      }

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDesc ? valueB.localeCompare(valueA) : valueA.localeCompare(valueB);
      }

      return sortDesc ? (valueB as number) - (valueA as number) : (valueA as number) - (valueB as number);
    });

    return list;
  }, [players, positionFilter, statusFilter, search, sortKey, sortDesc]);

  const positions = useMemo(
    () => Array.from(new Set(players.map((p) => getPositionName(p.playerMaster.positionId)))),
    [players],
  );

  const statuses = useMemo(
    () => Array.from(new Set(players.map((p) => p.playerMaster.playerStatus).filter(Boolean))),
    [players],
  );

  const filterConfig = [
    {
      key: 'position',
      label: 'Posición',
      value: positionFilter,
      onChange: setPositionFilter,
      options: [{ value: 'all', label: 'Todas' }, ...positions.map((p) => ({ value: p, label: p }))],
    },
    {
      key: 'status',
      label: 'Estado',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [{ value: 'all', label: 'Todos' }, ...statuses.map((s) => ({ value: s, label: s }))],
    },
  ];

  if (isLoading) return <TeamSkeleton />;
  if (error) return <ErrorState title="Error cargando plantilla" description={error.message} onRetry={refetch} />;

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <SectionHeader
        title="Mi Equipo"
        description="Plantilla completa con estado, valor y cláusulas."
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-muted-foreground" />
                Jugadores
              </CardTitle>
              <CardDescription>{filteredPlayers.length} de {players.length} jugadores</CardDescription>
            </div>
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar jugador, equipo…"
              filters={filterConfig}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]" />
                  <TableHead>Jugador</TableHead>
                  <TableHead>Posición</TableHead>
                  <TableHead>Estado</TableHead>
                  <SortableHead label="Puntos" sortKey="points" activeKey={sortKey} activeDesc={sortDesc} onSort={toggleSort} />
                  <SortableHead label="Valor mercado" sortKey="marketValue" activeKey={sortKey} activeDesc={sortDesc} onSort={toggleSort} />
                  <SortableHead label="Cláusula" sortKey="buyoutClause" activeKey={sortKey} activeDesc={sortDesc} onSort={toggleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <PlayerRow
                    key={player.playerTeamId}
                    player={player}
                    starter={starterInfo[player.playerMaster.id]}
                    onClick={() => setSelectedPlayer(player)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredPlayers.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay jugadores que coincidan con los filtros.
            </div>
          )}
        </CardContent>
      </Card>

      <PlayerDetailDialog
        player={selectedPlayer?.playerMaster || null}
        open={!!selectedPlayer}
        onOpenChange={(open) => !open && setSelectedPlayer(null)}
        buyoutClause={selectedPlayer?.buyoutClause}
        isShielded={selectedPlayer?.isShielded}
        starterInfo={selectedPlayer ? starterInfo[selectedPlayer.playerMaster.id] : undefined}
        signals={selectedPlayer ? signalsByPlayer[selectedPlayer.playerMaster.id] : undefined}
      />
    </div>
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  }
}

function PlayerRow({
  player,
  starter,
  onClick,
}: {
  player: TeamPlayer;
  starter?: StarterInfo;
  onClick: () => void;
}) {
  const p = player.playerMaster;
  const points = p.points || p.lastSeasonPoints || 0;
  const isShielded = player.isShielded;
  const posColor = positionBgClass(p.position || '', p.positionId);

  return (
    <TableRow onClick={onClick} className="cursor-pointer">
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
        <div className="flex flex-col gap-1">
          <PlayerStatusBadge status={p.playerStatus} />
          {starter && (
            <Badge
              variant={
                starter.score >= 0.8
                  ? 'success'
                  : starter.score >= 0.55
                  ? 'secondary'
                  : starter.score >= 0.35
                  ? 'warning'
                  : 'danger'
              }
              className="w-fit text-[10px]"
            >
              {starter.label}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4 font-display text-sm font-semibold text-foreground">{points}</TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <Currency value={p.marketValue} className="text-sm text-muted-foreground" />
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <div className="flex items-center gap-2">
          <Currency value={player.buyoutClause} className="text-sm" />
          {isShielded && <span className="text-[10px] text-muted-foreground">(B)</span>}
        </div>
      </TableCell>
    </TableRow>
  );
}

function SortableHead({
  label,
  sortKey,
  activeKey,
  activeDesc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  activeDesc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort(sortKey)}
        className="h-8 px-2 -ml-2 gap-1 font-medium"
      >
        {label}
        <ArrowUpDown
          className={`h-3.5 w-3.5 ${active ? 'text-foreground' : 'text-muted-foreground'}`}
          style={active ? { transform: activeDesc ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' } : undefined}
        />
      </Button>
    </TableHead>
  );
}

function TeamSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
