import { normalize } from './classifier';
import type { NewsItem } from './rss';

export interface NewsPlayer {
  id: string;
  name: string;
  nickname?: string;
  /** Nombre del equipo real: desambigua apellidos compartidos (García/López). */
  teamName?: string;
}

/** Noticias más antiguas que esto se ignoran (la jornada cambia cada semana). */
const MAX_NEWS_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Contextos ajenos a LaLiga masculina: evitan falsos positivos al clasificar
 * (p. ej. un "Andrés Martín" del fútbol femenino o de otro deporte).
 */
const CONTEXT_BLACKLIST = [
  'femenin', 'femenil', 'liga f', 'womens', 'baloncesto', 'basket',
  'nba', 'acb', 'tenis', 'padel', 'ciclismo', 'motogp',
  'formula 1', 'atletismo', 'natacion', 'boxeo', 'ufc',
  'balonmano', 'futbol sala', 'futsal', 'hockey', 'rugby', 'golf',
];

/** true si la noticia es del contexto que nos interesa (fútbol masculino LaLiga). */
export function isRelevantContext(item: NewsItem): boolean {
  const text = normalize(`${item.title} ${item.description}`);
  return !CONTEXT_BLACKLIST.some((term) => text.includes(term));
}

interface PlayerPattern {
  playerId: string;
  /** Nombre completo y apodo: coincidencia fuerte. */
  strong: RegExp[];
  /** Apellidos individuales: coincidencia débil (puede ser otro jugador). */
  weak: { token: string; re: RegExp }[];
  /** Tokens del nombre del equipo para desambiguar coincidencias débiles. */
  teamTokens: string[];
}

const STOPWORDS = new Set([
  'de', 'del', 'la', 'los', 'las', 'el', 'san', 'santa', 'van', 'von', 'jr',
]);

function wordBoundary(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
}

/**
 * Construye patrones de búsqueda para un jugador:
 * - fuertes: nombre completo (`name`) y apodo (`nickname`)
 * - débiles: apellidos (tokens tras el nombre de pila) de >= 4 caracteres
 */
function buildPatterns(player: NewsPlayer): PlayerPattern {
  const strong: RegExp[] = [];
  const weak: { token: string; re: RegExp }[] = [];
  const fullName = normalize(player.name || '');
  const nickname = normalize(player.nickname || '');

  if (fullName.length >= 3) strong.push(wordBoundary(fullName));
  if (nickname.length >= 3 && nickname !== fullName) strong.push(wordBoundary(nickname));

  // El primer token es el nombre de pila: fuera de los patrones débiles
  // (un "Pedro" suelto casa con cualquier Pedro de cualquier equipo).
  for (const part of fullName.split(/\s+/).slice(1)) {
    if (part.length >= 4 && !STOPWORDS.has(part)) {
      weak.push({ token: part, re: wordBoundary(part) });
    }
  }

  const teamTokens = normalize(player.teamName || '')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));

  return { playerId: player.id, strong, weak, teamTokens };
}

export function isRecent(item: NewsItem, now = Date.now()): boolean {
  if (!item.publishedAt) return true; // sin fecha: asumimos vigente
  const time = Date.parse(item.publishedAt);
  if (Number.isNaN(time)) return true;
  return now - time <= MAX_NEWS_AGE_MS;
}

/**
 * Devuelve, para cada jugador, las noticias que lo mencionan.
 * Desambiguación por equipo (§4.6): si un apellido es compartido por varios
 * jugadores seguidos, la coincidencia débil solo cuenta si la noticia menciona
 * también al equipo (acaba con los García/López cruzados).
 */
export function matchNewsToPlayers(
  players: NewsPlayer[],
  items: NewsItem[],
): Record<string, NewsItem[]> {
  const playerPatterns = players.map(buildPatterns);

  // Apellidos compartidos dentro del conjunto seguido.
  const surnameCount = new Map<string, number>();
  for (const pattern of playerPatterns) {
    for (const { token } of pattern.weak) {
      surnameCount.set(token, (surnameCount.get(token) || 0) + 1);
    }
  }

  const result: Record<string, NewsItem[]> = {};

  for (const item of items) {
    if (!isRecent(item)) continue;
    if (!isRelevantContext(item)) continue;
    const text = normalize(`${item.title} ${item.description}`);

    for (const pattern of playerPatterns) {
      if (pattern.strong.length === 0 && pattern.weak.length === 0) continue;

      const strongHit = pattern.strong.some((re) => re.test(text));
      const weakHitToken = pattern.weak.find(({ re }) => re.test(text))?.token;
      if (!strongHit && !weakHitToken) continue;

      // Apellido compartido y sin nombre completo: exigir mención del equipo.
      if (!strongHit && weakHitToken && (surnameCount.get(weakHitToken) || 0) > 1) {
        const teamMentioned = pattern.teamTokens.length > 0 && pattern.teamTokens.some((t) => text.includes(t));
        if (!teamMentioned) continue;
      }

      (result[pattern.playerId] ||= []).push(item);
    }
  }

  return result;
}
