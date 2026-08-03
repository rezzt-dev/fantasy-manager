export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function getPlayerImageUrl(
  images?: { transparent?: { '256x256'?: string } },
): string | undefined {
  return images?.transparent?.['256x256'];
}

export function statusText(status: string): string {
  switch (status) {
    case 'ok':
      return 'Disponible';
    case 'doubtful':
      return 'Dudoso';
    case 'injured':
      return 'Lesionado';
    case 'out_of_league':
      return 'Fuera de la liga';
    default:
      return status;
  }
}

const POSITION_NAME: Record<number, string> = {
  1: 'Portero',
  2: 'Defensa',
  3: 'Centrocampista',
  4: 'Delantero',
  5: 'Entrenador',
};

export function getPositionName(positionId?: number | null): string {
  if (positionId == null) return 'Otro';
  return POSITION_NAME[positionId] || 'Otro';
}

export function positionShortName(position?: string | null, positionId?: number | null): string {
  const name = position || getPositionName(positionId);
  if (!name || name === 'Otro') return '---';
  switch (name) {
    case 'Portero':
      return 'POR';
    case 'Defensa':
      return 'DEF';
    case 'Centrocampista':
      return 'MED';
    case 'Mediocentro Ofensivo':
      return 'MCO';
    case 'Delantero':
      return 'DEL';
    case 'Entrenador':
      return 'ENT';
    default:
      return name.slice(0, 3).toUpperCase();
  }
}

export function positionColor(position?: string | null, positionId?: number | null): string {
  const name = position || getPositionName(positionId);
  switch (name) {
    case 'Portero':
      return '#f59e0b';
    case 'Defensa':
      return '#3b82f6';
    case 'Centrocampista':
    case 'Mediocentro Ofensivo':
      return '#10b981';
    case 'Delantero':
      return '#ef4444';
    case 'Entrenador':
      return '#6366f1';
    default:
      return '#94a3b8';
  }
}

export function positionBgClass(position?: string | null, positionId?: number | null): string {
  const name = position || getPositionName(positionId);
  switch (name) {
    case 'Portero':
      return 'bg-amber-500';
    case 'Defensa':
      return 'bg-blue-500';
    case 'Centrocampista':
    case 'Mediocentro Ofensivo':
      return 'bg-emerald-500';
    case 'Delantero':
      return 'bg-rose-500';
    case 'Entrenador':
      return 'bg-indigo-500';
    default:
      return 'bg-slate-500';
  }
}
