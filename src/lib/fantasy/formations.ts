import { fetchOfficialAPI } from './api-proxy';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const FALLBACK_FORMATIONS = ['4,4,2', '4,3,3', '5,3,2', '4,5,1', '3,5,2', '3,4,3', '5,4,1'];

const cache = new Map<string, { expiresAt: number; formations: string[] }>();

async function fetchFormations(token: string, option: 'free' | 'premium'): Promise<string[]> {
  const cached = cache.get(option);
  if (cached && cached.expiresAt > Date.now()) return cached.formations;

  const formations = await fetchOfficialAPI<string[]>('/v4/teams/lineup/formations', token, { option });
  if (Array.isArray(formations) && formations.length > 0) {
    cache.set(option, { expiresAt: Date.now() + CACHE_TTL_MS, formations });
    return formations;
  }
  return [];
}

/**
 * Formaciones gratuitas disponibles para la alineación ("defensas,cents,dels").
 * Se cachean 24 h; si el endpoint falla se usa la lista estándar.
 */
export async function fetchFreeFormations(token: string): Promise<string[]> {
  try {
    const formations = await fetchFormations(token, 'free');
    if (formations.length > 0) return formations;
  } catch (error) {
    console.warn('[formations] fetch failed:', error instanceof Error ? error.message : error);
  }
  return FALLBACK_FORMATIONS;
}

/**
 * Formaciones disponibles según la configuración de la liga: gratuitas y, si
 * la liga tiene activada la feature premium de formaciones, también las
 * premium. Si el endpoint falla se usa la lista estándar gratuita.
 */
export async function fetchAvailableFormations(token: string, includePremium: boolean): Promise<string[]> {
  const free = await fetchFreeFormations(token);
  if (!includePremium) return free;

  try {
    const premium = await fetchFormations(token, 'premium');
    return [...new Set([...free, ...premium])];
  } catch (error) {
    console.warn('[formations] premium fetch failed:', error instanceof Error ? error.message : error);
    return free;
  }
}
