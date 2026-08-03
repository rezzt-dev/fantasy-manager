'use client';

import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { statusText } from '../../lib/format';

interface PlayerStatusBadgeProps {
  status: string;
  showDot?: boolean;
}

const statusDot: Record<string, string> = {
  ok: 'bg-emerald-400',
  doubtful: 'bg-amber-400',
  injured: 'bg-rose-400',
  out_of_league: 'bg-slate-400',
};

const statusTooltip: Record<string, string> = {
  ok: 'Disponible para la jornada',
  doubtful: 'Duda: revisa la alineación confirmada',
  injured: 'Lesionado o baja confirmada',
  out_of_league: 'Fuera de la competición',
};

export default function PlayerStatusBadge({ status, showDot = true }: PlayerStatusBadgeProps) {
  const variant =
    status === 'ok'
      ? 'success'
      : status === 'doubtful'
      ? 'warning'
      : status === 'injured'
      ? 'danger'
      : 'muted';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant as never} className="cursor-default gap-1.5">
            {showDot && (
              <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status] || 'bg-slate-400'} shadow-sm`} />
            )}
            {statusText(status)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="max-w-[200px] text-xs">{statusTooltip[status] || 'Estado desconocido'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
