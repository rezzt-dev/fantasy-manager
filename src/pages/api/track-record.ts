import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getToken } from '../../lib/fantasy/api-proxy';
import { ensureDataDir } from '../../lib/runtime-paths';
import { summarizeTrackRecord } from '../../lib/engine/track-record';

/**
 * GET /api/track-record?leagueId={id}
 *
 * Métricas del track record (§6.3 del diseño) por jornada y en total: MAE del
 * modelo frente al baseline, Spearman, top-11 hit rate, puntos del capitán,
 * precisión y ROI de compras. Lee solo los ficheros locales de
 * data/track-record (no llama a la API oficial): es rápido de servir.
 *
 * Lo que aún no tiene datos (pretemporada o jornadas sin liquidar) se
 * devuelve en null con nota, nunca como "todo OK" (§4.6, honestidad de datos).
 */



async function readJson(file: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ url, cookies, session }) => {
  try {
    const leagueId = url.searchParams.get('leagueId') ?? undefined;
    const token = await getToken(cookies, session);
    if (!token) {
      return new Response(JSON.stringify({ error: 'No token configured' }), { status: 401 });
    }

    const trackRecordDir = await ensureDataDir('track-record');
    const metricsLatest = (await readJson(path.join(trackRecordDir, 'metrics-latest.json'))) as {
      week?: number;
      note?: string;
      trackRecord?: { settled?: number };
    } | null;
    const calibration = await readJson(path.join(trackRecordDir, 'calibration-latest.json'));

    const currentWeek = metricsLatest?.week ?? 1;
    const summary = await summarizeTrackRecord(currentWeek, leagueId);

    const hasData = summary.totals.settled > 0;
    const notes: string[] = [];
    if (!hasData) {
      notes.push('Sin jornadas liquidadas todavía: las métricas se rellenan solas al cerrarse cada jornada (puntos reales vía API oficial).');
    }

    return new Response(
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        week: currentWeek,
        summary,
        walkForward: metricsLatest,
        calibration,
        notes,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[track-record] Error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
