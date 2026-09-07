import { test } from 'node:test';
import assert from 'node:assert';
import {
  DIXON_COLES_RHO,
  LEAGUE_AWAY_GOALS,
  LEAGUE_HOME_GOALS,
  expectedGoalsFromElo,
  leagueMeanElo,
  matchOutcomeFromElo,
  referenceOutcomeFromElo,
  scoreDistribution,
} from '../lib/engine/features/match-model.ts';
import {
  buildFixtureOutlooks,
  difficultyLabel,
  fixtureAdjustment,
} from '../lib/engine/features/fixture.ts';
import {
  POSITION_SHARE_PRIORS,
  buildFixtureShares,
  componentOfStat,
  poolShares,
  priorSharesForPosition,
  sharesFromPointsPer90,
} from '../lib/engine/features/fixture-components.ts';
import { DEFAULT_ENGINE_PARAMS } from '../lib/engine/params.ts';
import { predictPlayerPoints } from '../lib/engine/model.ts';
import type { PlayerWeekStat } from '../lib/engine/player-stats.ts';
import type { Match, PlayerMaster } from '../types/fantasy.ts';

/** Puntuación esperada de la propia fórmula Elo (victoria 1, empate 0.5). */
function eloExpectedScore(diff: number): number {
  return 1 / (1 + 10 ** (-diff / 400));
}

const LEAGUE_MEAN_ELO = 1760;

test('Modelo de partido (Elo → Poisson bivariante Dixon-Coles)', async (t) => {
  await t.test('la distribución de marcadores es una distribución de probabilidad', () => {
    const grid = scoreDistribution(2.1, 0.8, DIXON_COLES_RHO);
    let total = 0;
    for (const row of grid) {
      for (const p of row) {
        assert.ok(p >= 0, 'ninguna probabilidad puede ser negativa');
        total += p;
      }
    }
    assert.ok(Math.abs(total - 1) < 1e-9, `la masa total debe ser 1, es ${total}`);
  });

  await t.test('la corrección Dixon-Coles conserva la masa que redistribuye', () => {
    // τ solo mueve probabilidad entre los cuatro marcadores bajos: las
    // marginales de goles no deben cambiar de forma apreciable.
    const corrected = scoreDistribution(1.6, 1.1, DIXON_COLES_RHO);
    const independent = scoreDistribution(1.6, 1.1, 0);
    for (let own = 0; own <= 4; own++) {
      const marginalCorrected = corrected[own].reduce((sum, p) => sum + p, 0);
      const marginalIndependent = independent[own].reduce((sum, p) => sum + p, 0);
      assert.ok(
        Math.abs(marginalCorrected - marginalIndependent) < 0.02,
        `la marginal de ${own} goles se desvía ${Math.abs(marginalCorrected - marginalIndependent)}`,
      );
    }
  });

  await t.test('reproduce la puntuación esperada de la fórmula Elo en campo neutral', () => {
    // Es la calibración que fija el divisor por defecto: si el modelo de goles
    // no coincide con la fuente de los ratings, los ratings dejan de significar
    // lo que dicen significar.
    let worst = 0;
    for (let diff = -350; diff <= 350; diff += 25) {
      const outcome = matchOutcomeFromElo(1760 + diff, 1760, 'neutral', DEFAULT_ENGINE_PARAMS.fixtureEloDivisor);
      const modelled = outcome.pWin + 0.5 * outcome.pDraw;
      worst = Math.max(worst, Math.abs(modelled - eloExpectedScore(diff)));
    }
    assert.ok(worst < 0.02, `desviación máxima ${worst.toFixed(4)} frente a la fórmula Elo`);
  });

  await t.test('con equipos iguales devuelve las medias de la liga y ventaja de campo', () => {
    const goals = expectedGoalsFromElo(1800, 1800, 'home');
    assert.ok(Math.abs(goals.for - LEAGUE_HOME_GOALS) < 1e-9);
    assert.ok(Math.abs(goals.against - LEAGUE_AWAY_GOALS) < 1e-9);

    const home = matchOutcomeFromElo(1800, 1800, 'home');
    const away = matchOutcomeFromElo(1800, 1800, 'away');
    assert.ok(home.pWin > away.pWin, 'jugar en casa tiene que dar más probabilidad de victoria');
    assert.ok(Math.abs(home.pDraw - away.pDraw) < 1e-9, 'el empate es simétrico');
    assert.ok(Math.abs(home.pWin - away.pLoss) < 1e-9, 'las dos vistas del mismo partido deben cuadrar');
  });

  await t.test('las probabilidades suman 1 y el rival mejor empeora todos los indicadores', () => {
    let previous = matchOutcomeFromElo(1700, 1500, 'home');
    for (const opponentElo of [1600, 1700, 1800, 1900, 2000]) {
      const outcome = matchOutcomeFromElo(1700, opponentElo, 'home');
      assert.ok(Math.abs(outcome.pWin + outcome.pDraw + outcome.pLoss - 1) < 1e-9);
      assert.ok(outcome.for < previous.for, 'contra un rival mejor se marcan menos goles');
      assert.ok(outcome.against > previous.against, 'contra un rival mejor se encajan más');
      assert.ok(outcome.pCleanSheet < previous.pCleanSheet, 'y la portería a cero es menos probable');
      assert.ok(outcome.expectedMatchPoints < previous.expectedMatchPoints);
      previous = outcome;
    }
  });

  await t.test('la media de Elo de la liga ignora mapas vacíos', () => {
    assert.strictEqual(leagueMeanElo(new Map()), null);
    assert.strictEqual(leagueMeanElo(new Map([[1, 1700], [2, 1900]])), 1800);
  });
});

