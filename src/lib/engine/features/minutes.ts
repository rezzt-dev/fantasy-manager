import type { PlayerMaster } from '../../../types/fantasy';
import type { ConfirmedLineup, InjuryReportEntry, ProbableLineup } from '../sources/types';

/**
 * Minutos esperados (xMins) y probabilidad de titularidad, submodelo del
 * diseño (§4.4). El feature con más impacto individual de la literatura.
 *
 * Prioridad de fuentes:
 * 1. Bajas confirmadas (Jornada Perfecta): lesión/sanción → 0; duda → ×0.45.
 * 2. Alineación CONFIRMADA (Sofascore, ~1 h antes): override a 1/0 (§4.4.5).
 * 3. Onces probables (Jornada Perfecta): en el once → P ≈ 0.85 (precisión
 *    publicada de alineaciones previstas: 75-88%); fuera del once → P ≈ 0.15.
 * 4. Histórico de minutos (form.ts) cuando no hay fuente externa.
 */

export interface MinutesEstimate {
  /** Probabilidad de ser titular (0-1). */
  pStarter: number;
  expectedMinutes: number;
  source: 'injury-report' | 'confirmed-lineup' | 'probable-lineup' | 'historical';
  note?: string;
}

const P_STARTER_IN_PROBABLE_XI = 0.85;
const P_STARTER_ON_BENCH = 0.15;
const DOUBT_FACTOR = 0.45;
/** E[mins] condicionales por defecto cuando no hay histórico. */
const DEFAULT_MINS_IF_STARTER = 75;
const DEFAULT_MINS_IF_BENCH = 15;

