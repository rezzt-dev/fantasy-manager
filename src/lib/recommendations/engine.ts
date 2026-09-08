import type { Recommendation, RecommendationType, PlayerMaster } from '../../types/fantasy';
import type { LeagueAnalysis, ClauseRiskAnalysis, ExternalSignal } from '../../types/analysis';
import type { ValueTrend } from '../engine/sources/types';
import { estimatePoints, estimatePointsDetailed, type EstimatorContext } from './points-estimator';
import { combinedSignal } from './external-intelligence';
import { starterScoreFromLastSeason } from '../analysis/starter-score';
import { combinedSignal as cs } from './external-intelligence';
import { computeAvailableBudget } from '../analysis/tactical-scheme';
import { getClauseProtection } from '../clause-availability';

interface RecommendationInput {
  analysis: LeagueAnalysis;
  estimatorContext?: EstimatorContext;
  /** playerId -> tendencia de valor (FútbolFantasy), para el timing de mercado. */
  valueTrends?: Map<string, ValueTrend>;
}

/** Categorías de noticias que implican que el jugador no debería jugar. */
const HARD_NEGATIVE_CATEGORIES = new Set(['injury', 'illness', 'suspension']);
const SELL_NEWS_CONFIDENCE = 0.6;
/** Por debajo de este score de titularidad consideramos al jugador suplente habitual. */
const SUBSTITUTE_SCORE = 0.35;
/** A partir de aquí la carga europea del equipo condiciona una compra. */
const EUROPEAN_WARNING_RISK = 45;
/** Corte significativo de ΔxP para entrar en los mejores movimientos (puntos). */
const MIN_IMPACT_XP = 1;
/** Incremento mínimo sobre la puja actual para que la propuesta sea competitiva. */
const MIN_BID_INCREMENT = 50_000;
/** Múltiplo al que redondear los precios sugeridos de puja. */
const BID_PRICE_ROUNDING = 100_000;

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Lectura de la tendencia de valor (FútbolFantasy) para el timing de mercado:
 * comprar antes de subidas, vender antes de bajadas (§5.4). No altera el ΔxP
 * (que mide puntos, no euros): solo prioridad y textos.
 */
function trendSignal(trend?: ValueTrend): { direction: 'rising' | 'falling' | 'flat'; note: string | null } {
  if (!trend) return { direction: 'flat', note: null };
  const pct = Math.round(trend.pct7d);
  if (trend.trendScore > 0 && trend.pct7d >= 3) {
    return { direction: 'rising', note: `Sube de valor (+${pct}% en 7 días).` };
  }
  if (trend.trendScore < 0 && trend.pct7d <= -3) {
    return { direction: 'falling', note: `Baja de valor (${pct}% en 7 días).` };
  }
  return { direction: 'flat', note: null };
}

export function computeSuggestedBidPrice(
  salePrice: number,
  marketValue: number,
  numberOfBids: number,
  budgetAvailable: number,
): number {
  if (!Number.isFinite(salePrice) || salePrice <= 0) return Math.min(marketValue, budgetAvailable);

  // Incremento según competencia: sin pujas una pequeña mejora, con más
  // competencia hay que ser más agresivo para tener opciones reales.
  const incrementRate = numberOfBids === 0 ? 0.05 : numberOfBids <= 2 ? 0.08 : 0.12;
  const baseBid = salePrice * (1 + incrementRate);

  // Tope según relación precio/valor de mercado: oportunidad clara permite
  // pagar hasta 1.2× el valor; si ya está caro, no pujar por encima del valor.
  const valueRatio = salePrice / Math.max(marketValue, 1);
  const valueCap = marketValue * (valueRatio < 0.85 ? 1.2 : valueRatio > 1.05 ? 1.0 : 1.1);

  // Nunca por debajo del mínimo incremento sobre la puja actual, ni por encima
  // del presupuesto disponible.
  let suggested = Math.max(baseBid, salePrice + MIN_BID_INCREMENT);
  suggested = Math.min(suggested, valueCap, budgetAvailable);

  // Redondear hacia arriba a múltiplos de 100k para mostrar precios limpios.
  suggested = Math.ceil(suggested / BID_PRICE_ROUNDING) * BID_PRICE_ROUNDING;

  // Si el redondeo supera el presupuesto, devolvemos el tope presupuestario
  // redondeado hacia abajo para no ofrecer algo imposible.
  if (suggested > budgetAvailable) {
    suggested = Math.floor(budgetAvailable / BID_PRICE_ROUNDING) * BID_PRICE_ROUNDING;
  }

  return Math.max(suggested, salePrice + MIN_BID_INCREMENT);
}

