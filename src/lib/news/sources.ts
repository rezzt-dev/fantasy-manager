import { getEnvOptional } from '../env';

export interface NewsFeedSource {
  name: string;
  url: string;
}

/**
 * Feeds RSS de prensa deportiva española verificados (HTTP 200).
 * Se pueden sobrescribir con la variable de entorno NEWS_RSS_FEEDS
 * (lista de URLs separadas por comas).
 */
export const DEFAULT_NEWS_FEEDS: NewsFeedSource[] = [
  { name: 'Marca', url: 'https://e00-marca.uecdn.es/rss/futbol/primera-division.xml' },
  { name: 'AS', url: 'https://feeds.as.com/mrss-s/pages/as/site/as.com/section/futbol/portada/' },
  { name: 'Mundo Deportivo', url: 'https://www.mundodeportivo.com/rss/futbol.xml' },
  { name: 'Sport', url: 'https://www.sport.es/es/rss/' },
  { name: '20minutos', url: 'https://www.20minutos.es/rss/deportes/' },
];

export function resolveNewsFeeds(): NewsFeedSource[] {
  const fromEnv = getEnvOptional('NEWS_RSS_FEEDS')
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!fromEnv || fromEnv.length === 0) return DEFAULT_NEWS_FEEDS;

  return fromEnv.map((url) => ({ name: feedNameFromUrl(url), url }));
}

function feedNameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\.|^e00-/, '');
  } catch {
    return url;
  }
}
