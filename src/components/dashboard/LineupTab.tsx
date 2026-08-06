'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import fantasyAPI from '../../lib/fantasy/api';
import type { FantasyLeague, Formation, PlayerMaster, TeamPlayer } from '../../types/fantasy';
import type { OptimalLineup, TacticalScheme } from '../../types/analysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import PlayerAvatar from '../shared/PlayerAvatar';
import PlayerStatusBadge from '../shared/PlayerStatusBadge';
import Currency from '../shared/Currency';
import PlayerCard from '../shared/PlayerCard';
import PlayerDetailDialog from '../shared/PlayerDetailDialog';
import EmptyState from '../shared/EmptyState';
import ErrorState from '../shared/ErrorState';
import SectionHeader from '../shared/SectionHeader';
import { StaggerContainer, StaggerItem } from '../ui/motion';
import { Shield, Users, Swords, AlertTriangle, Sparkles, ArrowRightLeft, Wallet } from 'lucide-react';
import { positionShortName } from '../../lib/format';
import { useState } from 'react';

interface LineupTabProps {
  league: FantasyLeague;
}

interface FormationEntry {
  playerMaster: PlayerMaster;
  buyoutClause: number;
  playerTeamId: string;
}

interface FilledEntry extends FormationEntry {
  suggested?: boolean;
}

interface FilledRow {
  positionId: number;
  label: string;
  entries: FilledEntry[];
}

const POSITION_ROWS: { positionId: number; label: string }[] = [
  { positionId: 1, label: 'Portero' },
  { positionId: 2, label: 'Defensas' },
  { positionId: 3, label: 'Centrocampistas' },
  { positionId: 4, label: 'Delanteros' },
];

function buildFilledRows(
  formation: Formation,
  teamPlayers: TeamPlayer[],
  optimalLineup?: OptimalLineup,
): FilledRow[] {
  const officialByPos: Record<number, FormationEntry[]> = {
    1: formation.goalkeeper || [],
    2: formation.defender || [],
    3: formation.midfielder || [],
    4: formation.attacker || [],
  };
  const officialIds = new Set(
    Object.values(officialByPos).flatMap((entries) => entries.map((e) => e.playerMaster.id)),
  );

  let targets: Record<number, number> = { 1: 1, 2: 4, 3: 4, 4: 2 };
  if (optimalLineup?.formation) {
    const [d, m, a] = optimalLineup.formation.split('-').map((n) => parseInt(n, 10));
    if ([d, m, a].every((n) => Number.isFinite(n))) targets = { 1: 1, 2: d, 3: m, 4: a };
  }

  const suggestionPool = (positionId: number): PlayerMaster[] => {
    const fromOptimal = (optimalLineup?.starters || [])
      .filter((e) => e.player.positionId === positionId && !officialIds.has(e.player.id))
      .map((e) => e.player);
    const rest = teamPlayers
      .map((tp) => tp.playerMaster)
      .filter(
        (p) =>
          p.positionId === positionId &&
          !officialIds.has(p.id) &&
          !fromOptimal.some((o) => o.id === p.id),
      )
      .sort((a, b) => (b.points || b.lastSeasonPoints || 0) - (a.points || a.lastSeasonPoints || 0));
    return [...fromOptimal, ...rest];
  };

  const teamPlayerById = new Map(teamPlayers.map((tp) => [tp.playerMaster.id, tp]));

  return POSITION_ROWS.map(({ positionId, label }) => {
    const official = officialByPos[positionId];
    const target = Math.max(targets[positionId], official.length);
    const fill = suggestionPool(positionId)
      .slice(0, Math.max(0, target - official.length))
      .map((p): FilledEntry => {
        const tp = teamPlayerById.get(p.id);
        return {
          playerMaster: p,
          buyoutClause: tp?.buyoutClause ?? 0,
          playerTeamId: tp?.playerTeamId ?? p.id,
          suggested: true,
        };
      });
    return { positionId, label, entries: [...official, ...fill] };
  });
}