export function generateRecommendations(input: RecommendationInput): Recommendation[] {
  const { analysis, estimatorContext, valueTrends } = input;
  const { league, teamData, lineup, money, market, calendar, ownNeeds, clauseRisks, captain, externalSignals, starterInfo, rivals } = analysis;
  const recommendations: Recommendation[] = [];
  const teamPlayerIds = new Set(teamData.players.map((p) => p.playerMaster.id));

  // Presupuesto unificado (§5.1): efectivo + 20% del valor de plantilla, la
  // misma regla para compras, clausulazos y el esquema táctico.
  const budget = computeAvailableBudget(money, league.team?.teamValue ?? 0);

  // Predicciones de cada jugador propio, calculadas una sola vez.
  const predictionOwn = new Map<
    string,
    { xp: number; pStarter: number | null; expectedMinutes: number | null }
  >();
  const expectedOwn = new Map<string, number>();
  for (const teamPlayer of teamData.players) {
    const prediction = estimatePointsDetailed(teamPlayer.playerMaster, calendar, estimatorContext);
    predictionOwn.set(teamPlayer.playerMaster.id, {
      xp: prediction.xp,
      pStarter: prediction.pStarter,
      expectedMinutes: prediction.expectedMinutes,
    });
    expectedOwn.set(teamPlayer.playerMaster.id, prediction.xp);
  }

  // Nivel de reemplazo por posición: media de puntos esperados de los jugadores
  // propios SANOS de esa posición. Es la referencia para medir el ΔxP de
  // vender (puntos que recuperas al sustituirlo) y de comprar (puntos que
  // añade sobre lo que ya tienes).
  const referenceByPosition = buildPositionReference(teamData, expectedOwn);
  const referenceFor = (positionId: number) => referenceByPosition.get(positionId) ?? 0;

  // 1. Jugadores propios a vender (baja expectativa, lesionados, cláusula alta, demanda rival)
  for (const teamPlayer of teamData.players) {
    const player = teamPlayer.playerMaster;
    const expected = expectedOwn.get(player.id) ?? 0;
    const marketValueRatio = teamPlayer.buyoutClause / Math.max(player.marketValue, 1);
    const signals = externalSignals[player.id] || [];
    const external = combinedSignal(signals);
    // ΔxP de venderlo: puntos que recuperas al poner en su lugar a un jugador
    // de nivel medio de tu plantilla en esa posición.
    const sellImpact = round1(Math.max(0, referenceFor(player.positionId) - expected));

    if (player.playerStatus !== 'ok') {
      const trendNote = trendSignal(valueTrends?.get(player.id)).note;
      recommendations.push({
        id: `sell-${player.id}`,
        type: 'sell' as RecommendationType,
        priority: 'high',
        player,
        reason: `Está ${statusText(player.playerStatus)} y no aportará puntos esta jornada.`,
        details: `Cláusula actual: ${formatCurrency(teamPlayer.buyoutClause)}. Valor de mercado: ${formatCurrency(player.marketValue)}.${trendNote ? ` ${trendNote}` : ''}`,
        suggestedAction: 'Ponlo a la venta o busca un sustituto.',
        externalSignals: signals,
        impactScore: sellImpact,
      });
    } else if (marketValueRatio > 1.3 && expected < 3) {
      const trend = trendSignal(valueTrends?.get(player.id));
      recommendations.push({
        id: `sell-${player.id}`,
        type: 'sell' as RecommendationType,
        priority: external.signal === 'sell' || trend.direction === 'falling' ? 'high' : 'medium',
        player,
        reason: 'Su cláusula está muy por encima del valor de mercado y su rendimiento esperado es bajo.',
        details: `Cláusula: ${formatCurrency(teamPlayer.buyoutClause)} vs valor mercado ${formatCurrency(player.marketValue)}. Puntos esperados: ${expected.toFixed(1)}.${trend.note ? ` ${trend.note}` : ''}`,
        suggestedAction: 'Evalúa venderlo para liberar dinero.',
        externalSignals: signals,
        impactScore: sellImpact,
      });
    } else if (external.signal === 'sell' && external.confidence >= SELL_NEWS_CONFIDENCE) {
      const negative = strongestNegativeSignal(signals);
      const categoryLabel = negative?.category ? categoryText(negative.category) : null;
      recommendations.push({
        id: `sell-news-${player.id}`,
        type: 'sell' as RecommendationType,
        priority: negative?.category && HARD_NEGATIVE_CATEGORIES.has(negative.category) ? 'high' : 'medium',
        player,
        reason: categoryLabel
          ? `Noticias recientes: ${categoryLabel}. ${negative?.reason || ''}`.trim()
          : 'Señales externas recomiendan vender por noticias o estadísticas recientes.',
        details: `Confianza: ${(external.confidence * 100).toFixed(0)}%. Cláusula actual: ${formatCurrency(teamPlayer.buyoutClause)}.`,
        suggestedAction: 'Revisa la noticia y evalúa venderlo antes de que pierda valor.',
        externalSignals: signals,
        // La confianza de la noticia descuenta el impacto esperado.
        impactScore: round1(sellImpact * external.confidence),
      });
    } else {
      const pStarter = predictionOwn.get(player.id)?.pStarter ?? null;
      const starterScore = starterInfo[player.id]?.score ?? 0.5;
      const isBenchHabitual = starterScore < SUBSTITUTE_SCORE;
      const isBenchThisWeek = pStarter !== null && pStarter < SUBSTITUTE_SCORE;
      if ((isBenchHabitual || isBenchThisWeek) && expected < 2.5) {
        const starter = starterInfo[player.id];
        const starterLabel = starter ? starter.label.toLowerCase() : 'suplente';
        const thisWeekNote = isBenchThisWeek ? ` Probabilidad de titularidad esta jornada: ${Math.round((pStarter ?? 0) * 100)}%.` : '';
        recommendations.push({
          id: `sell-sub-${player.id}`,
          type: 'sell' as RecommendationType,
          priority: isBenchThisWeek ? 'medium' : 'low',
          player,
          reason: `Es ${starterLabel} en su equipo y apenas suma puntos esta jornada.`,
          details: `Puntos esperados: ${expected.toFixed(1)}.${thisWeekNote} Valor de mercado: ${formatCurrency(player.marketValue)}.`,
          suggestedAction: 'Véndelo para liberar dinero y una plaza para un titular.',
          externalSignals: signals,
          impactScore: sellImpact,
        });
      }
    }
  }

  // 2. Jugadores del mercado a comprar (buena relación valor/puntos y necesidad propia)
  const needByPosition = new Map(ownNeeds.map((n) => [n.positionId, n.needScore]));

  const affordableMarket = market
    .filter((m) => m.salePrice <= budget.available && !teamPlayerIds.has(m.playerMaster.id) && m.playerMaster.playerStatus === 'ok')
    .filter((m) => {
      // No recomendar fichar a alguien con noticias muy negativas (lesión, sanción, enfermedad)
      // aunque la API oficial todavía lo marque como disponible.
      const ext = combinedSignal(externalSignals[m.playerMaster.id] || []);
      return !(ext.signal === 'sell' && ext.confidence >= SELL_NEWS_CONFIDENCE);
    })
    .map((m) => {
      const prediction = estimatePointsDetailed(m.playerMaster, calendar, estimatorContext);
      return {
        ...m,
        expectedPoints: prediction.xp,
        pStarter: prediction.pStarter,
        european: prediction.european,
        valueRatio: m.salePrice / Math.max(m.playerMaster.marketValue, 1),
        needScore: needByPosition.get(m.playerMaster.positionId) || 0,
        starterScore: starterScoreFromLastSeason(m.playerMaster.lastSeasonPoints),
      };
    })
    .sort((a, b) => {
      // Jugadores que cubren una necesidad, tienen buena relación puntos/precio
      // y son titulares habituales en su equipo, primero. Los suplentes de la
      // jornada se penalizan para no fichar jugadores que no van a jugar.
      const starterFactorA = Math.min(1, 0.4 + 0.6 * (a.pStarter ?? a.starterScore));
      const starterFactorB = Math.min(1, 0.4 + 0.6 * (b.pStarter ?? b.starterScore));
      const scoreA = a.needScore * 2 + (a.expectedPoints * starterFactorA) / Math.max(a.valueRatio, 0.5);
      const scoreB = b.needScore * 2 + (b.expectedPoints * starterFactorB) / Math.max(b.valueRatio, 0.5);
      return scoreB - scoreA;
    })
    .slice(0, 10);

  for (const marketPlayer of affordableMarket) {
    const player = marketPlayer.playerMaster;
    const signals = externalSignals[player.id] || [];
    const external = combinedSignal(signals);
    const trend = trendSignal(valueTrends?.get(player.id));

    const isBargain = marketPlayer.valueRatio < 0.9;
    const coversNeed = marketPlayer.needScore > 0.3;
    const pStarter = marketPlayer.pStarter;
    // Coordinación con Europa: el aviso se da sobre el dinero que se va a
    // pujar, no sobre los puntos (que ya están descontados en expectedPoints).
    const european = marketPlayer.european;
    const europeanRisk = european !== null && european.outlook.rotationRisk >= EUROPEAN_WARNING_RISK;
    const europeanDrag = europeanRisk && !european!.beneficiary;
    const europeanBonus = europeanRisk && european!.beneficiary;
    const isBenchThisWeek = pStarter !== null && pStarter < SUBSTITUTE_SCORE;
    const starterNote = isBenchThisWeek
      ? ` Atención: probabilidad de titularidad ${Math.round(pStarter * 100)}% esta jornada.`
      : pStarter !== null
        ? ` Titularidad: ${Math.round(pStarter * 100)}%.`
        : '';

    // No promocionar a "high" una compra de un suplente de la jornada ni de
    // alguien a quien su equipo va a reservar para la Champions.
    const priority: 'high' | 'medium' | 'low' =
      trend.direction === 'falling' || isBenchThisWeek || europeanDrag
        ? 'low'
        : isBargain || coversNeed || external.signal === 'buy' || trend.direction === 'rising' || europeanBonus
          ? 'high'
          : 'medium';

    recommendations.push({
      id: `buy-${player.id}`,
      type: 'buy' as RecommendationType,
      priority,
      player,
      reason: buildBuyReason(marketPlayer, coversNeed),
      details: `Puntos esperados: ${marketPlayer.expectedPoints.toFixed(1)}.${starterNote} Valor de mercado: ${formatCurrency(player.marketValue)}. Pujas: ${marketPlayer.numberOfBids}.${trend.note ? ` ${trend.note}` : ''}${european?.advice ? ` ${european.advice}` : ''}`,
      suggestedAction: europeanDrag
        ? `Su equipo llega condicionado por ${european!.outlook.competitionShortName}: no pagues precio de titular por una jornada en la que puede descansar.`
        : isBenchThisWeek
          ? 'Es suplente en el once probable; solo puja si crees que jugará o a largo plazo.'
          : trend.direction === 'falling'
            ? 'Espera a que frene la bajada antes de pujar.'
            : europeanBonus
              ? 'La rotación de su equipo por Europa le abre el once: es una puja barata para esta jornada.'
              : 'Puja por él si encaja en tu esquema táctico.',
      estimatedValue: marketPlayer.salePrice,
      suggestedBidPrice: computeSuggestedBidPrice(marketPlayer.salePrice, player.marketValue, marketPlayer.numberOfBids, budget.available),
      externalSignals: signals,
      // ΔxP de ficharlo: puntos que añade sobre el nivel medio de tu plantilla.
      impactScore: round1(Math.max(0, marketPlayer.expectedPoints - referenceFor(player.positionId))),
      european: european?.outlook ?? null,
    });
  }

  // 3. Ajustes de alineación (jugadores dudosos/lesionados en lineup)
  // Los sustitutos se ponderan por puntos esperados y titularidad habitual.
  const replacementScore = (teamPlayer: { playerMaster: PlayerMaster }) =>
    estimatePoints(teamPlayer.playerMaster, calendar, estimatorContext) * (0.7 + 0.3 * (starterInfo[teamPlayer.playerMaster.id]?.score ?? 0.5));

  const lineupPlayers = [
    ...(lineup.formation.goalkeeper || []),
    ...(lineup.formation.defender || []),
    ...(lineup.formation.midfielder || []),
    ...(lineup.formation.attacker || []),
  ].map((entry) => entry.playerMaster);

  for (const lineupPlayer of lineupPlayers) {
    const signals = externalSignals[lineupPlayer.id] || [];
    const external = combinedSignal(signals);
    const newsRisk = external.signal === 'sell' && external.confidence >= SELL_NEWS_CONFIDENCE;

    if (lineupPlayer.playerStatus !== 'ok' || newsRisk) {
      const replacement = teamData.players
        .filter(
          (p) =>
            p.playerMaster.positionId === lineupPlayer.positionId &&
            p.playerMaster.playerStatus === 'ok' &&
            p.playerMaster.id !== lineupPlayer.id &&
            combinedSignal(externalSignals[p.playerMaster.id] || []).signal !== 'sell',
        )
        .sort((a, b) => replacementScore(b) - replacementScore(a))[0];

      if (replacement) {
        const negative = newsRisk ? strongestNegativeSignal(signals) : undefined;
        // ΔxP del cambio: diferencia directa de puntos esperados.
        const changeImpact = round1(
          Math.max(0, estimatePoints(replacement.playerMaster, calendar, estimatorContext) - estimatePoints(lineupPlayer, calendar, estimatorContext)),
        );
        recommendations.push({
          id: `change-${lineupPlayer.id}`,
          type: 'change_lineup' as RecommendationType,
          priority: 'high',
          player: lineupPlayer,
          reason:
            lineupPlayer.playerStatus !== 'ok'
              ? `Está ${statusText(lineupPlayer.playerStatus)} en la alineación titular.`
              : `Noticias negativas recientes${negative?.category ? ` (${categoryText(negative.category)})` : ''} sobre este titular.`,
          details: `Sustituto sugerido: ${replacement.playerMaster.nickname} (${replacement.playerMaster.position}).`,
          suggestedAction: `Cambia a ${replacement.playerMaster.nickname} en la alineación.`,
          externalSignals: newsRisk ? signals : undefined,
          impactScore: changeImpact,
        });
      }
    }
  }

  // 4. Protección de cláusulas con riesgo real de ser clausuladas
  if (league?.config?.features?.buyoutClause) {
    for (const risk of clauseRisks) {
      if (risk.riskScore < 30) continue;
      if (!Number.isFinite(risk.recommendedClause) || risk.recommendedClause <= 0) continue;

      const player = findPlayer(teamData, risk.playerId);
      if (!player) continue;

      const expected = expectedOwn.get(player.id) ?? 0;
      recommendations.push({
        id: `protect-${player.id}`,
        type: 'protect_clause' as RecommendationType,
        priority: risk.riskScore >= 70 ? 'high' : 'medium',
        player,
        reason: `Riesgo ${risk.riskScore}/100 de que otro manager lo fiche pagando la cláusula.`,
        details: `${risk.rivalsThatCanAfford} rival${risk.rivalsThatCanAfford === 1 ? '' : 'es'} puede pagar ${formatCurrency(risk.currentClause)}. Recomendado: ${formatCurrency(risk.recommendedClause)}.`,
        suggestedAction: `Sube la cláusula a ${formatCurrency(risk.recommendedClause)} para asegurarlo.`,
        recommendedClause: risk.recommendedClause,
        riskScore: risk.riskScore,
        // ΔxP en riesgo: probabilidad de perderlo × puntos que aporta sobre el reemplazo.
        impactScore: round1((risk.riskScore / 100) * Math.max(0, expected - referenceFor(player.positionId))),
      });
    }
  }

  // 5. Clausulazos ofensivos: jugadores de rivales disponibles
  if (league?.config?.features?.buyoutClause) {
    const buyoutCandidates = rivals
      .flatMap((rival) => rival.players.map((tp) => ({ rival, tp })))
      .filter(({ tp }) => {
        const p = tp.playerMaster;
        if (teamPlayerIds.has(p.id)) return false;
        if (p.playerStatus !== 'ok') return false;
        if (!(tp.buyoutClause > 0) || tp.buyoutClause > budget.available) return false;
        return getClauseProtection(tp).status === 'available';
      })
      .map(({ rival, tp }) => {
        const p = tp.playerMaster;
        const prediction = estimatePointsDetailed(p, calendar, estimatorContext);
        const expected = prediction.xp;
        const pStarter = prediction.pStarter;
        const needScore = needByPosition.get(p.positionId) || 0;
        const clauseRatio = tp.buyoutClause / Math.max(p.marketValue, 1);
        const external = combinedSignal(externalSignals[p.id] || []);
        const starterScore = starterScoreFromLastSeason(p.lastSeasonPoints);
        const starterFactor = Math.min(1, 0.4 + 0.6 * (pStarter ?? starterScore));
        let score = needScore * 2 + (expected * starterFactor) / Math.max(clauseRatio, 0.5);
        if (external.signal === 'sell' && external.confidence >= SELL_NEWS_CONFIDENCE) score *= 0.3;
        else if (external.signal === 'buy') score *= 1.2;
        return { rival, tp, expected, pStarter, needScore, clauseRatio, external, score };
      })
      .filter((c) => c.score > 1.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    for (const candidate of buyoutCandidates) {
      const p = candidate.tp.playerMaster;
      const pStarter = candidate.pStarter;
      const isBenchThisWeek = pStarter !== null && pStarter < SUBSTITUTE_SCORE;
      const starterNote = isBenchThisWeek
        ? ` Atención: probabilidad de titularidad ${Math.round(pStarter * 100)}% esta jornada.`
        : pStarter !== null
          ? ` Titularidad: ${Math.round(pStarter * 100)}%.`
          : '';
      recommendations.push({
        id: `buyout-${p.id}`,
        type: 'buyout' as RecommendationType,
        priority: isBenchThisWeek ? 'medium' : candidate.needScore > 0.3 || candidate.clauseRatio < 0.9 ? 'high' : 'medium',
        player: p,
        reason: `Disponible para clausulazo en el equipo de ${candidate.rival.managerName}.`,
        details: `Cláusula: ${formatCurrency(candidate.tp.buyoutClause)} (valor de mercado ${formatCurrency(p.marketValue)}). Puntos esperados: ${candidate.expected.toFixed(1)}.${starterNote}${candidate.needScore > 0.3 ? ' Cubre una necesidad de tu plantilla.' : ''}`,
        suggestedAction: isBenchThisWeek
          ? `Es suplente en el once probable; valora si merece pagar ${formatCurrency(candidate.tp.buyoutClause)}.`
          : `Paga su cláusula de ${formatCurrency(candidate.tp.buyoutClause)} antes de que la suban o lo blinden.`,
        estimatedValue: candidate.tp.buyoutClause,
        ownerName: candidate.rival.managerName,
        externalSignals: externalSignals[p.id] || [],
        // ΔxP del clausulazo: puntos que añade sobre el nivel medio de tu plantilla.
        impactScore: round1(Math.max(0, candidate.expected - referenceFor(p.positionId))),
      });
    }
  }

  // 6. Capitán recomendado (solo si la liga tiene la feature premium activada)
  if (league?.config?.premiumFeatures?.captain !== false && captain?.captain) {
    const cap = captain.captain;
    // ΔxP del capitán: ganancia marginal sobre la mejor alternativa (los
    // puntos del capitán se duplican, así que es la decisión más apalancada).
    const details = [
      captain.alternatives.length > 0
        ? `Alternativas: ${captain.alternatives.map((a) => `${a.player.nickname} (${a.expectedPoints.toFixed(1)})`).join(', ')}.`
        : 'No hay alternativas claras.',
      ...cap.risks,
    ].join(' ');
    recommendations.push({
      id: `captain-${cap.player.id}`,
      type: 'captain' as RecommendationType,
      priority: 'high',
      player: cap.player,
      reason: `Mejor candidato a capitán para esta jornada: ${cap.reasoning}.`,
      details,
      suggestedAction: `Asígnale el brazalete: duplica sus puntos y suma ${cap.captainBonus.toFixed(1)} pts esperados.`,
      impactScore: captain.gainOverAlternative,
    });
  }

  return dedupeByPlayer(recommendations)
    .map((rec) => ({
      ...rec,
      source: rec.source ?? (rec.type === 'buy' ? ('market' as const) : rec.type === 'buyout' ? ('rival' as const) : ('squad' as const)),
    }))
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));
}

