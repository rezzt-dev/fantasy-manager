import { test } from 'node:test';
import assert from 'node:assert';
import {
  EUROPEAN_WEIGHT_BY_MINUTES_SOURCE,
  applyEuropeanRotation,
  buildEuropeanOutlooks,
  computeEuropeanLoad,
  europeanLoadLabel,
  europeanPlayerAdjustment,
  fixtureStakes,
  restPressure,
} from '../lib/engine/features/european-load.ts';
import { stageFromRoundInfo } from '../lib/engine/sources/uefa.ts';
import { predictPlayerPoints } from '../lib/engine/model.ts';
import type { MinutesEstimate } from '../lib/engine/features/minutes.ts';
import type { EuropeanFixture } from '../lib/engine/sources/types.ts';
import type { Match, PlayerMaster } from '../types/fantasy.ts';

const DAY = 24 * 60 * 60 * 1000;

/** Sábado 19:00, el hueco habitual de la jornada de LaLiga. */
const LALIGA_KICKOFF = new Date('2026-09-19T19:00:00Z').getTime();
const REAL_MADRID = 1;
const RIVAL = 2;

function ucl(overrides: Partial<EuropeanFixture> = {}): EuropeanFixture {
  return {
    teamId: REAL_MADRID,
    competition: 'ucl',
    stage: 'league-phase',
    opponentName: 'Inter',
    isHome: true,
    // Miércoles anterior: tres días de descanso hasta el sábado.
    kickoff: LALIGA_KICKOFF - 3 * DAY,
    round: 2,
    played: false,
    eventId: 1,
    ...overrides,
  };
}

function minutes(overrides: Partial<MinutesEstimate> = {}): MinutesEstimate {
  return {
    pStarter: 0.85,
    expectedMinutes: 0.85 * 80 + 0.15 * 15,
    source: 'historical',
    minutesIfStarter: 80,
    minutesIfBench: 15,
    ...overrides,
  };
}

test('Presión por descanso', async (t) => {
  await t.test('es máxima con el turnaround mínimo y nula con una semana normal', () => {
    assert.equal(restPressure(2), 1);
    assert.equal(restPressure(5), 0);
    assert.equal(restPressure(7), 0);
  });

  await t.test('decrece de forma monótona con los días de descanso', () => {
    const values = [2, 2.5, 3, 3.5, 4, 4.5, 5].map(restPressure);
    for (let i = 1; i < values.length; i++) {
      assert.ok(values[i] <= values[i - 1], `no decrece entre ${i - 1} y ${i}`);
    }
  });

  await t.test('un descanso imposible no rompe el cálculo', () => {
    assert.equal(restPressure(Number.NaN), 0);
    assert.equal(restPressure(-3), 0);
  });
});

test('Importancia del partido europeo', async (t) => {
  await t.test('la Champions pesa más que la Europa League y esta más que la Conference', () => {
    const champions = fixtureStakes(ucl({ competition: 'ucl' }));
    const europa = fixtureStakes(ucl({ competition: 'uel' }));
    const conference = fixtureStakes(ucl({ competition: 'uecl' }));
    assert.ok(champions > europa, 'Champions debería pesar más que Europa League');
    assert.ok(europa > conference, 'Europa League debería pesar más que Conference');
  });

  await t.test('una eliminatoria pesa más que la fase de liga', () => {
    assert.ok(fixtureStakes(ucl({ stage: 'knockout' })) > fixtureStakes(ucl({ stage: 'league-phase', round: 2 })));
  });

  await t.test('las últimas rondas de la fase de liga pesan más que las primeras', () => {
    assert.ok(fixtureStakes(ucl({ round: 7 })) > fixtureStakes(ucl({ round: 2 })));
  });

  await t.test('nunca se sale de 0-1', () => {
    for (const fixture of [
      ucl({ stage: 'knockout' }),
      ucl({ competition: 'uecl', stage: 'qualifying' }),
      ucl({ round: 8 }),
    ]) {
      const stakes = fixtureStakes(fixture);
      assert.ok(stakes >= 0 && stakes <= 1, `${stakes} fuera de rango`);
    }
  });
});