test('Cuotas por componente', async (t) => {
  await t.test('las cuotas de un desglose real suman 1 y agrupan por componente', () => {
    const shares = sharesFromPointsPer90({ mins_played: 2, goals: 4, goal_assist: 1, yellow_card: -1 });
    assert.ok(shares !== null);
    const total = Object.values(shares!).reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `las cuotas deben sumar 1, suman ${total}`);
    assert.ok(Math.abs(shares!.attack - 5 / 6) < 1e-9, 'goles y asistencias van al mismo componente');
    assert.ok(shares!.discipline < 0, 'las tarjetas restan');
  });

  await t.test('no inventa cuotas cuando los puntos netos son ruido', () => {
    assert.strictEqual(sharesFromPointsPer90({ goals: 4, yellow_card: -3.5 }), null);
  });

  await t.test('cada prior de posición suma 1', () => {
    for (const [positionId, shares] of Object.entries(POSITION_SHARE_PRIORS)) {
      const total = Object.values(shares).reduce((sum, value) => sum + value, 0);
      assert.ok(Math.abs(total - 1) < 1e-9, `el prior de la posición ${positionId} suma ${total}`);
    }
  });

  await t.test('una acción desconocida es neutra, nunca se ajusta al revés', () => {
    assert.strictEqual(componentOfStat('accion_que_no_existe_todavia'), 'neutral');
    assert.strictEqual(componentOfStat('goals'), 'attack');
    assert.strictEqual(componentOfStat('saves'), 'saves');
    assert.strictEqual(componentOfStat('clean_sheet'), 'cleanSheet');
  });

  await t.test('el partial pooling va del prior a lo observado según la evidencia', () => {
    const observed = sharesFromPointsPer90({ mins_played: 2, goals: 8 })!;
    const prior = priorSharesForPosition(4);
    assert.deepStrictEqual(poolShares(observed, 0, prior, 8), { ...prior });
    const pooled = poolShares(observed, 8, prior, 8);
    assert.ok(Math.abs(pooled.attack - (observed.attack + prior.attack) / 2) < 1e-9, 'con n=k la mezcla es 50/50');
  });

  await t.test('agrega cuotas por posición sobre el universo con datos', () => {
    const shares = buildFixtureShares([
      { positionId: 4, pointsPer90ByStat: { mins_played: 2, goals: 6 } },
      { positionId: 4, pointsPer90ByStat: { mins_played: 2, goals: 2 } },
      { positionId: 1, pointsPer90ByStat: null },
    ]);
    assert.ok(shares.has(4));
    assert.ok(!shares.has(1), 'sin desglose no se inventa una cuota');
    assert.ok(Math.abs(shares.get(4)!.attack - 8 / 12) < 1e-9, 'agrega puntos, no medias de cuotas');
  });
});