/**
 * Selecciona los mejores movimientos de la jornada: top 5 por impacto (ΔxP en
 * puntos) con diversidad de tipos (máx. 2 por tipo), cubriendo plantilla,
 * mercado y rivales.
 */
export function computeBestMoves(recommendations: Recommendation[]): Recommendation[] {
  const sorted = [...recommendations].sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0));
  const picks: Recommendation[] = [];
  const perType = new Map<string, number>();

  for (const rec of sorted) {
    if ((rec.impactScore ?? 0) < MIN_IMPACT_XP) continue;
    const count = perType.get(rec.type) || 0;
    if (count >= 2) continue;
    perType.set(rec.type, count + 1);
    picks.push(rec);
    if (picks.length >= 5) break;
  }

  return picks;
}

/**
 * Deduplicación por jugador (§5.4): una acción coherente por jugador, la de
 * mayor ΔxP. Evita recomendaciones contradictorias (p. ej. vender y proteger
 * la cláusula del mismo jugador a la vez).
 */
function dedupeByPlayer(recommendations: Recommendation[]): Recommendation[] {
  const byPlayer = new Map<string, Recommendation>();
  for (const rec of recommendations) {
    const existing = byPlayer.get(rec.player.id);
    if (!existing || (rec.impactScore ?? 0) > (existing.impactScore ?? 0)) {
      byPlayer.set(rec.player.id, rec);
    }
  }
  return [...byPlayer.values()];
}

