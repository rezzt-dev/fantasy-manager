/**
 * Coordinación con las competiciones europeas (§4.4.6).
 *
 * ## El problema
 *
 * Un equipo que juega la Champions el martes no afronta la jornada del sábado
 * como los demás. El entrenador **prioriza Europa**: reserva titulares, mete
 * suplentes, y los que juegan llegan con 72 horas de recuperación en lugar de
 * una semana. El efecto es grande y perfectamente anticipable — el calendario
 * europeo se publica con meses de antelación — pero un motor que solo mira el
 * calendario de LaLiga no lo ve, y recomienda pagar 40 M€ por un jugador que
 * va a ver el partido desde el banquillo.
 *
 * ## Los tres canales, que son distintos y no se solapan
 *
 * Este módulo separa deliberadamente tres efectos que un multiplicador único
 * confundiría:
 *
 * 1. **Rotación → minutos.** ¿Va a jugar? Es una decisión del entrenador y no
 *    afecta a todos igual: la rotación *redistribuye* minutos, no los
 *    destruye. El titular indiscutible pierde probabilidad de jugar y el
 *    suplente la gana. Un modelo que penalice a toda la plantilla de un equipo
 *    de Champions está equivocado en la mitad de los casos.
 * 2. **Fatiga → rendimiento por minuto.** Quien juega con 2-3 días de descanso
 *    corre menos. Es un efecto pequeño (unidades de por ciento) y solo lo
 *    provoca un partido europeo **ya jugado**, nunca uno futuro.
 * 3. **Calidad del once → resultado del partido.** Un equipo que rota alinea
 *    un once peor y ese partido de LaLiga se le da peor. Esto no se modela con
 *    un factor nuevo: se traduce a **puntos Elo** y entra por el modelo de
 *    goles que ya existe (`match-model.ts`). Así el efecto llega solo a donde
 *    tiene que llegar — la portería a cero del portero, los goles esperados
 *    del delantero — y además funciona **en las dos direcciones**: si tu
 *    jugador se enfrenta a un equipo que viene de jugar en Europa, su
 *    emparejamiento mejora.
 *
 * Los tres son reales y ninguno contiene a los otros: (1) es *si juega*, (2)
 * es *cómo rinde si juega* y (3) es *cómo juega su equipo alrededor*.
 *
 * ## Cómo se mide la presión de rotación
 *
 * Dos lados, que se pueden dar a la vez (semana sándwich: Champions el
 * martes, LaLiga el sábado, Champions el miércoles siguiente):
 *
 * - **Antes**: el equipo viene de jugar en Europa. Cuenta el descanso.
 * - **Después**: el equipo juega en Europa justo después. Cuenta el descanso
 *   y, sobre todo, **cuánto se juega** en ese partido — que es la traducción
 *   numérica de "los equipos priorizan la Champions sobre la liga".
 *
 * La presión combinada es `1 − (1−antes)(1−después)`: dos motivos
 * independientes para rotar se acumulan sin poder pasar de 1.
 *
 * ## La rotación conserva el número de titulares
 *
 * Con `k` plazas del once esperadas para rotación, el ajuste sobre la
 * probabilidad de ser titular `p` de cada jugador es
 *
 *   Δp = k · [ p(1−p)/Σp(1−p) − p²/Σp² ]
 *
 * Es un reparto en dos mitades. La que resta quita las `k` plazas repartidas
 * **proporcionalmente a p²**: cuanto más indiscutible es un jugador, más
 * papeletas tiene de que le toque descansar, que es justo lo que hace un
 * entrenador con una eliminatoria a la vista. La que suma devuelve esas mismas
 * `k` plazas repartidas **proporcionalmente a p(1−p)**: se las lleva quien
 * está cerca del once sin ser fijo, y no quien no cuenta para nada.
 *
 * Las dos sumas del denominador son las del **equipo canónico** — 11 jugadores
 * con la probabilidad que `minutes.ts` da al once probable y 9 con la que da
 * al banquillo — y no números inventados: se derivan en tiempo de carga de
 * esas mismas constantes. Como cada mitad reparte exactamente `k`, la suma de
 * los Δp sobre ese equipo es **cero**: la rotación mueve minutos de unos a
 * otros sin inventarse ni perder titulares. Hay un test que lo comprueba.
 *
 * Dos propiedades que salen gratis de la forma y que importan:
 *
 * - `Δp = 0` cuando `p = 0`. Un jugador sin un solo minuto en las piernas no
 *   se convierte en titular porque su equipo juegue la Champions.
 * - `Δp < 0` cuando `p = 1`. Al revés sí: un fijo puede acabar descansando,
 *   y de hecho es el candidato número uno. Solo lo protege un dato mejor (la
 *   alineación confirmada), no el modelo.
 *
 * ## El lado que suma exige saber quién es titular
 *
 * "Indiscutible" es una idea **relativa a la plantilla**: 0,70 es mucho en un
 * equipo plano y poco en uno con un once claro. El equipo canónico solo
 * describe bien al primero cuando hay un once probable publicado, que es
 * cuando `minutes.ts` reparte 0,85 y 0,15 y la conservación sale exacta.
 *
 * Sin once probable, con la titularidad deducida de los minutos históricos, no
 * hay forma honesta de saber **quién entra** en lugar del que descansa. Ahí se
 * aplica solo el lado que resta. Se pierde el matiz del suplente que se
 * beneficia, pero el error queda del lado prudente — menos puntos esperados,
 * no más — que es justo el que no cuesta dinero al usuario.
 *
 * ## Qué no hace este módulo
 *
 * No dobla la contabilidad. Cuando ya se sabe quién juega — alineación
 * confirmada de Sofascore o baja del parte médico — el ajuste **se apaga**: la
 * realidad gana siempre a un modelo de rotación. Cuando hay once probable, se
 * aplica a la mitad, porque esa previsión ya incorpora parte de la rotación
 * esperada. El peso vive en `EUROPEAN_WEIGHT_BY_MINUTES_SOURCE`.
 */

