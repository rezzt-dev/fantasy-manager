'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague } from '../../types/fantasy';
import type { ClauseCombo, ClauseTarget, ClauseVerdict, OwnerExposure, UpcomingClauseTarget } from '../../types/analysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Slider } from '../ui/slider';
import { Toggle } from '../ui/toggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import DataTable from '../shared/DataTable';
import PlayerAvatar from '../shared/PlayerAvatar';
import PlayerStatusBadge from '../shared/PlayerStatusBadge';
import PlayerDetailDialog from '../shared/PlayerDetailDialog';
import FixtureChip from '../shared/FixtureChip';
import SignalChips from '../shared/SignalChips';
import Currency from '../shared/Currency';
import SectionHeader from '../shared/SectionHeader';
import EmptyState from '../shared/EmptyState';
import ErrorState from '../shared/ErrorState';
import FilterBar from '../shared/FilterBar';
import KpiCard from '../shared/KpiCard';
import LoadingSection from '../shared/LoadingSection';
import { StaggerContainer, StaggerItem } from '../ui/motion';
import { cn } from '../../lib/utils';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  Crosshair,
  Flame,
  Gavel,
  Info,
  Layers,
  Lock,
  PiggyBank,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

interface ClauseMarketTabProps {
  league: FantasyLeague;
}

const VERDICT_META: Record<ClauseVerdict, { label: string; variant: 'success' | 'muted' | 'warning' | 'danger'; hint: string }> = {
  top: { label: 'Objetivo top', variant: 'success', hint: 'Encaja de lleno: mejora tu once a un precio razonable.' },
  good: { label: 'Buena opción', variant: 'muted', hint: 'Aporta valor, aunque no es un salto decisivo.' },
  situational: { label: 'Situacional', variant: 'warning', hint: 'Solo si cubres una necesidad concreta o piensas a largo plazo.' },
  avoid: { label: 'No interesa', variant: 'danger', hint: 'Hoy no compensa: no mejora tu once o tiene demasiado riesgo.' },
};

