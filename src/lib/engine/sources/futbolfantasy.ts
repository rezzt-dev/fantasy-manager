import { fetchTextWithCache } from './http-cache';
import { buildTeamMatcher, type OfficialTeam } from '../team-names';
import { normalizePlayerName } from '../features/minutes';
import type { PlayerMaster } from '../../../types/fantasy';
import type { ValueTrend } from './types';

/**
 * Adaptador FútbolFantasy Analytics — Mercado (§3.2, riesgo medio): tendencia
 * de valor de cada jugador de LaLiga Fantasy (variación € y % a 1/7 días e
 * indicador de tendencia). Base del timing de compra/venta (§5.4): comprar
 * antes de subidas, vender antes de bajadas.
 *
 * Estructura verificada (agosto 2026): tabla HTML con una fila `<tr>` por
 * jugador con atributos data-tendencia, data-diferencia1/7 (€) y
 * data-diferencia-pct1/7 (%); nombre en `.player-name span`, equipo en
 * `.player-equipo span` y posición en la clase `icon-{POR|DFC|MED|DEL}`.
 * La página es grande (~3,5 MB): una sola petición cada 12 h.
 */

const URL = 'https://www.futbolfantasy.com/analytics/laliga-fantasy/mercado';
const TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

export interface ValueTrendsResult {
  /** playerId oficial → tendencia. */
  trendsByPlayerId: Map<string, ValueTrend>;
  /** Jugadores de la fuente cruzados / sin cruzar con el catálogo oficial. */
  matched: number;
  unmatched: number;
  origin: 'network' | 'cache' | 'stale';
}

function parseTrendRows(html: string): ValueTrend[] {
  const trends: ValueTrend[] = [];
  // Cada fila de jugador empieza con data-tendencia dentro de un <tr>.
  const rowRe = /<tr[^>]*data-tendencia="(-?\d+)"[^>]*data-aceleracion="[^"]*"[^>]*data-diferencia1="(-?\d+)"[^>]*data-diferencia2="[^"]*"[^>]*data-diferencia3="[^"]*"[^>]*data-diferencia7="(-?\d+)"[^>]*data-diferencia14="[^"]*"[^>]*data-diferencia30="[^"]*"[^>]*data-diferencia-pct1="([^"]*)"[^>]*data-diferencia-pct2="[^"]*"[^>]*data-diferencia-pct3="[^"]*"[^>]*data-diferencia-pct7="([^"]*)"[\s\S]*?(?=<tr[^>]*data-tendencia=|$)/g;

  for (const m of html.matchAll(rowRe)) {
    const row = m[0];
    const name = /<span class="d-none d-md-inline">([^<]+)<\/span>/.exec(row)?.[1];
    const team = /<div class="player-equipo">[\s\S]*?<span>([^<]+)<\/span>/.exec(row)?.[1];
    const position = /class="icon icon-([A-Z]+)"/.exec(row)?.[1];
    if (!name || !team) continue;

    trends.push({
      playerName: name.trim(),
      sourceTeamName: team.trim(),
      positionCode: position ?? '',
      trendScore: Number(m[1]) || 0,
      diff1d: Number(m[2]) || 0,
      diff7d: Number(m[3]) || 0,
      pct1d: Number(m[4]) || 0,
      pct7d: Number(m[5]) || 0,
    });
  }
  return trends;
}

/**
 * Descarga y cruza las tendencias con el catálogo oficial (nombre + equipo).
 * El mismo jugador puede aparecer en varias tablas de la página: se conserva
 * la primera aparición.
 */
export async function fetchValueTrends(
  officialPlayers: PlayerMaster[],
  officialTeams: OfficialTeam[],
): Promise<ValueTrendsResult | null> {
  const fetched = await fetchTextWithCache('ff-analytics-mercado', URL, TTL_MS);
  if (!fetched) return null;

  const rows = parseTrendRows(fetched.text);
  if (rows.length === 0) {
    console.warn('[futbolfantasy] página sin filas de tendencias (¿estructura cambiada?)');
    return null;
  }

  const matchTeam = buildTeamMatcher(officialTeams);

  // Índice nombre-normalizado → jugadores oficiales. El catálogo no siempre
  // trae `name` (solo `nickname`): se indexan ambas formas. Los homónimos se
  // desambiguán por equipo.
  interface NameEntry {
    player: PlayerMaster;
    norm: string;
  }
  const entries: NameEntry[] = [];
  for (const player of officialPlayers) {
    const forms = new Set<string>();
    if (player.name) forms.add(normalizePlayerName(player.name));
    if (player.nickname) forms.add(normalizePlayerName(player.nickname));
    for (const norm of forms) {
      if (norm) entries.push({ player, norm });
    }
  }

  const findPlayer = (row: ValueTrend, teamId: number | null): PlayerMaster | undefined => {
    const ffNorm = normalizePlayerName(row.playerName);
    if (!ffNorm) return undefined;
    const byTeam = (list: NameEntry[]) =>
      list.filter((e) => teamId === null || Number(e.player.teamId) === teamId);

    // 1. Exacto (nombre completo o apodo).
    const exact = byTeam(entries.filter((e) => e.norm === ffNorm));
    if (exact.length > 0) return exact[0].player;

    // 2. Contención de al menos 2 tokens ('inigo ruiz de galarreta' ⊇ 'de galarreta').
    const contained = byTeam(
      entries.filter((e) => {
        const shorter = e.norm.length <= ffNorm.length ? e.norm : ffNorm;
        const longer = e.norm.length <= ffNorm.length ? ffNorm : e.norm;
        return shorter.split(' ').length >= 2 && longer.includes(shorter);
      }),
    );
    if (contained.length > 0) return contained[0].player;

    // 3. Apellido único dentro del equipo (el apodo oficial puede ser 'Purić').
    const surname = ffNorm.split(' ').pop() ?? ffNorm;
    if (surname.length >= 3) {
      const bySurname = byTeam(entries.filter((e) => e.norm.split(' ').includes(surname)));
      const uniquePlayers = [...new Set(bySurname.map((e) => e.player.id))];
      if (uniquePlayers.length === 1) return bySurname[0].player;
    }
    return undefined;
  };

  const trendsByPlayerId = new Map<string, ValueTrend>();
  let unmatched = 0;

  for (const row of rows) {
    const teamId = matchTeam(row.sourceTeamName);
    const player = findPlayer(row, teamId);
    if (!player || trendsByPlayerId.has(player.id)) {
      if (!player) unmatched += 1;
      continue;
    }
    trendsByPlayerId.set(player.id, row);
  }

  return { trendsByPlayerId, matched: trendsByPlayerId.size, unmatched, origin: fetched.origin };
}