export function normalizePlayerName(name: string | undefined | null): string {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cruce jugador oficial ↔ nombre/slug de fuente externa, en orden:
 * 1. slug exacto; 2. slug uno sufijo del otro ('r-de-galarreta'/'de-galarreta');
 * 3. nombre completo contenido ('Inigo Ruiz de Galarreta' ⊇ 'De Galarreta');
 * 4. apellido único dentro de la lista candidata (evita los García/López).
 * Devuelve el índice del candidato que casa, o -1.
 */
function findPlayerIndex(player: PlayerMaster, candidates: { slug?: string; name: string }[]): number {
  const officialSlug = player.slug?.toLowerCase();
  if (officialSlug) {
    const exact = candidates.findIndex((c) => c.slug && c.slug.toLowerCase() === officialSlug);
    if (exact >= 0) return exact;
    const suffix = candidates.findIndex((c) => {
      const slug = c.slug?.toLowerCase();
      return slug && (officialSlug.endsWith(slug) || slug.endsWith(officialSlug));
    });
    if (suffix >= 0) return suffix;
  }

  const officialName = normalizePlayerName(player.name);
  const normalized = candidates.map((c) => normalizePlayerName(c.name));
  const exactName = normalized.findIndex((n) => n === officialName);
  if (exactName >= 0) return exactName;

  const contained = normalized.findIndex((n) => {
    const shorter = n.length <= officialName.length ? n : officialName;
    const longer = n.length <= officialName.length ? officialName : n;
    return shorter.split(' ').length >= 2 && longer.includes(shorter);
  });
  if (contained >= 0) return contained;

  // Apellido: solo si es único entre los candidatos.
  const surname = officialName.split(' ').pop() ?? officialName;
  if (surname.length >= 3) {
    const matches = normalized.map((n, i) => (n.split(' ').includes(surname) ? i : -1)).filter((i) => i >= 0);
    if (matches.length === 1) return matches[0];
  }
  return -1;
}

export function findInjury(player: PlayerMaster, injuries: InjuryReportEntry[]): InjuryReportEntry | undefined {
  const index = findPlayerIndex(player, injuries);
  return index >= 0 ? injuries[index] : undefined;
}

/** true si el jugador está suspendido según la API oficial o el injury report externo. */
export function isSuspended(player: PlayerMaster, injuries?: InjuryReportEntry[]): boolean {
  if (player.playerStatus === 'suspended') return true;
  const injury = injuries && injuries.length > 0 ? findInjury(player, injuries) : undefined;
  return injury?.status === 'suspended';
}

export function estimateMinutes(input: {
  player: PlayerMaster;
  /** E[mins] histórico (form.ts); null en pretemporada o sin datos. */
  historicalMinutes: number | null;
  /** teamId -> once probable de la jornada (Jornada Perfecta). */
  probableLineups?: Map<number, ProbableLineup>;
  /** Bajas y dudas de la jornada (Jornada Perfecta). */
  injuries?: InjuryReportEntry[];
  /** teamId -> alineación confirmada (Sofascore, solo cerca del partido). */
  confirmedLineups?: Map<number, ConfirmedLineup>;
  /** teamId del jugador (ya resuelto por el modelo). */
  teamId?: number;
}): MinutesEstimate | null {
  const { player, historicalMinutes, probableLineups, injuries, confirmedLineups, teamId } = input;

  // 1. Bajas confirmadas.
  const injury = injuries && injuries.length > 0 ? findInjury(player, injuries) : undefined;
  if (injury && (injury.status === 'injured' || injury.status === 'suspended')) {
    return {
      pStarter: 0,
      expectedMinutes: 0,
      source: 'injury-report',
      note: `Baja según Jornada Perfecta (${injury.status}${injury.note ? `: ${injury.note}` : ''}).`,
    };
  }

  const minsIfStarter = historicalMinutes !== null && historicalMinutes >= 45 ? Math.min(90, historicalMinutes) : DEFAULT_MINS_IF_STARTER;

  // 2. Alineación confirmada (Sofascore): override a 1/0 cerca del partido.
  const confirmed = teamId !== undefined ? confirmedLineups?.get(teamId) : undefined;
  if (confirmed) {
    const inStarters = findPlayerIndex(player, confirmed.starters.map((name) => ({ name })));
    const inBench = inStarters < 0 ? findPlayerIndex(player, confirmed.bench.map((name) => ({ name }))) : -1;
    if (inStarters >= 0 || inBench >= 0) {
      const pStarter = inStarters >= 0 ? 1 : 0;
      return {
        pStarter,
        expectedMinutes: pStarter * minsIfStarter + (1 - pStarter) * DEFAULT_MINS_IF_BENCH,
        source: 'confirmed-lineup',
        note: inStarters >= 0 ? 'Titular confirmado (Sofascore).' : 'Suplente confirmado (Sofascore).',
      };
    }
    // No encontrado en la confirmada: puede ser no convocado o fallo de cruce;
    // se sigue con el once probable (no se castiga).
  }

  // 3. Once probable del equipo.
  const lineup = teamId !== undefined ? probableLineups?.get(teamId) : undefined;
  if (lineup) {
    const starterIndex = findPlayerIndex(player, lineup.starters);
    const starter = starterIndex >= 0 ? lineup.starters[starterIndex] : undefined;

    let pStarter: number;
    if (starter) {
      const declared = Number.isFinite(starter.probability) ? Math.min(100, Math.max(0, starter.probability)) / 100 : 1;
      pStarter = P_STARTER_IN_PROBABLE_XI * declared;
    } else {
      const alternativeIndex = findPlayerIndex(player, lineup.alternatives);
      const alternative = alternativeIndex >= 0 ? lineup.alternatives[alternativeIndex] : undefined;
      pStarter = alternative && Number.isFinite(alternative.probability)
        ? P_STARTER_IN_PROBABLE_XI * Math.min(100, Math.max(0, alternative.probability)) / 100
        : P_STARTER_ON_BENCH;
    }
    if (injury?.status === 'doubt' || injury?.status === 'other') pStarter *= DOUBT_FACTOR;

    const expectedMinutes = pStarter * minsIfStarter + (1 - pStarter) * DEFAULT_MINS_IF_BENCH;

    return {
      pStarter,
      expectedMinutes,
      source: 'probable-lineup',
      note: starter ? 'En el once probable (Jornada Perfecta).' : 'Fuera del once probable (Jornada Perfecta).',
    };
  }

  // 3. Solo histórico.
  if (historicalMinutes !== null) {
    let pStarter = Math.min(1, historicalMinutes / 90);
    let expectedMinutes = Math.min(90, Math.max(0, historicalMinutes));
    if (injury?.status === 'doubt' || injury?.status === 'other') {
      pStarter *= DOUBT_FACTOR;
      expectedMinutes *= DOUBT_FACTOR;
    }
    return {
      pStarter,
      expectedMinutes,
      source: 'historical',
      note: injury ? `Duda según Jornada Perfecta (${injury.note ?? 'sin detalle'}).` : undefined,
    };
  }

  return null;
}
