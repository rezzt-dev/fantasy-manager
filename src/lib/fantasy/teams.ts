import { fetchOfficialAPI } from './api-proxy';
import type { OfficialTeam } from '../engine/team-names';
import type { TeamCatalogEntry } from '../../types/fantasy';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

interface TeamMasterEntry {
  id: number | string;
  name: string;
  shortName?: string;
  slug?: string;
  badgeColor?: string;
  badgeWhite?: string;
}

let cache: { expiresAt: number; teams: TeamCatalogEntry[] } | null = null;

/**
 * Catálogo oficial de equipos (`/v3/teams-master`): id, nombre, nombre corto,
 * slug y escudos. Es la referencia para cruzar fuentes externas y para pintar
 * escudos en la UI. Se cachea 24 h; si falla devuelve lista vacía.
 */
export async function fetchTeamsCatalog(token: string): Promise<TeamCatalogEntry[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.teams;

  try {
    const teams = await fetchOfficialAPI<TeamMasterEntry[]>('/v3/teams-master', token);
    if (Array.isArray(teams) && teams.length > 0) {
      const catalog = teams
        .map((t) => ({
          id: Number(t.id),
          name: t.name,
          shortName: t.shortName ?? '',
          slug: t.slug ?? '',
          badgeColor: t.badgeColor ?? '',
          badgeWhite: t.badgeWhite ?? '',
        }))
        .filter((t) => Number.isFinite(t.id) && !!t.name);
      cache = { expiresAt: Date.now() + CACHE_TTL_MS, teams: catalog };
      return catalog;
    }
  } catch (error) {
    console.warn('[teams-master] fetch failed:', error instanceof Error ? error.message : error);
  }

  return [];
}

/**
 * Lista oficial de equipos reducida a (id, nombre), que es lo que necesita el
 * matcher de nombres para cruzar fuentes externas.
 */
export async function fetchTeamsMaster(token: string): Promise<OfficialTeam[]> {
  const catalog = await fetchTeamsCatalog(token);
  return catalog.map((t) => ({ id: t.id, name: t.name }));
}