test('Ajuste por emparejamiento', async (t) => {
  const strong = 2000; // equipo muy superior
  const weak = 1600; // equipo muy inferior

  await t.test('un rival medio en condiciones medias no mueve la estimación', () => {
    // El partido de referencia ES el rival medio en campo neutral, así que
    // enfrentarse a él en casa solo puede desviar por la ventaja de campo.
    for (const positionId of [1, 2, 3, 4]) {
      const adjustment = fixtureAdjustment({
        eloOwn: LEAGUE_MEAN_ELO,
        eloOpponent: LEAGUE_MEAN_ELO,
        eloLeagueMean: LEAGUE_MEAN_ELO,
        isHome: true,
        shares: priorSharesForPosition(positionId),
      });
      assert.ok(
        Math.abs(adjustment.multiplier - 1) < 0.12,
        `posición ${positionId}: el partido medio no debería desviar tanto (${adjustment.multiplier})`,
      );
      assert.ok(adjustment.difficulty > 35 && adjustment.difficulty < 55);
    }
  });

  await t.test('penaliza al buen jugador de un equipo inferior contra uno superior', () => {
    const forward = fixtureAdjustment({
      eloOwn: weak,
      eloOpponent: strong,
      eloLeagueMean: LEAGUE_MEAN_ELO,
      isHome: false,
      shares: priorSharesForPosition(4),
    });
    assert.ok(forward.multiplier < 0.85, `el delantero debería perder puntos, multiplicador ${forward.multiplier}`);
    assert.strictEqual(forward.label, 'Muy difícil');
    assert.ok(forward.byComponent.attack < 0.7, 'el componente de ataque es el que más cae');
    assert.ok(forward.byComponent.conceded > 1.2, 'y el equipo encaja mucho más');
  });

  await t.test('premia al jugador del equipo superior contra el inferior', () => {
    const forward = fixtureAdjustment({
      eloOwn: strong,
      eloOpponent: weak,
      eloLeagueMean: LEAGUE_MEAN_ELO,
      isHome: true,
      shares: priorSharesForPosition(4),
    });
    assert.ok(forward.multiplier > 1.1, `multiplicador ${forward.multiplier}`);
    assert.strictEqual(forward.label, 'Muy favorable');
  });

  await t.test('el mismo partido afecta distinto según la demarcación', () => {
    const input = { eloOwn: weak, eloOpponent: strong, eloLeagueMean: LEAGUE_MEAN_ELO, isHome: false };
    const goalkeeper = fixtureAdjustment({ ...input, shares: priorSharesForPosition(1) }).multiplier;
    const defender = fixtureAdjustment({ ...input, shares: priorSharesForPosition(2) }).multiplier;
    const forward = fixtureAdjustment({ ...input, shares: priorSharesForPosition(4) }).multiplier;

    // Es el resultado que justifica todo el módulo: el portero apenas pierde
    // puntos porque las paradas compensan los goles encajados, mientras que
    // defensa y delantero sí sufren el emparejamiento.
    assert.ok(goalkeeper > defender, 'el portero debe sufrir menos que el defensa');
    assert.ok(goalkeeper > forward, 'el portero debe sufrir menos que el delantero');
    assert.ok(goalkeeper > 0.9, `el portero no debería desplomarse (${goalkeeper})`);
    assert.ok(defender < 0.85, `el defensa sí (${defender})`);
  });

  await t.test('el amortiguador de calibración escala el efecto', () => {
    const input = {
      eloOwn: weak,
      eloOpponent: strong,
      eloLeagueMean: LEAGUE_MEAN_ELO,
      isHome: false,
      shares: priorSharesForPosition(4),
    };
    assert.strictEqual(fixtureAdjustment({ ...input, dampening: 0 }).multiplier, 1);
    const half = fixtureAdjustment({ ...input, dampening: 0.5 }).multiplier;
    const full = fixtureAdjustment({ ...input, dampening: 1 }).multiplier;
    assert.ok(Math.abs(half - (1 + full) / 2) < 1e-9, 'a la mitad de amortiguador, la mitad de desviación');
  });

  await t.test('la barandilla del multiplicador no toca el peor emparejamiento real', () => {
    // 400 puntos de Elo es el hueco entre el líder y el colista de LaLiga: el
    // caso más extremo que se puede dar. Si el recorte global mordiera aquí,
    // dejaría de ser una barandilla y se convertiría en el modelo.
    for (const positionId of [1, 2, 3, 4]) {
      for (const [eloOwn, eloOpponent, isHome] of [[weak, strong, false], [strong, weak, true]] as const) {
        const multiplier = fixtureAdjustment({
          eloOwn,
          eloOpponent,
          eloLeagueMean: LEAGUE_MEAN_ELO,
          isHome,
          shares: priorSharesForPosition(positionId),
        }).multiplier;
        assert.ok(multiplier > 0.56 && multiplier < 1.49, `posición ${positionId}: ${multiplier} roza el recorte`);
      }
    }
  });

  await t.test('la dificultad es monótona y las etiquetas cubren la escala', () => {
    const difficulties = [1500, 1700, 1900, 2100].map(
      (eloOpponent) =>
        fixtureAdjustment({
          eloOwn: LEAGUE_MEAN_ELO,
          eloOpponent,
          eloLeagueMean: LEAGUE_MEAN_ELO,
          isHome: true,
          shares: priorSharesForPosition(3),
        }).difficulty,
    );
    for (let i = 1; i < difficulties.length; i++) {
      assert.ok(difficulties[i] > difficulties[i - 1], 'un rival mejor tiene que ser más difícil');
    }
    assert.strictEqual(difficultyLabel(0), 'Muy favorable');
    assert.strictEqual(difficultyLabel(50), 'Equilibrado');
    assert.strictEqual(difficultyLabel(100), 'Muy difícil');
  });

  await t.test('el partido de referencia no depende de la localía', () => {
    const home = referenceOutcomeFromElo(1900, LEAGUE_MEAN_ELO);
    const away = referenceOutcomeFromElo(1900, LEAGUE_MEAN_ELO);
    assert.deepStrictEqual(home, away);
  });
});

