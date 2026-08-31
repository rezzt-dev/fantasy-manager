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

/** Sufijos de filial: se conservan aunque sean tokens de una sola letra. */
const FILIAL_SUFFIXES = new Set(['b', 'ii']);

/**
 * Alias: nombre normalizado de la fuente → nombre normalizado oficial.
 * Se aplican en ambos sentidos: el nombre oficial también se indexa bajo la
 * variante inversa para que un sourceName como "Celta Vigo" encuentre a
 * "Celta", y viceversa.
 */
const NAME_ALIASES: Record<string, string> = {
  atletico: 'atletico madrid',
  vallecano: 'rayo vallecano',
  alaves: 'deportivo alaves',
  // ClubElo usa nombres de ciudad para estos equipos.
  bilbao: 'athletic',
  santander: 'racing',
  depor: 'deportivo',
  // SofaScore / fuentes externas vs. nombres cortos de LaLiga Fantasy.
  'celta vigo': 'celta',
  'deportivo coruna': 'deportivo',
};

/** Expande los alias en ambos sentidos sin perder el mapeo directo. */
function expandAliases(aliases: Record<string, string>): Record<string, string[]> {
  const expanded: Record<string, string[]> = {};
  for (const [source, official] of Object.entries(aliases)) {
    expanded[source] = [official];
    expanded[official] = expanded[official] ?? [];
    expanded[official].push(source);
  }
  return expanded;
}

const EXPANDED_ALIASES = expandAliases(NAME_ALIASES);

export function normalizeTeamName(name: string): string {
  const rawTokens = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  // El marcador de filial va siempre al final ("R. Sociedad B") y es lo único
  // que lo distingue del primer equipo. Se extrae antes de descartar tokens de
  // una letra para no colapsar "Real Sociedad" y "R. Sociedad B" en el mismo
  // nombre normalizado.
  const lastToken = rawTokens[rawTokens.length - 1];
  const filial = lastToken && FILIAL_SUFFIXES.has(lastToken) ? lastToken : null;
  const baseTokens = filial ? rawTokens.slice(0, -1) : rawTokens;

  const tokens = baseTokens.filter((token) => token.length > 1 && !DROP_TOKENS.has(token));
  const base = tokens.join(' ').trim();
  const normalized = filial ? `${base} ${filial}`.trim() : base;
  return NAME_ALIASES[normalized] ?? normalized;
}

/** Devuelve las variantes normalizadas de un nombre (directa + alias inversos). */
function nameVariations(name: string): string[] {
  const normalized = normalizeTeamName(name);
  const inverses = EXPANDED_ALIASES[normalized] ?? [];
  const variations = new Set([normalized, ...inverses]);
  return [...variations].filter(Boolean);
}

export interface OfficialTeam {
  id: number;
  name: string;
}

export type TeamMatcher = (sourceName: string) => number | null;

/**
 * Los avisos de normalización describen el catálogo, no la petición: se
 * construye un matcher por consulta y sin esto el mismo aviso se repetiría en
 * cada una, inundando el log.
 */
const warnedKeys = new Set<string>();

function warnOnce(message: string): void {
  if (warnedKeys.has(message)) return;
  warnedKeys.add(message);
  console.warn(message);
}

/**
 * Construye el matcher nombre-de-fuente → teamId oficial a partir de la lista
 * oficial (teams-master). Indexa variaciones de alias en ambos sentidos para
 * que pequeñas diferencias de nomenclatura ("Celta" vs "Celta Vigo") no
 * impidan el cruce. Los fallos devuelven null (el consumidor lo anota en
 * dataQuality); nunca se adivina.
 */
export function buildTeamMatcher(officialTeams: OfficialTeam[]): TeamMatcher {
  const byNormalized = new Map<string, number>();
  for (const team of officialTeams) {
    const variations = nameVariations(team.name);
    if (variations.length === 0) {
      warnOnce(`[team-names] nombre oficial no normalizable: ${team.name}`);
      continue;
    }
    for (const key of variations) {
      if (byNormalized.has(key) && byNormalized.get(key) !== team.id) {
        warnOnce(`[team-names] nombre normalizado duplicado: ${key} (${byNormalized.get(key)} y ${team.id})`);
        continue;
      }
      byNormalized.set(key, team.id);
    }
  }
  return (sourceName: string) => {
    for (const key of nameVariations(sourceName)) {
      const id = byNormalized.get(key);
      if (id !== undefined) return id;
    }
    return null;
  };
}
