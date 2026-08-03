import type { Match, PlayerMaster } from '../../types/fantasy';
import type { ExternalSignal, StarterInfo } from '../../types/analysis';
import { categoryEvidence } from '../recommendations/external-intelligence';
import { recentForm } from './form';
import { fixtureMultiplierFromElo } from './features/fixture';
import { estimateMinutes } from './features/minutes';
import { partialPool, priorForPlayer } from './features/shrinkage';
import { getEngineParams, type EngineParams } from './params';
import type { ConfirmedLineup, InjuryReportEntry, ProbableLineup } from './sources/types';
import type { PlayerWeekStat } from './player-stats';

/**
 * Estimador de puntos esperados por componentes, v1 (§4.3 del diseño).
 *
 * Solo usa datos de la API oficial: los puntos por 90' desglosados por acción
 * de `playerStats` (goles, asistencias, paradas, recuperaciones, tarjetas,
 * puntos de medios...), ponderados con decaimiento sobre una ventana de 10
 * jornadas, escalados por los minutos esperados. Sin fuentes externas todavía:
 * los componentes de goles/asistencias se sustituirán por xG/xA en Fase 1 sin
 * cambiar la estructura.
 *
 * Cadena de fallback cuando faltan datos (cada salto se anota en dataQuality):
 *   componentes (playerStats) → media temporada en curso → temporada pasada
 *   (/38, sin mejor dato de partidos jugados) → media del catálogo por posición.
 *
 * Los factores de contexto (localía, fuerza de rival, estado, titularidad,
 * noticias) se aplican UNA sola vez aquí: es el único punto de ajuste para
 * evitar la doble/triple contabilidad del motor anterior.
 */

export interface PredictionContext {
  /** teamId -> multiplicador de dificultad del rival (0.92-1.08). */
  teamStrength?: Map<number, number>;
  starterInfo?: Record<string, StarterInfo>;
  externalSignals?: Record<string, ExternalSignal[]>;
  /** playerId -> stats por jornada (fuente de la forma y los componentes). */
  playerStats?: Record<string, PlayerWeekStat[]>;
  /** positionId -> media de puntos por partido del catálogo (último fallback). */
  positionAverages?: Map<number, number>;
  /** Jornada actual: referencia del decaimiento temporal de la forma. */
  weekNumber?: number;
  /** teamId -> rating Elo (ClubElo) para la dificultad real del fixture. */
  teamElos?: Map<number, number>;
  /** teamId -> once probable de la jornada (Jornada Perfecta). */
  probableLineups?: Map<number, ProbableLineup>;
  /** Bajas y dudas de la jornada (Jornada Perfecta). */
  injuryReport?: InjuryReportEntry[];
  /** "positionId:tier" -> media de puntos por partido del grupo (shrinkage §4.5). */
  shrinkagePriors?: Map<string, number>;
  /** teamId -> tier 1-5 desde Elo (shrinkage §4.5). */
  teamTiers?: Map<number, number>;
  /** Cobertura de noticias: fuentes RSS activas / totales (§4.6). */
  newsCoverage?: { feedsOk: number; feedsTotal: number };
  /** teamId -> alineación confirmada (Sofascore, solo cerca del partido). */
  confirmedLineups?: Map<number, ConfirmedLineup>;
  /** Overrides de parámetros del motor (backtesting/calibración walk-forward). */
  paramOverrides?: Partial<EngineParams>;
}

export type PredictionSource = 'components' | 'season-average' | 'last-season' | 'position-average' | 'bye-week';

export interface PlayerPrediction {
  xp: number;
  /** xp penalizado por riesgo (xP − λ·σ, §5.2): σ de puntos del histórico. */
  riskAdjustedXp: number;
  expectedMinutes: number | null;
  /** Probabilidad de titularidad (submodelo xMins); null si no computable. */
  pStarter: number | null;
  /** Desviación típica de puntos por jornada (null sin histórico). */
  pointsStdDev: number | null;
  source: PredictionSource;
  dataQuality: { level: 'high' | 'medium' | 'low'; notes: string[] };
}

