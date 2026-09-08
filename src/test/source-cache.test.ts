import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { kvSet } from '../lib/kv-cache';
import { fetchTextWithCache } from '../lib/engine/sources/http-cache';

const url = 'https://example.invalid/calendar';
const key = () => `test-sources-${randomUUID()}`;

test('Peticiones concurrentes comparten una sola descarga', async () => {
  let calls = 0;
  const cacheKey = key();
  const fetcher = async () => { calls++; return 'calendar'; };
  const results = await Promise.all(Array.from({ length: 20 }, () => fetchTextWithCache(cacheKey, url, 60_000, fetcher)));
  assert.equal(calls, 1);
  assert.ok(results.every(result => result?.text === 'calendar'));
  assert.equal((await fetchTextWithCache(cacheKey, url, 60_000, fetcher))?.origin, 'cache');
  assert.equal(calls, 1);
});

test('La caché compartida evita red en una instancia sin memoria ni disco', async () => {
  const cacheKey = key();
  await kvSet(`sources:${cacheKey}`, { url, text: 'shared', fetchedAt: Date.now() });
  let calls = 0;
  const result = await fetchTextWithCache(cacheKey, url, 60_000, async () => { calls++; return 'network'; });
  assert.equal(result?.text, 'shared');
  assert.equal(result?.origin, 'cache');
  assert.equal(calls, 0);
});

test('Una caída conserva el último dato compartido con su antigüedad original', async () => {
  const cacheKey = key();
  const fetchedAt = Date.now() - 120_000;
  await kvSet(`sources:${cacheKey}`, { url, text: 'stale', fetchedAt });
  const result = await fetchTextWithCache(cacheKey, url, 1, async () => { throw new Error('offline test'); });
  assert.deepEqual(result, { text: 'stale', origin: 'stale', fetchedAt });
});

test('Cambiar URL no reutiliza datos de otro recurso y respeta el TTL del consumidor', async () => {
  const cacheKey = key();
  await fetchTextWithCache(cacheKey, url, 60_000, async () => 'first');
  const replaced = await fetchTextWithCache(cacheKey, `${url}/other`, 60_000, async () => 'other');
  assert.equal(replaced?.text, 'other');
  const refreshed = await fetchTextWithCache(cacheKey, `${url}/other`, 0, async () => 'fresh');
  assert.equal(refreshed?.text, 'fresh');
  assert.equal(refreshed?.origin, 'network');
});

test('Un fallo sin caché devuelve null y permite reintentar', async () => {
  const cacheKey = key();
  assert.equal(await fetchTextWithCache(cacheKey, url, 1, async () => { throw new Error('offline test'); }), null);
  assert.equal((await fetchTextWithCache(cacheKey, url, 1, async () => 'recovered'))?.text, 'recovered');
});
