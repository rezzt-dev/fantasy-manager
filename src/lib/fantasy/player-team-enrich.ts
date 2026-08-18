import type { PlayerMaster } from '../../types/fantasy';
import { fetchTeamsMaster } from './teams';

/**
 * Enriquece los objetos `PlayerMaster` que llegan desde la API oficial con el
 * nombre del equipo real cuando la respuesta lo omite (`Sin equipo`).
 *
 * Se aplica de forma recursiva sobre arrays y objetos, de modo que funciona
 * tanto para listados de jugadores (`PlayerMaster[]`), mercado
 * (`MarketPlayer[]`), plantillas (`TeamData`), alineaciones (`TeamLineup`) y
 * detalles de un jugador.
 */

let teamNameCache: { expiresAt: number; map: Map<number, string> } | null = null;
const TEAM_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export async function fetchTeamNameMap(token: string): Promise<Map<number, string>> {
  if (teamNameCache && teamNameCache.expiresAt > Date.now()) {
    return teamNameCache.map;
  }

  const teams = await fetchTeamsMaster(token);
  const map = new Map(teams.map((t) => [t.id, t.name]));
  teamNameCache = { expiresAt: Date.now() + TEAM_CACHE_TTL_MS, map };
  return map;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function enrichPlayerMasterTeam(player: PlayerMaster, teamNames: Map<number, string>): PlayerMaster {
  const teamId = Number(player.teamId);
  const name = Number.isFinite(teamId) && teamId > 0 ? teamNames.get(teamId) : undefined;

  if (!name) return player;

  if (!player.team || !player.team.name) {
    player.team = {
      id: String(teamId),
      name,
      slug: player.team?.slug || slugify(name),
    };
  }

  return player;
}

function isPlayerMasterLike(obj: unknown): obj is Record<string, unknown> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'nickname' in obj &&
    ('teamId' in obj || 'team' in obj)
  );
}

function isPlainObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj) && obj.constructor === Object;
}

export function enrichResponseTeams<T>(data: T, teamNames: Map<number, string>): T {
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      data[i] = enrichResponseTeams(data[i], teamNames);
    }
    return data;
  }

  if (!isPlainObject(data)) return data;

  // Si el objeto es un PlayerMaster directo, enriquecerlo.
  if (isPlayerMasterLike(data)) {
    enrichPlayerMasterTeam(data as unknown as PlayerMaster, teamNames);
  }

  // Si tiene un playerMaster anidado (MarketPlayer, TeamPlayer, etc.), enriquecerlo.
  if (data.playerMaster && isPlayerMasterLike(data.playerMaster)) {
    enrichPlayerMasterTeam(data.playerMaster as unknown as PlayerMaster, teamNames);
  }

  // Recorrer el resto de propiedades por si hay más jugadores anidados.
  const record = data as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (Array.isArray(value) || isPlainObject(value)) {
      record[key] = enrichResponseTeams(value, teamNames);
    }
  }

  return data;
}

/**
 * Comprueba si un objeto JSON parseado contiene algún jugador cuyo equipo
 * pueda enriquecerse.
 */
export function mayNeedTeamEnrichment(data: unknown): boolean {
  if (isPlayerMasterLike(data)) return true;
  if (Array.isArray(data)) return data.some(mayNeedTeamEnrichment);
  if (!isPlainObject(data)) return false;

  if (data.playerMaster && isPlayerMasterLike(data.playerMaster)) return true;

  return Object.values(data).some(mayNeedTeamEnrichment);
}
