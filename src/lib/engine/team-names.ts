/**
 * Normalización de nombres de equipo para cruzar fuentes externas (ClubElo,
 * Jornada Perfecta, FútbolFantasy) con los equipos oficiales de la API.
 *
 * Estrategia: normalizar todo a minúsculas sin tildes, sin tokens corporativos
 * (fc, cf, ud, rc, real, club...) ni tokens de una letra ("C.A.", "R."), y
 * resolver los pocos casos residuales con una tabla de alias explícita. Los
 * fallos de matching se loguean y devuelven null — nunca se adivina.
 */

const DROP_TOKENS = new Set([
  'fc', 'cf', 'ud', 'rc', 'rcd', 'cd', 'ca', 'sd', 'ad', 'de', 'club', 'real', 'sad', 'cfc',
]);

/** Alias residuales: nombre normalizado de la fuente → nombre normalizado oficial. */
const NAME_ALIASES: Record<string, string> = {
  atletico: 'atletico madrid',
  vallecano: 'rayo vallecano',
  alaves: 'deportivo alaves',
  // ClubElo usa nombres de ciudad para estos equipos.
  bilbao: 'athletic',
  santander: 'racing',
  depor: 'deportivo',
};

export function normalizeTeamName(name: string): string {
  const tokens = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !DROP_TOKENS.has(token));
  const normalized = tokens.join(' ').trim();
  return NAME_ALIASES[normalized] ?? normalized;
}

export interface OfficialTeam {
  id: number;
  name: string;
}

export type TeamMatcher = (sourceName: string) => number | null;

/**
 * Construye el matcher nombre-de-fuente → teamId oficial a partir de la lista
 * oficial (teams-master). Los fallos devuelven null (el consumidor lo anota
 * en dataQuality); nunca se adivina.
 */
export function buildTeamMatcher(officialTeams: OfficialTeam[]): TeamMatcher {
  const byNormalized = new Map<string, number>();
  for (const team of officialTeams) {
    const key = normalizeTeamName(team.name);
    if (!key) {
      console.warn(`[team-names] nombre oficial no normalizable: ${team.name}`);
      continue;
    }
    if (byNormalized.has(key) && byNormalized.get(key) !== team.id) {
      console.warn(`[team-names] nombre normalizado duplicado: ${key} (${byNormalized.get(key)} y ${team.id})`);
    }
    byNormalized.set(key, team.id);
  }
  return (sourceName: string) => byNormalized.get(normalizeTeamName(sourceName)) ?? null;
}
