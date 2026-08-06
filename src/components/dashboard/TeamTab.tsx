'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague, TeamPlayer } from '../../types/fantasy';
import type { StarterInfo } from '../../types/analysis';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import DataTable, { DataTableSkeleton } from '../shared/DataTable';
import PlayerAvatar from '../shared/PlayerAvatar';
import PlayerStatusBadge from '../shared/PlayerStatusBadge';
import Currency from '../shared/Currency';
import PlayerDetailDialog from '../shared/PlayerDetailDialog';
import PlayerCard from '../shared/PlayerCard';
import ErrorState from '../shared/ErrorState';
import SectionHeader from '../shared/SectionHeader';
import FilterBar from '../shared/FilterBar';
import { Toggle } from '../ui/toggle';
import { LayoutGrid, Table2, Users } from 'lucide-react';
import { positionShortName, positionBgClass, getPositionName } from '../../lib/format';
import { StaggerContainer, StaggerItem } from '../ui/motion';
import { useDensity } from '../../hooks/useDensity';

interface TeamTabProps {
  league: FantasyLeague;
}

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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const { dense } = useDensity();

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

    return list;
  }, [players, positionFilter, statusFilter, search]);

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

  const columns = useMemo<ColumnDef<TeamPlayer>[]>(
    () => [
      {
        id: 'avatar',
        header: '',
        cell: ({ row }) => <PlayerAvatar player={row.original.playerMaster} size="md" showPosition />,
        enableSorting: false,
        size: 70,
      },
      {
        accessorKey: 'playerMaster.nickname',
        header: 'Jugador',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-foreground">{row.original.playerMaster.nickname}</div>
            <div className="text-xs text-muted-foreground">{row.original.playerMaster.team?.name || 'Sin equipo'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'playerMaster.positionId',
        header: 'Posición',
        meta: { headerClassName: 'hidden sm:table-cell', cellClassName: 'hidden sm:table-cell' },
        cell: ({ row }) => {
          const p = row.original.playerMaster;
          const posColor = positionBgClass(p.position || '', p.positionId);
          return (
            <Badge variant="secondary" className={`border-0 text-[10px] text-white ${posColor}`}>
              {positionShortName(p.position, p.positionId)}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'playerMaster.playerStatus',
        header: 'Estado',
        meta: { headerClassName: 'hidden md:table-cell', cellClassName: 'hidden md:table-cell' },
        cell: ({ row }) => {
          const starter = starterInfo[row.original.playerMaster.id];
          return (
            <div className="flex flex-col gap-1">
              <PlayerStatusBadge status={row.original.playerMaster.playerStatus} />
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
          );
        },
      },
      {
        accessorKey: 'playerMaster.points',
        header: 'Puntos',
        cell: ({ row }) => (
          <span className="font-display text-sm font-semibold text-foreground">
            {row.original.playerMaster.points || row.original.playerMaster.lastSeasonPoints || 0}
          </span>
        ),
      },
      {
        accessorKey: 'playerMaster.marketValue',
        header: 'Valor mercado',
        meta: { headerClassName: 'hidden md:table-cell', cellClassName: 'hidden md:table-cell' },
        cell: ({ row }) => <Currency value={row.original.playerMaster.marketValue} className="text-sm text-muted-foreground" />,
      },
      {
        accessorKey: 'buyoutClause',
        header: 'Cláusula',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Currency value={row.original.buyoutClause} className="text-sm" />
            {row.original.isShielded && <span className="text-[10px] text-muted-foreground">(B)</span>}
          </div>
        ),
      },
    ],
    [starterInfo],
  );

  if (isLoading) return <TeamSkeleton />;
  if (error) return <ErrorState title="Error cargando plantilla" description={error.message} onRetry={refetch} />;

  const totalValue = players.reduce((sum, p) => sum + p.playerMaster.marketValue, 0);
  const totalPoints = players.reduce((sum, p) => sum + (p.playerMaster.points || p.playerMaster.lastSeasonPoints || 0), 0);
  const healthyCount = players.filter((p) => p.playerMaster.playerStatus === 'ok').length;

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <SectionHeader
        title="Mi Equipo"
        description="Plantilla completa con estado, valor y cláusulas."
        action={
          <div className="flex items-center gap-2">
            <Toggle
              pressed={viewMode === 'table'}
              onPressedChange={(pressed) => setViewMode(pressed ? 'table' : 'cards')}
              aria-label="Cambiar vista"
              className="gap-2"
            >
              {viewMode === 'table' ? <Table2 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              {viewMode === 'table' ? 'Tabla' : 'Tarjetas'}
            </Toggle>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-surface-2 p-4">
          <div className="text-xs text-muted-foreground">Jugadores</div>
          <div className="mt-2 text-2xl font-bold font-display text-foreground">{players.length}</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-surface-2 p-4">
          <div className="text-xs text-muted-foreground">Disponibles</div>
          <div className="mt-2 text-2xl font-bold font-display text-foreground">{healthyCount}</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-surface-2 p-4">
          <div className="text-xs text-muted-foreground">Valor total</div>
          <div className="mt-2 text-2xl font-bold font-display text-foreground">
            <Currency value={totalValue} />
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-surface-2 p-4">
          <div className="text-xs text-muted-foreground">Puntos totales</div>
          <div className="mt-2 text-2xl font-bold font-display text-foreground">{totalPoints}</div>
        </div>
      </div>

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
        <CardContent>
          {viewMode === 'table' ? (
            <DataTable
              columns={columns}
              data={filteredPlayers}
              onRowClick={setSelectedPlayer}
              emptyMessage="No hay jugadores que coincidan con los filtros."
              pageSize={10}
              dense={dense}
            />
          ) : (
            <StaggerContainer className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3" stagger={0.03}>
              {filteredPlayers.map((player) => (
                <StaggerItem key={player.playerTeamId}>
                  <PlayerCard
                    player={player.playerMaster}
                    buyoutClause={player.buyoutClause}
                    isShielded={player.isShielded}
                    onClick={() => setSelectedPlayer(player)}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
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
}

function TeamSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-10 w-full" />
      <DataTableSkeleton rows={8} />
    </div>
  );
}
