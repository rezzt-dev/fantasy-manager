import type { NewsCategory } from '../../types/analysis';

export interface NewsClassification {
  category: NewsCategory;
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  /** true si la palabra clave aparece negada ("descartan lesión"). */
  negated: boolean;
  /** true si el texto es especulativo ("podría ser baja"). */
  speculative: boolean;
}

interface CategoryRule {
  category: NewsCategory;
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  keywords: string[];
}

/**
 * Reglas por orden de prioridad. A diferencia del clasificador anterior,
 * classifyNewsAll devuelve TODAS las categorías con evidencia (no gana la
 * primera que casa), y cada acierto se ajusta por negación y especulación
 * (§4.6 del diseño).
 */
const RULES: CategoryRule[] = [
  {
    category: 'injury',
    signal: 'sell',
    confidence: 0.85,
    keywords: [
      'lesion', 'lesionado', 'lesionada', 'rotura', 'parte medico', 'baja',
      'pubalgia', 'esguince', 'fractura', 'desgarro', 'sobrecarga',
      'molestias', 'operado', 'quirurgic', 'codo roto', 'fuera un mes',
      'semana de baja', 'semanas de baja', 'meses de baja',
    ],
  },
  {
    category: 'illness',
    signal: 'sell',
    confidence: 0.8,
    keywords: [
      'enfermo', 'enfermedad', 'indispuesto', 'indispuesta', 'virus',
      'gripe', 'fiebre', 'gastroenteritis', 'catarro', 'infeccion',
      'covid', 'migraña', 'mareado',
    ],
  },
  {
    category: 'suspension',
    signal: 'sell',
    confidence: 0.8,
    keywords: [
      'sancion', 'sancionado', 'sancionada', 'quinta amarilla',
      'acumulacion de tarjetas', 'ciclo de tarjetas', 'expulsado',
      'expulsion', 'tarjeta roja', 'partido de sancion',
      'partidos de sancion', 'cumple sancion',
    ],
  },
  {
    category: 'doubt',
    signal: 'hold',
    confidence: 0.55,
    keywords: [
      'duda', 'dudoso', 'incierto', 'incertidumbre', 'a expensas',
      'entre algodones', 'sera testado', 'ultima prueba',
    ],
  },
  {
    category: 'return',
    signal: 'buy',
    confidence: 0.65,
    keywords: [
      'vuelve', 'reaparece', 'alta medica', 'recuperado', 'regresa',
      'entrena con el grupo', 'convocado', 'ya entrena',
      'vuelve a entrenar', 'regreso',
    ],
  },
  {
    category: 'form',
    signal: 'buy',
    confidence: 0.5,
    keywords: [
      'racha', 'goleador', 'doblete', 'hat-trick', 'hat trick', 'mvp',
      'estado de forma', 'gran momento', 'imparable', 'lider del ataque',
    ],
  },
  {
    category: 'rotation',
    signal: 'hold',
    confidence: 0.4,
    keywords: ['rotacion', 'rotaciones', 'descanso', 'suplente', 'banquillo'],
  },
  {
    category: 'transfer',
    signal: 'hold',
    confidence: 0.3,
    keywords: [
      'traspaso', 'fichaje', 'oferta por', 'interes del', 'renovacion',
      'clausula de rescision', 'agente libre', 'cesion',
    ],
  },
];

/** Negadores en la ventana previa a la palabra clave ("descartan lesión", "sin lesión"). */
const NEGATORS = new Set(['no', 'sin', 'nunca', 'jamas', 'niega', 'descarta', 'descartan', 'descartado', 'descartada']);
/** Marcadores de especulación: la confianza baja (rumor ≠ hecho). */
const SPECULATION_MARKERS = [
  'podria', 'podrian', 'se teme', 'rumorea', 'rumor', 'en el aire',
  'posible', 'posibilidad', 'suena', 'apunta a', 'parece',
];

const SPECULATION_FACTOR = 0.6;
const NEGATION_FACTOR = 0.25;

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function containsPhrase(normalizedText: string, phrase: string): boolean {
  return phraseIndex(normalizedText, phrase) >= 0;
}

function phraseIndex(normalizedText: string, phrase: string): number {
  const escaped = normalize(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`);
  const match = re.exec(normalizedText);
  return match ? match.index : -1;
}

/** true si hay un negador en las 4 palabras anteriores a la posición dada. */
function isNegated(normalizedText: string, index: number): boolean {
  const before = normalizedText.slice(0, index).trim().split(/\s+/).slice(-4);
  return before.some((token) => NEGATORS.has(token));
}

function isSpeculative(normalizedText: string): boolean {
  return SPECULATION_MARKERS.some((marker) => containsPhrase(normalizedText, marker));
}

/**
 * Clasifica una noticia (título + descripción) devolviendo TODAS las
 * categorías con evidencia, ajustadas por negación y especulación (§4.6).
 * Una coincidencia negada ("descartan lesión") pasa a hold con confianza
 * reducida en vez de ser una falsa alarma de venta.
 */
export function classifyNewsAll(text: string): NewsClassification[] {
  const normalized = normalize(text);
  const speculative = isSpeculative(normalized);
  const results: NewsClassification[] = [];

  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      const index = phraseIndex(normalized, keyword);
      if (index < 0) continue;

      const negated = isNegated(normalized, index);
      let confidence = rule.confidence;
      let signal = rule.signal;
      if (negated) {
        confidence *= NEGATION_FACTOR;
        signal = 'hold';
      }
      if (speculative) confidence *= SPECULATION_FACTOR;

      results.push({ category: rule.category, signal, confidence, negated, speculative });
      break; // una coincidencia por categoría basta
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Compatibilidad: la mejor clasificación de una noticia (o null si no hay
 * señal relevante). Consume classifyNewsAll.
 */
export function classifyNews(text: string): NewsClassification | null {
  return classifyNewsAll(text)[0] ?? null;
}
