import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStrategyReport, compareStrategyPlayers, strategyDistribution, strategyObservations } from '../lib/engine/strategy';
import { estimateMinutes } from '../lib/engine/features/minutes';
import { predictPlayerPoints } from '../lib/engine/model';
import { recentForm } from '../lib/engine/form';
import { matchApiFootballInjuries, parseApiFootballInjuries } from '../lib/engine/sources/api-football';
import type { Match, PlayerMaster } from '../types/fantasy';
import type { PlayerWeekStat } from '../lib/engine/player-stats';

const player: PlayerMaster = { id: 'a', name: 'Jugador A', nickname: 'Jugador A', slug: 'jugador-a',
  positionId: 4, position: '4', teamId: 1, playerStatus: 'ok', lastSeasonPoints: 152,
  marketValue: 1000000, points: 60, averagePoints: 6 };
const stats = (values: number[]): PlayerWeekStat[] => values.map((totalPoints, index) => ({
  weekNumber: index + 1, totalPoints, stats: { mins_played: [75, totalPoints] },
}));
const calendar: Match[] = [{ id: 'm', matchDate: '2026-09-10T18:00:00Z', date: '2026-09-10', time: '18:00',
  localId: 1, visitorId: 2, matchState: 0, localScore: null, visitorScore: null, featured: false }];

test('minute precision, explicit zero and alternative probabilities survive estimation', () => {
  const lineup = { sourceTeamName: 'Club', starters: [{ name: player.name, slug: player.slug!, probability: 60.01 }], alternatives: [] };
  const estimate = () => estimateMinutes({ player, historicalMinutes: 75, teamId: 1, probableLineups: new Map([[1, lineup]]) })!;
  const first = estimate();
  lineup.starters[0].probability = 60.02;
  assert.ok(estimate().expectedMinutes > first.expectedMinutes);
  assert.ok(estimate().expectedMinutes - first.expectedMinutes < 0.01);
  lineup.starters[0].probability = 0;
  assert.equal(estimate().pStarter, 0);
  const alternative = estimateMinutes({ player, historicalMinutes: 75, teamId: 1, probableLineups: new Map([[1, {
    ...lineup, starters: [], alternatives: [{ name: player.name, slug: '', probability: 40 }],
  }]]) })!;
  assert.ok(Math.abs(alternative.pStarter - 0.34) < 1e-12);
});

test('shrinkage cannot restore points to an unavailable player', () => {
  const result = predictPlayerPoints(player, calendar, {
    weekNumber: 8, playerStats: { a: stats([3, 5, 4, 8, 2, 6]) }, shrinkagePriors: new Map([['4:3', 5]]),
    injuryReport: [{ name: player.name, slug: player.slug, status: 'injured' }],
  });
  assert.equal(result.expectedMinutes, 0);
  assert.equal(result.xp, 0);
});

test('per-game fallback does not reapply historical participation', () => {
  const result = predictPlayerPoints(player, [], { confirmedLineups: new Map([[1, {
    sourceTeamName: 'Club', starters: [player.name], bench: [],
  }]]) });
  assert.equal(result.expectedMinutes, 75);
  assert.equal(result.xp, 6);
});

test('current and future outcomes do not leak into form or strategy', () => {
  const past = stats([2, 3, 4, 5, 6, 7]);
  const polluted = [...past, { weekNumber: 7, totalPoints: 500, stats: { mins_played: [90, 500] as [number, number] } }];
  assert.deepEqual(recentForm(polluted, 7), recentForm(past, 7));
  assert.deepEqual(strategyObservations(polluted, 7), strategyObservations(past, 7));
  assert.equal(strategyObservations([...past, past[0], { weekNumber: 0 }], 7).length, 6);
});

test('uncertainty is unavailable with sparse evidence, finite and ordered otherwise', () => {
  assert.equal(strategyDistribution(4, strategyObservations(stats([2, 4]), 7)), null);
  const distribution = strategyDistribution(4, strategyObservations(stats([-3, 0, 4, 7, 8, 12]), 7))!;
  assert.ok(distribution.lower <= distribution.median && distribution.median <= distribution.upper);
  assert.ok(distribution.lower < 0, 'negative fantasy scores must not be clamped');
  assert.ok(distribution.probabilityAtLeast5 >= 0 && distribution.probabilityAtLeast5 <= 1);
  assert.ok(distribution.effectiveSamples <= distribution.samples);
});

test('paired comparison preserves covariance, ties and sub-centipoint changes', () => {
  const a = strategyObservations(stats([0, 10, -2, 4, 3, 12]), 7);
  const b = strategyObservations(stats([2, 12, 0, 6, 5, 14]), 7);
  assert.equal(compareStrategyPlayers(0, a, b).probabilityTie, 1);
  assert.equal(compareStrategyPlayers(0.00001, a, b).probabilityBetter, 1);
  assert.equal(compareStrategyPlayers(-0.00001, a, b).probabilityBetter, 0);
  assert.equal(compareStrategyPlayers(1, a, b.slice(0, 3)).probabilityBetter, null);
});

test('report deduplicates universe and exposes sensitivity without modifying inputs', () => {
  const context = { weekNumber: 7, playerStats: { a: stats([1, 3, 2, 8, 5, 12]) }, teamElos: new Map([[1, 1700], [2, 1700]]) };
  const report = buildStrategyReport({ players: [player, player], ownPlayerIds: new Set(['a']), calendar, context, sources: [] });
  assert.equal(report.players.length, 1);
  assert.equal(report.calibrated, false);
  assert.ok(report.players[0].opponentSensitivity!.stronger < 0);
  assert.ok(report.players[0].opponentSensitivity!.weaker > 0);
  assert.equal(context.teamElos.get(2), 1700);
  assert.doesNotThrow(() => JSON.stringify(report));
});

test('API-Football rejects provider errors, malformed rows and partial pages', () => {
  assert.throws(() => parseApiFootballInjuries(JSON.stringify({ errors: { token: 'invalid' }, response: [] })));
  assert.throws(() => parseApiFootballInjuries(JSON.stringify({ errors: [], response: [{}] })));
  assert.throws(() => parseApiFootballInjuries(JSON.stringify({ errors: [], response: [], paging: { total: 2 } })));
  assert.deepEqual(parseApiFootballInjuries(JSON.stringify({ errors: [], response: [], paging: { total: 1 } })), []);
});

test('API-Football requires exact club, player and fixture date; unknown types ignored', () => {
  const row = { player: { name: player.name, type: 'Missing Fixture', reason: 'Injury' }, team: { name: 'Real Madrid' }, fixture: { date: calendar[0].matchDate } };
  const teams = [{ id: 1, name: 'Real Madrid' }, { id: 2, name: 'Barcelona' }];
  assert.equal(matchApiFootballInjuries([row], [player], teams, calendar).length, 1);
  assert.equal(matchApiFootballInjuries([{ ...row, team: { name: 'Barcelona' } }], [player], teams, calendar).length, 0);
  assert.equal(matchApiFootballInjuries([{ ...row, fixture: { date: '2020-01-01' } }], [player], teams, calendar).length, 0);
  assert.equal(matchApiFootballInjuries([{ ...row, player: { ...row.player, type: 'Unknown' } }], [player], teams, calendar).length, 0);
  assert.equal(matchApiFootballInjuries([row], [player, { ...player, id: 'b' }], teams, calendar).length, 0);
});
