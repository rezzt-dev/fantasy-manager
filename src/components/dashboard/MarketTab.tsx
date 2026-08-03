'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague, MarketPlayer, ExternalSignal, PlayerMaster } from '../../types/fantasy';
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
import SignalChips from '../shared/SignalChips';
import FilterBar from '../shared/FilterBar';
import EmptyState from '../shared/EmptyState';
import { ShoppingCart, ArrowUpDown, TrendingDown, TrendingUp, Percent, Gavel } from 'lucide-react';
import { positionShortName, positionBgClass, getPositionName, statusText } from '../../lib/format';
import { starterScoreFromLastSeason } from '../../lib/analysis/starter-score';

interface MarketTabProps {
  league: FantasyLeague;
}

type SortKey = 'salePrice' | 'numberOfBids' | 'marketValue' | 'diff';

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

  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('salePrice');
  const [sortDesc, setSortDesc] = useState(true);
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

    if (priceRange !== 'all') {
      list = list.filter((m) => {
        if (priceRange === 'under-5m') return m.salePrice < 5_000_000;
        if (priceRange === '5m-15m') return m.salePrice >= 5_000_000 && m.salePrice <= 15_000_000;
        if (priceRange === 'over-15m') return m.salePrice > 15_000_000;
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.playerMaster.nickname.toLowerCase().includes(q) ||
          m.playerMaster.name.toLowerCase().includes(q) ||
          m.playerMaster.team?.name.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      let valueA: number;
      let valueB: number;
      switch (sortKey) {
        case 'salePrice':
          valueA = a.salePrice;
          valueB = b.salePrice;
          break;
        case 'numberOfBids':
          valueA = a.numberOfBids ?? 0;
          valueB = b.numberOfBids ?? 0;
          break;
        case 'marketValue':
          valueA = a.playerMaster.marketValue;
          valueB = b.playerMaster.marketValue;
          break;
        case 'diff':
          valueA = a.playerMaster.marketValue - a.salePrice;
          valueB = b.playerMaster.marketValue - b.salePrice;
          break;
        default:
          valueA = 0;
          valueB = 0;
      }
      return sortDesc ? valueB - valueA : valueA - valueB;
    });

    return list;
  }, [market, positionFilter, statusFilter, priceRange, search, sortKey, sortDesc]);

  const positions = useMemo(
    () => Array.from(new Set(market.map((m) => getPositionName(m.playerMaster.positionId)))),
    [market],
  );
  const statuses = useMemo(
    () => Array.from(new Set(market.map((m) => m.playerMaster.playerStatus).filter(Boolean))),
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
      key: 'price',
      label: 'Precio',
      value: priceRange,
      onChange: setPriceRange,
      options: [
        { value: 'all', label: 'Cualquiera' },
        { value: 'under-5m', label: '< 5M€' },
        { value: '5m-15m', label: '5M€ - 15M€' },
        { value: 'over-15m', label: '> 15M€' },
      ],
    },
  ];

  if (isLoading) return <MarketSkeleton />;
  if (error) return <ErrorState title="Error cargando mercado" description={error.message} onRetry={refetch} />;

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <SectionHeader
        title="Mercado"
        description={`${market.length} jugadores en venta en ${league.name}`}
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                Jugadores en venta
              </CardTitle>
              <CardDescription>{filtered.length} coinciden con los filtros</CardDescription>
            </div>
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar jugador, equipo…"
              filters={filters}
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
                  <SortableHead label="Precio" sortKey="salePrice" activeKey={sortKey} activeDesc={sortDesc} onSort={toggleSort} />
                  <SortableHead label="Valor mercado" sortKey="marketValue" activeKey={sortKey} activeDesc={sortDesc} onSort={toggleSort} />
                  <SortableHead label="Pujas" sortKey="numberOfBids" activeKey={sortKey} activeDesc={sortDesc} onSort={toggleSort} />
                  <SortableHead label="Diferencial" sortKey="diff" activeKey={sortKey} activeDesc={sortDesc} onSort={toggleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((marketPlayer) => (
                  <MarketRow
                    key={marketPlayer.id}
                    marketPlayer={marketPlayer}
                    signals={externalSignals[marketPlayer.playerMaster.id]}
                    ownMoney={ownMoney}
                    onClick={() => setSelectedPlayer(marketPlayer)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length === 0 && (
            <div className="p-8">
              <EmptyState
                compact
                title="No hay jugadores en el mercado"
                description="Actualmente no hay jugadores en venta que coincidan con tus filtros."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <PlayerDetailDialog
        player={selectedPlayer?.playerMaster || null}
        open={!!selectedPlayer}
        onOpenChange={(open) => !open && setSelectedPlayer(null)}
        signals={selectedPlayer ? externalSignals[selectedPlayer.playerMaster.id] : undefined}
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

function MarketRow({
  marketPlayer,
  signals,
  ownMoney,
  onClick,
}: {
  marketPlayer: MarketPlayer;
  signals?: ExternalSignal[];
  ownMoney: number;
  onClick: () => void;
}) {
  const p = marketPlayer.playerMaster;
  const diff = p.marketValue - marketPlayer.salePrice;
  const diffPercent = p.marketValue > 0 ? (diff / p.marketValue) * 100 : 0;
  const isBargain = diffPercent > 15;
  const isOverpriced = diffPercent < -15;
  const posColor = positionBgClass(p.position || '', p.positionId);
  const starterScore = starterScoreFromLastSeason(p.lastSeasonPoints);
  const canAfford = marketPlayer.salePrice <= ownMoney;

  return (
    <TableRow onClick={onClick} className="cursor-pointer">
      <TableCell className="py-2 px-2 sm:px-4">
        <PlayerAvatar player={p} size="md" showPosition />
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <div className="font-semibold text-foreground">{p.nickname}</div>
        <div className="text-xs text-muted-foreground">{p.team?.name || 'Sin equipo'}</div>
        {signals && signals.length > 0 && <SignalChips signals={signals} max={2} />}
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <Badge variant="secondary" className={`font-display font-bold tracking-wide text-white ${posColor} border-0`}>
          {positionShortName(p.position, p.positionId)}
        </Badge>
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <div className="flex flex-col gap-1">
          <PlayerStatusBadge status={p.playerStatus} />
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
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <Currency value={marketPlayer.salePrice} className="font-semibold" />
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <Currency value={p.marketValue} className="text-muted-foreground" />
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <Badge variant={marketPlayer.numberOfBids > 0 ? 'muted' : 'secondary'} className="font-normal">
          {marketPlayer.numberOfBids} {marketPlayer.numberOfBids === 1 ? 'puja' : 'pujas'}
        </Badge>
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        {isBargain ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <TrendingDown className="h-3.5 w-3.5" />
            <Percent className="h-3 w-3" />
            {Math.abs(diffPercent).toFixed(0)}%
          </div>
        ) : isOverpriced ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
            <TrendingUp className="h-3.5 w-3.5" />
            <Percent className="h-3 w-3" />
            {Math.abs(diffPercent).toFixed(0)}%
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Ajustado</span>
        )}
        {canAfford && (
          <Badge variant="success" className="ml-2 text-[10px]">
            <Gavel className="mr-1 h-3 w-3" /> A tu alcance
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

function starterLabel(score: number): string {
  if (score >= 0.8) return 'Titular';
  if (score >= 0.55) return 'Habitual';
  if (score >= 0.35) return 'Rotación';
  return 'Suplente';
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
      <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 gap-1 font-medium" onClick={() => onSort(sortKey)}>
        {label}
        <ArrowUpDown
          className={`h-3.5 w-3.5 ${active ? 'text-foreground' : 'text-muted-foreground'}`}
          style={active ? { transform: activeDesc ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' } : undefined}
        />
      </Button>
    </TableHead>
  );
}

function MarketSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}
