import { fetchTextWithCache } from './http-cache';
import type { SofaEvent, SofaIncident } from './sofascore';
import type { MatchLineup, MatchLineupSide } from '../../../types/fantasy';

// API pública no oficial. HTTP nativo: no necesita binarios ni un proxy externo.
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1';
interface Team { id: string; displayName: string; abbreviation?: string; logo?: string; logos?: { href: string }[] }
interface Status { displayClock?: string; period?: number; type?: { name?: string; state?: string; completed?: boolean } }
interface Competition {
  id: string; date: string; status?: Status;
  competitors: { homeAway: string; team: Team; score?: string }[];
}
interface Athlete { id?: string; displayName?: string; shortName?: string }
interface Roster {
  homeAway: string; team: Team; formation?: string;
  roster?: { athlete?: Athlete; starter?: boolean; jersey?: string; position?: { abbreviation?: string } }[];
}
interface KeyEvent {
  type?: { type?: string }; clock?: { displayValue?: string }; team?: { id: string };
  participants?: { athlete?: Athlete }[]; scoringPlay?: boolean; shootout?: boolean;
}
export interface EspnSummary {
  header?: { competitions?: Competition[] };
  rosters?: Roster[];
  keyEvents?: KeyEvent[];
}
export interface EspnMatch {
  /** Forma normalizada compartida con el adaptador existente; los IDs son de ESPN. */
  event: SofaEvent;
  homeLogo?: string;
  awayLogo?: string;
  stale: boolean;
}

export function parseMatchClock(value?: string): number | undefined {
  const parts = value?.match(/^(\d+)(?:['’]?\s*\+\s*(\d+))?/);
  return parts ? Number(parts[1]) + Number(parts[2] ?? 0) : undefined;
}

export function mapEspnCompetition(c: Competition): SofaEvent | null {
  if (!c || !Array.isArray(c.competitors)) return null;
  const home = c.competitors?.find(t => t.homeAway === 'home');
  const away = c.competitors?.find(t => t.homeAway === 'away');
  const timestamp = Date.parse(c.date) / 1000;
  if (!home?.team?.displayName || !away?.team?.displayName || !Number.isFinite(timestamp) || !Number.isFinite(Number(c.id))) return null;
  const s = c.status?.type;
  const name = s?.name ?? '';
  const type = name.includes('POSTPONED') ? 'postponed'
    : /CANCEL/.test(name) ? 'canceled'
    : name === 'STATUS_HALFTIME' ? 'halftime'
    : s?.completed ? 'finished'
    : s?.state === 'in' ? 'inprogress'
    : s?.state === 'pre' ? 'notstarted' : 'unknown';
  const team = (t: Team) => ({ id: Number(t.id), name: t.displayName, shortName: t.abbreviation ?? t.displayName, slug: '' });
  const score = (v?: string) => v != null && v !== '' && Number.isFinite(Number(v)) && type !== 'notstarted' ? Number(v) : undefined;
  return {
    id: Number(c.id), homeTeam: team(home.team), awayTeam: team(away.team), startTimestamp: timestamp,
    status: { code: 0, type }, homeScore: { current: score(home.score) }, awayScore: { current: score(away.score) },
    time: { currentMinute: parseMatchClock(c.status?.displayClock), period: (c.status?.period ?? 1) >= 2 ? 'secondHalf' : 'firstHalf' },
  };
}

async function fetchJson<T>(key: string, path: string): Promise<{ data: T; stale: boolean } | null> {
  const result = await fetchTextWithCache(key, `${BASE}${path}`, 60_000, async url => {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`ESPN HTTP ${response.status}`);
    const text = await response.text();
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || parsed.error
      || (path.startsWith('/scoreboard') ? !Array.isArray(parsed.events) : !Array.isArray(parsed.header?.competitions))) {
      throw new Error('Respuesta ESPN inválida');
    }
    return text;
  });
  if (!result) return null;
  try {
    const data = JSON.parse(result.text);
    if (path.startsWith('/scoreboard') ? !Array.isArray(data?.events) : !Array.isArray(data?.header?.competitions)) return null;
    return { data: data as T, stale: result.origin === 'stale' };
  }
  catch { return null; }
}

export async function fetchEspnMatches(from: number, to: number): Promise<EspnMatch[]> {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
  const day = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 10).replaceAll('-', '');
  const dates = `${day(from)}-${day(to)}`;
  const result = await fetchJson<{ events?: { competitions?: Competition[] }[] }>(`espn-board-${dates}`, `/scoreboard?dates=${dates}&limit=1000`);
  return (result?.data.events ?? []).flatMap(item => {
    const c = item?.competitions?.[0];
    const event = c && mapEspnCompetition(c);
    if (!event) return [];
    const logo = (side: string) => { const t = c!.competitors.find(t => t.homeAway === side)?.team; return t?.logo ?? t?.logos?.[0]?.href; };
    return [{ event, homeLogo: logo('home'), awayLogo: logo('away'), stale: result!.stale }];
  });
}

export function mapEspnLineups(rosters?: Roster[]): MatchLineup | undefined {
  const side = (which: string): MatchLineupSide | undefined => {
    const r = rosters?.find(r => r.homeAway === which);
    if (!r) return;
    const players = (r.roster ?? []).filter(p => p.athlete?.displayName).map(p => ({
      id: p.athlete!.id, name: p.athlete!.displayName!, shortName: p.athlete!.shortName,
      number: p.jersey, position: p.position?.abbreviation, isStarter: p.starter === true,
    }));
    const starters = players.filter(p => p.isStarter);
    // No confundir la plantilla o una convocatoria incompleta con el once.
    if (starters.length !== 11) return;
    return { teamName: r.team.displayName, formation: r.formation, starters, bench: players.filter(p => !p.isStarter) };
  };
  const home = side('home'); const away = side('away');
  return home && away ? { home, away } : undefined;
}

export function mapEspnIncidents(events: KeyEvent[] | undefined, homeId: number): SofaIncident[] {
  return (events ?? []).flatMap<SofaIncident>(e => {
    if (e.shootout) return [];
    const type = e.type?.type ?? '';
    const player = (index: number) => { const a = e.participants?.[index]?.athlete; return a?.displayName ? { name: a.displayName, shortName: a.shortName ?? a.displayName } : undefined; };
    const common = { time: parseMatchClock(e.clock?.displayValue), isHome: e.team ? Number(e.team.id) === homeId : undefined };
    if (e.scoringPlay || ['goal', 'own-goal', 'penalty---scored', 'penalty-scored'].includes(type)) return [{ ...common, incidentType: 'goal', player: player(0), reason: type === 'own-goal' ? 'propia puerta' : undefined }];
    if (['yellow-card', 'red-card', 'yellow-red-card', 'second-yellow-card'].includes(type)) return [{ ...common, incidentType: 'card', player: player(0), incidentClass: type === 'yellow-card' ? 'yellow' : type === 'red-card' ? 'red' : 'yellowRed' }];
    if (type === 'substitution') return [{ ...common, incidentType: 'substitution', playerIn: player(0), playerOut: player(1) }];
    return [];
  });
}

export async function fetchEspnMatchDetails(id: number) {
  const result = await fetchJson<EspnSummary>(`espn-summary-${id}`, `/summary?event=${id}`);
  if (!result) return null;
  const c = result.data.header?.competitions?.[0];
  const event = c && mapEspnCompetition(c);
  if (!event) return null;
  return { event, lineups: mapEspnLineups(result.data.rosters), incidents: mapEspnIncidents(result.data.keyEvents, event.homeTeam.id), incidentsAvailable: Array.isArray(result.data.keyEvents), stale: result.stale };
}
