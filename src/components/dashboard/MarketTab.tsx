'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague, MarketPlayer, ExternalSignal } from '../../types/fantasy';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Slider } from '../ui/slider';
import { Toggle } from '../ui/toggle';
import DataTable, { DataTableSkeleton } from '../shared/DataTable';
import PlayerAvatar from '../shared/PlayerAvatar';
import PlayerStatusBadge from '../shared/PlayerStatusBadge';
import Currency from '../shared/Currency';
import PlayerDetailDialog from '../shared/PlayerDetailDialog';
import PlayerCard from '../shared/PlayerCard';
import ErrorState from '../shared/ErrorState';
import SectionHeader from '../shared/SectionHeader';
import SignalChips from '../shared/SignalChips';
import EmptyState from '../shared/EmptyState';
import FilterBar from '../shared/FilterBar';
import { ShoppingCart, TrendingDown, TrendingUp, Percent, Gavel, Table2, LayoutGrid, Users } from 'lucide-react';
import { positionShortName, positionBgClass, getPositionName, statusText } from '../../lib/format';
import { starterScoreFromLastSeason } from '../../lib/analysis/starter-score';
import { buildMarketOwnerMap, resolveMarketOwner } from '../../lib/fantasy/market-sellers';
import type { LeagueAnalysis } from '../../types/analysis';

interface MarketTabProps {
  league: FantasyLeague;
}

