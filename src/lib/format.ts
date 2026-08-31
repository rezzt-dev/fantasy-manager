export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Importe abreviado: «14,2 M €». Para columnas estrechas y tarjetas, donde
 * «14.237.500 €» obliga a encoger la tipografía hasta que deja de leerse.
 */
export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
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

/**
 * Color de demarcación como variable CSS resoluble en SVG (gráficos) y en
 * `style`. Sale del token `--pos-*`, no de un hex suelto.
 *
 * Los cuatro tonos están separados en luminosidad además de en matiz, para que
 * sigan distinguiéndose sin percepción de color; aun así la sigla (POR, DEF,
 * MED, DEL) acompaña siempre al color.
 */
export function positionColor(position?: string | null, positionId?: number | null): string {
  const name = position || getPositionName(positionId);
  switch (name) {
    case 'Portero':
      return 'hsl(var(--pos-gk))';
    case 'Defensa':
      return 'hsl(var(--pos-df))';
    case 'Centrocampista':
    case 'Mediocentro Ofensivo':
      return 'hsl(var(--pos-mf))';
    case 'Delantero':
      return 'hsl(var(--pos-fw))';
    case 'Entrenador':
      return 'hsl(var(--pos-co))';
    default:
      return 'hsl(var(--ink-700))';
  }
}

/** Clase de fondo para la demarcación. El texto encima va en `text-ink-0`. */
export function positionBgClass(position?: string | null, positionId?: number | null): string {
  const name = position || getPositionName(positionId);
  switch (name) {
    case 'Portero':
      return 'bg-pitch-gk';
    case 'Defensa':
      return 'bg-pitch-df';
    case 'Centrocampista':
    case 'Mediocentro Ofensivo':
      return 'bg-pitch-mf';
    case 'Delantero':
      return 'bg-pitch-fw';
    case 'Entrenador':
      return 'bg-pitch-co';
    default:
      return 'bg-ink-600';
  }
}

/** Clase de color de texto para la demarcación sobre superficie oscura. */
export function positionTextClass(position?: string | null, positionId?: number | null): string {
  const name = position || getPositionName(positionId);
  switch (name) {
    case 'Portero':
      return 'text-pitch-gk';
    case 'Defensa':
      return 'text-pitch-df';
    case 'Centrocampista':
    case 'Mediocentro Ofensivo':
      return 'text-pitch-mf';
    case 'Delantero':
      return 'text-pitch-fw';
    case 'Entrenador':
      return 'text-pitch-co';
    default:
      return 'text-content-tertiary';
  }
}
