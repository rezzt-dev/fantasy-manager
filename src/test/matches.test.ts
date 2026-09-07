import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { mapEspnCompetition, mapEspnLineups, mapEspnIncidents, parseMatchClock } from '../lib/engine/sources/espn';
import { formatKickoff, buildEnrichedMatch, findSofaEvent } from '../lib/engine/matches';
import { buildTeamMatcher } from '../lib/engine/team-names';
import { writablePath } from '../lib/runtime-paths';
import type { Match, TeamCatalogEntry } from '../types/fantasy';

const competition = (id = '123') => ({ id, date: '2026-09-06T14:15Z', status: { type: { completed: true, state: 'post' } }, competitors: [
  { homeAway: 'away', team: { id: '83', displayName: 'Barcelona' }, score: '5' },
  { homeAway: 'home', team: { id: '94', displayName: 'Valencia' }, score: '0' },
] });
const rosters = () => ['away', 'home'].map(homeAway => ({ homeAway, team: { id: homeAway, displayName: homeAway }, formation: '4-3-3', roster: Array.from({ length: 16 }, (_, i) => ({ athlete: { id: String(i), displayName: `Jugador ${i}` }, starter: i < 11, jersey: String(i + 1) })) }));
const calendar: Match = { id: 'official-1', localId: 1, visitorId: 2, matchDate: '2026-09-06T14:15:00Z', date: '', time: '', matchState: 0, localScore: 0, visitorScore: 5, featured: false };
const teams = new Map<number, TeamCatalogEntry>([[1, { id: 1, name: 'Valencia', shortName: 'VAL', badgeColor: 'official-home' } as TeamCatalogEntry], [2, { id: 2, name: 'Barcelona', shortName: 'BAR', badgeColor: 'official-away' } as TeamCatalogEntry]]);