test('Pronóstico de la jornada por equipo', async (t) => {
  const calendar: Match[] = [
    {
      id: 'm1',
      matchDate: '2026-09-12T19:00:00Z',
      date: '2026-09-12',
      time: '19:00',
      localId: 1,
      visitorId: 2,
      matchState: 0,
      localScore: null,
      visitorScore: null,
      featured: false,
    },
  ];
  const eloByTeamId = new Map([[1, 2000], [2, 1600], [3, 1760]]);

  await t.test('describe el partido desde los dos lados', () => {
    const outlooks = buildFixtureOutlooks({ calendar, eloByTeamId });
    assert.strictEqual(outlooks.size, 2);

    const local = outlooks.get(1)!;
    const visitor = outlooks.get(2)!;
    assert.strictEqual(local.isHome, true);
    assert.strictEqual(local.opponentTeamId, 2);
    assert.strictEqual(visitor.isHome, false);
    assert.ok(local.difficulty < visitor.difficulty, 'el favorito tiene el emparejamiento más fácil');
    assert.ok(Math.abs(local.pWin - visitor.pLoss) < 0.002, 'las dos vistas cuadran');
    assert.ok(Math.abs(local.expectedGoalsFor - visitor.expectedGoalsAgainst) < 0.002);
  });

  await t.test('resuelve el efecto por demarcación', () => {
    const visitor = buildFixtureOutlooks({ calendar, eloByTeamId }).get(2)!;
    assert.ok(visitor.multiplierByPosition);
    assert.ok(visitor.multiplierByPosition![1] > visitor.multiplierByPosition![4], 'portero vs delantero');
  });

  await t.test('omite los equipos sin rating Elo en vez de inventárselo', () => {
    const outlooks = buildFixtureOutlooks({ calendar, eloByTeamId: new Map([[1, 2000]]) });
    assert.strictEqual(outlooks.size, 0);
    assert.strictEqual(buildFixtureOutlooks({ calendar, eloByTeamId: new Map() }).size, 0);
  });
});