test('Carga europea de un equipo', async (t) => {
  await t.test('devuelve null si el equipo no tiene compromiso europeo', () => {
    const load = computeEuropeanLoad({ teamId: RIVAL, kickoff: LALIGA_KICKOFF, fixtures: [ucl()] });
    assert.equal(load, null);
  });

  await t.test('devuelve null si el partido europeo cae fuera de la ventana', () => {
    const load = computeEuropeanLoad({
      teamId: REAL_MADRID,
      kickoff: LALIGA_KICKOFF,
      fixtures: [ucl({ kickoff: LALIGA_KICKOFF - 40 * DAY })],
    });
    assert.equal(load, null);
  });

  await t.test('un partido europeo posterior presiona más que uno anterior con el mismo descanso', () => {
    const antes = computeEuropeanLoad({
      teamId: REAL_MADRID,
      kickoff: LALIGA_KICKOFF,
      fixtures: [ucl({ kickoff: LALIGA_KICKOFF - 3 * DAY })],
    })!;
    const despues = computeEuropeanLoad({
      teamId: REAL_MADRID,
      kickoff: LALIGA_KICKOFF,
      fixtures: [ucl({ kickoff: LALIGA_KICKOFF + 3 * DAY })],
    })!;
    // Reservarse PARA la Champions pesa más que venir DE la Champions: es la
    // traducción de "la Champions va por delante de la liga".
    assert.ok(
      despues.rotationPressure > antes.rotationPressure,
      `posterior ${despues.rotationPressure} debería superar a anterior ${antes.rotationPressure}`,
    );
  });

  await t.test('la semana sándwich acumula las dos presiones', () => {
    const solo = computeEuropeanLoad({
      teamId: REAL_MADRID,
      kickoff: LALIGA_KICKOFF,
      fixtures: [ucl({ kickoff: LALIGA_KICKOFF + 3 * DAY, eventId: 2 })],
    })!;
    const sandwich = computeEuropeanLoad({
      teamId: REAL_MADRID,
      kickoff: LALIGA_KICKOFF,
      fixtures: [ucl({ kickoff: LALIGA_KICKOFF - 3 * DAY }), ucl({ kickoff: LALIGA_KICKOFF + 3 * DAY, eventId: 2 })],
    })!;
    assert.ok(sandwich.rotationPressure > solo.rotationPressure);
    assert.ok(sandwich.rotationPressure <= 1);
    assert.equal(sandwich.matchesInWindow, 2);
  });

  await t.test('un equipo con plantilla corta rota menos que uno grande', () => {
    const base = { teamId: REAL_MADRID, kickoff: LALIGA_KICKOFF, fixtures: [ucl({ kickoff: LALIGA_KICKOFF + 3 * DAY })] };
    const grande = computeEuropeanLoad({ ...base, tier: 1 })!;
    const modesto = computeEuropeanLoad({ ...base, tier: 5 })!;
    assert.ok(grande.expectedRotatedSlots > modesto.expectedRotatedSlots);
    // La presión es la misma: lo que cambia es cuántos cambios puede permitirse.
    assert.equal(grande.rotationPressure, modesto.rotationPressure);
  });

  await t.test('solo un partido ya jugado produce fatiga', () => {
    const antes = computeEuropeanLoad({
      teamId: REAL_MADRID,
      kickoff: LALIGA_KICKOFF,
      fixtures: [ucl({ kickoff: LALIGA_KICKOFF - 3 * DAY })],
    })!;
    const despues = computeEuropeanLoad({
      teamId: REAL_MADRID,
      kickoff: LALIGA_KICKOFF,
      fixtures: [ucl({ kickoff: LALIGA_KICKOFF + 3 * DAY })],
    })!;
    assert.ok(antes.fatigueMultiplier < 1, 'venir de jugar debería fatigar');
    assert.equal(despues.fatigueMultiplier, 1, 'un partido futuro no puede fatigar todavía');
  });

  await t.test('la penalización de Elo crece con la presión y se mantiene acotada', () => {
    const suave = computeEuropeanLoad({
      teamId: REAL_MADRID,
      kickoff: LALIGA_KICKOFF,
      fixtures: [ucl({ competition: 'uecl', kickoff: LALIGA_KICKOFF - 4 * DAY })],
    })!;
    const dura = computeEuropeanLoad({
      teamId: REAL_MADRID,
      kickoff: LALIGA_KICKOFF,
      fixtures: [ucl({ stage: 'knockout', kickoff: LALIGA_KICKOFF + 2 * DAY })],
    })!;
    assert.ok(dura.eloPenalty > suave.eloPenalty);
    assert.ok(dura.eloPenalty <= 35, `${dura.eloPenalty} supera el tope de diseño`);
  });

  await t.test('la etiqueta acompaña siempre a la cifra', () => {
    assert.equal(europeanLoadLabel(0), 'Sin carga europea');
    assert.equal(europeanLoadLabel(90), 'Rotación muy probable');
    const load = computeEuropeanLoad({
      teamId: REAL_MADRID,
      kickoff: LALIGA_KICKOFF,
      fixtures: [ucl({ kickoff: LALIGA_KICKOFF + 3 * DAY })],
    })!;
    assert.equal(load.label, europeanLoadLabel(load.rotationRisk));
    assert.ok(load.summary.includes('Champions'));
  });
});