test('horarios peninsulares independientes de TZ y con cambio de verano/invierno', () => {
  const previous = process.env.TZ;
  try {
    for (const tz of ['UTC', 'America/New_York', 'Europe/Madrid']) {
      process.env.TZ = tz;
      assert.match(formatKickoff(Date.parse('2026-09-06T14:15Z') / 1000), /16:15/);
      assert.match(formatKickoff(Date.parse('2026-01-06T14:15Z') / 1000), /15:15/);
    }
    assert.equal(formatKickoff(NaN), 'Horario por confirmar');
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('local/visitante se identifican por homeAway, marcador pendiente no se inventa', () => {
  const c = competition();
  const event = mapEspnCompetition(c)!;
  assert.equal(event.homeTeam.name, 'Valencia');
  assert.equal(event.awayScore?.current, 5);
  c.status.type = { completed: false, state: 'pre' };
  assert.equal(mapEspnCompetition(c)?.homeScore?.current, undefined);
  assert.equal(mapEspnCompetition({ ...c, date: 'inválido' }), null);
});

test('solo dos onces completos se publican como alineaciones; se preserva el banquillo', () => {
  const data = rosters();
  assert.equal(mapEspnLineups(data)?.home.starters.length, 11);
  assert.equal(mapEspnLineups(data)?.away.bench.length, 5);
  data[0].roster[0].starter = false;
  assert.equal(mapEspnLineups(data), undefined);
  assert.equal(mapEspnLineups(), undefined);
});

test('goles, segunda amarilla, cambios y descuento; no cuenta tandas de penaltis', () => {
  assert.equal(parseMatchClock("45'+3'"), 48);
  assert.equal(parseMatchClock('HT'), undefined);
  const incidents = mapEspnIncidents([
    { type: { type: 'goal' }, scoringPlay: true, clock: { displayValue: "6'" }, team: { id: '83' }, participants: [{ athlete: { displayName: 'Autor' } }] },
    { type: { type: 'second-yellow-card' }, clock: { displayValue: "45'+3'" }, team: { id: '94' } },
    { type: { type: 'substitution' }, participants: [{ athlete: { displayName: 'Entra' } }, { athlete: { displayName: 'Sale' } }] },
    { scoringPlay: true, shootout: true },
  ], 94);
  assert.equal(incidents.length, 3);
  assert.equal(incidents[0].isHome, false);
  assert.equal(incidents[1].incidentClass, 'yellowRed');
  assert.equal(incidents[1].time, 48);
  assert.equal(incidents[2].playerOut?.name, 'Sale');
});

test('el cruce exige ambos equipos y una fecha próxima', () => {
  const event = mapEspnCompetition(competition())!;
  const matcher = buildTeamMatcher([...teams.values()]);
  assert.equal(findSofaEvent(calendar, [event], teams, matcher)?.id, event.id);
  assert.equal(findSofaEvent({ ...calendar, localId: 2, visitorId: 1 }, [event], teams, matcher), null);
  assert.equal(findSofaEvent({ ...calendar, matchDate: '2025-09-06T14:15Z' }, [event], teams, matcher), null);
});

test('partido completo sin SofaScore ni curl: onces, resumen, escudos e IDs separados', async t => {
  const id = String(Date.now());
  const c = competition(id);
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
    assert.match(String(url), /site.api.espn.com/);
    return Response.json({ header: { competitions: [c] }, rosters: rosters(), keyEvents: [{ type: { type: 'goal' }, scoringPlay: true, clock: { displayValue: "6'" }, team: { id: '83' }, participants: [{ athlete: { displayName: 'Autor' } }] }] });
  });
  try {
    const { match } = await buildEnrichedMatch(calendar, null, [], teams, { event: mapEspnCompetition(c)!, stale: false });
    assert.equal(match.dataSource, 'espn');
    assert.equal(match.eventId, null);
    assert.equal(match.sourceEventId, id);
    assert.equal(match.home.logoUrl, 'official-home');
    assert.equal(match.lineups?.away.starters.length, 11);
    assert.match(match.summary!.text, /Barcelona se impuso/);
    assert.match(match.summary!.text, /Autor 6'/);
    assert.match(match.kickoffFormatted, /16:15/);
  } finally { await rm(writablePath('cache', 'sources', `espn-summary-${id}.txt`), { force: true }); }
});

test('fuente caída conserva marcador y avisa; no inventa alineación', async t => {
  const c = competition(String(Date.now() + 1));
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  const { match } = await buildEnrichedMatch(calendar, null, [], teams, { event: mapEspnCompetition(c)!, stale: false });
  assert.equal(match.away.score, 5);
  assert.equal(match.lineups, undefined);
  assert.ok(match.notes.some(n => n.includes('Reintenta')));
});

test('descanso y segunda parte no se confunden con el inicio del partido', () => {
  const c = competition();
  const halftime = mapEspnCompetition({ ...c, status: { type: { name: 'STATUS_HALFTIME', state: 'in' }, period: 1, displayClock: '45' } });
  assert.equal(halftime?.status?.type, 'halftime');
  const second = mapEspnCompetition({ ...c, status: { type: { name: 'STATUS_SECOND_HALF', state: 'in' }, period: 2, displayClock: "67'" } });
  assert.equal(second?.time?.period, 'secondHalf');
  assert.equal(second?.time?.currentMinute, 67);
});

test('sin fuentes no se inventa un empate ni alineaciones', async () => {
  const { match } = await buildEnrichedMatch({ ...calendar, localScore: null, visitorScore: null }, null, [], teams);
  assert.equal(match.status, 'unknown');
  assert.equal(match.lineups, undefined);
  assert.match(match.summary!.text, /Marcador no disponible/);
  assert.doesNotMatch(match.summary!.text, /0-0/);
});

test('Racing Santander se cruza con el nombre corto oficial', () => {
  assert.equal(buildTeamMatcher([{ id: 1, name: 'Racing' }])('Racing Santander'), 1);
});