import type {
  EuropeanCompetition,
  EuropeanFixtureRef,
  EuropeanLoadLabel,
  EuropeanOutlook,
  Match,
  PlayerEuropeanImpact,
} from '../../../types/fantasy';
import type { EuropeanFixture, EuropeanStage } from '../sources/types';
import { COMPETITION_NAMES, COMPETITION_SHORT_NAMES } from '../sources/uefa';
import { getEngineParams } from '../params';
import { P_STARTER_IN_PROBABLE_XI, P_STARTER_ON_BENCH, type MinutesEstimate } from './minutes';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Descanso a partir del cual un partido europeo deja de condicionar el once de
 * LaLiga, y descanso mínimo real del calendario (martes → sábado son 4 días;
 * miércoles → sábado, 3; y un miércoles → viernes adelantado, 2).
 */
const REST_DAYS_FULL = 5;
const REST_DAYS_MIN = 2;

/**
 * Peso deportivo de cada competición. La Champions reparte del orden de cuatro
 * veces más dinero que la Europa League y ocho veces más que la Conference, y
 * esa diferencia es exactamente la que ordena las prioridades del entrenador.
 * Los valores son la respuesta a "¿cuánto está dispuesto a sacrificar de la
 * liga por este partido?", no una escala de calidad.
 */
const COMPETITION_WEIGHT: Record<EuropeanCompetition, number> = {
  ucl: 1,
  uel: 0.72,
  uecl: 0.5,
};

/**
 * Peso de la fase. Las eliminatorias son a vida o muerte; las últimas rondas
 * de la fase de liga deciden la clasificación; las primeras dan margen.
 */
const STAGE_WEIGHT: Record<EuropeanStage, number> = {
  qualifying: 0.9,
  'league-phase': 0.85,
  knockout: 1.15,
};

/** Ronda de la fase de liga a partir de la cual la clasificación aprieta. */
const LEAGUE_PHASE_DECISIVE_ROUND = 5;
const LEAGUE_PHASE_DECISIVE_WEIGHT = 1;