test('Redistribución de la titularidad', async (t) => {
  const outlook = computeEuropeanLoad({
    teamId: REAL_MADRID,
    kickoff: LALIGA_KICKOFF,
    fixtures: [ucl({ kickoff: LALIGA_KICKOFF + 3 * DAY })],
    tier: 1,
  })!;

  await t.test('el titular indiscutible pierde titularidad y el suplente la gana', () => {
    const titular = applyEuropeanRotation({ pStarter: 0.85, outlook, minutesSource: 'probable-lineup' });
    const suplente = applyEuropeanRotation({ pStarter: 0.15, outlook, minutesSource: 'probable-lineup' });
    assert.ok(titular.delta < 0, 'el titular debería perder probabilidad');
    assert.ok(suplente.delta > 0, 'el suplente debería ganarla');
  });

  await t.test('conserva exactamente el once del equipo canónico', () => {
    // 11 titulares del once probable (0.85) y 9 suplentes (0.15): la suma de
    // los Δ tiene que ser cero. Es la propiedad que hace que la rotación mueva
    // minutos en vez de inventárselos o destruirlos, y la razón de que las dos
    // masas del denominador se deriven de las constantes de `minutes.ts`.
    const titular = applyEuropeanRotation({ pStarter: 0.85, outlook, minutesSource: 'probable-lineup' }).delta;
    const suplente = applyEuropeanRotation({ pStarter: 0.15, outlook, minutesSource: 'probable-lineup' }).delta;
    const total = 11 * titular + 9 * suplente;
    assert.ok(Math.abs(total) < 1e-9, `el once se desequilibra en ${total}`);
  });

  await t.test('sin once publicado solo se aplica el lado que resta', () => {
    // Sin saber quién es titular no se puede decir quién aprovecha la
    // rotación, así que el error se deja del lado prudente.
    for (const p of [0.15, 0.5, 0.85, 1]) {
      const delta = applyEuropeanRotation({ pStarter: p, outlook, minutesSource: 'historical' }).delta;
      assert.ok(delta <= 0, `p=${p} no debería ganar titularidad sin once de referencia (${delta})`);
    }
  });

  await t.test('quien no cuenta para nada no se convierte en titular por la Champions', () => {
    for (const source of ['historical', 'probable-lineup'] as const) {
      const delta = applyEuropeanRotation({ pStarter: 0, outlook, minutesSource: source }).delta;
      assert.ok(Math.abs(delta) < 1e-9, `${source} mueve al que no cuenta`);
    }
  });

  await t.test('ni siquiera un fijo está a salvo de la rotación', () => {
    assert.ok(applyEuropeanRotation({ pStarter: 1, outlook, minutesSource: 'probable-lineup' }).delta < 0);
  });

  await t.test('el punto de equilibrio deja ganar al que ronda el once y perder al fijo', () => {
    const rondaElOnce = applyEuropeanRotation({ pStarter: 0.6, outlook, minutesSource: 'probable-lineup' }).delta;
    const fijo = applyEuropeanRotation({ pStarter: 0.9, outlook, minutesSource: 'probable-lineup' }).delta;
    assert.ok(rondaElOnce > 0, 'el que ronda el once debería ganar sitio');
    assert.ok(fijo < 0, 'el fijo debería perderlo');
  });

  await t.test('la probabilidad ajustada nunca se sale de 0-1', () => {
    for (const source of ['historical', 'probable-lineup'] as const) {
      for (const s of [0, 0.05, 0.5, 0.95, 1]) {
        const { pStarter } = applyEuropeanRotation({ pStarter: s, outlook, minutesSource: source });
        assert.ok(pStarter >= 0 && pStarter <= 1, `${pStarter} fuera de rango para s=${s} (${source})`);
      }
    }
  });

  await t.test('una alineación confirmada apaga el ajuste (no se dobla la contabilidad)', () => {
    const confirmada = applyEuropeanRotation({ pStarter: 0.85, outlook, minutesSource: 'confirmed-lineup' });
    assert.equal(confirmada.delta, 0);
    assert.equal(confirmada.pStarter, 0.85);
    assert.equal(EUROPEAN_WEIGHT_BY_MINUTES_SOURCE['confirmed-lineup'], 0);
    assert.equal(EUROPEAN_WEIGHT_BY_MINUTES_SOURCE['injury-report'], 0);
  });

  await t.test('un once probable atenúa el ajuste a la mitad del histórico', () => {
    // Con el mismo lado (el que resta), el once probable pesa la mitad porque
    // esa previsión ya incorpora parte de la rotación esperada.
    const historico = applyEuropeanRotation({ pStarter: 1, outlook, minutesSource: 'historical' }).delta;
    const probable = applyEuropeanRotation({ pStarter: 1, outlook, minutesSource: 'probable-lineup' }).delta;
    assert.ok(Math.abs(probable - historico / 2) < 1e-9);
  });

  await t.test('el amortiguador a 0 devuelve el motor a su comportamiento anterior', () => {
    const apagado = applyEuropeanRotation({ pStarter: 0.85, outlook, minutesSource: 'probable-lineup', dampening: 0 });
    assert.equal(apagado.delta, 0);
  });
});

