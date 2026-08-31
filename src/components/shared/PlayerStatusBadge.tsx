'use client';

import { CircleCheck, CircleHelp, CircleX, CircleSlash } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { statusText } from '../../lib/format';

interface PlayerStatusBadgeProps {
  status: string;
  /** Oculta el texto y deja solo el icono. Solo en tablas muy densas. */
  iconOnly?: boolean;
}

/**
 * Estado de disponibilidad del jugador.
 *
 * Cada estado tiene forma de icono propia además de color: un círculo con
 * aspa no se confunde con uno con interrogación aunque ambos se vean grises.
 */
const STATUS = {
  ok: {
    variant: 'success' as const,
    Icon: CircleCheck,
    help: 'Disponible para la jornada.',
  },
  doubtful: {
    variant: 'warning' as const,
    Icon: CircleHelp,
    help: 'Duda: confirma la alineación antes del cierre de la jornada.',
  },
  injured: {
    variant: 'danger' as const,
    Icon: CircleX,
    help: 'Lesión o baja confirmada. No puntuará esta jornada.',
  },
  out_of_league: {
    variant: 'neutral' as const,
    Icon: CircleSlash,
    help: 'Fuera de la competición: ya no puntúa.',
  },
} as const;

export default function PlayerStatusBadge({ status, iconOnly = false }: PlayerStatusBadgeProps) {
  const { variant, Icon, help } = STATUS[status as keyof typeof STATUS] ?? STATUS.out_of_league;
  const label = statusText(status);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={variant}
            size="sm"
            className="cursor-default"
            icon={<Icon aria-hidden="true" />}
            aria-label={iconOnly ? `${label}. ${help}` : undefined}
          >
            {iconOnly ? null : label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="max-w-[220px] text-xs leading-relaxed">{help}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
