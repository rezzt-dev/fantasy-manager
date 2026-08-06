import type { MarketPlayer, TeamData, TeamPlayer } from '../../types/fantasy';
import type { RivalTeam } from '../../types/analysis';

export interface MarketOwnerEntry {
  teamId: number;
  teamName: string;
  managerName: string;
}

export interface MarketOwnerInfo {
  /** Origen de la venta: mercado oficial (libre) o puesto en venta por un equipo. */
  type: 'official' | 'team';
  /** Nombre del manager que lo vende (solo si type === 'team'). */
  managerName?: string;
  /** Nombre del equipo fantasy propietario (solo si type === 'team'). */
  teamName?: string;
  /** Identificador del equipo fantasy propietario (solo si type === 'team'). */
  teamId?: number;
  /** Etiqueta legible para mostrar en la UI. */
  label: string;
}

/**
 * Construye un mapa playerId -> equipo fantasy propietario a partir de la
 * plantilla propia y las plantillas rivales. Se usa para saber quién ha puesto
 * en venta a un jugador cuando la API de mercado no lo incluye.
 */
export function buildMarketOwnerMap(
  ownTeam: TeamData,
  rivals: RivalTeam[],
  ownTeamId?: number,
): Map<string, MarketOwnerEntry> {
  const map = new Map<string, MarketOwnerEntry>();

  for (const tp of ownTeam.players ?? []) {
    const player = tp.playerMaster;
    if (!player?.id) continue;
    const managerName = tp.manager?.managerName || 'Tu equipo';
    map.set(player.id, { teamId: ownTeamId ?? 0, teamName: 'Tu equipo', managerName });
  }

  for (const rival of rivals) {
    for (const tp of rival.players ?? []) {
      const player = tp.playerMaster;
      if (!player?.id) continue;
      const managerName = tp.manager?.managerName || rival.managerName;
      map.set(player.id, { teamId: rival.teamId, teamName: rival.managerName, managerName });
    }
  }

  return map;
}

/**
 * Determina el origen de un jugador en el mercado: mercado oficial (libre) o
 * venta por un equipo fantasy. Si la API no incluye el vendedor, se cruza con
 * el mapa de propietarios construido desde las plantillas de la liga.
 */
export function resolveMarketOwner(
  marketPlayer: MarketPlayer,
  ownerMap?: Map<string, MarketOwnerEntry>,
): MarketOwnerInfo {
  const sellerName = marketPlayer.sellerTeam?.manager?.managerName;
  if (sellerName) {
    return {
      type: 'team',
      managerName: sellerName,
      teamName: marketPlayer.sellerTeam?.manager?.managerName,
      label: `En venta por ${sellerName}`,
    };
  }

  if (marketPlayer.discr === 'marketPlayerLeague') {
    return { type: 'official', label: 'Mercado oficial' };
  }

  const owner = ownerMap?.get(marketPlayer.playerMaster.id);
  if (owner) {
    return {
      type: 'team',
      managerName: owner.managerName,
      teamName: owner.teamName,
      teamId: owner.teamId,
      label: `En venta por ${owner.managerName}`,
    };
  }

  if (marketPlayer.discr === 'marketPlayerTeam') {
    return { type: 'team', label: 'En venta por equipo' };
  }

  return { type: 'official', label: 'Mercado oficial' };
}

/** Indica si el jugador está en venta por un equipo fantasy. */
export function isTeamSale(player: MarketPlayer, ownerMap?: Map<string, MarketOwnerEntry>): boolean {
  return resolveMarketOwner(player, ownerMap).type === 'team';
}

/** Indica si el jugador pertenece al mercado oficial (libre). */
export function isOfficialMarket(player: MarketPlayer, ownerMap?: Map<string, MarketOwnerEntry>): boolean {
  return resolveMarketOwner(player, ownerMap).type === 'official';
}

/**
 * Enriquece la lista de jugadores de mercado añadiendo el vendedor (manager) y
 * ajustando el discriminador cuando la API no lo devuelve. Utiliza las
 * plantillas de la liga como fuente de verdad para determinar el propietario.
 */
export function enrichMarketSellers(
  market: MarketPlayer[],
  ownTeam: TeamData,
  rivals: RivalTeam[],
  ownTeamId?: number,
): MarketPlayer[] {
  const ownerMap = buildMarketOwnerMap(ownTeam, rivals, ownTeamId);

  return market.map((entry) => {
    if (entry.sellerTeam?.manager?.managerName) return entry;

    const owner = ownerMap.get(entry.playerMaster.id);
    if (!owner) return entry;

    return {
      ...entry,
      discr: 'marketPlayerTeam' as const,
      sellerTeam: { manager: { managerName: owner.managerName } },
    };
  });
}