test('Efecto sobre el jugador', async (t) => {
  const outlook = computeEuropeanLoad({
    teamId: REAL_MADRID,
    kickoff: LALIGA_KICKOFF,
    fixtures: [ucl({ kickoff: LALIGA_KICKOFF - 3 * DAY }), ucl({ kickoff: LALIGA_KICKOFF + 3 * DAY, eventId: 2 })],
    tier: 1,
  })!;

  await t.test('recompone los minutos con la identidad de estimateMinutes', () => {
    const minutesEstimate = minutes();
    const adjustment = europeanPlayerAdjustment({ outlook, minutes: minutesEstimate });
    const expected =
      adjustment.pStarter! * minutesEstimate.minutesIfStarter * outlook.starterMinutesMultiplier +
      (1 - adjustment.pStarter!) * minutesEstimate.minutesIfBench;
    assert.ok(Math.abs(adjustment.expectedMinutes! - expected) < 1e-9);
  });

  await t.test('el titular pierde puntos esperados y el suplente los gana', () => {
    const titular = europeanPlayerAdjustment({
      outlook,
      minutes: minutes({ pStarter: 0.85, source: 'probable-lineup' }),
    });
    const suplente = europeanPlayerAdjustment({
      outlook,
      minutes: minutes({ pStarter: 0.15, expectedMinutes: 0.15 * 80 + 0.85 * 15, source: 'probable-lineup' }),
    });
    assert.ok(titular.impact.xpMultiplier < 1);
    assert.ok(suplente.impact.xpMultiplier > 1);
    assert.equal(suplente.impact.beneficiary, true);
    assert.equal(titular.impact.beneficiary, false);
  });

  await t.test('el aviso del titular menciona el dinero y el del suplente la oportunidad', () => {
    const titular = europeanPlayerAdjustment({
      outlook,
      minutes: minutes({ pStarter: 0.85, source: 'probable-lineup' }),
    });
    const suplente = europeanPlayerAdjustment({
      outlook,
      minutes: minutes({ pStarter: 0.15, expectedMinutes: 0.15 * 80 + 0.85 * 15, source: 'probable-lineup' }),
    });
    assert.match(titular.impact.advice ?? '', /pagar/i);
    assert.match(suplente.impact.advice ?? '', /barata|entrar en el once/i);
  });

  await t.test('sin submodelo de minutos solo queda la fatiga', () => {
    const adjustment = europeanPlayerAdjustment({ outlook, minutes: null });
    assert.equal(adjustment.pStarter, null);
    assert.equal(adjustment.expectedMinutes, null);
    assert.equal(adjustment.impact.xpMultiplier, outlook.fatigueMultiplier);
  });

  await t.test('inflar σ penaliza el xP ajustado por riesgo', () => {
    assert.ok(outlook.sigmaMultiplier > 1);
  });
});