export default function LineupTab({ league }: LineupTabProps) {
  const teamId = league.team.id;
  const leagueId = league.id;

  const lineupQuery = useQuery({
    queryKey: ['lineup', teamId],
    queryFn: () => fantasyAPI.getTeamLineup(teamId),
    enabled: !!teamId,
  });

  const teamQuery = useQuery({
    queryKey: ['team', leagueId, teamId],
    queryFn: () => fantasyAPI.getTeamData(leagueId, teamId),
    enabled: !!teamId,
  });

  const analysisQuery = useQuery({
    queryKey: ['league-analysis', leagueId, teamId],
    queryFn: () => fantasyAPI.getLeagueAnalysis(leagueId, teamId),
    enabled: !!teamId,
  });
  const optimalLineup: OptimalLineup | undefined = analysisQuery.data?.analysis?.optimalLineup;

  const recommendationsQuery = useQuery({
    queryKey: ['recommendations', leagueId, teamId],
    queryFn: () => fantasyAPI.getRecommendations(leagueId, teamId),
    enabled: !!teamId,
  });
  const tacticalScheme: TacticalScheme | undefined = recommendationsQuery.data?.tacticalScheme;

  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);

  const isLoading = lineupQuery.isLoading || teamQuery.isLoading;
  const hasError = lineupQuery.error || teamQuery.error;

  if (isLoading) return <LineupSkeleton />;
  if (hasError)
    return (
      <ErrorState
        title="Error cargando alineación"
        description="No se ha podido cargar la alineación."
        onRetry={() => {
          lineupQuery.refetch();
          teamQuery.refetch();
        }}
      />
    );

  const formation = lineupQuery.data?.formation;
  const teamPlayers = teamQuery.data?.players || [];

  if (!formation) {
    return (
      <EmptyState
        title="Sin alineación"
        description="No hay datos de alineación disponibles para esta liga."
      />
    );
  }

  const allFormationEntries = [
    ...(formation.goalkeeper || []),
    ...(formation.defender || []),
    ...(formation.midfielder || []),
    ...(formation.attacker || []),
  ];
  const lineupIds = new Set(allFormationEntries.map((e) => e.playerMaster.id));
  const totalLineup = allFormationEntries.length;

  const filledRows = buildFilledRows(formation, teamPlayers, optimalLineup);
  const filledEntries = filledRows.flatMap((row) => row.entries);
  const isIncomplete = totalLineup < filledEntries.length;

  const filledIds = new Set(filledEntries.map((e) => e.playerMaster.id));
  const bench = teamPlayers.filter((p) => !filledIds.has(p.playerMaster.id));

  const injuredOrDoubtful = allFormationEntries.filter(
    (e) => e.playerMaster.playerStatus === 'injured' || e.playerMaster.playerStatus === 'doubtful',
  );

  const teamPlayerById = new Map(teamPlayers.map((tp) => [tp.playerMaster.id, tp]));

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <SectionHeader
        title="Alineación"
        description="Tu once titular y jugadores disponibles en el banquillo."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {injuredOrDoubtful.length > 0 && (
              <Badge variant="warning" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {injuredOrDoubtful.length} aviso{injuredOrDoubtful.length > 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant="secondary" className="font-display text-xs">
              <Swords className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {totalLineup} titulares
            </Badge>
          </div>
        }
      />

      {optimalLineup && <RecommendedLineupCard optimalLineup={optimalLineup} />}
      {tacticalScheme && <TacticalSchemeCard scheme={tacticalScheme} />}

      {isIncomplete && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="text-sm">
            <span className="font-semibold text-foreground">Tu alineación oficial está incompleta ({totalLineup} de 11 jugadores).</span>
            <span className="text-muted-foreground">
              {' '}Completamos el campo con los mejores jugadores disponibles de tu plantilla, marcados como «Sugerido». Confirma el once en la app oficial.
            </span>
          </div>
        </div>
      )}

      <Tabs defaultValue="field" className="space-y-6">
        <TabsList className="flex w-full items-start gap-1 overflow-x-auto rounded-xl p-1 scrollbar-thin lg:grid lg:grid-cols-3">
          <TabsTrigger value="field" className="shrink-0 gap-1.5">
            <Swords className="h-3.5 w-3.5" /> Campo
          </TabsTrigger>
          <TabsTrigger value="lineup" className="shrink-0 gap-1.5">
            <Users className="h-3.5 w-3.5" /> Once titular
          </TabsTrigger>
          <TabsTrigger value="bench" className="shrink-0 gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Banquillo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="field">
          <Card className="overflow-hidden">
            <div className="relative flex min-h-[420px] flex-col overflow-hidden rounded-t-xl bg-gradient-to-b from-[#14532d] to-[#166534] p-3 sm:min-h-[540px] sm:p-5 lg:min-h-[680px]">
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{ backgroundImage: 'radial-gradient(#16a34a 1px, transparent 1px)', backgroundSize: '24px 24px' }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25" />

              <svg
                className="pointer-events-none absolute inset-0 h-full w-full text-white/30"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                <rect x="2" y="2" width="96" height="96" fill="none" stroke="currentColor" strokeWidth="0.4" />
                <line x1="50" y1="2" x2="50" y2="98" stroke="currentColor" strokeWidth="0.4" />
                <circle cx="50" cy="50" r="9" fill="none" stroke="currentColor" strokeWidth="0.4" />
                <circle cx="50" cy="50" r="0.8" fill="currentColor" />
                <rect x="32" y="2" width="36" height="14" fill="none" stroke="currentColor" strokeWidth="0.4" />
                <rect x="40" y="2" width="20" height="6" fill="none" stroke="currentColor" strokeWidth="0.4" />
                <rect x="32" y="84" width="36" height="14" fill="none" stroke="currentColor" strokeWidth="0.4" />
                <rect x="40" y="92" width="20" height="6" fill="none" stroke="currentColor" strokeWidth="0.4" />
                <path d="M 2 6 A 4 4 0 0 0 6 2" fill="none" stroke="currentColor" strokeWidth="0.4" />
                <path d="M 94 2 A 4 4 0 0 0 98 6" fill="none" stroke="currentColor" strokeWidth="0.4" />
                <path d="M 2 94 A 4 4 0 0 1 6 98" fill="none" stroke="currentColor" strokeWidth="0.4" />
                <path d="M 94 98 A 4 4 0 0 1 98 94" fill="none" stroke="currentColor" strokeWidth="0.4" />
              </svg>

              <div className="relative z-10 flex min-h-[420px] flex-1 flex-col justify-between gap-3 overflow-y-auto py-3 sm:min-h-[540px] sm:py-4 lg:min-h-[680px]">
                {filledRows.map((row) => (
                  <PositionRow key={row.positionId} entries={row.entries} onPlayerClick={(p) => setSelectedPlayer(teamPlayerById.get(p.id) || null)} />
                ))}
                {formation.coach && formation.coach.length > 0 && (
                  <PositionRow entries={formation.coach} onPlayerClick={(p) => setSelectedPlayer(teamPlayerById.get(p.id) || null)} />
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="lineup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-muted-foreground" />
                Once titular ({totalLineup} oficial{totalLineup === 1 ? '' : 'es'}{isIncomplete ? ` + ${filledEntries.length - totalLineup} sugerido${filledEntries.length - totalLineup === 1 ? '' : 's'}` : ''})
              </CardTitle>
              <CardDescription>Listado completo de los jugadores que puntúan esta jornada</CardDescription>
            </CardHeader>
            <CardContent>
              <StaggerContainer className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3" stagger={0.04}>
                {filledEntries.map((entry) => (
                  <StaggerItem key={entry.playerTeamId}>
                    <PlayerCard
                      player={entry.playerMaster}
                      buyoutClause={entry.buyoutClause}
                      suggested={entry.suggested}
                      onClick={() => setSelectedPlayer(teamPlayerById.get(entry.playerMaster.id) || null)}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bench">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-muted-foreground" />
                Banquillo
              </CardTitle>
              <CardDescription>Jugadores disponibles para sustituir titulares</CardDescription>
            </CardHeader>
            <CardContent>
              {bench.length === 0 ? (
                <EmptyState compact title="Banquillo vacío" description="Todos tus jugadores están en el once titular." />
              ) : (
                <StaggerContainer className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3" stagger={0.04}>
                  {bench.map((p) => (
                    <StaggerItem key={p.playerTeamId}>
                      <PlayerCard
                        player={p.playerMaster}
                        buyoutClause={p.buyoutClause}
                        isShielded={p.isShielded}
                        onClick={() => setSelectedPlayer(p)}
                      />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PlayerDetailDialog
        player={selectedPlayer?.playerMaster || null}
        open={!!selectedPlayer}
        onOpenChange={(open) => !open && setSelectedPlayer(null)}
        buyoutClause={selectedPlayer?.buyoutClause}
        isShielded={selectedPlayer?.isShielded}
      />
    </div>
  );
}

function PositionRow({
  entries,
  onPlayerClick,
}: {
  entries: FilledEntry[];
  onPlayerClick: (player: PlayerMaster) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:gap-4">
      {entries.map((entry) => (
        <LineupPlayerCard key={entry.playerTeamId} entry={entry} onClick={() => onPlayerClick(entry.playerMaster)} />
      ))}
    </div>
  );
}

function LineupPlayerCard({ entry, onClick }: { entry: FilledEntry; onClick: () => void }) {
  const player = entry.playerMaster;
  const points = player.points || player.lastSeasonPoints || 0;
  const isWarning = player.playerStatus === 'injured' || player.playerStatus === 'doubtful';

  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group flex w-28 flex-col items-center rounded-2xl border bg-card/95 p-2.5 text-center shadow-card transition-colors hover:bg-surface-2 sm:w-32 sm:p-3 ${
        entry.suggested
          ? 'border-dashed border-amber-500/60'
          : isWarning
          ? 'border-rose-500/50 shadow-[0_0_12px_-4px_rgba(244,63,94,0.25)]'
          : 'border-white/[0.12]'
      }`}
    >
      <PlayerAvatar player={player} size="xl" showPosition className="mb-2.5" />
      <div className="w-full truncate text-sm font-bold text-foreground">{player.nickname}</div>
      <div className="mt-0.5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="font-display font-semibold">{positionShortName(player.position, player.positionId)}</span>
        <span>•</span>
        <span>{points} pts</span>
      </div>
      <div className="mt-2 flex w-full items-center justify-center gap-1.5">
        <PlayerStatusBadge status={player.playerStatus} />
        {entry.suggested && (
          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
            Sugerido
          </span>
        )}
      </div>
    </motion.button>
  );
}

function RecommendedLineupCard({ optimalLineup }: { optimalLineup: OptimalLineup }) {
  const improvement = optimalLineup.improvement;
  const positions: { positionId: number; label: string }[] = [
    { positionId: 1, label: 'POR' },
    { positionId: 2, label: 'DEF' },
    { positionId: 3, label: 'CEN' },
    { positionId: 4, label: 'DEL' },
  ];

  return (
    <Card className="border-foreground/10">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-foreground" />
              Alineación recomendada
              <Badge variant="secondary" className="font-display text-xs">{optimalLineup.formation}</Badge>
            </CardTitle>
            <CardDescription>
              Maximiza los puntos esperados de la jornada según rendimiento, rival, titularidad y noticias.
              {optimalLineup.degraded && (
                <span className="mt-1 block text-amber-400">
                  No hay suficientes jugadores sanos: la propuesta incluye jugadores con dudas.
                </span>
              )}
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="font-display text-2xl font-bold text-foreground">{optimalLineup.totalExpected.toFixed(1)}</span>
            <span className="text-muted-foreground"> pts esperados</span>
            <span className={`ml-2 text-xs font-semibold ${improvement >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({improvement >= 0 ? '+' : ''}{improvement.toFixed(1)} vs actual)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {optimalLineup.changes.length > 0 && (
          <div className="rounded-lg border border-white/[0.06] bg-surface-2 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cambios sugeridos</div>
            <div className="flex flex-wrap gap-2">
              {optimalLineup.changes.map((change, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs">
                  <span className="text-rose-400 line-through">{change.out.nickname}</span>
                  <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold text-emerald-400">{change.in.nickname}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {positions.map(({ positionId, label }) => {
            const entries = optimalLineup.starters.filter((e) => e.player.positionId === positionId);
            if (entries.length === 0) return null;
            return (
              <div key={positionId} className="flex items-start gap-3">
                <span className="mt-1.5 w-9 shrink-0 font-display text-xs font-bold text-muted-foreground">{label}</span>
                <div className="flex flex-wrap gap-2">
                  {entries.map((entry) => (
                    <span
                      key={entry.player.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-surface px-2.5 py-1 text-xs"
                    >
                      <span className="font-semibold text-foreground">{entry.player.nickname}</span>
                      <span className="text-muted-foreground">{entry.expectedPoints.toFixed(1)}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {optimalLineup.bench.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wide">Banquillo sugerido: </span>
            {optimalLineup.bench.map((e) => `${e.player.nickname} (${e.expectedPoints.toFixed(1)})`).join(' · ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TacticalSchemeCard({ scheme }: { scheme: TacticalScheme }) {
  const positions: { positionId: number; label: string }[] = [
    { positionId: 1, label: 'POR' },
    { positionId: 2, label: 'DEF' },
    { positionId: 3, label: 'CEN' },
    { positionId: 4, label: 'DEL' },
  ];
  const improvement = scheme.improvement;

  const confidenceBadge = (confidence: number) => {
    if (confidence >= 0.75) return <Badge variant="success" className="px-1.5 py-0 text-[9px]">Alta</Badge>;
    if (confidence >= 0.6) return <Badge variant="warning" className="px-1.5 py-0 text-[9px]">Media</Badge>;
    return <Badge variant="danger" className="px-1.5 py-0 text-[9px]">Baja</Badge>;
  };

  return (
    <Card className="border-foreground/10">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-foreground" />
              Esquema táctico con presupuesto
              <Badge variant="secondary" className="font-display text-xs">{scheme.formation}</Badge>
            </CardTitle>
            <CardDescription>
              Mejor once alcanzable combinando tu plantilla, el mercado y las cláusulas de rivales.
              {scheme.dataQuality.level !== 'high' && (
                <span className="mt-1 block text-amber-400">
                  Confianza {scheme.dataQuality.level === 'medium' ? 'media' : 'baja'} en las estimaciones: {scheme.dataQuality.notes[0]}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="font-display text-2xl font-bold text-foreground">{scheme.totalExpected.toFixed(1)}</span>
            <span className="text-muted-foreground"> pts esperados</span>
            <span className={`ml-2 text-xs font-semibold ${improvement >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({improvement >= 0 ? '+' : ''}{improvement.toFixed(1)} vs sin fichar)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-white/[0.06] bg-surface-2 p-3 text-xs">
          <span className="text-muted-foreground">
            Disponible: <span className="font-semibold text-foreground"><Currency value={scheme.budget.available} /></span>
          </span>
          <span className="text-muted-foreground">
            Gastado: <span className="font-semibold text-foreground"><Currency value={scheme.budget.spent} /></span>
          </span>
          <span className="text-muted-foreground">
            Restante: <span className="font-semibold text-emerald-400"><Currency value={scheme.budget.remaining} /></span>
          </span>
        </div>

        {scheme.moves.length > 0 ? (
          <div className="rounded-lg border border-white/[0.06] bg-surface-2 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Movimientos necesarios</div>
            <div className="flex flex-wrap gap-2">
              {scheme.moves.map((move) => (
                <span key={move.player.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs">
                  <span className="font-semibold text-emerald-400">
                    {move.type === 'buy_market' ? 'Fichar' : 'Pagar cláusula'}: {move.player.nickname}
                  </span>
                  <Currency value={move.cost} className="text-muted-foreground" />
                  {move.sellerManagerName && <span className="text-muted-foreground">({move.sellerManagerName})</span>}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Tu plantilla actual ya permite montar este esquema: no hacen falta fichajes.
          </div>
        )}

        <div className="space-y-2">
          {positions.map(({ positionId, label }) => {
            const entries = scheme.starters.filter((e) => e.player.positionId === positionId);
            if (entries.length === 0) return null;
            return (
              <div key={positionId} className="flex items-start gap-3">
                <span className="mt-1.5 w-9 shrink-0 font-display text-xs font-bold text-muted-foreground">{label}</span>
                <div className="flex flex-wrap gap-2">
                  {entries.map((entry) => (
                    <span
                      key={entry.player.id}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${
                        entry.source === 'squad'
                          ? 'border-white/[0.08] bg-surface'
                          : 'border-emerald-500/30 bg-emerald-500/[0.06]'
                      }`}
                    >
                      <span className="font-semibold text-foreground">{entry.player.nickname}</span>
                      <span className="text-muted-foreground">{entry.expectedPoints.toFixed(1)}</span>
                      {confidenceBadge(entry.confidence)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function LineupSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-[600px] w-full rounded-xl" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