// Factores heredados del motor anterior (pendientes de calibrar con el track
// record; los calibrables viven en data/engine-params.json, Fase 3).
const HOME_MULTIPLIER = 1.05;
const AWAY_MULTIPLIER = 0.98;
const BAD_STATUS_MULTIPLIER = 0.3;
const BAD_NEWS_CONFIDENCE = 0.6;
const BAD_NEWS_MULTIPLIER = 0.3;
const GOOD_NEWS_CONFIDENCE = 0.5;
const GOOD_NEWS_MULTIPLIER = 1.08;

export function predictPlayerPoints(
  player: PlayerMaster,
  matches: Match[],
  context?: PredictionContext,
): PlayerPrediction {
  // El teamId viene en distinta forma según el endpoint: numérico en catálogo
  // y detalle, pero la plantilla solo trae `team.id` (string). Sin teamId no
  // se puede detectar la jornada de descanso ni la localía.
  const teamId = resolveTeamId(player);
  const homeMatch = teamId !== undefined ? matches.find((m) => m.localId === teamId) : undefined;
  const awayMatch = teamId !== undefined ? matches.find((m) => m.visitorId === teamId) : undefined;

  // Jornada de descanso: si hay calendario y el equipo no aparece, no puntúa.
  if (matches.length > 0 && teamId !== undefined && !homeMatch && !awayMatch) {
    return {
      xp: 0,
      riskAdjustedXp: 0,
      expectedMinutes: 0,
      pStarter: 0,
      pointsStdDev: null,
      source: 'bye-week',
      dataQuality: { level: 'high', notes: ['Su equipo descansa esta jornada.'] },
    };
  }

  const notes: string[] = [];
  let base: number | null = null;
  let source: PredictionSource = 'position-average';
  let expectedMinutes: number | null = null;
  let level: 'high' | 'medium' | 'low' = 'low';

  const stats = context?.playerStats?.[player.id];
  let weeksUsed = 0;
  let pointsStdDev: number | null = null;
  if (stats && stats.length > 0) {
    const form = recentForm(stats, context?.weekNumber);
    weeksUsed = form.weeksUsed;
    pointsStdDev = form.pointsStdDev;
    expectedMinutes = form.expectedMinutes;
    if (form.pointsPer90 !== null && form.expectedMinutes !== null) {
      base = form.pointsPer90;
      source = 'components';
      level = form.weeksUsed >= 5 ? 'high' : 'medium';
      notes.push(`Componentes de ${form.weeksUsed} jornada(s) con decaimiento exponencial.`);
      if (form.per90FromShortMatches) {
        notes.push('Medias por 90\' calculadas con partidos de menos de 60 minutos.');
      }
    }
  }

  if (base === null) {
    const averagePoints = Number(player.averagePoints) || 0;
    if (averagePoints > 0) {
      base = averagePoints;
      source = 'season-average';
      level = 'medium';
      notes.push('Sin stats por jornada: media de la temporada en curso.');
    }
  }

  if (base === null) {
    const lastSeasonPoints = Number(player.lastSeasonPoints) || 0;
    if (lastSeasonPoints > 0) {
      base = lastSeasonPoints / 38;
      source = 'last-season';
      level = 'low';
      notes.push('Sin datos de la temporada en curso: temporada pasada (asume 38 partidos jugados).');
    }
  }

  if (base === null) {
    // Último eslabón de la jerarquía de priors (§4.5): posición×tier del
    // equipo y, si no hay tiers, media global de la posición.
    const { prior, note } = priorForPlayer(player, {
      byPositionTier: context?.shrinkagePriors ?? new Map(),
      teamTiers: context?.teamTiers,
      positionAverages: context?.positionAverages,
    });
    base = prior;
    notes.push(`Sin histórico del jugador: ${note}.`);
  }

  // Minutos esperados (xMins): onces probables y bajas (Jornada Perfecta)
  // tienen prioridad sobre el histórico. El escalado por minutos se aplica
  // una sola vez y por igual a todas las fuentes de puntos.
  const minutesEst = estimateMinutes({
    player,
    historicalMinutes: expectedMinutes,
    probableLineups: context?.probableLineups,
    injuries: context?.injuryReport,
    confirmedLineups: context?.confirmedLineups,
    teamId,
  });
  let pStarter: number | null = null;
  if (minutesEst) {
    pStarter = minutesEst.pStarter;
    expectedMinutes = minutesEst.expectedMinutes;
    if (minutesEst.source !== 'historical' && minutesEst.note) notes.push(minutesEst.note);
  }
  if (expectedMinutes !== null) {
    base *= Math.min(1, expectedMinutes / 90);
  }

  // Shrinkage jerárquico (§4.5): con pocas jornadas observadas, la estimación
  // por componentes se encoge hacia el prior de su grupo (partial pooling).
  // k es calibrable (Fase 3): override explícito o data/engine-params.json.
  const params = getEngineParams();
  const shrinkageK = context?.paramOverrides?.shrinkageK ?? params.shrinkageK;
  if (source === 'components' && context?.shrinkagePriors) {
    const { prior, note } = priorForPlayer(player, {
      byPositionTier: context.shrinkagePriors,
      teamTiers: context.teamTiers,
      positionAverages: context.positionAverages,
    });
    const shrunk = partialPool(base, weeksUsed, prior, shrinkageK);
    if (Math.abs(shrunk - base) > 0.01) {
      notes.push(`Shrinkage hacia ${note} (n=${weeksUsed}, k=${shrinkageK}).`);
    }
    base = shrunk;
  }

  // Factores de contexto (una única aplicación).
  // Fixture: con Elo real (ClubElo) la fuerza relativa y la localía van en un
  // solo factor; sin Elo, fallback a los factores heredados (localía simple +
  // proxy de valor de mercado).
  const opponentId = homeMatch ? homeMatch.visitorId : awayMatch ? awayMatch.localId : undefined;
  const eloOwn = teamId !== undefined ? context?.teamElos?.get(teamId) : undefined;
  const eloOpponent = opponentId !== undefined ? context?.teamElos?.get(opponentId) : undefined;
  if (eloOwn !== undefined && eloOpponent !== undefined) {
    base *= fixtureMultiplierFromElo(eloOwn, eloOpponent, Boolean(homeMatch), context?.paramOverrides?.eloDiffDivisor);
    notes.push('Fixture: Elo ClubElo.');
  } else {
    if (homeMatch) base *= HOME_MULTIPLIER;
    else if (awayMatch) base *= AWAY_MULTIPLIER;
    if (opponentId !== undefined && context?.teamStrength) {
      base *= context.teamStrength.get(opponentId) ?? 1;
    }
    notes.push('Fixture: proxy por valor de mercado (sin Elo).');
  }

  if (player.playerStatus !== 'ok') base *= BAD_STATUS_MULTIPLIER;

  const starterScore = context?.starterInfo?.[player.id]?.score;
  if (starterScore !== undefined) base *= 0.9 + 0.1 * starterScore;

  // Noticias por categorías (§4.6): baja dura, duda, rotación o señal
  // positiva, sin aplanar a buy/sell. Un solo punto de ajuste.
  const evidence = categoryEvidence(context?.externalSignals?.[player.id] || []);
  if (evidence.hardNegative >= BAD_NEWS_CONFIDENCE) base *= BAD_NEWS_MULTIPLIER;
  else if (evidence.doubt >= 0.5) base *= 0.7;
  else if (evidence.rotation >= 0.5) base *= 0.85;
  if (evidence.hardNegative < BAD_NEWS_CONFIDENCE && evidence.positive >= GOOD_NEWS_CONFIDENCE) base *= GOOD_NEWS_MULTIPLIER;

  if (context?.newsCoverage && context.newsCoverage.feedsOk === 0 && context.newsCoverage.feedsTotal > 0) {
    notes.push('Sin cobertura de noticias: todos los feeds han fallado.');
  }

  const xp = Math.max(0, base);
  // Penalización por riesgo (§5.2): xP − λ·σ cuando hay σ del histórico.
  const riskLambda = context?.paramOverrides?.riskLambda ?? params.riskLambda;
  const riskAdjustedXp = pointsStdDev !== null ? Math.max(0, xp - riskLambda * pointsStdDev) : xp;
  return { xp, riskAdjustedXp, expectedMinutes, pStarter, pointsStdDev, source, dataQuality: { level, notes } };
}

/** teamId del jugador sea cual sea la forma de la respuesta de la API. */
export function resolveTeamId(player: PlayerMaster): number | undefined {
  const direct = Number(player.teamId);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const fromTeam = Number(player.team?.id);
  if (Number.isFinite(fromTeam) && fromTeam > 0) return fromTeam;
  return undefined;
}