test('Fase de la competición desde la ronda que publica la fuente', async (t) => {
  await t.test('la fase de liga llega sin nombre', () => {
    assert.equal(stageFromRoundInfo({ round: 3 }), 'league-phase');
  });

  await t.test('las eliminatorias se reconocen por nombre o por cupRoundType', () => {
    assert.equal(stageFromRoundInfo({ round: 1, name: 'Round of 16', cupRoundType: 16 }), 'knockout');
    assert.equal(stageFromRoundInfo({ round: 1, name: 'Final' }), 'knockout');
    assert.equal(stageFromRoundInfo({ round: 1, slug: 'quarterfinals' }), 'knockout');
  });

  await t.test('la previa se distingue de la fase de liga', () => {
    assert.equal(stageFromRoundInfo({ round: 1, name: 'Qualification Round 3' }), 'qualifying');
  });

  await t.test('sin información se elige la fase de peso intermedio', () => {
    assert.equal(stageFromRoundInfo(undefined), 'league-phase');
  });
});

test('Integración con el estimador de puntos', async (t) => {
  const calendar: Match[] = [
    {
      id: 'm1',
      matchDate: new Date(LALIGA_KICKOFF).toISOString(),
      date: new Date(LALIGA_KICKOFF).toISOString(),
      time: '21:00',
      localId: REAL_MADRID,
      visitorId: RIVAL,
      matchState: 0,
      localScore: null,
      visitorScore: null,
      featured: false,
    },
  ];

  const player = {
    id: 'p1',
    name: 'Titular Indiscutible',
    nickname: 'Titular',
    positionId: 3,
    teamId: REAL_MADRID,
    marketValue: 20_000_000,
    averagePoints: 6,
    lastSeasonPoints: 180,
    playerStatus: 'ok',
  } as unknown as PlayerMaster;

  const teamElos = new Map([
    [REAL_MADRID, 1950],
    [RIVAL, 1700],
  ]);

  await t.test('sin partidos europeos el resultado no cambia', () => {
    const sin = predictPlayerPoints(player, calendar, { teamElos });
    const conListaVacia = predictPlayerPoints(player, calendar, { teamElos, europeanFixtures: [] });
    assert.equal(sin.xp, conListaVacia.xp);
    assert.equal(conListaVacia.european, null);
  });

  await t.test('una Champions pegada a la jornada baja el xP del titular', () => {
    const sin = predictPlayerPoints(player, calendar, { teamElos });
    const con = predictPlayerPoints(player, calendar, {
      teamElos,
      europeanFixtures: [ucl({ kickoff: LALIGA_KICKOFF + 3 * DAY, stage: 'knockout' })],
    });
    assert.ok(con.european !== null, 'debería exponer el contexto europeo');
    assert.ok(con.xp < sin.xp, `${con.xp} debería ser menor que ${sin.xp}`);
    assert.ok(con.european!.advice !== null);
  });

  await t.test('la carga europea del RIVAL mejora el emparejamiento propio', () => {
    const sin = predictPlayerPoints(player, calendar, { teamElos });
    const con = predictPlayerPoints(player, calendar, {
      teamElos,
      europeanFixtures: [ucl({ teamId: RIVAL, kickoff: LALIGA_KICKOFF + 3 * DAY, stage: 'knockout' })],
    });
    // Nuestro jugador no tiene carga: solo mejora porque el rival llega peor.
    assert.equal(con.european, null);
    assert.ok(con.xp > sin.xp, `${con.xp} debería superar a ${sin.xp}`);
    assert.ok(con.fixture!.difficulty <= sin.fixture!.difficulty);
  });

  await t.test('en jornada de descanso no se calcula carga europea', () => {
    const otro = { ...player, teamId: 99 } as unknown as PlayerMaster;
    const prediction = predictPlayerPoints(otro, calendar, {
      teamElos,
      europeanFixtures: [ucl({ teamId: 99, kickoff: LALIGA_KICKOFF + 3 * DAY })],
    });
    assert.equal(prediction.source, 'bye-week');
    assert.equal(prediction.european, null);
  });
});

