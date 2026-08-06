# 06 — Fix: jugadores con equipo real que aparecen «Sin equipo» en el mercado

> **Bug**: hay jugadores que pertenecen a la plantilla de un equipo real de LaLiga y, sin embargo, en el **mercado** aparecen **«Sin equipo»**. Hay que arreglarlo: aunque estén en el mercado, se debe mostrar el equipo al que pertenecen.

---

## 1. Síntoma y alcance

- En el mercado (`src/components/dashboard/MarketTab.tsx`, línea ~278) se renderiza `p.team?.name || 'Sin equipo'`.
- El mismo fallback existe en **7 componentes más**: `TeamTab`, `RivalsTab`, `RecommendationsTab`, `MarketStatsPanel`, `PlayerCard`, `PlayerRow`, `PlayerDetailDialog`.
- Es decir: el problema **no es de UI** sino de **datos**: `playerMaster.team` llega `undefined`/`null` para ciertos jugadores, aunque `playerMaster.teamId` sí indica su equipo real.

## 2. Causa raíz (a verificar en desarrollo)

Estructura actual (`src/types/fantasy.ts`):

```ts
export interface PlayerMaster {
  // ...
  teamId: number;                    // obligatorio en el tipo...
  team?: { id: string; name: string; slug: string };  // ...pero team es OPCIONAL
}
```

Hipótesis (ordenadas por probabilidad):

1. **El endpoint de mercado no enriquece `team`**: `/league/{leagueId}/market` devuelve `playerMaster` con `teamId` pero sin objeto `team`. El enriquecimiento con `teams-master` que se documenta para el catálogo (`adaptPlayersResponse` en `agent-docs/useful-docs/api-endpoints.md`) **no se aplica al mercado**.
2. **`teamId` ausente o vacío** en algunos jugadores del mercado: el propio código asume strings raros («El catálogo devuelve teamId como string») y `snapshots.ts` normaliza `teamId: Number(p.teamId) || undefined`, lo que indica que a veces llega `""`/`null`.
3. **Jugadores recién traspasados/incorporados** en los que la API oficial no rellena el equipo hasta el siguiente refresco del catálogo.

> **Paso 0 obligatorio**: capturar la respuesta real de `/league/{leagueId}/market` (vía `/api/proxy`) de un jugador afectado y confirmar cuál de las hipótesis se cumple (¿`teamId` presente sin `team`? ¿`teamId` vacío?). Documentar el hallazgo en `agent-docs/useful-docs/api-endpoints.md`.

## 3. Solución propuesta (normalización en servidor, única fuente de verdad)

### 3.1 Fuente de verdad de equipos

Reutilizar `/v3/teams-master` → `fetchTeamsMaster(token)` (`src/lib/fantasy/teams.ts`, caché 24 h) que ya devuelve `OfficialTeam[]` (`{ id, name }`). Ampliar el mapeo con `slug` y `badgeColor` si el endpoint los expone, para el escudo y el nombre corto.

### 3.2 Módulo de normalización

Nuevo `src/lib/fantasy/player-teams.ts` (o integrarlo en el `adapters.ts` que referencia `api-endpoints.md`):

```ts
// src/lib/fantasy/player-teams.ts
import type { PlayerMaster } from '../../types/fantasy';
import type { OfficialTeam } from '../engine/team-names';

export function buildTeamIndex(teams: OfficialTeam[]): Map<number, { id: string; name: string; slug: string }> {
  const index = new Map<number, { id: string; name: string; slug: string }>();
  for (const t of teams) index.set(t.id, { id: String(t.id), name: t.name, slug: slugify(t.name) });
  return index;
}

/**
 * Rellena playerMaster.team cuando falta pero teamId es válido.
 * Nunca adivina: si no hay teamId válido o no está en el índice, deja team
 * como está y cuenta el fallo (para logging y métricas).
 */
export function enrichPlayerTeams<T extends { playerMaster: PlayerMaster }>(
  items: T[],
  teamIndex: Map<number, { id: string; name: string; slug: string }>,
): { items: T[]; unresolved: number } {
  let unresolved = 0;
  for (const item of items) {
    const p = item.playerMaster;
    if (p.team?.name) continue;                     // ya resuelto
    const teamId = Number(p.teamId);
    const team = Number.isFinite(teamId) && teamId > 0 ? teamIndex.get(teamId) : undefined;
    if (team) {
      p.team = { id: team.id, name: team.name, slug: team.slug };
    } else {
      unresolved += 1;
      console.warn(`[player-teams] sin equipo resoluble para ${p.nickname} (teamId=${p.teamId})`);
    }
  }
  return { items, unresolved };
}
```