export default function MarketTab({ league }: MarketTabProps) {
  const leagueId = league.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['market', leagueId],
    queryFn: () => fantasyAPI.getMarket(leagueId),
    enabled: !!leagueId,
  });

  const teamId = league.team.id;
  const { data: analysisData } = useQuery({
    queryKey: ['league-analysis', leagueId, teamId],
    queryFn: () => fantasyAPI.getLeagueAnalysis(leagueId, teamId),
    enabled: !!leagueId && !!teamId,
  });
  const externalSignals: Record<string, ExternalSignal[]> = analysisData?.analysis?.externalSignals || {};
  const ownMoney: number = analysisData?.analysis?.money?.teamMoney ?? 0;

  const ownerMap = useMemo(() => {
    const analysis = analysisData?.analysis as LeagueAnalysis | undefined;
    if (!analysis?.teamData) return new Map<string, { teamId: number; teamName: string; managerName: string }>();
    return buildMarketOwnerMap(analysis.teamData, analysis.rivals || [], league.team.id);
  }, [analysisData, league.team.id]);

  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'official' | 'team'>('all');
  const [maxPrice, setMaxPrice] = useState<number>(100_000_000);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedPlayer, setSelectedPlayer] = useState<MarketPlayer | null>(null);

  const market = data || [];

  const filtered = useMemo(() => {
    let list = [...market];

    if (positionFilter !== 'all') {
      list = list.filter((m) => getPositionName(m.playerMaster.positionId) === positionFilter);
    }

    if (statusFilter !== 'all') {
      list = list.filter((m) => m.playerMaster.playerStatus === statusFilter);
    }

    if (ownerFilter !== 'all') {
      list = list.filter((m) => resolveMarketOwner(m, ownerMap).type === ownerFilter);
    }

    if (maxPrice < 100_000_000) {
      list = list.filter((m) => m.salePrice <= maxPrice);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => {
        const owner = resolveMarketOwner(m, ownerMap);
        return (
          m.playerMaster.nickname.toLowerCase().includes(q) ||
          m.playerMaster.name.toLowerCase().includes(q) ||
          m.playerMaster.team?.name.toLowerCase().includes(q) ||
          owner.label.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [market, positionFilter, statusFilter, ownerFilter, maxPrice, search, ownerMap]);

  const positions = useMemo(
    () => Array.from(new Set(market.map((m) => getPositionName(m.playerMaster.positionId)))),
    [market],
  );
  const statuses = useMemo(
    () => Array.from(new Set(market.map((m) => m.playerMaster.playerStatus).filter(Boolean))),
    [market],
  );

  const bargainsCount = useMemo(
    () =>
      market.filter((m) => {
        const diff = m.playerMaster.marketValue - m.salePrice;
        const pct = m.playerMaster.marketValue > 0 ? (diff / m.playerMaster.marketValue) * 100 : 0;
        return pct > 15;
      }).length,
    [market],
  );

  const avgPrice = useMemo(
    () => (market.length > 0 ? market.reduce((sum, m) => sum + m.salePrice, 0) / market.length : 0),
    [market],
  );

  const filters = [
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
      options: [{ value: 'all', label: 'Todos' }, ...statuses.map((s) => ({ value: s, label: statusText(s) }))],
    },
    {
      key: 'owner',
      label: 'Origen',
      value: ownerFilter,
      onChange: (value: string) => setOwnerFilter(value as 'all' | 'official' | 'team'),
      options: [
        { value: 'all', label: 'Todos' },
        { value: 'official', label: 'Mercado oficial' },
        { value: 'team', label: 'En venta por equipo' },
      ],
    },
  ];

  const columns = useMemo<ColumnDef<MarketPlayer>[]>(
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
        cell: ({ row }) => {
          const p = row.original.playerMaster;
          const signals = externalSignals[p.id];
          const owner = resolveMarketOwner(row.original, ownerMap);
          return (
            <div className="min-w-0">
              <div className="truncate font-semibold text-content">{p.nickname}</div>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-content-tertiary">
                {p.team?.name && <span className="truncate">{p.team.name}</span>}
                <span className={owner.type === 'team' ? 'text-caution-text' : 'text-positive-text'}>{owner.label}</span>
              </div>
              {signals && signals.length > 0 && <SignalChips signals={signals} max={2} />}
            </div>
          );
        },
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
          const starterScore = starterScoreFromLastSeason(row.original.playerMaster.lastSeasonPoints);
          return (
            <div className="flex flex-col gap-1">
              <PlayerStatusBadge status={row.original.playerMaster.playerStatus} />
              <Badge
                variant={
                  starterScore >= 0.8
                    ? 'success'
                    : starterScore >= 0.55
                    ? 'secondary'
                    : starterScore >= 0.35
                    ? 'warning'
                    : 'danger'
                }
                className="w-fit text-[10px]"
              >
                {starterLabel(starterScore)}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'salePrice',
        header: 'Precio',
        cell: ({ row }) => <Currency value={row.original.salePrice} className="font-semibold" />,
      },
      {
        accessorKey: 'playerMaster.marketValue',
        header: 'Valor mercado',
        meta: { headerClassName: 'hidden md:table-cell', cellClassName: 'hidden md:table-cell' },
        cell: ({ row }) => <Currency value={row.original.playerMaster.marketValue} className="text-content-tertiary" />,
      },
      {
        accessorKey: 'numberOfBids',
        header: 'Pujas',
        meta: { headerClassName: 'hidden lg:table-cell', cellClassName: 'hidden lg:table-cell' },
        cell: ({ row }) => (
          <Badge variant={row.original.numberOfBids > 0 ? 'muted' : 'secondary'} className="font-normal">
            {row.original.numberOfBids} {row.original.numberOfBids === 1 ? 'puja' : 'pujas'}
          </Badge>
        ),
      },
      {
        id: 'diff',
        header: 'Diferencial',
        accessorFn: (row) => row.playerMaster.marketValue - row.salePrice,
        meta: { headerClassName: 'hidden lg:table-cell', cellClassName: 'hidden lg:table-cell' },
        cell: ({ row }) => {
          const diff = row.original.playerMaster.marketValue - row.original.salePrice;
          const diffPercent = row.original.playerMaster.marketValue > 0
            ? (diff / row.original.playerMaster.marketValue) * 100
            : 0;
          const isBargain = diffPercent > 15;
          const isOverpriced = diffPercent < -15;
          const canAfford = row.original.salePrice <= ownMoney;

          return (
            <div className="flex items-center gap-2">
              {isBargain ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-positive-text">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <Percent className="h-3 w-3" />
                  {Math.abs(diffPercent).toFixed(0)}%
                </div>
              ) : isOverpriced ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-negative-text">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <Percent className="h-3 w-3" />
                  {Math.abs(diffPercent).toFixed(0)}%
                </div>
              ) : (
                <span className="text-xs text-content-tertiary">Ajustado</span>
              )}
              {canAfford && (
                <Badge variant="success" className="text-[10px]">
                  <Gavel className="mr-1 h-3 w-3" /> A tu alcance
                </Badge>
              )}
            </div>
          );
        },
      },
    ],
    [externalSignals, ownMoney, ownerMap],
  );

  if (isLoading) return <MarketSkeleton />;
  if (error) return (
      <ErrorState
        title="No hemos podido leer el mercado"
        description="El mercado se renueva cada 24 h y la API a veces tarda en responder durante ese cambio. Reintenta en unos segundos."
        detail={error.message}
        onRetry={refetch}
      />
    );

  return (
    <div className="space-y-6">
      <SectionHeader
        as="h1"
        eyebrow="Mercado"
        title="Quién está en venta ahora"
        description={`${market.length} jugadores disponibles en ${league.name}. El mercado se renueva cada 24 h.`}
        action={
          <Toggle
            pressed={viewMode === 'table'}
            onPressedChange={(pressed) => setViewMode(pressed ? 'table' : 'cards')}
            aria-label="Cambiar vista"
            className="gap-2"
          >
            {viewMode === 'table' ? <Table2 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            {viewMode === 'table' ? 'Tabla' : 'Tarjetas'}
          </Toggle>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-white/[0.09] bg-surface-raised p-4">
          <div className="flex items-center gap-2 text-xs text-content-tertiary">
            <Users className="h-4 w-4" />
            En venta
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-content">{market.length}</div>
        </div>
        <div className="rounded-lg border border-white/[0.09] bg-surface-raised p-4">
          <div className="flex items-center gap-2 text-xs text-content-tertiary">
            <ShoppingCart className="h-4 w-4" />
            Precio medio
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-content">
            <Currency value={Math.round(avgPrice)} />
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.09] bg-surface-raised p-4">
          <div className="flex items-center gap-2 text-xs text-content-tertiary">
            <TrendingDown className="h-4 w-4" />
            Oportunidades
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-content">{bargainsCount}</div>
        </div>
        <div className="rounded-lg border border-white/[0.09] bg-surface-raised p-4">
          <div className="flex items-center gap-2 text-xs text-content-tertiary">
            <Gavel className="h-4 w-4" />
            A tu alcance
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-content">
            {market.filter((m) => m.salePrice <= ownMoney).length}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-white/[0.09] bg-surface-raised p-4">
          <div className="flex items-center gap-2 text-xs text-positive-text">
            <Users className="h-4 w-4" />
            Mercado oficial
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-content">
            {market.filter((m) => resolveMarketOwner(m, ownerMap).type === 'official').length}
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.09] bg-surface-raised p-4">
          <div className="flex items-center gap-2 text-xs text-caution-text">
            <ShoppingCart className="h-4 w-4" />
            En venta por equipo
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-content">
            {market.filter((m) => resolveMarketOwner(m, ownerMap).type === 'team').length}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4 text-content-tertiary" />
                Jugadores en venta
              </CardTitle>
              <CardDescription>{filtered.length} coinciden con los filtros</CardDescription>
            </div>
            <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[280px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-content-tertiary">Precio máximo</span>
                <span className="text-xs font-semibold text-content">
                  {maxPrice >= 100_000_000 ? 'Sin límite' : <Currency value={maxPrice} />}
                </span>
              </div>
              <Slider
                value={[maxPrice]}
                onValueChange={(v) => setMaxPrice(v[0])}
                min={1_000_000}
                max={100_000_000}
                step={1_000_000}
                className="w-full"
              />
            </div>
          </div>
          <div className="mt-4">
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar jugador, equipo…"
              filters={filters}
            />
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
            <DataTable
              columns={columns}
              data={filtered}
              onRowClick={setSelectedPlayer}
              emptyMessage="No hay jugadores en el mercado que coincidan con tus filtros."
              pageSize={10}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              compact
              title="No hay jugadores en el mercado"
              description="Actualmente no hay jugadores en venta que coincidan con tus filtros."
            />
          ) : (
            /* Igual que en Plantilla: el mercado se filtra y se ordena, así
               que no hay un «primero» que la cascada pueda subrayar. Entra con
               la sección y punto. */
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
              {filtered.map((marketPlayer) => (
                <PlayerCard
                  key={marketPlayer.id}
                  player={marketPlayer.playerMaster}
                  onClick={() => setSelectedPlayer(marketPlayer)}
                  highlight={marketPlayer.salePrice <= ownMoney}
                  owner={resolveMarketOwner(marketPlayer, ownerMap)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PlayerDetailDialog
        player={selectedPlayer?.playerMaster || null}
        open={!!selectedPlayer}
        onOpenChange={(open) => !open && setSelectedPlayer(null)}
        signals={selectedPlayer ? externalSignals[selectedPlayer.playerMaster.id] : undefined}
        marketPlayer={selectedPlayer || undefined}
        league={league}
        onActionSuccess={refetch}
      />
    </div>
  );
}

function starterLabel(score: number): string {
  if (score >= 0.8) return 'Titular';
  if (score >= 0.55) return 'Habitual';
  if (score >= 0.35) return 'Rotación';
  return 'Suplente';
}

function MarketSkeleton() {
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
