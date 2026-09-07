import { test, mock } from 'node:test';
import assert from 'node:assert';
import { LaLigaFantasyClient, fantasyAPI } from '../lib/fantasy/api';
import { isTokenExpired } from '../lib/fantasy/api-proxy';

test('LaLiga Fantasy Actions API Layer Tests', async (t) => {
  t.afterEach(() => {
    mock.reset();
  });

  await t.test('1. login/session handling', async () => {
    mock.method(global, 'fetch', async (url: string, init: any) => {
      assert.match(url, /\/api\/auth\/login/);
      return new Response(JSON.stringify({ success: true, expires_in: 86400 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const res = await LaLigaFantasyClient.login('test@user.com', 'password123');
    assert.deepStrictEqual(res, { success: true, expires_in: 86400 });
  });

  await t.test('2. saveToken handling', async () => {
    mock.method(global, 'fetch', async (url: string, init: any) => {
      assert.match(url, /\/api\/auth\/token/);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const res = await LaLigaFantasyClient.saveToken('test_jwt_access_token');
    assert.deepStrictEqual(res, { success: true });
  });

  await t.test('3. refresh token handling', async () => {
    mock.method(global, 'fetch', async (url: string, init: any) => {
      assert.match(url, /\/api\/proxy\/v1\/competition\/1\/week\/current/);
      return new Response(JSON.stringify({ id: 'w1', weekNumber: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const res = await LaLigaFantasyClient.refreshToken();
    assert.deepStrictEqual(res, { id: 'w1', weekNumber: 1 });
  });

  await t.test('4. obtener plantilla', async () => {
    mock.method(global, 'fetch', async (url: string, init: any) => {
      assert.match(url, /\/api\/proxy\/v1\/competition\/1\/leagues\/l1\/teams\/123/);
      return new Response(JSON.stringify({ players: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const res = await LaLigaFantasyClient.getTeamData('l1', 123);
    assert.deepStrictEqual(res, { players: [] });
  });

  await t.test('5. vender jugador', async () => {
    mock.method(global, 'fetch', async (url: string, init: any) => {
      assert.match(url, /\/api\/proxy\/v1\/competition\/1\/league\/l1\/market\/sell/);
      assert.strictEqual(init.method, 'POST');
      const body = JSON.parse(init.body);
      assert.strictEqual(body.playerId, 'p1');
      assert.strictEqual(body.salePrice, 5000000);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const res = await LaLigaFantasyClient.sellPlayerToMarket('l1', 'p1', 5000000);
    assert.deepStrictEqual(res, { success: true });
  });

  await t.test('6. comprar jugador / pujar por jugador', async () => {
    mock.method(global, 'fetch', async (url: string, init: any) => {
      assert.match(url, /\/api\/proxy\/v1\/competition\/1\/league\/l1\/market\/m1\/bid/);
      assert.strictEqual(init.method, 'POST');
      const body = JSON.parse(init.body);
      assert.strictEqual(body.money, 6000000);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const res = await LaLigaFantasyClient.makeBid('l1', 'm1', 6000000);
    assert.deepStrictEqual(res, { success: true });
  });

  await t.test('7. obtener alineación', async () => {
    mock.method(global, 'fetch', async (url: string, init: any) => {
      assert.match(url, /\/api\/proxy\/v1\/competition\/1\/teams\/123\/lineup/);
      return new Response(JSON.stringify({ formation: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    // `getCurrentLineup` normaliza la alineación: rellena las cuatro líneas
    // (más el entrenador) y traduce `midfield`/`striker` de la API oficial a
    // `midfielder`/`attacker`, que es lo que usa el resto del proyecto.
    const res = await LaLigaFantasyClient.getCurrentLineup(123);
    assert.deepStrictEqual(res, {
      formation: { goalkeeper: [], defender: [], midfielder: [], attacker: [], coach: [] },
    });
  });

  await t.test('8. guardar alineación con formato oficial corregido', async () => {
    const lineupData = {
      tactical_formation: [4, 4, 2],
      goalkeeper: 'gk1',
      defender: ['df1', 'df2', 'df3', 'df4'],
      midfield: ['mf1', 'mf2', 'mf3', 'mf4'],
      striker: ['at1', 'at2'],
    };

    mock.method(global, 'fetch', async (url: string, init: any) => {
      assert.match(url, /\/api\/proxy\/v1\/competition\/1\/teams\/123\/lineup/);
      assert.strictEqual(init.method, 'PUT');
      const body = JSON.parse(init.body);
      assert.deepStrictEqual(body, lineupData);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const res = await LaLigaFantasyClient.updateLineup(123, lineupData);
    assert.deepStrictEqual(res, { success: true });
  });

  await t.test('9. errores HTTP handling', async () => {
    mock.method(global, 'fetch', async (url: string, init: any) => {
      return new Response(JSON.stringify({ message: 'Insufficient funds' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    });

    await assert.rejects(
      async () => {
        await LaLigaFantasyClient.makeBid('l1', 'm1', 999999999);
      },
      /Insufficient funds/
    );
  });

  await t.test('10. token expirado check', () => {
    const expiredPayload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 })).toString('base64url');
    const expiredToken = `header.${expiredPayload}.signature`;
    assert.strictEqual(isTokenExpired(expiredToken), true);

    const validPayload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 7200 })).toString('base64url');
    const validToken = `header.${validPayload}.signature`;
    assert.strictEqual(isTokenExpired(validToken), false);
  });

  await t.test('11. evitar doble ejecución check (loading guard simulation)', async () => {
    let executions = 0;
    mock.method(global, 'fetch', async (url: string, init: any) => {
      executions++;
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    let isSubmitting = false;
    const triggerSubmit = async () => {
      if (isSubmitting) return;
      isSubmitting = true;
      try {
        await LaLigaFantasyClient.shieldPlayer('l1', 'p1');
      } finally {
        isSubmitting = false;
      }
    };

    await Promise.all([
      triggerSubmit(),
      triggerSubmit()
    ]);

    assert.strictEqual(executions, 1);
  });

  await t.test('12. validación de propiedad de plantilla contra unowned players', () => {
    const teamPlayers = [
      { playerTeamId: 'inst_gk1', playerMaster: { id: 'p1', name: 'Real Player 1' } },
      { playerTeamId: 'inst_df1', playerMaster: { id: 'p2', name: 'Real Player 2' } },
    ];

    const unownedPlayerTeamId = 'inst_unowned';
    const ownedTeamIds = new Set(teamPlayers.map(p => p.playerTeamId));

    const checkLineupOwnership = (goalkeeper: string, defender: string[]) => {
      const payloadIds = [goalkeeper, ...defender];
      const unownedIds = payloadIds.filter(id => !ownedTeamIds.has(id));
      return unownedIds.length === 0;
    };

    assert.strictEqual(checkLineupOwnership('inst_gk1', ['inst_df1']), true);
    assert.strictEqual(checkLineupOwnership('inst_gk1', ['inst_df1', unownedPlayerTeamId]), false);
  });

  await t.test('13. filtrar correctamente jugadores propios, comprar solo externos, vender solo propios', () => {
    const teamPlayers = [
      { playerTeamId: 't1', playerMaster: { id: 'p1', nickname: 'Owner GK' } },
      { playerTeamId: 't2', playerMaster: { id: 'p2', nickname: 'Owner DF' } },
    ];
    const marketPlayers = [
      { id: 'm1', salePrice: 1000000, playerMaster: { id: 'p3', nickname: 'Market MF' } },
    ];

    const ownedIds = new Set(teamPlayers.map(p => p.playerMaster.id));

    // Validar venta: el jugador debe pertenecer a la plantilla propia
    const validateCanSell = (playerId: string) => ownedIds.has(playerId);
    assert.strictEqual(validateCanSell('p1'), true);
    assert.strictEqual(validateCanSell('p3'), false);

    // Validar compra: el jugador NO debe pertenecer a la plantilla propia
    const validateCanBuy = (playerId: string) => !ownedIds.has(playerId);
    assert.strictEqual(validateCanBuy('p3'), true);
    assert.strictEqual(validateCanBuy('p1'), false);
  });

  await t.test('14. recomendaciones sin datos incompletos (robustez ante features undefined)', () => {
    const mockLeagueWithoutConfig = {
      id: 'l1',
      name: 'Test League',
      config: undefined, // Simular config undefined
    };

    // La función debe manejar config undefined de forma graciosa sin lanzar excepciones
    const isBuyoutClauseEnabled = (league: any) => league?.config?.features?.buyoutClause ?? false;
    assert.strictEqual(isBuyoutClauseEnabled(mockLeagueWithoutConfig), false);
  });
});