export default function ClauseMarketTab({ league }: ClauseMarketTabProps) {
  const leagueId = league.id;
  const teamId = league.team.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clause-market', leagueId, teamId],
    queryFn: () => fantasyAPI.getClauseMarket(leagueId, teamId),
    enabled: !!leagueId && !!teamId,
  });

  const clauseMarket = data?.clauseMarket;
  const targets = useMemo(() => clauseMarket?.targets ?? [], [clauseMarket]);

  const [selected, setSelected] = useState<ClauseTarget | null>(null);
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [verdictFilter, setVerdictFilter] = useState('all');
  const [onlyAffordable, setOnlyAffordable] = useState(true);
  const [onlyUpgrades, setOnlyUpgrades] = useState(false);
  const [maxClause, setMaxClause] = useState<number | null>(null);

  const clauseCeiling = useMemo(
    () => (targets.length > 0 ? Math.max(...targets.map((t) => t.clause)) : 0),
    [targets],
  );
  const effectiveMaxClause = maxClause ?? clauseCeiling;

  const positions = useMemo(() => Array.from(new Set(targets.map((t) => t.positionName))), [targets]);
  const owners = useMemo(() => Array.from(new Set(targets.map((t) => t.owner.managerName))), [targets]);

  const filtered = useMemo(() => {
    let list = [...targets];
    if (positionFilter !== 'all') list = list.filter((t) => t.positionName === positionFilter);
    if (ownerFilter !== 'all') list = list.filter((t) => t.owner.managerName === ownerFilter);
    if (verdictFilter !== 'all') list = list.filter((t) => t.verdict === verdictFilter);
    if (onlyAffordable) list = list.filter((t) => t.affordable);
    if (onlyUpgrades) list = list.filter((t) => t.xiGain > 0);
    if (clauseCeiling > 0 && effectiveMaxClause < clauseCeiling) list = list.filter((t) => t.clause <= effectiveMaxClause);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.player.nickname.toLowerCase().includes(q) ||
          t.player.name?.toLowerCase().includes(q) ||
          t.player.team?.name?.toLowerCase().includes(q) ||
          t.owner.managerName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [targets, positionFilter, ownerFilter, verdictFilter, onlyAffordable, onlyUpgrades, effectiveMaxClause, clauseCeiling, search]);

  const columns = useMemo<ColumnDef<ClauseTarget>[]>(
    () => [
      {
        id: 'avatar',
        header: '',
        cell: ({ row }) => <PlayerAvatar player={row.original.player} size="md" showPosition />,
        enableSorting: false,
        size: 70,
      },
      {
        id: 'player',
        header: 'Jugador',
        accessorFn: (row) => row.player.nickname,
        cell: ({ row }) => {
          const target = row.original;
          return (
            <div className="min-w-0">
              <div className="truncate font-semibold text-content">{target.player.nickname}</div>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-content-tertiary">
                {target.player.team?.name && <span className="truncate">{target.player.team.name}</span>}
                <span className="truncate text-caution-text">{target.owner.managerName}</span>
              </div>
              {target.fixture && <FixtureChip fixture={target.fixture} className="mt-1" />}
            </div>
          );
        },
      },
      {
        id: 'clause',
        header: 'Cláusula',
        accessorFn: (row) => row.clause,
        cell: ({ row }) => {
          const target = row.original;
          const discount = Math.round((1 - target.clauseRatio) * 100);
          return (
            <div className="space-y-1">
              <Currency value={target.clause} className="font-semibold text-content" />
              <div className="flex items-center gap-1.5">
                {discount >= 5 ? (
                  <Badge variant="success" className="text-[10px]">
                    <TrendingDown className="mr-1 h-3 w-3" />-{discount}% s/ valor
                  </Badge>
                ) : discount <= -20 ? (
                  <Badge variant="danger" className="text-[10px]">
                    <TrendingUp className="mr-1 h-3 w-3" />+{Math.abs(discount)}% s/ valor
                  </Badge>
                ) : (
                  <span className="text-[11px] text-content-tertiary">Ajustada a su valor</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: 'xp',
        header: 'xP jornada',
        accessorFn: (row) => row.expectedPoints,
        meta: { headerClassName: 'hidden md:table-cell', cellClassName: 'hidden md:table-cell' },
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-display text-base font-bold text-content">{row.original.expectedPoints.toFixed(1)}</div>
            <div className="text-[11px] text-content-tertiary">{row.original.starterLabel}</div>
          </div>
        ),
      },
      {
        id: 'xiGain',
        header: 'Δ Once',
        accessorFn: (row) => row.xiGain,
        cell: ({ row }) => {
          const target = row.original;
          return (
            <div className="space-y-0.5">
              <div className={cn('font-display text-base font-bold', target.xiGain > 0 ? 'text-positive-text' : 'text-content-tertiary')}>
                {target.xiGain > 0 ? `+${target.xiGain.toFixed(1)}` : '—'}
              </div>
              {target.replaces && (
                <div className="truncate text-[11px] text-content-tertiary">por {target.replaces.nickname}</div>
              )}
            </div>
          );
        },
      },
      {
        id: 'fit',
        header: 'Encaje',
        accessorFn: (row) => row.fitScore,
        cell: ({ row }) => <FitBar value={row.original.fitScore} verdict={row.original.verdict} />,
      },
      {
        id: 'urgency',
        header: 'Urgencia',
        accessorFn: (row) => row.urgency,
        meta: { headerClassName: 'hidden lg:table-cell', cellClassName: 'hidden lg:table-cell' },
        cell: ({ row }) => <UrgencyBadge target={row.original} />,
      },
      {
        id: 'affordable',
        header: 'Presupuesto',
        accessorFn: (row) => (row.affordable ? 1 : 0),
        meta: { headerClassName: 'hidden sm:table-cell', cellClassName: 'hidden sm:table-cell' },
        cell: ({ row }) => {
          const target = row.original;
          if (target.affordable) {
            return (
              <Badge variant="success" className="text-[10px]">
                <CheckCircle2 className="mr-1 h-3 w-3" /> A tu alcance
              </Badge>
            );
          }
          return (
            <div className="space-y-1">
              <Badge variant="outline-muted" className="text-[10px]">
                Faltan <Currency value={target.missingBudget} className="ml-1" />
              </Badge>
              {target.funding?.feasible && (
                <div className="text-[11px] text-positive-text">Financiable vendiendo {target.funding.players.length}</div>
              )}
            </div>
          );
        },
      },
    ],
    [],
  );

  if (isLoading) return <LoadingSection titleWidth="w-56" cardCount={4} rows={6} />;
  if (error) return (
      <ErrorState
        title="No hemos podido leer las cláusulas de tu liga"
        description="El cálculo de clausulazos necesita el catálogo de jugadores y las plantillas de tus rivales. Reintenta; si insiste, prueba dentro de unos minutos."
        detail={error.message}
        onRetry={refetch}
      />
    );
  if (!clauseMarket) {
    return <EmptyState
        icon={<Gavel />}
        title="No hay nada que clausular"
        description="Ahora mismo ningún jugador de tus rivales está fuera de su periodo de protección. Los blindajes duran unos días desde el fichaje."
      />;
  }

  if (!clauseMarket.enabled) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Clausulazos" description="Cláusulas de rescisión de los equipos de tu liga." />
        <EmptyState
          icon={<Lock className="h-6 w-6" />}
          title="Cláusulas desactivadas en esta liga"
          description="El administrador no ha activado la cláusula de rescisión, así que no se pueden hacer clausulazos."
        />
      </div>
    );
  }

  const { budget, stats, recommended, combos, upcoming, owners: exposures, baseline, notes } = clauseMarket;

  return (
    <div className="space-y-6">
      <SectionHeader
        as="h1"
        eyebrow={`Clausulazos · jornada ${data?.week ?? '—'}`}
        title="A quién puedes robarle un jugador hoy"
        description={`${stats.available} jugadores rivales tienen la cláusula libre y ${stats.affordable} entran en tu presupuesto. Ordenados por lo que mejorarían tu once.`}
        action={
          <Badge variant="outline-muted" className="gap-1.5">
            <Sparkles className="h-3 w-3" />
            Mejor once actual: {baseline.expectedPoints.toFixed(1)} pts ({baseline.formation.replace(/,/g, '-')})
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Presupuesto"
          value={budget.available / 1_000_000}
          suffix=" M€"
          sub={`${formatMillions(budget.cash)} en caja + ${formatMillions(budget.teamValueBonus)} de crédito`}
        />
        <KpiCard
          icon={<Crosshair className="h-4 w-4" />}
          label="Clausulables"
          value={stats.available}
          sub={`${stats.locked} bloqueados · ${stats.shielded} blindados`}
        />
        <KpiCard
          icon={<Gavel className="h-4 w-4" />}
          label="A tu alcance"
          value={stats.affordable}
          sub={stats.cheapestAffordable !== null ? `Desde ${formatMillions(stats.cheapestAffordable)}` : 'Ninguno entra en tu presupuesto'}
        />
        <KpiCard
          icon={<Zap className="h-4 w-4" />}
          label="Mejor mejora del once"
          value={stats.bestXiGain}
          suffix=" pts"
          sub={recommended[0] ? `Con ${recommended[0].player.nickname}` : 'Sin objetivos que mejoren tu once'}
        />
      </div>

      {recommended.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-content-tertiary" />
            <h3 className="font-display text-base font-semibold text-content">Recomendados para tu equipo</h3>
            <Badge variant="outline-muted" className="text-[10px]">
              Ordenados por encaje
            </Badge>
          </div>
          {/* La etiqueta lo dice: «ordenados por encaje». La cascada es la
              versión temporal de ese mismo orden —el primero que aparece es el
              que más mejora el once— y por eso aquí sí se escalona. */}
          <StaggerContainer className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3" tone="base" count={recommended.length}>
            {recommended.map((target) => (
              <StaggerItem key={target.playerId}>
                <TargetCard target={target} onSelect={() => setSelected(target)} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      ) : (
        <EmptyState
          compact
          icon={<Crosshair className="h-5 w-5" />}
          title="Ningún clausulazo compensa hoy"
          description="Ninguna cláusula libre a tu alcance mejora tu once. Revisa la pestaña Próximamente o sube tu presupuesto vendiendo."
        />
      )}

      <Tabs defaultValue="targets">
        <TabsList variant="underline" className="flex-wrap">
          <TabsTrigger value="targets">Objetivos ({targets.length})</TabsTrigger>
          <TabsTrigger value="combos">Combos ({combos.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Próximamente ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="owners">Por rival ({exposures.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="targets" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gavel className="h-4 w-4 text-content-tertiary" />
                    Jugadores clausulables
                  </CardTitle>
                  <CardDescription>{filtered.length} coinciden con tus filtros</CardDescription>
                </div>
                <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[300px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-content-tertiary">Cláusula máxima</span>
                    <span className="text-xs font-semibold text-content">
                      {effectiveMaxClause >= clauseCeiling ? 'Sin límite' : <Currency value={effectiveMaxClause} />}
                    </span>
                  </div>
                  <Slider
                    value={[effectiveMaxClause]}
                    onValueChange={(v) => setMaxClause(v[0])}
                    min={Math.min(1_000_000, clauseCeiling)}
                    max={Math.max(clauseCeiling, 1_000_000)}
                    step={500_000}
                    className="w-full"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Toggle pressed={onlyAffordable} onPressedChange={setOnlyAffordable} className="h-8 gap-1.5 text-xs">
                      <Coins className="h-3.5 w-3.5" /> Solo a mi alcance
                    </Toggle>
                    <Toggle pressed={onlyUpgrades} onPressedChange={setOnlyUpgrades} className="h-8 gap-1.5 text-xs">
                      <Zap className="h-3.5 w-3.5" /> Solo mejoras del once
                    </Toggle>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <FilterBar
                  search={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Buscar jugador, equipo o manager…"
                  filters={[
                    {
                      key: 'position',
                      label: 'Posición',
                      value: positionFilter,
                      onChange: setPositionFilter,
                      options: [{ value: 'all', label: 'Todas' }, ...positions.map((p) => ({ value: p, label: p }))],
                    },
                    {
                      key: 'owner',
                      label: 'Propietario',
                      value: ownerFilter,
                      onChange: setOwnerFilter,
                      options: [{ value: 'all', label: 'Todos' }, ...owners.map((o) => ({ value: o, label: o }))],
                    },
                    {
                      key: 'verdict',
                      label: 'Veredicto',
                      value: verdictFilter,
                      onChange: setVerdictFilter,
                      options: [
                        { value: 'all', label: 'Todos' },
                        ...(Object.keys(VERDICT_META) as ClauseVerdict[]).map((v) => ({ value: v, label: VERDICT_META[v].label })),
                      ],
                    },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filtered}
                onRowClick={setSelected}
                emptyMessage="Ningún jugador clausulable coincide con tus filtros."
                pageSize={10}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="combos" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-content-tertiary" />
                Combos dentro del presupuesto
              </CardTitle>
              <CardDescription>
                Varios clausulazos a la vez. La mejora es conjunta: dos fichajes de la misma posición no suman sus ΔxP.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {combos.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Layers className="h-5 w-5" />}
                  title="Sin combos posibles"
                  description="No hay dos cláusulas que quepan a la vez en tu presupuesto y mejoren tu once."
                />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {combos.map((combo, index) => (
                    <ComboCard key={index} combo={combo} rank={index + 1} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-content-tertiary" />
                Próximamente disponibles
              </CardTitle>
              <CardDescription>
                Jugadores con la cláusula bloqueada o blindada. Los bloqueos caducan: apunta la fecha y prepara el dinero.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <EmptyState compact title="Nada bloqueado" description="Ningún rival tiene jugadores protegidos ahora mismo." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jugador</TableHead>
                        <TableHead>Propietario</TableHead>
                        <TableHead>Cláusula</TableHead>
                        <TableHead className="hidden md:table-cell">xP</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcoming.map((entry) => (
                        <UpcomingRow key={entry.playerId} entry={entry} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="owners" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-content-tertiary" />
                Exposición de cada rival
              </CardTitle>
              <CardDescription>Cuánta plantilla rival tiene la cláusula al aire y cuánta puedes pagar tú.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Manager</TableHead>
                      <TableHead>Libres</TableHead>
                      <TableHead className="hidden sm:table-cell">Protegidos</TableHead>
                      <TableHead>A tu alcance</TableHead>
                      <TableHead className="hidden lg:table-cell">Mejor objetivo</TableHead>
                      <TableHead>Exposición</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exposures.map((owner) => (
                      <OwnerRow key={owner.teamId} owner={owner} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {notes.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            {notes.map((note, index) => (
              <div key={index} className="flex items-start gap-2 text-xs text-content-tertiary">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{note}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <PlayerDetailDialog
        player={selected?.player ?? null}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        buyoutClause={selected?.clause}
        expectedPoints={selected?.expectedPoints ?? null}
        fixture={selected?.fixture}
        signals={selected?.signals}
        league={league}
        onActionSuccess={refetch}
      />
    </div>
  );
}

/** Tarjeta rica de un objetivo recomendado: por qué, cuánto cuesta y qué gana. */
function TargetCard({ target, onSelect }: { target: ClauseTarget; onSelect: () => void }) {
  const meta = VERDICT_META[target.verdict];

  return (
    <Card variant="interactive" className="h-full cursor-pointer" onClick={onSelect}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <PlayerAvatar player={target.player} size="md" showPosition />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-display text-base font-semibold text-content">{target.player.nickname}</span>
              <PlayerStatusBadge status={target.player.playerStatus} />
            </div>
            <div className="truncate text-xs text-content-tertiary">
              {target.player.team?.name} · de <span className="text-caution-text">{target.owner.managerName}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant={meta.variant} className="text-[10px]" title={meta.hint}>
                {meta.label}
              </Badge>
              <Badge variant="outline-muted" className="text-[10px]">
                {target.starterLabel}
                {target.pStarter !== null ? ` · ${Math.round(target.pStarter * 100)}%` : ''}
              </Badge>
              {target.fixture && <FixtureChip fixture={target.fixture} showEffect />}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Metric label="Cláusula" value={formatMillions(target.clause)} />
          <Metric label="xP jornada" value={target.expectedPoints.toFixed(1)} />
          <Metric
            label="Δ Once"
            value={target.xiGain > 0 ? `+${target.xiGain.toFixed(1)}` : '—'}
            accent={target.xiGain > 0}
          />
        </div>

        <FitBar value={target.fitScore} verdict={target.verdict} showLabel />

        {target.reasons.length > 0 && (
          <ul className="space-y-1">
            {target.reasons.slice(0, 3).map((reason, index) => (
              <li key={index} className="flex items-start gap-1.5 text-xs text-content-tertiary">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-positive-text" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        )}

        {target.warnings.length > 0 && (
          <ul className="space-y-1">
            {target.warnings.slice(0, 2).map((warning, index) => (
              <li key={index} className="flex items-start gap-1.5 text-xs text-caution-text/90">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        )}

        {target.signals.length > 0 && <SignalChips signals={target.signals} max={2} className="mt-0" />}

        {target.alsoOnMarket && (
          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.09] bg-surface-raised/60 px-2.5 py-1.5 text-[11px] text-content-tertiary">
            <Coins className="h-3 w-3" />
            También está en el mercado por <Currency value={target.alsoOnMarket.salePrice} className="font-semibold text-content" />
            {target.alsoOnMarket.salePrice < target.clause && <span className="text-positive-text">· más barato pujando</span>}
          </div>
        )}

        {!target.affordable && target.funding && (
          <FundingPlanBox target={target} />
        )}

        <div className="flex items-center justify-between gap-2 border-t border-white/[0.09] pt-3">
          <UrgencyBadge target={target} />
          <Button variant="glass" size="xs" onClick={onSelect} className="gap-1">
            <Flame className="h-3.5 w-3.5" /> Ver y clausular
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Plan de ventas propias para llegar a una cláusula fuera de presupuesto. */
function FundingPlanBox({ target }: { target: ClauseTarget }) {
  const funding = target.funding!;
  return (
    <div className="rounded-lg border border-white/[0.09] bg-surface-raised/60 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">
        <PiggyBank className="h-3.5 w-3.5" />
        Cómo financiarlo
      </div>
      <p className="mt-1 text-xs text-content-tertiary">
        Te faltan <Currency value={target.missingBudget} className="font-semibold text-content" />.{' '}
        {funding.feasible
          ? `Vendiendo ${funding.players.length} jugador${funding.players.length === 1 ? '' : 'es'} lo cubres.`
          : `Aun vendiendo lo que menos aporta seguirían faltando ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(funding.shortfall)}.`}
      </p>
      {funding.players.length > 0 && (
        <ul className="mt-2 space-y-1">
          {funding.players.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-content">
                {p.nickname} <span className="text-content-tertiary">· {p.positionName}</span>
              </span>
              <span className="shrink-0 text-content-tertiary">
                <Currency value={p.marketValue} /> · {p.expectedPoints.toFixed(1)} xP
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ComboCard({ combo, rank }: { combo: ClauseCombo; rank: number }) {
  return (
    <div className="rounded-lg border border-white/[0.09] bg-surface-raised p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-white/[0.09] bg-surface-overlay text-[11px] font-bold text-content">
            {rank}
          </span>
          <span className="text-sm font-semibold text-content">
            {combo.targets.length === 2 ? 'Doble golpe' : 'Triple golpe'}
          </span>
        </div>
        <Badge variant="success" className="gap-1">
          <Zap className="h-3 w-3" /> +{combo.totalXiGain.toFixed(1)} pts
        </Badge>
      </div>

      <ul className="mt-3 space-y-1.5">
        {combo.targets.map((t) => (
          <li key={t.playerId} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-content">
              {t.nickname} <span className="text-content-tertiary">· {t.positionName}</span>
            </span>
            <Currency value={t.clause} className="shrink-0 text-content-tertiary" />
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.09] pt-3 text-xs">
        <span className="text-content-tertiary">
          Coste total <Currency value={combo.totalCost} className="font-semibold text-content" />
        </span>
        <span className="text-content-tertiary">
          Te quedan <Currency value={combo.remainingBudget} className="font-semibold text-content" />
        </span>
      </div>
    </div>
  );
}

function UpcomingRow({ entry }: { entry: UpcomingClauseTarget }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <PlayerAvatar player={entry.player} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-content">{entry.player.nickname}</div>
            <div className="truncate text-[11px] text-content-tertiary">{entry.player.team?.name}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-caution-text">{entry.owner.managerName}</TableCell>
      <TableCell>
        <Currency value={entry.clause} className="text-sm text-content" />
        {entry.affordable && <div className="text-[11px] text-positive-text">Podrías pagarla</div>}
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm text-content">{entry.expectedPoints.toFixed(1)}</TableCell>
      <TableCell>
        {entry.status === 'shielded' ? (
          <Badge variant="info" className="gap-1 text-[10px]">
            <Shield className="h-3 w-3" /> Blindado
          </Badge>
        ) : (
          <Badge variant="warning" className="gap-1 text-[10px]">
            <Lock className="h-3 w-3" />
            {entry.daysLeft !== undefined
              ? entry.daysLeft <= 1
                ? 'Libre en menos de 1 día'
                : `Libre en ${entry.daysLeft} días`
              : 'Bloqueado'}
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

function OwnerRow({ owner }: { owner: OwnerExposure }) {
  return (
    <TableRow>
      <TableCell>
        <div className="text-sm font-semibold text-content">{owner.managerName}</div>
        <div className="text-[11px] text-content-tertiary">{owner.squadSize} jugadores</div>
      </TableCell>
      <TableCell className="text-sm text-content">{owner.availableCount}</TableCell>
      <TableCell className="hidden sm:table-cell text-sm text-content-tertiary">
        {owner.lockedCount} bloq. · {owner.shieldedCount} blind.
      </TableCell>
      <TableCell>
        <Badge variant={owner.affordableCount > 0 ? 'success' : 'outline-muted'} className="text-[10px]">
          {owner.affordableCount}
        </Badge>
        {owner.cheapestClause !== null && (
          <div className="mt-1 text-[11px] text-content-tertiary">
            desde <Currency value={owner.cheapestClause} />
          </div>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {owner.bestTarget ? (
          <div className="text-xs">
            <div className="truncate text-content">{owner.bestTarget.nickname}</div>
            <div className="text-[11px] text-content-tertiary">
              {owner.bestTarget.xiGain > 0 ? `+${owner.bestTarget.xiGain.toFixed(1)} pts · ` : ''}
              <Currency value={owner.bestTarget.clause} />
            </div>
          </div>
        ) : (
          <span className="text-xs text-content-tertiary">—</span>
        )}
      </TableCell>
      <TableCell className="min-w-[110px]">
        <div className="flex items-center gap-2">
          <Progress value={owner.exposureScore} className="h-1.5 w-16" />
          <span className="text-xs text-content-tertiary">{owner.exposureScore}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

function FitBar({ value, verdict, showLabel }: { value: number; verdict: ClauseVerdict; showLabel?: boolean }) {
  const color =
    verdict === 'top'
      ? 'bg-positive'
      : verdict === 'good'
      ? 'bg-foreground'
      : verdict === 'situational'
      ? 'bg-caution'
      : 'bg-negative';

  return (
    <div className="min-w-[90px] space-y-1">
      <div className="flex items-center justify-between gap-2">
        {showLabel && <span className="text-[11px] uppercase tracking-wider text-content-tertiary">Encaje</span>}
        <span className="text-xs font-semibold text-content">{value}/100</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.1]">
        <div className={cn('h-full rounded-full transition-[width] duration-slow ease-out', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function UrgencyBadge({ target }: { target: ClauseTarget }) {
  const level = target.urgency >= 70 ? 'alta' : target.urgency >= 40 ? 'media' : 'baja';
  const variant = level === 'alta' ? 'danger' : level === 'media' ? 'warning' : 'outline-muted';
  const title =
    target.rivalsThatCanAfford > 0
      ? `${target.rivalsThatCanAfford} rival${target.rivalsThatCanAfford === 1 ? '' : 'es'} puede${target.rivalsThatCanAfford === 1 ? '' : 'n'} pagar su cláusula`
      : 'Ningún rival puede pagar su cláusula ahora mismo';

  return (
    <Badge variant={variant} className="gap-1 text-[10px]" title={title}>
      <Flame className="h-3 w-3" /> Urgencia {level}
    </Badge>
  );
}

function Metric({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.09] bg-surface-raised/60 p-2">
      <div className="text-[10px] uppercase tracking-wider text-content-tertiary">{label}</div>
      <div className={cn('mt-0.5 truncate font-display text-sm font-bold', accent ? 'text-positive-text' : 'text-content')}>
        {value}
      </div>
    </div>
  );
}

function formatMillions(value: number): string {
  if (!Number.isFinite(value)) return '-';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')} M€`;
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}
