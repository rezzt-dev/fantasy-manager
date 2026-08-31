import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureDataDir, writablePath } from '../runtime-paths';
import type { MarketPlayer, PlayerMaster } from '../../types/fantasy';

/**
 * Snapshot diario (§7.2 del diseño): catálogo de jugadores (valor, puntos,
 * estado) y mercado de la liga, en data/snapshots/YYYY-MM-DD.json. Es la base
 * de las tendencias de valor, el comportamiento rival y el backtesting.
 *
 * Se escribe como mucho una vez al día (si ya existe el fichero de hoy, no se
 * toca). Formato JSON único por día: volumen pequeño (~cientos de jugadores),
 * sin dependencias.
 */

const SNAPSHOT_DIR = writablePath('snapshots');

interface CatalogEntry {
  id: string;
  teamId?: number;
  positionId: number;
  marketValue: number;
  points: number;
  averagePoints: number;
  lastSeasonPoints: number;
  playerStatus: string;
}

interface MarketEntry {
  marketId: string;
  playerId: string;
  salePrice: number;
  numberOfBids: number;
  numberOfOffers?: number;
  directOffer?: boolean;
  expirationDate?: string;
  sellerManagerName?: string;
  marketValue: number;
  playerStatus: string;
}

export interface DailySnapshot {
  date: string;
  leagueId: string;
  week: number;
  catalog: CatalogEntry[];
  market: MarketEntry[];
}

function slimPlayer(p: PlayerMaster): CatalogEntry {
  return {
    id: p.id,
    // El catálogo devuelve teamId/positionId como string; se normaliza.
    teamId: Number(p.teamId) || undefined,
    positionId: Number(p.positionId) || 0,
    marketValue: Number(p.marketValue) || 0,
    points: Number(p.points) || 0,
    averagePoints: Number(p.averagePoints) || 0,
    lastSeasonPoints: Number(p.lastSeasonPoints) || 0,
    playerStatus: p.playerStatus,
  };
}

function slimMarketPlayer(m: MarketPlayer): MarketEntry {
  return {
    marketId: m.id,
    playerId: m.playerMaster.id,
    salePrice: Number(m.salePrice) || 0,
    numberOfBids: Number(m.numberOfBids) || 0,
    numberOfOffers: m.numberOfOffers,
    directOffer: m.directOffer,
    expirationDate: m.expirationDate,
    sellerManagerName: m.sellerTeam?.manager?.managerName,
    marketValue: Number(m.playerMaster.marketValue) || 0,
    playerStatus: m.playerMaster.playerStatus,
  };
}

/**
 * Escribe el snapshot de hoy si no existe. Devuelve true si se ha escrito.
 * Nunca lanza: un fallo de disco no debe romper la request que lo dispara.
 */
export async function maybeWriteDailySnapshot(input: {
  leagueId: string;
  week: number;
  allPlayers: PlayerMaster[];
  market: MarketPlayer[];
}): Promise<boolean> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const file = path.join(SNAPSHOT_DIR, `${date}.json`);
    if (existsSync(file)) return false;

    const snapshot: DailySnapshot = {
      date,
      leagueId: input.leagueId,
      week: input.week,
      catalog: input.allPlayers.map(slimPlayer),
      market: input.market.map(slimMarketPlayer),
    };

    await ensureDataDir('snapshots');
    await writeFile(file, JSON.stringify(snapshot));
    console.log(`[snapshots] daily snapshot written: ${file} (${snapshot.catalog.length} jugadores, ${snapshot.market.length} en mercado)`);
    return true;
  } catch (error) {
    console.warn('[snapshots] write failed:', error instanceof Error ? error.message : error);
    return false;
  }
}
