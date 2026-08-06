import type { MarketPlayer, PlayerMaster } from '../../types/fantasy';

/**
 * La API de mercado a veces devuelve jugadores con el campo `team` vacío en
 * `playerMaster`, aunque el catálogo global sí incluye su equipo. Esto hace que
 * aparezcan "Sin equipo" en el mercado pese a pertenecer a un club real.
 *
 * Este helper enriquece los jugadores de mercado con el equipo del catálogo
 * (`/players`) cuando falta el nombre o el slug. También repone `teamId` si
 * viene a 0, ya que el motor usa ese identificador para fixtures y localía.
 */
export function enrichMarketPlayers(market: MarketPlayer[], allPlayers: PlayerMaster[]): MarketPlayer[] {
  const catalogById = new Map<string, PlayerMaster>();
  for (const p of allPlayers) {
    catalogById.set(p.id, p);
  }

  return market.map((entry) => {
    const catalogPlayer = catalogById.get(entry.playerMaster.id);
    if (!catalogPlayer) return entry;

    const player = { ...entry.playerMaster };

    // Reparar el objeto team (nombre, id y slug) si falta información clave.
    const catalogTeam = catalogPlayer.team;
    if (catalogTeam && (!player.team || !player.team.name || !player.team.slug)) {
      player.team = { ...catalogTeam };
    }

    // Reparar teamId numérico cuando la API del mercado lo omite o pone 0.
    const catalogTeamId = Number(catalogPlayer.teamId);
    if (Number.isFinite(catalogTeamId) && catalogTeamId > 0 && (!player.teamId || player.teamId === 0)) {
      player.teamId = catalogTeamId;
    }

    // Si el catálogo tiene teamId pero no objeto team, construir uno mínimo
    // con el id; el nombre seguirá sin aparecer, pero al menos se mantiene
    // la consistencia del identificador para el motor.
    if (!player.team && Number.isFinite(catalogTeamId) && catalogTeamId > 0) {
      player.team = { id: String(catalogTeamId), name: '', slug: '' };
    }

    return { ...entry, playerMaster: player };
  });
}

/** Comprueba si un jugador de mercado tiene datos de equipo incompletos. */
export function marketPlayerNeedsTeamFix(player: MarketPlayer['playerMaster']): boolean {
  if (!player.team || !player.team.name || !player.team.slug) return true;
  const teamId = Number(player.teamId);
  return !Number.isFinite(teamId) || teamId <= 0;
}