test('El estimador aplica el emparejamiento de punta a punta', async (t) => {
  const WEAK_TEAM = 10;
  const STRONG_TEAM = 20;
  const teamElos = new Map([
    [WEAK_TEAM, 1600],
    [STRONG_TEAM, 2000],
    // Relleno para que la media de la liga sea 1760 y no la de dos equipos.
    [30, 1700],
    [40, 1780],
    [50, 1720],
  ]);

  const calendar: Match[] = [
    {
      id: 'm1',
      matchDate: '2026-09-12T19:00:00Z',
      date: '2026-09-12',
      time: '19:00',
      localId: STRONG_TEAM,
      visitorId: WEAK_TEAM,
      matchState: 0,
      localScore: null,
      visitorScore: null,
      featured: false,
    },
  ];

  /** Jugador con 6 jornadas idénticas: solo cambia su equipo y su posición. */
  function player(id: string, teamId: number, positionId: number): PlayerMaster {
    return {
      id,
      name: `Jugador ${id}`,
      nickname: `Jugador ${id}`,
      slug: `jugador-${id}`,
      positionId,
      position: String(positionId),
      teamId,
      playerStatus: 'ok',
      lastSeasonPoints: 120,
      marketValue: 10_000_000,
      points: 60,
      averagePoints: 6,
    };
  }

  function stats(breakdown: Record<string, [number, number]>): PlayerWeekStat[] {
    return Array.from({ length: 6 }, (_, index) => ({
      weekNumber: index + 1,
      totalPoints: Object.values(breakdown).reduce((sum, [, points]) => sum + points, 0),
      stats: { mins_played: [90, 2], ...breakdown },
    }));
  }

  const forwardStats = stats({ goals: [1, 4], won_contest: [2, 1] });
  const keeperStats = stats({ saves: [3, 2], goals_conceded: [1, -1], marca_points: [2, 2] });

  const weakForward = player('w-fw', WEAK_TEAM, 4);
  const strongForward = player('s-fw', STRONG_TEAM, 4);
  const weakKeeper = player('w-gk', WEAK_TEAM, 1);

  const context = {
    teamElos,
    weekNumber: 7,
    playerStats: {
      'w-fw': forwardStats,
      's-fw': forwardStats,
      'w-gk': keeperStats,
    },
  };

  await t.test('el mismo jugador vale menos en el equipo inferior por el rival que le toca', () => {
    const weak = predictPlayerPoints(weakForward, calendar, context);
    const strong = predictPlayerPoints(strongForward, calendar, context);

    // Idénticos en todo salvo el emparejamiento: mismas jornadas, mismos
    // minutos, mismo desglose. La diferencia es exactamente lo que aporta
    // "contra quién juega", que es el objetivo de la funcionalidad.
    assert.ok(strong.xp > weak.xp, `${strong.xp} debería superar a ${weak.xp}`);
    assert.ok(weak.xp / strong.xp < 0.8, 'la diferencia tiene que ser relevante, no cosmética');
    assert.ok(weak.fixture !== null && strong.fixture !== null);
    assert.strictEqual(weak.fixture!.opponentTeamId, STRONG_TEAM);
    assert.strictEqual(weak.fixture!.isHome, false);
    assert.ok(weak.fixture!.difficulty > strong.fixture!.difficulty);
    assert.ok(
      weak.dataQuality.notes.some((note) => note.startsWith('Emparejamiento')),
      'el ajuste tiene que quedar explicado en dataQuality',
    );
  });

  await t.test('el portero del equipo inferior aguanta el emparejamiento mucho mejor', () => {
    const keeper = predictPlayerPoints(weakKeeper, calendar, context);
    const forward = predictPlayerPoints(weakForward, calendar, context);
    assert.ok(keeper.fixture!.multiplier > forward.fixture!.multiplier);
    assert.ok(keeper.fixture!.multiplier > 0.9, `las paradas compensan (${keeper.fixture!.multiplier})`);
  });

  await t.test('sin ratings Elo cae al proxy heredado y no inventa emparejamiento', () => {
    const prediction = predictPlayerPoints(weakForward, calendar, { ...context, teamElos: undefined });
    assert.strictEqual(prediction.fixture, null);
    assert.ok(prediction.xp > 0);
    assert.ok(prediction.dataQuality.notes.some((note) => note.includes('sin ratings Elo')));
  });

  await t.test('en jornada de descanso no hay ni puntos ni emparejamiento', () => {
    const resting = player('rest', 99, 4);
    const prediction = predictPlayerPoints(resting, calendar, context);
    assert.strictEqual(prediction.source, 'bye-week');
    assert.strictEqual(prediction.xp, 0);
    assert.strictEqual(prediction.fixture, null);
  });
});
