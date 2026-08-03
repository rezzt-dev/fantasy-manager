import { fetchTextWithCache } from './http-cache';
import { buildTeamMatcher, type OfficialTeam } from '../team-names';
import type { TeamElo } from './types';

/**
 * Adaptador ClubElo (§3.3, riesgo bajo): CSV sin auth con el rating Elo de
 * cada club a fecha de hoy. TTL 24 h. Si la fuente cae se sirve la última
 * caché (stale) y se anota en dataQuality.
 */

const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

function eloCsvUrl(): string {
  // Ranking del día (UTC); ClubElo publica un fichero por fecha.
  const today = new Date().toISOString().slice(0, 10);
  return `http://api.clubelo.com/${today}`;
}

export interface TeamElosResult {
  /** teamId oficial → Elo. */
  eloByTeamId: Map<number, number>;
  /** Nombres de la fuente que no cruzaron con ningún equipo oficial. */
  unmatched: string[];
  origin: 'network' | 'cache' | 'stale';
}

export async function fetchTeamElos(officialTeams: OfficialTeam[]): Promise<TeamElosResult | null> {
  const fetched = await fetchTextWithCache('clubelo-ranking', eloCsvUrl(), TTL_MS);
  if (!fetched) return null;

  const matchTeam = buildTeamMatcher(officialTeams);
  const eloByTeamId = new Map<number, number>();
  const unmatched: string[] = [];

  const lines = fetched.text.split('\n').slice(1); // cabecera: Rank,Club,Country,Level,Elo,From,To
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 5) continue;
    const sourceName = parts[1].trim();
    const elo = Number(parts[4]);
    if (!sourceName || !Number.isFinite(elo)) continue;

    const teamId = matchTeam(sourceName);
    if (teamId !== null) {
      eloByTeamId.set(teamId, elo);
    } else if (parts[2] === 'ESP') {
      // Solo nos interesan los fallos de equipos españoles (otros países no cruzan nunca).
      unmatched.push(sourceName);
    }
  }

  if (unmatched.length > 0) {
    console.warn('[clubelo] equipos ESP sin cruzar:', unmatched.join(', '));
  }
  if (eloByTeamId.size === 0) return null;

  return { eloByTeamId, unmatched, origin: fetched.origin };
}
