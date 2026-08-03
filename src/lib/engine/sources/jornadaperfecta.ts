import { fetchTextWithCache } from './http-cache';
import { buildTeamMatcher, type OfficialTeam } from '../team-names';
import type { InjuryReportEntry, ProbableLineupPlayer, ProbableMatch } from './types';

/**
 * Adaptador Jornada Perfecta (§3.2, riesgo bajo-medio): onces probables por
 * partido y bajas/dudas de la jornada. Es la fuente principal de probabilidad
 * de titularidad (§4.4).
 *
 * Estructura verificada (agosto 2026): el índice /onces-posibles/ enlaza las
 * páginas de partido de la jornada actual (`match-link current-round-content`
 * → /partido/{id}/{local}-{visitante}); cada página tiene dos bloques
 * `campo-futbol` (local y visitante) con 11 jugadores (slug, probabilidad en
 * `percent-budget`, alternativas "Nombre 40%") y una sección `#unavailable`
 * con las bajas (slug, estado, nota de vuelta).
 *
 * TTL 3 h (los onces cambian conforme se acerca el partido). ~11 peticiones
 * por refresco como máximo.
 */

const BASE_URL = 'https://www.jornadaperfecta.com';
const TTL_MS = 3 * 60 * 60 * 1000; // 3 horas

export interface ProbableData {
  matches: ProbableMatch[];
  injuries: InjuryReportEntry[];
  /** Nombres de equipo de la fuente sin cruce oficial. */
  unmatchedTeams: string[];
  /** 'stale' si alguna pieza vino de caché caducada. */
  origin: 'network' | 'cache' | 'stale';
}

interface MatchLink {
  url: string;
  slug: string;
}

function extractMatchLinks(indexHtml: string): MatchLink[] {
  const links: MatchLink[] = [];
  const seen = new Set<string>();
  const re = /match-link current-round-content[^>]*href="(https:\/\/www\.jornadaperfecta\.com\/partido\/(\d+)\/([^"]+))"/g;
  for (const m of indexHtml.matchAll(re)) {
    if (seen.has(m[2])) continue;
    seen.add(m[2]);
    links.push({ url: m[1], slug: m[3] });
  }
  return links;
}

function parsePlayers(block: string): ProbableLineupPlayer[] {
  const players: ProbableLineupPlayer[] = [];
  // <a class='player ...' href='.../jugador/{slug}'>...<img ... alt='{Nombre}'/>... [<div class='percent-budget'>60</div>]
  const re = /<a class='player[^']*'[^>]*href='https:\/\/www\.jornadaperfecta\.com\/jugador\/([^']+)'[^>]*>[\s\S]*?alt='([^']+)'[^>]*\/>(?:<div class='percent-budget'>(\d+)<\/div>)?/g;
  for (const m of block.matchAll(re)) {
    players.push({
      slug: m[1],
      name: m[2].trim(),
      probability: m[3] ? Number(m[3]) : 100,
    });
  }
  return players;
}

function parseAlternatives(block: string): ProbableLineupPlayer[] {
  const alternatives: ProbableLineupPlayer[] = [];
  // <div class='alternative'><span>D. Suárez 40%</span></div>
  const re = /<div class='alternative'><span>([^<]+)<\/span><\/div>/g;
  for (const m of block.matchAll(re)) {
    const text = m[1].trim();
    const pctMatch = /(\d+)\s*%?\s*$/.exec(text);
    const probability = pctMatch ? Number(pctMatch[1]) : 50;
    const name = pctMatch ? text.slice(0, pctMatch.index).trim() : text;
    alternatives.push({ slug: '', name, probability });
  }
  return alternatives;
}

function parseStatus(text: string): InjuryReportEntry['status'] {
  const t = text.toLowerCase();
  if (t.includes('lesionado')) return 'injured';
  if (t.includes('sancionado')) return 'suspended';
  if (t.includes('duda')) return 'doubt';
  return 'other';
}

