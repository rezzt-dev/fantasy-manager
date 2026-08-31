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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
import PlayerDetailDialog from '../shared/PlayerDetailDialog';
import ErrorState from '../shared/ErrorState';
import SectionHeader from '../shared/SectionHeader';
import EmptyState from '../shared/EmptyState';
import { Shield, ShieldCheck, Lock, Gavel, Users, Wallet, TrendingUp } from 'lucide-react';
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
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const selectedRival = useMemo(
    () => rivals.find((r) => String(r.teamId) === selectedTeamId) || rivals[0],
    [rivals, selectedTeamId],
  );

  if (isLoading) return <RivalsSkeleton />;
  if (error) return (
      <ErrorState
        title="No hemos podido leer las plantillas rivales"
        description="Se consulta el equipo de cada manager por separado; si uno falla, el análisis se detiene. Reintenta."
        detail={error.message}
        onRetry={refetch}
      />
    );

  if (rivals.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Rivales" description="Plantillas de los otros miembros de la liga." />
        <EmptyState
          icon={<Shield />}
          title="Esta liga no tiene más managers"
          description="La comparativa de rivales necesita al menos otro equipo en la liga. En cuanto se una alguien más, sus plantillas aparecerán aquí."
        />
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
    <div className="space-y-6">
      <SectionHeader
        as="h1"
        eyebrow="Rivales"
        title="Qué tiene cada manager"
        description="Plantilla, valor y protección de cláusula de tus rivales. Sirve para saber a quién puedes clausular y quién puede clausularte a ti."
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-content-tertiary" />
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
              <SelectTrigger className="w-full sm:w-56">
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
          <Tabs defaultValue="squad" className="w-full">
            <div className="border-b border-white/[0.09] px-4">
              <TabsList variant="underline">
                <TabsTrigger value="squad" className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-1 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  Plantilla
                </TabsTrigger>
                <TabsTrigger value="risks" className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-1 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  Riesgos de cláusula
                </TabsTrigger>
                <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-1 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  Resumen
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="squad" className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]" />
                      <TableHead>Jugador</TableHead>
                      <TableHead>Posición</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Puntos</TableHead>
                      <TableHead className="text-right">Valor mercado</TableHead>
                      <TableHead className="text-right">Cláusula</TableHead>
                      <TableHead>Protección</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...(selectedRival?.players || [])]
                      .sort((a, b) => a.playerMaster.positionId - b.playerMaster.positionId)
                      .map((player) => (
                        <RivalPlayerRow
                          key={player.playerTeamId}
                          player={player}
                          ownMoney={ownMoney}
                          onClick={() => setSelectedPlayer(player)}
                        />
                      ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="risks" className="p-4">
              <div className="space-y-3">
                {selectedRival?.players
                  .filter((p) => getClauseProtection(p).status === 'available')
                  .sort((a, b) => (b.playerMaster.marketValue - b.buyoutClause) - (a.playerMaster.marketValue - a.buyoutClause))
                  .slice(0, 8)
                  .map((player) => {
                    const diff = player.playerMaster.marketValue - player.buyoutClause;
                    return (
                      <div
                        key={player.playerTeamId}
                        className="flex items-center gap-4 rounded-lg border border-white/[0.09] bg-surface-raised/50 p-3"
                      >
                        <PlayerAvatar player={player.playerMaster} size="md" showPosition />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-content">{player.playerMaster.nickname}</div>
                          <div className="text-xs text-content-tertiary">
                            {positionShortName(player.playerMaster.position, player.playerMaster.positionId)} ·{' '}
                            {player.playerMaster.team?.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-content-tertiary">Cláusula</div>
                          <Currency value={player.buyoutClause} className="font-semibold" />
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-content-tertiary">Diferencial</div>
                          <span className={`font-semibold ${diff > 0 ? 'text-positive-text' : 'text-negative-text'}`}>
                            {diff > 0 ? '+' : ''}
                            <Currency value={diff} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </TabsContent>

            <TabsContent value="summary" className="p-4">
              {selectedRival && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-white/[0.09] bg-surface-raised/50 p-4">
                    <div className="flex items-center gap-2 text-xs text-content-tertiary">
                      <TrendingUp className="h-4 w-4" />
                      Valor de plantilla
                    </div>
                    <div className="mt-2 text-xl font-bold text-content">
                      <Currency value={selectedRival.teamValue} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.09] bg-surface-raised/50 p-4">
                    <div className="flex items-center gap-2 text-xs text-content-tertiary">
                      <Wallet className="h-4 w-4" />
                      Dinero disponible
                    </div>
                    <div className="mt-2 text-xl font-bold text-content">
                      {selectedRival.teamMoney !== null ? <Currency value={selectedRival.teamMoney} /> : '—'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.09] bg-surface-raised/50 p-4">
                    <div className="flex items-center gap-2 text-xs text-content-tertiary">
                      <Shield className="h-4 w-4" />
                      Clausulables
                    </div>
                    <div className="mt-2 text-xl font-bold text-content">{availableCount}</div>
                  </div>
                  <div className="rounded-lg border border-white/[0.09] bg-surface-raised/50 p-4">
                    <div className="flex items-center gap-2 text-xs text-content-tertiary">
                      <Gavel className="h-4 w-4" />
                      A tu alcance
                    </div>
                    <div className="mt-2 text-xl font-bold text-content">{buyoutableCount}</div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <PlayerDetailDialog
        player={selectedPlayer?.playerMaster || null}
        open={!!selectedPlayer}
        onOpenChange={(open) => !open && setSelectedPlayer(null)}
        buyoutClause={selectedPlayer?.buyoutClause}
        isShielded={selectedPlayer?.isShielded}
        league={league}
        onActionSuccess={refetch}
      />
    </div>
  );
}

function RivalPlayerRow({
  player,
  ownMoney,
  onClick,
}: {
  player: TeamPlayer;
  ownMoney: number;
  onClick: () => void;
}) {
  const p = player.playerMaster;
  const points = p.points || p.lastSeasonPoints || 0;
  const posColor = positionBgClass(p.position || '', p.positionId);
  const protection = getClauseProtection(player);
  const canBuyout =
    protection.status === 'available' && player.buyoutClause > 0 && player.buyoutClause <= ownMoney;

  return (
    <TableRow onClick={onClick} className="cursor-pointer">
      <TableCell className="py-2 px-2 sm:px-4">
        <PlayerAvatar player={p} size="md" showPosition />
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <div className="font-semibold text-content">{p.nickname}</div>
        <div className="text-xs text-content-tertiary">{p.team?.name || 'Sin equipo'}</div>
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <Badge variant="secondary" className={`font-display font-bold tracking-wide text-white ${posColor} border-0`}>
          {positionShortName(p.position, p.positionId)}
        </Badge>
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4">
        <PlayerStatusBadge status={p.playerStatus} />
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4 text-right font-display text-sm font-semibold text-content">{points}</TableCell>
      <TableCell className="py-2 px-2 sm:px-4 text-right">
        <Currency value={p.marketValue} className="text-content-tertiary" />
      </TableCell>
      <TableCell className="py-2 px-2 sm:px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Currency value={player.buyoutClause} />
          {canBuyout && (
            <Badge variant="success" className="gap-1 text-[10px]">
              <Gavel className="h-3 w-3" /> Clausulable
            </Badge>
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
      <Badge variant="info" className="gap-1 text-[10px]">
        <ShieldCheck className="h-3 w-3" /> Blindado
      </Badge>
    );
  }

  if (protection.status === 'locked') {
    return (
      <Badge variant="warning" className="gap-1 text-[10px]" title="Cláusula bloqueada">
        <Lock className="h-3 w-3" /> Protegido
      </Badge>
    );
  }

  return (
    <Badge variant="success" className="gap-1 text-[10px]">
      <Shield className="h-3 w-3" /> Disponible
    </Badge>
  );
}

function RivalsSkeleton() {
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
