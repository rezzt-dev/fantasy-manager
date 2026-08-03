import { fetchOfficialAPI } from './api-proxy';
import type { OfficialTeam } from '../engine/team-names';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

interface TeamMasterEntry {
  id: number | string;
  name: string;
  slug?: string;
}

let cache: { expiresAt: number; teams: OfficialTeam[] } | null = null;

/**
 * Lista oficial de equipos de la competición (id, nombre) de
 * `/v3/teams-master`. Es la referencia para cruzar fuentes externas.
 * Se cachea 24 h; si falla devuelve lista vacía (matching desactivado).
 */
export async function fetchTeamsMaster(token: string): Promise<OfficialTeam[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.teams;

  try {
    const teams = await fetchOfficialAPI<TeamMasterEntry[]>('/v3/teams-master', token);
    if (Array.isArray(teams) && teams.length > 0) {
      const official = teams.map((t) => ({ id: Number(t.id), name: t.name })).filter((t) => Number.isFinite(t.id));
      cache = { expiresAt: Date.now() + CACHE_TTL_MS, teams: official };
      return official;
    }
  } catch (error) {
    console.warn('[teams-master] fetch failed:', error instanceof Error ? error.message : error);
  }

  return [];
}
