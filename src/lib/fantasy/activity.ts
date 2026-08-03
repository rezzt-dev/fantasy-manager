import { fetchOfficialAPI, CMP } from './api-proxy';

/**
 * Actividad reciente de la liga ({CMP}/leagues/{id}/activity/{i}): movimientos
 * de mercado de todos los managers. Sirve para estimar la liquidez real de
 * los rivales y su comportamiento (quién ataca cláusulas).
 *
 * Tipos (verificado en LaLigaApp): 1 compró · 4 blindó · 6 ganancia jornada ·
 * 9 nuevo miembro · 31 fichó · 32 clausuló · 33 vendió.
 */

export interface LeagueActivityEvent {
  activityTypeId: number;
  /** user1Id de la API: id de usuario del manager que hizo el movimiento. */
  userId: number;
  playerMasterId: number;
  amount: number;
  createdAt: string;
}

/** Tipos que suponen gasto (compra, fichaje, clausulazo). */
const EXPENSE_TYPES = new Set([1, 31, 32]);
/** Tipo que supone ingreso (venta). */
const INCOME_TYPE = 33;
/** Tipo clausulazo (comportamiento agresivo con cláusulas). */
const CLAUSE_TYPE = 32;

interface RawActivityEvent {
  activityTypeId: number;
  user1Id: number;
  playerMasterId: number;
  amount?: number;
  createdAt: string;
}

/**
 * Descarga las últimas páginas de actividad (35 eventos/página). Fallo
 * gracioso: si el endpoint falla devuelve lista vacía y el análisis sigue
 * sin este enriquecimiento.
 */
export async function fetchLeagueActivity(leagueId: string, token: string, maxPages = 2): Promise<LeagueActivityEvent[]> {
  const events: LeagueActivityEvent[] = [];

  for (let page = 0; page < maxPages; page++) {
    try {
      const raw = await fetchOfficialAPI<RawActivityEvent[]>(`${CMP}/leagues/${leagueId}/activity/${page}`, token);
      if (!Array.isArray(raw) || raw.length === 0) break;
      for (const e of raw) {
        events.push({
          activityTypeId: Number(e.activityTypeId),
          userId: Number(e.user1Id),
          playerMasterId: Number(e.playerMasterId),
          amount: Number(e.amount) || 0,
          createdAt: e.createdAt,
        });
      }
    } catch (error) {
      console.warn(`[activity] fetch page ${page} failed:`, error instanceof Error ? error.message : error);
      break;
    }
  }

  return events;
}

export interface ManagerMarketFlow {
  /** Gasto en compras/fichajes/clausulazos reciente. */
  expense: number;
  /** Ingreso por ventas reciente. */
  income: number;
  /** Nº de clausulazos lanzados en la ventana. */
  clauseAttacks: number;
}

/**
 * Flujo de mercado por manager en los últimos `windowDays` días, indexado por
 * userId (manager.id). Sirve para ajustar la liquidez estimada de los rivales
 * y detectar quién ataca cláusulas.
 */
export function marketFlowByManager(events: LeagueActivityEvent[], windowDays = 14): Map<number, ManagerMarketFlow> {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const flows = new Map<number, ManagerMarketFlow>();

  for (const event of events) {
    const at = Date.parse(event.createdAt);
    if (Number.isNaN(at) || at < cutoff) continue;

    const flow = flows.get(event.userId) ?? { expense: 0, income: 0, clauseAttacks: 0 };
    if (EXPENSE_TYPES.has(event.activityTypeId)) flow.expense += event.amount;
    if (event.activityTypeId === INCOME_TYPE) flow.income += event.amount;
    if (event.activityTypeId === CLAUSE_TYPE) flow.clauseAttacks += 1;
    flows.set(event.userId, flow);
  }

  return flows;
}
