import type { Match, PlayerMaster, TeamLineup, TeamPlayer } from '../../types/fantasy';
import type { OptimalLineup, OptimalLineupEntry } from '../../types/analysis';
import { estimatePointsDetailed, type EstimatorContext } from '../recommendations/points-estimator';
import { combinedSignal } from '../recommendations/external-intelligence';

const BAD_NEWS_CONFIDENCE = 0.6;
const BENCH_SIZE = 5;
const COACH_POSITION_ID = 5;

interface OptimizerInput {
  squad: TeamPlayer[];
  currentLineup: TeamLineup;
  calendar: Match[];
  /** Formaciones libres de la API: "defensas,centrocampistas,delanteros". */
  formations: string[];
  context?: EstimatorContext;
  /** league.config.premiumFeatures.captain: el capitán duplica puntos. */
  captainEnabled?: boolean;
}

/** Puntos usados para decidir (xP penalizado por riesgo cuando hay σ). */
function selectionPoints(player: PlayerMaster, calendar: Match[], context?: EstimatorContext): number {
  return estimatePointsDetailed(player, calendar, context).riskAdjustedXp;
}

/**
 * Calcula la alineación que maximiza los puntos esperados de la próxima
 * jornada probando todas las formaciones disponibles.
 *
 * Con la feature de capitán activada, el objetivo es Σ puntos + puntos del
 * mejor jugador (el capitán duplica): el once y el capitán se eligen a la
 * vez (co-optimización, §5.2). La selección usa xP penalizado por riesgo
 * (xP − λσ) cuando hay histórico para estimar σ.
 *
 * Elegibles: jugadores sanos (`playerStatus === 'ok'`) y sin noticias muy
 * negativas (lesión/enfermedad/sanción reciente). El entrenador (positionId 5)
 * no entra en las formaciones de campo.
 */
export function computeOptimalLineup(input: OptimizerInput): OptimalLineup | undefined {
  const { squad, currentLineup, calendar, formations, context, captainEnabled } = input;

  const fieldPlayers = squad
    .map((tp) => tp.playerMaster)
    .filter((p) => p.positionId !== COACH_POSITION_ID);

  // Pasada estricta: solo sanos y sin noticias muy negativas.
  const strict = fieldPlayers
    .filter((p) => p.playerStatus === 'ok')
    .filter((p) => {
      const external = combinedSignal(context?.externalSignals?.[p.id] || []);
      return !(external.signal === 'sell' && external.confidence >= BAD_NEWS_CONFIDENCE);
    });

  // Si con los elegibles no se cubre ninguna formación, se relaja el filtro:
  // entran todos y el estimador ya penaliza lesiones y malas noticias.
  let eligible = strict;
  let degraded = false;
  let best = pickBestFormation(eligible, calendar, formations, context, captainEnabled);
  if (!best) {
    eligible = fieldPlayers;
    degraded = true;
    best = pickBestFormation(eligible, calendar, formations, context, captainEnabled);
  }
  if (!best) return undefined;

  // Banquillo: mejores elegibles que no entran en el once.
  const starterIds = new Set(best.starters.map((e) => e.player.id));
  const bench = eligible
    .filter((p) => !starterIds.has(p.id))
    .map((player) => ({ player, expectedPoints: selectionPoints(player, calendar, context) }))
    .sort((a, b) => b.expectedPoints - a.expectedPoints)
    .slice(0, BENCH_SIZE);

  // Comparación con la alineación actual, con el mismo criterio de capitán.
  const currentEntries = [
    ...(currentLineup.formation.goalkeeper || []),
    ...(currentLineup.formation.defender || []),
    ...(currentLineup.formation.midfielder || []),
    ...(currentLineup.formation.attacker || []),
  ];
  const currentIds = new Set(currentEntries.map((e) => e.playerMaster.id));
  const currentPoints = currentEntries.map((e) => selectionPoints(e.playerMaster, calendar, context));
  const captainBonusOf = (points: number[]) => (captainEnabled && points.length > 0 ? Math.max(...points) : 0);
  const currentExpected = currentPoints.reduce((sum, v) => sum + v, 0) + captainBonusOf(currentPoints);

  // Cambios: titulares actuales que salen vs nuevos titulares (mismo número,
  // emparejados por posición lo mejor posible).
  const outgoing = currentEntries
    .map((e) => e.playerMaster)
    .filter((p) => !starterIds.has(p.id) && p.positionId !== COACH_POSITION_ID)
    .sort((a, b) => a.positionId - b.positionId);
  const incoming = best.starters
    .map((e) => e.player)
    .filter((p) => !currentIds.has(p.id))
    .sort((a, b) => a.positionId - b.positionId);

  const changes: OptimalLineup['changes'] = outgoing.map((out, i) => ({
    out,
    in: incoming[i] || out,
  }));

  // Titulares ordenados por posición para presentarlos.
  const starters = [...best.starters].sort(
    (a, b) => a.player.positionId - b.player.positionId || b.expectedPoints - a.expectedPoints,
  );

  return {
    formation: best.formation,
    starters,
    bench,
    captain: best.captain,
    totalExpected: round1(best.total),
    currentExpected: round1(currentExpected),
    improvement: round1(best.total - currentExpected),
    changes,
    degraded,
  };
}

interface FormationPick {
  formation: string;
  starters: OptimalLineupEntry[];
  /** Capitán co-optimizado: el titular con más puntos (si la feature está activa). */
  captain?: OptimalLineupEntry;
  total: number;
}

/** Prueba todas las formaciones y devuelve la que más puntos esperados suma. */
function pickBestFormation(
  eligible: PlayerMaster[],
  calendar: Match[],
  formations: string[],
  context?: EstimatorContext,
  captainEnabled?: boolean,
): FormationPick | undefined {
  if (eligible.length === 0) return undefined;

  const byPosition = new Map<number, OptimalLineupEntry[]>();
  for (const player of eligible) {
    const entry: OptimalLineupEntry = { player, expectedPoints: selectionPoints(player, calendar, context) };
    const list = byPosition.get(player.positionId) || [];
    list.push(entry);
    byPosition.set(player.positionId, list);
  }
  for (const list of byPosition.values()) {
    list.sort((a, b) => b.expectedPoints - a.expectedPoints);
  }

  let best: FormationPick | undefined;

  for (const formation of formations) {
    const [defCount, midCount, attCount] = formation.split(',').map((n) => parseInt(n, 10));
    if (![defCount, midCount, attCount].every((n) => Number.isFinite(n))) continue;

    const gks = byPosition.get(1) || [];
    const defs = byPosition.get(2) || [];
    const mids = byPosition.get(3) || [];
    const atts = byPosition.get(4) || [];

    if (gks.length < 1 || defs.length < defCount || mids.length < midCount || atts.length < attCount) continue;

    const starters = [
      ...gks.slice(0, 1),
      ...defs.slice(0, defCount),
      ...mids.slice(0, midCount),
      ...atts.slice(0, attCount),
    ];
    // Capitán co-optimizado: su bonus entra en el objetivo de la formación.
    const captain = captainEnabled && starters.length > 0 ? starters.reduce((a, b) => (b.expectedPoints > a.expectedPoints ? b : a)) : undefined;
    const total = starters.reduce((sum, e) => sum + e.expectedPoints, 0) + (captain?.expectedPoints ?? 0);

    if (!best || total > best.total) {
      best = { formation: formatFormation(defCount, midCount, attCount), starters, captain, total };
    }
  }

  return best;
}

function formatFormation(def: number, mid: number, att: number): string {
  return `${def}-${mid}-${att}`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