### 3.3 Dónde aplicarlo

**Capa servidor** (recomendado — corrige las 8 vistas de golpe):

1. **Endpoints propios que ya orquestan datos** (`src/pages/api/league-analysis.ts`, `src/pages/api/recommendations.ts`): tras `fetchOfficialAPI` del mercado y del catálogo, ejecutar `enrichPlayerTeams` con el índice de `fetchTeamsMaster` (que ya llaman). Mínimo coste: `teams-master` ya se cachea 24 h.
2. **Proxy genérico** (`src/pages/api/proxy/[...path].ts`): para la ruta del mercado (`/market`), post-procesar la respuesta con el mismo enriquecedor. Esto garantiza que **cualquier** consumidor futuro del mercado quede corregido (es la opción más robusta). Implementar de forma opcional (path-match) y con fallo gracioso (si `teams-master` falla, se devuelve la respuesta tal cual).
3. **Catálogo** (`/players`), **detalle de jugador** (`/player/{id}/league/{leagueId}`) y **clasificación/plantillas rivales**: aplicar el mismo enriquecedor para homogeneizar (cubre `TeamTab`, `RivalsTab`, `RecommendationsTab`, estadísticas).

**Capa cliente** (defensa, opcional): dejar el fallback `|| 'Sin equipo'` como red de seguridad, pero si el servidor normaliza, el fallback ya no debería saltar. Añadir un contador de «sin equipo» en `MarketTab` solo si interesa visibilidad de datos raros.

### 3.4 Último recurso (no recomendado en primera fase)

Si tras el Paso 0 resultara que **`teamId` también falta** en algunos jugadores, las opciones son:

- Consultar el detalle individual `/player/{id}/league/{leagueId}` (más coste) — usar solo para los casos sin resolver, con caché.
- **No** intentar inferir el club por el nombre del jugador (fragilidad alta, riesgo de error). Mejor mostrar «Sin equipo» y registrar el caso.

## 4. Fases de implementación

| Fase | Tarea | Verificación |
|------|-------|--------------|
| 0 | Paso 0: capturar payload real del mercado y confirmar causa raíz | Nota en `api-endpoints.md` |
| 1 | `player-teams.ts` + `buildTeamIndex` + test unitario | Test: jugador con teamId válido se rellena; sin teamId no se toca; contador de unresolved |
| 2 | Aplicar en proxy (`/market`) y en `league-analysis.ts` / `recommendations.ts` | Test del proxy con fixture |
| 3 | Aplicar a catálogo, detalle y plantillas rivales | Revisión de las 8 vistas afectadas |
| 4 | Limpieza: quitar fallbacks si ya no aplican (dejar el `|| 'Sin equipo'` como red de seguridad) | `pnpm typecheck` + E2E |

## 5. Riesgos y mitigaciones

- **Cambiar el shape del mercado en el proxy** → riesgo bajo: el enriquecedor solo **añade** `playerMaster.team`; si el enriquecimiento falla, se devuelve la respuesta original (nunca rompe).
- **Jugadores sin `teamId`** → no se resuelven (correcto); se loguean para decidir si merece el coste del detalle individual.
- **Caché de `teams-master` desactualizada** (traspasos) → TTL 24 h; si el equipo del jugador cambió, la API oficial normalmente lo refleja en `teamId` (que sí se respeta).
- **Coherencia de snapshots** (`data/snapshots/`) → ya persisten `teamId`; no requieren migración, y el enriquecimiento se puede replicar en lectura si se quiere mostrar el nombre del equipo en histórico.

## 6. Validación

- `pnpm typecheck` y `pnpm lint`.
- **Test unitario** de `enrichPlayerTeams`: (a) rellena `team` si `teamId` existe en el índice; (b) no muta si `team` ya presente; (c) `unresolved` correcto con `teamId` nulo; (d) `teamId` como string (`"123"`) se normaliza a número.
- **E2E**: abrir el mercado y comprobar que no hay ningún jugador con «Sin equipo» teniendo `teamId` válido (aserto sobre el DOM + métrica en consola).
- Revisión manual de las 8 vistas (mercado, equipo, rivales, recomendaciones, estadísticas, cards).