test('Pronóstico europeo de la jornada completa', async (t) => {
  const calendar: Match[] = [
    {
      id: 'm1',
      matchDate: new Date(LALIGA_KICKOFF).toISOString(),
      date: '',
      time: '',
      localId: REAL_MADRID,
      visitorId: RIVAL,
      matchState: 0,
      localScore: null,
      visitorScore: null,
      featured: false,
    },
  ];

  await t.test('solo aparecen los equipos con compromiso europeo', () => {
    const outlooks = buildEuropeanOutlooks({
      calendar,
      fixtures: [ucl({ kickoff: LALIGA_KICKOFF + 3 * DAY })],
      teamTiers: new Map([[REAL_MADRID, 1]]),
    });
    assert.equal(outlooks.size, 1);
    assert.ok(outlooks.has(REAL_MADRID));
    assert.equal(outlooks.has(RIVAL), false);
  });

  await t.test('el amortiguador a cero también apaga los avisos de la jornada', () => {
    assert.equal(buildEuropeanOutlooks({ calendar, fixtures: [ucl()], dampening: 0 }).size, 0);
  });

  await t.test('sin partidos europeos el mapa está vacío', () => {
    assert.equal(buildEuropeanOutlooks({ calendar, fixtures: [] }).size, 0);
  });
});

test('Amortiguador europeo: todos los canales y confirmadas', async (t) => {
  const outlook = computeEuropeanLoad({ teamId: REAL_MADRID, kickoff: LALIGA_KICKOFF, fixtures: [ucl()] })!;
  await t.test('cero conserva minutos, rendimiento y dispersión', () => {
    const estimate = minutes();
    const result = europeanPlayerAdjustment({ outlook, minutes: estimate, dampening: 0 });
    assert.equal(result.pStarter, estimate.pStarter);
    assert.equal(result.expectedMinutes, estimate.expectedMinutes);
    assert.equal(result.fatigueMultiplier, 1);
    assert.equal(result.sigmaMultiplier, 1);
    assert.equal(result.impact.xpMultiplier, 1);
    assert.equal(result.impact.advice, null);
    const unknown = europeanPlayerAdjustment({ outlook, minutes: null, dampening: 0 });
    assert.equal(unknown.fatigueMultiplier, 1);
    assert.equal(unknown.sigmaMultiplier, 1);
  });
  await t.test('medio amortiguador aplica media fatiga y media incertidumbre', () => {
    const full = europeanPlayerAdjustment({ outlook, minutes: minutes(), dampening: 1 });
    const half = europeanPlayerAdjustment({ outlook, minutes: minutes(), dampening: 0.5 });
    assert.ok(Math.abs(half.fatigueMultiplier - (1 + full.fatigueMultiplier) / 2) < 1e-12);
    assert.ok(Math.abs(half.sigmaMultiplier - (1 + full.sigmaMultiplier) / 2) < 1e-12);
  });
  await t.test('once confirmado elimina la incertidumbre y el aviso de reservar un titular', () => {
    const result = europeanPlayerAdjustment({ outlook, minutes: minutes({ source: 'confirmed-lineup', pStarter: 1 }) });
    assert.equal(result.pStarter, 1);
    assert.equal(result.sigmaMultiplier, 1);
    assert.equal(result.impact.advice, null);
    assert.ok(result.fatigueMultiplier < 1);
  });
  await t.test('apagar Europa equivale a quitar el calendario incluso con carga del rival', () => {
    const calendar = [{ id: 'm', matchDate: new Date(LALIGA_KICKOFF).toISOString(), date: '', time: '', localId: 1, visitorId: 2, matchState: 0, localScore: null, visitorScore: null, featured: false }] satisfies Match[];
    const player = { id: 'p', name: 'Jugador', positionId: 3, teamId: 1, averagePoints: 6, playerStatus: 'ok' } as PlayerMaster;
    const context = { teamElos: new Map([[1, 1950], [2, 1700]]), paramOverrides: { europeanDampening: 0 } };
    const baseline = predictPlayerPoints(player, calendar, context);
    const disabled = predictPlayerPoints(player, calendar, { ...context, europeanFixtures: [ucl(), ucl({ teamId: RIVAL, eventId: 2 })] });
    assert.deepStrictEqual(disabled, baseline);
  });
});
