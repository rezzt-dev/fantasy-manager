import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectEuropeanEvents, toEuropeanFixtures } from '../lib/engine/sources/uefa';
import type { SofaEvent } from '../lib/engine/sources/sofascore';

const now = Date.parse('2026-09-08T12:00:00Z');
const day = 86_400_000;
function event(id: number, days: number, status = 'notstarted'): SofaEvent {
  return { id, startTimestamp: (now + days * day) / 1000,
    homeTeam: { id: 1, name: 'Madrid', shortName: 'Madrid', slug: 'madrid' },
    awayTeam: { id: 2, name: 'Inter', shortName: 'Inter', slug: 'inter' }, status: { code: 0, type: status } };
}

test('Un aplazado, cancelado o suspendido no provoca carga europea', () => {
  for (const status of ['postponed', 'canceled', 'cancelled', 'interrupted']) {
    assert.deepEqual(toEuropeanFixtures(event(1, -2, status), 'ucl', () => 1), []);
  }
  const fixtures = toEuropeanFixtures(event(1, -2, 'finished'), 'ucl', name => name === 'Madrid' ? 1 : null);
  assert.equal(fixtures.length, 1);
  assert.equal(fixtures[0].played, true);
  assert.equal(fixtures[0].opponentName, 'Inter');
});

test('El calendario supera dos páginas y alcanza el horizonte de planificación', async () => {
  const pages: number[] = [];
  const events = await collectEuropeanEvents(async page => {
    pages.push(page);
    return { events: [event(page, [2, 16, 30, 44, 58][page])], hasNextPage: true };
  }, 'next', now);
  assert.deepEqual(pages, [0, 1, 2, 3, 4]);
  assert.equal(events.length, 5);
});

test('Paginación acotada, fin explícito y fallo parcial conservan datos', async () => {
  let calls = 0;
  await collectEuropeanEvents(async () => { calls++; return { events: [event(1, 2)], hasNextPage: true }; }, 'next', now);
  assert.equal(calls, 12);
  const ended = await collectEuropeanEvents(async page => {
    assert.equal(page, 0);
    return { events: [event(1, 2)], hasNextPage: false };
  }, 'next', now);
  assert.equal(ended.length, 1);
  const partial = await collectEuropeanEvents(async page => page === 0 ? { events: [event(1, 2)] } : null, 'next', now);
  assert.equal(partial.length, 1);
});

test('La paginación anterior se detiene al cubrir dos semanas', async () => {
  let calls = 0;
  const events = await collectEuropeanEvents(async page => {
    calls++;
    return { events: [event(page, -7 * (page + 1))], hasNextPage: true };
  }, 'last', now);
  assert.equal(calls, 2);
  assert.equal(events.length, 2);
});
