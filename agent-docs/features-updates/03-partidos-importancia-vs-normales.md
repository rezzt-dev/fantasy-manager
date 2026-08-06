# 03 — Partidos de importancia vs. normales

> **Funcionalidad**: distinguir entre partidos de **importancia** y **normales**. Un partido pasa a «importancia» cuando en él **juega al menos un jugador de nuestra plantilla**; si no, es «normal». Dentro de cada grupo los partidos se **ordenan por la cantidad de jugadores de nuestra plantilla que juegan** (más jugadores → más arriba).

---

## 1. Objetivo

Que el usuario vea primero lo que le afecta: los partidos donde participan sus jugadores, priorizados por cuántos jugadores propios hay en liza. Los partidos sin jugadores propios quedan agrupados aparte (contexto de la jornada, resultados, etc.).

## 2. Contexto actual

- La plantilla propia está disponible como `TeamData.players` (`playerMaster.teamId` = equipo real del jugador).
- El calendario oficial de la jornada (`Match[]`) expone `localId` / `visitorId` (IDs de equipo fantasy) — ver `getCalendar` y el cruce propuesto en el doc 02.
- El endpoint `/api/matches` (doc 02) devuelve los partidos ya cruzados con el calendario oficial, por lo que **cada partido tiene `localId`/`visitorId` fantasy** listos para el cruce con la plantilla.
- `DashboardContainer` ya tiene la plantilla cargada (`teamQuery`), así que el cruce puede hacerse en el cliente o en el servidor.

## 3. Regla de clasificación (definir y documentar)

Propuesta (configurable):

1. **Contar jugadores propios por partido**:
   - `ownPlayersCount(partido) = nº de jugadores de nuestra plantilla cuyo `playerMaster.teamId` es `localId` o `visitorId``.
2. **Umbral de importancia**: `ownPlayersCount >= 1` → partido de **importancia**.
3. **Ordenación**:
   - Importancia: `ownPlayersCount` **desc**; empate → hora de inicio asc.
   - Normales: hora de inicio asc.
4. **Ponderación opcional (fase 2)**: dar más peso a los **titulares** que a los suplentes. Si tenemos `starterInfo` (`src/lib/analysis/starter-status.ts`) o la alineación confirmada de Sofascore (doc 02/05), se puede puntuar: titular = 1.0, suplente = 0.5. De esta forma un partido con 2 titulares pesa más que uno con 3 suplentes. Se recomienda **empezar sin ponderación** (regla simple, predecible) y añadirla después como refinamiento, manteniendo el conteo bruto visible en la UI.

> 📌 **Regla de producto a decidir**: ¿cuenta también el entrenador de la plantilla (posición 5)? Recomendación: sí, un partido con nuestro entrenador también es de importancia (el entrenador puntúa con el resultado). Documentar la decisión en el código.

## 4. Diseño propuesto

### 4.1 Cálculo (servidor)

En el endpoint `/api/matches` (doc 02) añadir los campos de clasificación, para que todas las vistas (03, 04, 05) consuman lo mismo y el orden no dependa del cliente:

```ts
export interface MatchEvent {               // ampliación del doc 02
  // ...
  importance: {
    ownPlayersCount: number;                // nº de jugadores de nuestra plantilla en el partido
    ownPlayers: { playerId: string; nickname: string; isStarter: boolean }[]; // desglose
    weightedScore: number;                  // fase 2: sumatorio ponderado (titular 1.0 / suplente 0.5)
  };
  group: 'importance' | 'normal';
}
```

Cruce: `ownPlayersByTeam = Map<teamId, TeamPlayer[]>` construido desde `teamData.players`; por partido, `ownPlayers = [...(map.get(localId)||[]), ...(map.get(visitorId)||[])]`.

Si el cálculo se hace en el cliente (para simplificar la fase 1), hacerlo en `PartidosTab.tsx` con `useMemo` sobre `matches` + `teamQuery.data` — misma regla, y moverlo al servidor cuando convenga para reutilizarlo en notificaciones/push.

### 4.2 UI

En `PartidosTab.tsx` (doc 02):

- **Sección «Importancia»** (primera, con contador `N partidos · M jugadores tuyos`):
  - Badge por partido: `X jugadores tuyos` (o `Tus jugadores: Yamal, Pedri…` en hover/tooltip).
  - Ordenados por `ownPlayersCount` desc.
  - Chip de estado del jugador si es útil: titular probable (`starterInfo`) vs suplente.
- **Sección «Normales»**: resto de partidos, colapsable (`<details>`/acordeón) para no robar atención, con su contador.
- **Toggle de filtro**: `Todos / Importantes / Normales` (pestañas o `FilterBar` existente).
- **Vacío**: si no hay partidos de importancia → mensaje suave («Ningún jugador tuyo juega en esta jornada») con el listado normal debajo.

### 4.3 Casos borde

- **Jugador cedido / traspasado** (cambia de equipo durante la temporada): usar siempre `playerMaster.teamId` vigente (la API lo actualiza); el cruce es por equipo real, no por club histórico.
- **Partido sin cruzar con calendario oficial** (no puntúa en fantasy, p. ej. Copa en paralelo): se marca `group: 'normal'` y se muestra solo si hay toggle «otros partidos» — por defecto, fuera.
- **Jornada en blanco para el equipo propio** (descanso): todos los partidos son `normal`; la UI lo comunica.
- **Jugador de nuestra plantilla lesionado y que no juega**: si el estado (`playerStatus`) no es `ok`, sigue contando como «de nuestra plantilla» pero la UI debe poder mostrar su estado (reutilizar `PlayerStatusBadge`). La **regla base** cuenta plantilla; un refinamiento (fase 2) puede excluir lesionados del conteo.

## 5. Fases de implementación

| Fase | Tarea | Verificación |
|------|-------|--------------|
| 1 | Regla base (conteo por `teamId`, sin ponderación) en el endpoint o cliente | Test unitario del clasificador con fixtures |
| 2 | Secciones Importancia/Normales en `PartidosTab.tsx` con badges y orden | E2E: orden correcto con 2+ partidos |
| 3 | Refinamientos: ponderación titular/suplente, entrenador, excluir lesionados | Test unitario + revisión de producto |

## 6. Validación

- Test unitario del clasificador: casos (0, 1, 3, 5 jugadores propios), empates por hora, entrenador, lesionados (según regla elegida).
- E2E: los partidos de importancia aparecen primero y ordenados por nº de jugadores; el toggle funciona.
- `pnpm typecheck` y `pnpm lint`.
