'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import PlayerAvatar from '../shared/PlayerAvatar';
import Currency from '../shared/Currency';
import EmptyState from '../shared/EmptyState';
import { Calendar, ArrowRight, Trophy, Wallet, Sparkles } from 'lucide-react';
import type { MultiWeekPlan as MultiWeekPlanType } from '../../lib/engine/optimize';
import { positionShortName } from '../../lib/format';
import { cn } from '../../lib/utils';

interface MultiWeekPlanProps {
  plan: MultiWeekPlanType | null | undefined;
}

export default function MultiWeekPlan({ plan }: MultiWeekPlanProps) {
  if (!plan || plan.weeks.length === 0) {
    return (
      <EmptyState
        title="Sin plan multi-jornada"
        description="No hay suficientes datos de calendario para planificar más allá de la jornada actual."
        compact
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-foreground" />
              Plan multi-jornada
            </CardTitle>
            <CardDescription>
              {plan.weeks.length} jornadas planificadas · {plan.totalMoves} movimientos ·{' '}
              <span className="font-semibold text-foreground">{plan.totalExpected.toFixed(1)} pts</span> esperados
            </CardDescription>
          </div>
          <Badge variant="outline-muted" className="h-fit gap-1">
            <Sparkles className="h-3 w-3" /> Experimental
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-white/[0.08]" />
          {plan.weeks.map((week, idx) => (
            <WeekStep key={week.week} week={week} isLast={idx === plan.weeks.length - 1} />
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{plan.note}</p>
      </CardContent>
    </Card>
  );
}

function WeekStep({ week, isLast }: { week: MultiWeekPlanType['weeks'][number]; isLast: boolean }) {
  return (
    <div className={cn('relative pl-10', !isLast && 'pb-6')}>
      <div className="absolute left-2 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.12] bg-surface-3 text-[10px] font-bold text-foreground">
        {week.week}
      </div>
      <div className="space-y-3 rounded-xl border border-white/[0.06] bg-surface-2/40 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="font-display text-xs">{week.formation}</Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" /> {week.expectedPoints.toFixed(1)} pts
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> <Currency value={week.cashAfter} /> tras movimientos
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {week.starters.map((entry) => (
            <div
              key={entry.player.id}
              className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-surface-3/50 p-2"
            >
              <PlayerAvatar player={entry.player} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-foreground">{entry.player.nickname}</div>
                <div className="text-[10px] text-muted-foreground">
                  {positionShortName(entry.player.position, entry.player.positionId)} · {entry.expectedPoints.toFixed(1)} xP
                </div>
              </div>
            </div>
          ))}
        </div>

        {week.moves.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Movimientos</div>
            <div className="flex flex-wrap gap-2">
              {week.moves.map((move) => (
                <Badge key={move.player.id} variant="outline-muted" className="gap-1">
                  <ArrowRight className="h-3 w-3" />
                  {move.type === 'buy_market' ? 'Fichar' : 'Cláusula'} {move.player.nickname}
                  <span className="text-muted-foreground">· <Currency value={move.cost} /></span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {week.captain && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Trophy className="h-3.5 w-3.5 text-foreground" />
            Capitán: <span className="font-semibold text-foreground">{week.captain.player.nickname}</span>
          </div>
        )}
      </div>
    </div>
  );
}