/** Media de puntos esperados de los jugadores sanos de la plantilla por posición. */
function buildPositionReference(
  teamData: { players: { playerMaster: PlayerMaster }[] },
  expectedOwn: Map<string, number>,
): Map<number, number> {
  const sum = new Map<number, number>();
  const count = new Map<number, number>();
  for (const teamPlayer of teamData.players) {
    const player = teamPlayer.playerMaster;
    if (player.playerStatus !== 'ok') continue;
    const expected = expectedOwn.get(player.id);
    if (expected === undefined) continue;
    sum.set(player.positionId, (sum.get(player.positionId) || 0) + expected);
    count.set(player.positionId, (count.get(player.positionId) || 0) + 1);
  }
  const reference = new Map<number, number>();
  for (const [positionId, total] of sum) {
    reference.set(positionId, total / Math.max(count.get(positionId) || 0, 1));
  }
  return reference;
}

function buildBuyReason(marketPlayer: { salePrice: number; valueRatio: number; expectedPoints: number; numberOfBids: number }, coversNeed: boolean): string {
  const bargainText = marketPlayer.valueRatio < 0.9 ? 'Oportunidad de mercado por debajo de su valor.' : 'Opción de mercado a precio ajustado.';
  const needText = coversNeed ? ' Cubre una necesidad de tu plantilla.' : '';
  return `${bargainText}${needText}`;
}

function findPlayer(teamData: { players: { playerMaster: PlayerMaster }[] }, playerId: string): PlayerMaster | undefined {
  return teamData.players.find((p) => p.playerMaster.id === playerId)?.playerMaster;
}

function strongestNegativeSignal(signals: ExternalSignal[]): ExternalSignal | undefined {
  return signals
    .filter((s) => s.signal === 'sell')
    .sort((a, b) => b.confidence - a.confidence)[0];
}

function categoryText(category: string): string {
  switch (category) {
    case 'injury':
      return 'posible lesión';
    case 'illness':
      return 'enfermo o indispuesto';
    case 'suspension':
      return 'posible sanción';
    case 'doubt':
      return 'duda para el próximo partido';
    case 'return':
      return 'vuelve de una baja';
    case 'form':
      return 'gran momento de forma';
    case 'rotation':
      return 'riesgo de rotación';
    case 'transfer':
      return 'rumores de mercado';
    default:
      return category;
  }
}

function statusText(status: string): string {
  switch (status) {
    case 'doubtful':
      return 'dudoso';
    case 'injured':
      return 'lesionado';
    case 'out_of_league':
      return 'fuera de la liga';
    default:
      return status;
  }
}

function priorityWeight(priority: string): number {
  switch (priority) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}