/**
 * Suelo de importancia para el lado "ya ha jugado". La fatiga es física: unas
 * piernas cansadas lo están igual viniendo de la Conference que de la
 * Champions. Lo que sí depende de la competición es cuánto de su once titular
 * puso el equipo allí, y por eso el suelo no es 1.
 */
const PLAYED_STAKES_FLOOR = 0.45;

/**
 * Prima del compromiso europeo que **está por venir**. Con el mismo descanso,
 * reservar a un titular para el partido del martes cambia más onces que
 * rotarlo por venir de jugarlo: lo primero es una decisión deliberada de
 * sacrificar la liga y lo segundo una gestión de cargas.
 *
 * Es la traducción numérica del enunciado del que sale toda esta
 * funcionalidad — los equipos priorizan Europa sobre LaLiga — y por eso es una
 * constante con nombre y no un efecto colateral de otros pesos.
 */
const UPCOMING_PROTECTION = 1.15;

/**
 * Plazas del once que un equipo llega a rotar en la peor semana. Cuatro o
 * cinco cambios entre un partido europeo y el siguiente de liga es lo que se
 * observa en los grandes; por encima de eso ya no es rotación, es un equipo B.
 */
const MAX_ROTATION_SLOTS = 5;

/**
 * Equipo canónico sobre el que se normaliza el reparto: los 11 del once
 * probable y los 9 suplentes con opciones. Las probabilidades son las que
 * asigna `minutes.ts`, así que las dos masas se derivan y no se codifican:
 * si allí se recalibra la titularidad, aquí se sigue conservando el once.
 */
const REFERENCE_STARTERS = 11;
const REFERENCE_BENCH = 9;

/** Σp² del equipo canónico: normaliza el reparto de las plazas que se pierden. */
const STARTER_MASS =
  REFERENCE_STARTERS * P_STARTER_IN_PROBABLE_XI ** 2 + REFERENCE_BENCH * P_STARTER_ON_BENCH ** 2;

/** Σp(1−p) del equipo canónico: normaliza el reparto de las plazas que se ganan. */
const ROTATION_MASS =
  REFERENCE_STARTERS * P_STARTER_IN_PROBABLE_XI * (1 - P_STARTER_IN_PROBABLE_XI) +
  REFERENCE_BENCH * P_STARTER_ON_BENCH * (1 - P_STARTER_ON_BENCH);

/**
 * Profundidad de plantilla por tier de Elo (1 = mejor). Un equipo grande rota
 * más porque puede permitírselo; un equipo modesto que juega en Europa saca al
 * mismo once porque no tiene otro. Es un multiplicador del **número** de
 * cambios, no de lo que empeora el equipo al hacerlos.
 */
const DEPTH_BY_TIER: Record<number, number> = { 1: 1, 2: 0.92, 3: 0.82, 4: 0.72, 5: 0.65 };
const DEFAULT_DEPTH = 0.85;

/** Caída máxima de rendimiento por minuto de quien juega fundido. */
const MAX_FATIGUE_PENALTY = 0.04;

/** Recorte máximo de los minutos del titular que sí juega (cambio temprano). */
const MAX_EARLY_SUBSTITUTION = 0.06;

/**
 * Inflado máximo de la desviación típica de puntos. La rotación no solo baja
 * la media: ensancha la distribución (o juega 90' o no juega). Entra por
 * `riskAdjustedXp = xP − λσ`, así que el capitán y los clausulazos se vuelven
 * conservadores solos en semana europea.
 */
const MAX_SIGMA_INFLATION = 0.35;

/**
 * Penalización máxima de Elo del equipo con la rotación al máximo.
 *
 * 35 puntos Elo con el divisor del modelo de goles (220) mueven los goles
 * esperados alrededor de un 8% arriba y abajo, es decir unos 0,2 goles de
 * diferencia en un partido medio. Es la magnitud que la literatura atribuye a
 * jugar con menos días de descanso que el rival, y coincide con el ajuste por
 * descanso que aplican los sistemas de rating públicos.
 */