function parseMatchPage(html: string): { match: ProbableMatch; injuries: InjuryReportEntry[] } | null {
  // Local/visitante: metadatos schema.org si están, si no el <title> ("A - B |").
  let homeName = /<div style="display:none" itemprop="homeTeam"><meta itemprop="name" content="([^"]+)"/.exec(html)?.[1];
  let awayName = /<div style="display:none" itemprop="awayTeam"><meta itemprop="name" content="([^"]+)"/.exec(html)?.[1];
  if (!homeName || !awayName) {
    const title = /<title>([^<]+)<\/title>/.exec(html)?.[1];
    const names = title ? /^(.+?)\s+-\s+(.+?)\s*\|/.exec(title) : null;
    if (names) {
      homeName = homeName ?? names[1].trim();
      awayName = awayName ?? names[2].trim();
    }
  }
  const dateMatch = /<time itemprop="startDate" content="([^"]+)"/.exec(html);

  // Bloques de alineación: cada `campo-futbol` va seguido del escudo del equipo.
  const blocks = [...html.matchAll(/campo-futbol/g)].map((m) => m.index!);
  const lineups: ProbableMatch['lineups'] = [];
  for (let i = 0; i < blocks.length; i++) {
    const start = blocks[i];
    const end = i + 1 < blocks.length ? blocks[i + 1] : html.indexOf('id="unavailable"', start);
    const block = html.slice(start, end > start ? end : start + 20000);
    const teamMatch = /escudo-equipo-alineacion[^>]*>\s*<img[^>]*title='([^']+)'/.exec(block);
    if (!teamMatch) continue;
    lineups.push({
      sourceTeamName: teamMatch[1],
      starters: parsePlayers(block),
      alternatives: parseAlternatives(block),
    });
  }
  if (lineups.length === 0) return null;

  // Respaldo final: el orden de los bloques (local primero).
  homeName = homeName ?? lineups[0].sourceTeamName;
  awayName = awayName ?? lineups[1]?.sourceTeamName ?? homeName;

  // Bajas: sección #unavailable (tarjetas con slug, estado y nota de vuelta).
  const injuries: InjuryReportEntry[] = [];
  const unavailableIdx = html.indexOf('id="unavailable"');
  if (unavailableIdx >= 0) {
    const section = html.slice(unavailableIdx, unavailableIdx + 15000);
    const re = /<a href="https:\/\/www\.jornadaperfecta\.com\/jugador\/([^/"]+)\/?" class="column center fifa-card">[\s\S]*?<span class="bold font-size-12 name" title="[^"]*">([^<]+)<\/span>[\s\S]*?<span class="capitalize text text-center"[^>]*>([^<]+)<\/span>[\s\S]*?<span class=" text text-center"[^>]*>([^<]*)<\/span>/g;
    for (const m of section.matchAll(re)) {
      injuries.push({
        slug: m[1],
        name: m[2].trim(),
        status: parseStatus(m[3]),
        note: m[4].trim() || undefined,
      });
    }
  }

  return {
    match: {
      homeSourceName: homeName,
      awaySourceName: awayName,
      matchDate: dateMatch?.[1],
      lineups,
    },
    injuries,
  };
}

/**
 * Descarga los onces probables y las bajas de la jornada actual.
 * `officialTeams` sirve para anotar qué equipos no cruzan (dataQuality).
 */
export async function fetchProbableLineups(officialTeams: OfficialTeam[]): Promise<ProbableData | null> {
  const index = await fetchTextWithCache('jp-onces-index', `${BASE_URL}/onces-posibles/`, TTL_MS);
  if (!index) return null;

  const links = extractMatchLinks(index.text);
  if (links.length === 0) {
    console.warn('[jornadaperfecta] índice sin partidos de la jornada actual');
    return null;
  }

  const matchTeam = buildTeamMatcher(officialTeams);
  const matches: ProbableMatch[] = [];
  const injuries: InjuryReportEntry[] = [];
  const unmatched = new Set<string>();
  let origin: ProbableData['origin'] = index.origin;

  for (const link of links) {
    const page = await fetchTextWithCache(`jp-partido-${link.slug}`, link.url, TTL_MS);
    if (!page) continue;
    if (page.origin === 'stale') origin = 'stale';
    else if (page.origin === 'network' && origin === 'cache') origin = 'network';

    const parsed = parseMatchPage(page.text);
    if (!parsed) {
      console.warn(`[jornadaperfecta] página de partido sin estructura esperada: ${link.slug}`);
      continue;
    }
    for (const name of [parsed.match.homeSourceName, parsed.match.awaySourceName]) {
      if (matchTeam(name) === null) unmatched.add(name);
    }
    matches.push(parsed.match);
    injuries.push(...parsed.injuries);
  }

  if (unmatched.size > 0) {
    console.warn('[jornadaperfecta] equipos sin cruzar:', [...unmatched].join(', '));
  }

  return { matches, injuries, unmatchedTeams: [...unmatched], origin: matches.length > 0 ? origin : 'stale' };
}