const MAX_ELO_PENALTY = 35;

/**
 * Ventana alrededor del partido de LaLiga en la que un partido europeo cuenta.
 * Asimétrica a propósito: lo que ya se jugó pesa más tiempo (la carga se
 * acumula) que lo que está por venir.
 */
const WINDOW_BEFORE_DAYS = 9;
const WINDOW_AFTER_DAYS = 7;

/**
 * Peso del ajuste según de dónde salgan los minutos esperados. Es la barrera
 * contra la doble contabilidad: si Sofascore ya ha publicado el once, la
 * rotación es un hecho conocido y el modelo no tiene nada que añadir.
 */
/**
 * Fuentes de minutos que definen un once de referencia. Solo con una de ellas
 * tiene sentido repartir las plazas que la rotación libera: sin un once
 * publicado no se sabe quién las ocupa.
 */
const SOURCES_WITH_KNOWN_XI = new Set<MinutesEstimate['source']>(['probable-lineup', 'confirmed-lineup']);

export const EUROPEAN_WEIGHT_BY_MINUTES_SOURCE: Record<MinutesEstimate['source'], number> = {
  'injury-report': 0,
  'confirmed-lineup': 0,
  'probable-lineup': 0.5,
  historical: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Presión por descanso: 1 con el turnaround mínimo del calendario y 0 a partir
 * de una semana normal de trabajo. Lineal entre ambos porque no hay evidencia
 * pública para justificar una curva más fina; lo que importa es el orden.
 */
export function restPressure(days: number): number {
  if (!Number.isFinite(days) || days < 0) return 0;
  return clamp01((REST_DAYS_FULL - days) / (REST_DAYS_FULL - REST_DAYS_MIN));
}

/**
 * Cuánto se juega el equipo en un partido europeo, 0-1. Es la cifra que
 * codifica "la Champions va por delante de la liga".
 */
export function fixtureStakes(fixture: EuropeanFixture): number {
  const stageWeight =
    fixture.stage === 'league-phase' && (fixture.round ?? 0) >= LEAGUE_PHASE_DECISIVE_ROUND
      ? LEAGUE_PHASE_DECISIVE_WEIGHT
      : STAGE_WEIGHT[fixture.stage];
  return clamp01(COMPETITION_WEIGHT[fixture.competition] * stageWeight);
}

function stageLabel(fixture: EuropeanFixture): string {
  if (fixture.roundName) return fixture.roundName;
  if (fixture.stage === 'knockout') return 'Eliminatoria';
  if (fixture.stage === 'qualifying') return 'Previa';
  return fixture.round ? `Jornada ${fixture.round}` : 'Fase de liga';
}

function toRef(fixture: EuropeanFixture, restDays: number): EuropeanFixtureRef {
  return {
    competition: fixture.competition,
    competitionName: COMPETITION_NAMES[fixture.competition],
    competitionShortName: COMPETITION_SHORT_NAMES[fixture.competition],
    stage: fixture.stage,
    stageLabel: stageLabel(fixture),
    opponentName: fixture.opponentName,
    isHome: fixture.isHome,
    kickoff: new Date(fixture.kickoff).toISOString(),
    restDays: round2(restDays),
    stakes: round2(fixtureStakes(fixture)),
    eventId: fixture.eventId,
  };
}

export function europeanLoadLabel(rotationRisk: number): EuropeanLoadLabel {
  if (rotationRisk < 12) return 'Sin carga europea';
  if (rotationRisk < 32) return 'Carga ligera';
  if (rotationRisk < 55) return 'Rotación posible';
  if (rotationRisk < 75) return 'Rotación probable';
  return 'Rotación muy probable';
}

export interface EuropeanLoadInput {
  teamId: number;
  /** Inicio del partido de LaLiga en ms epoch. */
  kickoff: number;
  /** Partidos europeos de todos los equipos (se filtra aquí). */
  fixtures: EuropeanFixture[];
  /** Tier 1-5 del equipo por Elo; sin él se asume profundidad media. */
  tier?: number;
}

/**
 * Carga europea de un equipo alrededor de un partido concreto de LaLiga.
 * Devuelve null cuando el equipo no tiene ningún compromiso europeo en la
 * ventana, que es el caso de la mayoría de la liga.
 */
export function computeEuropeanLoad(input: EuropeanLoadInput): EuropeanOutlook | null {
  const { teamId, kickoff, fixtures, tier } = input;
  if (!Number.isFinite(kickoff) || kickoff <= 0 || fixtures.length === 0) return null;

  const windowStart = kickoff - WINDOW_BEFORE_DAYS * DAY_MS;
  const windowEnd = kickoff + WINDOW_AFTER_DAYS * DAY_MS;
  const inWindow = fixtures.filter((f) => f.teamId === teamId && f.kickoff >= windowStart && f.kickoff <= windowEnd);
  if (inWindow.length === 0) return null;

  // El partido europeo inmediatamente anterior y el inmediatamente posterior
  // son los que condicionan el once; los demás solo cuentan como carga
  // acumulada que se le enseña al usuario.
  const previous = inWindow.filter((f) => f.kickoff < kickoff).sort((a, b) => b.kickoff - a.kickoff)[0];
  const upcoming = inWindow.filter((f) => f.kickoff >= kickoff).sort((a, b) => a.kickoff - b.kickoff)[0];

  const restDaysBefore = previous ? (kickoff - previous.kickoff) / DAY_MS : null;
  const restDaysAfter = upcoming ? (upcoming.kickoff - kickoff) / DAY_MS : null;

  // Lado "ya ha jugado": manda el descanso, atenuado por el peso de la
  // competición (en Conference muchos equipos ni ponen a los titulares).
  const playedStakes = previous ? PLAYED_STAKES_FLOOR + (1 - PLAYED_STAKES_FLOOR) * fixtureStakes(previous) : 0;
  const pressureBefore = previous ? restPressure(restDaysBefore!) * playedStakes : 0;

  // Lado "va a jugar": manda lo que se juega. Aquí es donde la Champions se
  // come a la liga.
  const upcomingStakes = upcoming ? fixtureStakes(upcoming) : 0;
  const pressureAfter = upcoming ? clamp01(restPressure(restDaysAfter!) * upcomingStakes * UPCOMING_PROTECTION) : 0;

  const rotationPressure = clamp01(1 - (1 - pressureBefore) * (1 - pressureAfter));
  const depth = tier !== undefined ? (DEPTH_BY_TIER[tier] ?? DEFAULT_DEPTH) : DEFAULT_DEPTH;
  const expectedRotatedSlots = MAX_ROTATION_SLOTS * rotationPressure * depth;

  // La fatiga solo la causa un partido ya jugado, y no se pondera por lo que
  // estuviera en juego: correr 11 km cansa lo mismo en cualquier competición.
  const rawFatigue = previous ? restPressure(restDaysBefore!) : 0;

  const competition = (upcoming ?? previous)!.competition;

  const outlook: EuropeanOutlook = {
    teamId,
    competition,
    competitionName: COMPETITION_NAMES[competition],
    competitionShortName: COMPETITION_SHORT_NAMES[competition],
    before: previous ? toRef(previous, restDaysBefore!) : null,
    after: upcoming ? toRef(upcoming, restDaysAfter!) : null,
    restDaysBefore: restDaysBefore === null ? null : round2(restDaysBefore),
    restDaysAfter: restDaysAfter === null ? null : round2(restDaysAfter),
    matchesInWindow: inWindow.length,
    stakes: round2(Math.max(upcomingStakes, previous ? fixtureStakes(previous) : 0)),
    rotationPressure: round2(rotationPressure),
    expectedRotatedSlots: round2(expectedRotatedSlots),
    rotationRisk: Math.round(100 * rotationPressure),
    fatigueMultiplier: round2(1 - MAX_FATIGUE_PENALTY * rawFatigue),
    starterMinutesMultiplier: round2(1 - MAX_EARLY_SUBSTITUTION * rawFatigue),
    sigmaMultiplier: round2(1 + MAX_SIGMA_INFLATION * rotationPressure),
    eloPenalty: Math.round(MAX_ELO_PENALTY * rotationPressure),
    label: europeanLoadLabel(Math.round(100 * rotationPressure)),
    summary: '',
  };
  outlook.summary = summarize(outlook);
  return outlook;
}

/** Frase de una línea que explica la carga sin tener que leer las cifras. */
function summarize(outlook: EuropeanOutlook): string {
  const parts: string[] = [];
  if (outlook.before) {
    parts.push(
      `Jugó ${outlook.before.competitionShortName} ${outlook.before.isHome ? 'en casa contra' : 'a domicilio contra'} ` +
        `${outlook.before.opponentName} ${formatRest(outlook.before.restDays)} antes`,
    );
  }
  if (outlook.after) {
    parts.push(
      `juega ${outlook.after.competitionShortName} contra ${outlook.after.opponentName} ` +
        `${formatRest(outlook.after.restDays)} después`,
    );
  }
  const head = parts.length > 0 ? `${parts.join(' y ')}. ` : '';
  if (outlook.rotationRisk < 12) return `${head}Sin efecto apreciable sobre el once de LaLiga.`;
  return (
    `${head}Se esperan ${outlook.expectedRotatedSlots.toFixed(1)} cambios en el once ` +
    `(${outlook.label.toLowerCase()}, ${outlook.rotationRisk}/100).`
  );
}

function formatRest(days: number): string {
  if (days < 1.5) return 'un día';
  return `${Math.round(days)} días`;
}

export interface EuropeanRotationEffect {
  /** P(titular) después del ajuste. */
  pStarter: number;
  /** Variación aplicada (positiva en los suplentes que ganan sitio). */
  delta: number;
  /** Peso efectivo tras la barrera anti-doble-contabilidad. */
  weight: number;
  note: string | null;
}

/** Un único valor validado para los tres canales; valores corruptos usan el prior. */
export function resolveEuropeanDampening(value?: number): number {
  const candidate = value ?? getEngineParams().europeanDampening;
  return Number.isFinite(candidate) ? clamp(candidate, 0, 2) : 1;
}

/**
 * Redistribución de la titularidad por rotación europea.
 *
 * Ver la cabecera del módulo: `Δp = k·[p(1−p)/Σp(1−p) − p²/Σp²]`, que reparte
 * las mismas `k` plazas por los dos lados y conserva por tanto el número
 * esperado de titulares del equipo.
 */
export function applyEuropeanRotation(input: {
  pStarter: number;
  outlook: EuropeanOutlook;
  /** Fuente de los minutos: decide el peso anti-doble-contabilidad. */
  minutesSource: MinutesEstimate['source'];
  /** Amortiguador calibrable; por defecto el de los parámetros del motor. */
  dampening?: number;
}): EuropeanRotationEffect {
  const { pStarter, outlook, minutesSource } = input;
  const weight =
    EUROPEAN_WEIGHT_BY_MINUTES_SOURCE[minutesSource] *
    resolveEuropeanDampening(input.dampening);

  if (weight <= 0 || outlook.expectedRotatedSlots <= 0) {
    return { pStarter, delta: 0, weight: 0, note: null };
  }

  const p = clamp01(pStarter);
  const k = outlook.expectedRotatedSlots;

  // El lado que resta siempre se aplica: que va a haber rotación se sabe. El
  // que suma necesita un once de referencia para saber quién la aprovecha.
  const loss = (k * p * p) / STARTER_MASS;
  const gain = SOURCES_WITH_KNOWN_XI.has(minutesSource) ? (k * p * (1 - p)) / ROTATION_MASS : 0;
  const delta = weight * (gain - loss);
  const adjusted = clamp01(p + delta);

  const points = Math.round(Math.abs(adjusted - p) * 100);
  const note =
    points < 2
      ? null
      : adjusted < p
        ? `Riesgo de rotación por ${outlook.competitionShortName}: −${points} puntos de titularidad.`
        : `Se beneficia de la rotación por ${outlook.competitionShortName}: +${points} puntos de titularidad.`;

  return { pStarter: adjusted, delta: adjusted - p, weight, note };
}

/**
 * Carga europea por equipo para una jornada completa. Es lo que consume la
 * interfaz (un chip por jugador) y lo que se adjunta a la respuesta de la API.
 */
export function buildEuropeanOutlooks(input: {
  calendar: Match[];
  fixtures: EuropeanFixture[];
  /** teamId -> tier 1-5 desde Elo (profundidad de plantilla). */
  teamTiers?: Map<number, number>;
  dampening?: number;
}): Map<number, EuropeanOutlook> {
  const outlooks = new Map<number, EuropeanOutlook>();
  if (input.fixtures.length === 0 || resolveEuropeanDampening(input.dampening) === 0) return outlooks;

  for (const match of input.calendar) {
    const kickoff = new Date(match.matchDate || match.date).getTime();
    if (!Number.isFinite(kickoff)) continue;
    for (const teamId of [match.localId, match.visitorId]) {
      const load = computeEuropeanLoad({
        teamId,
        kickoff,
        fixtures: input.fixtures,
        tier: input.teamTiers?.get(teamId),
      });
      if (load) outlooks.set(teamId, load);
    }
  }
  return outlooks;
}

/**
 * Caché por petición de la carga de cada equipo.
 *
 * El estimador evalúa cientos de jugadores que comparten un puñado de equipos
 * y de partidos. La clave externa es el propio array de fixtures: al llegar
 * una descarga nueva, el objeto cambia y la caché caduca sola, sin necesidad
 * de invalidarla a mano ni de que nadie se acuerde de hacerlo.
 */
const loadCache = new WeakMap<EuropeanFixture[], Map<string, EuropeanOutlook | null>>();

/** `computeEuropeanLoad` memoizado por (equipo, hora del partido). */
export function europeanLoadFor(input: EuropeanLoadInput): EuropeanOutlook | null {
  let byKey = loadCache.get(input.fixtures);
  if (!byKey) {
    byKey = new Map();
    loadCache.set(input.fixtures, byKey);
  }
  const key = `${input.teamId}:${input.kickoff}:${input.tier ?? '-'}`;
  const cached = byKey.get(key);
  if (cached !== undefined) return cached;

  const load = computeEuropeanLoad(input);
  byKey.set(key, load);
  return load;
}

export interface EuropeanPlayerAdjustment {
  /** P(titular) ajustada; null si no había estimación de minutos. */
  pStarter: number | null;
  /** Minutos esperados recompuestos con la misma aritmética de `minutes.ts`. */
  expectedMinutes: number | null;
  /** Multiplicador sobre el rendimiento por minuto (fatiga). */
  fatigueMultiplier: number;
  /** Inflado de σ por incertidumbre de rotación. */
  sigmaMultiplier: number;
  impact: PlayerEuropeanImpact;
  /** Nota para `dataQuality`; null si el efecto es despreciable. */
  note: string | null;
}

/**
 * Efecto completo de la carga europea sobre un jugador: minutos, rendimiento
 * por minuto y varianza. Reúne aquí toda la aritmética para que el estimador
 * (`model.ts`) solo tenga que aplicarla.
 *
 * Los minutos no se reescalan con una regla de tres: se recomponen con la
 * identidad `E[min] = p·minutosSiTitular + (1−p)·minutosSiSuplente` que
 * publica `estimateMinutes`, con los minutos del titular recortados por el
 * cambio temprano que provoca la fatiga.
 */
export function europeanPlayerAdjustment(input: {
  outlook: EuropeanOutlook;
  /** Estimación de minutos previa; null si no se ha podido calcular. */
  minutes: MinutesEstimate | null;
  dampening?: number;
}): EuropeanPlayerAdjustment {
  const { outlook, minutes } = input;
  const dampening = resolveEuropeanDampening(input.dampening);
  const fatigueMultiplier = 1 + (outlook.fatigueMultiplier - 1) * dampening;
  // Una confirmada elimina la incertidumbre de rotación, no el cansancio físico.
  const rotationWeight = minutes ? EUROPEAN_WEIGHT_BY_MINUTES_SOURCE[minutes.source] : 1;
  const sigmaMultiplier = 1 + (outlook.sigmaMultiplier - 1) * dampening * rotationWeight;

  if (!minutes) {
    // Sin submodelo de minutos no hay rotación que redistribuir: solo queda la
    // fatiga, que es un efecto sobre el rendimiento y no sobre el once.
    return {
      pStarter: null,
      expectedMinutes: null,
      fatigueMultiplier,
      sigmaMultiplier,
      impact: {
        outlook,
        pStarterBefore: null,
        pStarterAfter: null,
        xpMultiplier: round2(fatigueMultiplier),
        weight: 0,
        beneficiary: false,
        advice: dampening > 0 ? adviceFor(outlook, 0, fatigueMultiplier) : null,
      },
      note: null,
    };
  }

  const rotation = applyEuropeanRotation({
    pStarter: minutes.pStarter,
    outlook,
    minutesSource: minutes.source,
    dampening,
  });

  const minutesIfStarter = minutes.minutesIfStarter * (1 + (outlook.starterMinutesMultiplier - 1) * dampening);
  const expectedMinutes = rotation.pStarter * minutesIfStarter + (1 - rotation.pStarter) * minutes.minutesIfBench;
  const minutesRatio = minutes.expectedMinutes > 0 ? expectedMinutes / minutes.expectedMinutes : 1;
  const xpMultiplier = minutesRatio * fatigueMultiplier;

  return {
    pStarter: rotation.pStarter,
    expectedMinutes,
    fatigueMultiplier,
    sigmaMultiplier,
    impact: {
      outlook,
      pStarterBefore: round2(minutes.pStarter),
      pStarterAfter: round2(rotation.pStarter),
      xpMultiplier: round2(xpMultiplier),
      weight: round2(rotation.weight),
      beneficiary: rotation.delta > 0.02,
      advice: dampening > 0 && rotationWeight > 0 ? adviceFor(outlook, rotation.delta, xpMultiplier) : null,
    },
    note: rotation.note,
  };
}

/**
 * Aviso en lenguaje llano. Es lo que impide que el usuario gaste 40 M€ en un
 * jugador que se va a quedar en el banquillo, así que dice el porqué y no solo
 * el cuánto.
 */
function adviceFor(outlook: EuropeanOutlook, delta: number, xpMultiplier: number): string | null {
  const effect = Math.round((xpMultiplier - 1) * 100);
  // El aviso lo dispara la situación del EQUIPO, no el efecto calculado sobre
  // el jugador: cuando no hay datos para afinar su papel es justo cuando más
  // falta hace advertir de que la jornada le llega condicionada.
  if (outlook.rotationRisk < 12) return null;

  const when = outlook.after
    ? `juega ${outlook.after.competitionShortName} ${formatRest(outlook.after.restDays)} después de la jornada`
    : outlook.before
      ? `viene de jugar ${outlook.before.competitionShortName} ${formatRest(outlook.before.restDays)} antes`
      : `tiene compromiso europeo`;

  if (delta < -0.03) {
    return (
      `Su equipo ${when}: se esperan ${outlook.expectedRotatedSlots.toFixed(1)} cambios en el once y él es de los ` +
      `que descansan (${Math.abs(effect)}% menos de puntos esperados). Piénsatelo antes de pagar por esta jornada.`
    );
  }
  if (delta > 0.03) {
    return (
      `Su equipo ${when}: la rotación le da opciones de entrar en el once ` +
      `(+${effect}% de puntos esperados). Es la vía barata de aprovechar la semana europea.`
    );
  }
  return (
    `Su equipo ${when}: se esperan ${outlook.expectedRotatedSlots.toFixed(1)} cambios en el once. ` +
    `Su papel concreto no se puede afinar con los datos disponibles, así que cuenta con más incertidumbre de lo normal.`
  );
}
