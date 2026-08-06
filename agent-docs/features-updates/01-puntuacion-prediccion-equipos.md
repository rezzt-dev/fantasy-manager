# 01 — Sección «Puntuación»: predicción de puntos por equipo y persistencia

> **Funcionalidad**: el usuario podrá ver, en una sección llamada «Puntuación», los **puntos posibles que puede realizar cada equipo de la liga** en la jornada en curso, teniendo en cuenta los jugadores, el **capitán** asignado (si la API lo expone) y el **entrenador + banquillo** (si la API lo expone). Con las actualizaciones de los equipos y los cambios de jugadores, tendremos una **predicción de puntos posibles** en cada jornada. Además se persisten estos datos para ver **clasificaciones por puntos y por jornadas**.

---

## 1. Objetivo

Construir una pestaña «Puntuación» que responda a dos preguntas:

1. **¿Cuántos puntos puede sacar cada equipo de mi liga esta jornada?** → predicción por equipo a partir de su once (y capitán/entrenador/banquillo cuando estén disponibles).
2. **¿Cómo ha evolucionado esa predicción a lo largo de las jornadas?** → histórico persistido que permita ver clasificaciones por puntos (predichos y reales) en cada jornada.

## 2. Contexto actual del código

El proyecto ya tiene casi todo el «ladrillo» de predicción montado:

- **Motor de puntos**: `src/lib/recommendations/points-estimator.ts` expone `estimatePoints(player, matches, context)` y `estimatePointsDetailed(...)` que delegan en `predictPlayerPoints` de `src/lib/engine/model.ts` (modelo por componentes: forma reciente, fixture, starter info, Elo, onces probables, shrinkage…).
- **Contexto del estimador**: `src/pages/api/league-analysis.ts` ya construye un `estimatorContext` completo (`teamStrength`, `starterInfo`, `externalSignals`, `teamElos`, `probableLineups`, `injuryReport`, `shrinkagePriors`, `positionAverages`…) — es la plantilla de referencia para el nuevo endpoint.
- **Plantillas de todos los rivales**: `src/lib/analysis/league-analysis.ts` ya descarga la plantilla de cada rival (`fetchTeamData`) con concurrencia limitada y reintentos (`withConcurrency`, `fetchWithRetry`). El dato está disponible y no hay que volver a descubrir el endpoint.
- **Persistencia**: patrón JSONL append-only y liquidación de jornadas ya resuelto en `src/lib/engine/track-record.ts` (`predictions-w{week}.jsonl`, `settleTrackRecord`, `summarizeTrackRecord`). También existe el snapshot diario en `src/lib/engine/snapshots.ts` (`data/snapshots/YYYY-MM-DD.json`).
- **Clasificación por jornada**: la API oficial expone `GET /v1/competition/1/leagues/{leagueId}/standing/{week}` (ya mapeado como `getStandingByWeek` en `src/lib/fantasy/api.ts`).
- **UI**: las pestañas se registran en `src/components/DashboardContainer.tsx` (switch `TabContent` + hook `useDashboardTab`).

### Huecos detectados

1. **Capitán**: `TeamLineup` (`src/types/fantasy.ts`) solo modela `formation` (portero, defensa, centrocampista, delantero y `coach?`). **No hay campo de capitán**. Hay que explorar la respuesta real de `/teams/{teamId}/lineup` (y `/lineup/week/{week}`) para localizar el campo (p. ej. `captainId`, `captain`, o una propiedad dentro de cada slot). El capitán solo existe en ligas con la feature premium `captain` (`league.config.premiumFeatures.captain`).
2. **Banquillo**: `TeamLineup` tampoco modela suplentes. La plantilla del equipo (`teamData.players`) contiene a todos los jugadores; el banquillo habrá que derivarlo (jugadores de la plantilla que no están en el once) o buscarlo en la respuesta del lineup.
3. **Predicción por equipo rival**: hoy se predice jugador a jugador solo del equipo propio. Para rivales hay que aplicar el mismo estimador sobre su plantilla y su once (que ya se descargan).
4. **Persistencia específica de predicciones por equipo**: el track record actual persiste predicciones *por jugador*; falta una serie *por equipo* (once completo + capitán + entrenador) por jornada.

## 3. Requisitos funcionales

- R1. Mostrar para **cada equipo de la liga** (propio y rivales): puntos esperados de la jornada (total del once), desglose por jugador, capitán marcado, entrenador y banquillo (si disponibles).
- R2. La predicción se **recalcula** cuando cambia la plantilla/once de un equipo (refresco bajo demanda y/o polling ligero durante la jornada).
- R3. **Persistir** la predicción de cada equipo y jornada (primera escritura de la jornada gana, honestidad walk-forward como en `track-record.ts`).
- R4. Vista **clasificación por puntos**: ranking de equipos según puntos predichos (y comparación con puntos reales una vez liquidada la jornada).
- R5. Vista **por jornadas**: evolución del equipo propio (y opcional de rivales) jornada a jornada; gráfico con Recharts (ya en el stack).
- R6. Degradación graciosa: si la API no expone capitán/banquillo/entrenador, la predicción se calcula con lo disponible y se anota en `dataQuality`.

## 4. Diseño propuesto

### 4.1 Modelo de datos

Nuevo fichero de tipos (o ampliar `src/types/analysis.ts`):

```ts
// src/types/analysis.ts (ampliación)
export interface TeamWeekPrediction {
  teamId: number;
  managerId: number;
  managerName: string;
  week: number;
  leagueId: string;
  recordedAt: string;          // ISO, primera escritura de la jornada
  modelVersion: string;        // reutilizar MODEL_VERSION
  // Once considerado (jugadores titulares), con su xP individual.
  starters: {
    playerId: string;
    nickname: string;
    positionId: number;
    xp: number;
    isCaptain: boolean;
  }[];
  coach: { playerId: string; nickname: string; xp: number } | null;
  bench: { playerId: string; nickname: string; positionId: number; xp: number }[] | null;
  totalXp: number;             // suma del once (capitán con multiplicador si aplica)
  captainEnabled: boolean;     // ¿la liga tiene capitán premium?
  dataQuality: 'high' | 'medium' | 'low'; // qué campos estaban disponibles
  actualPoints: number | null; // se rellena al liquidar la jornada
  settledAt: string | null;
}
```

> **Nota de producto**: el multiplicador de capitán (x2 en LALIGA FANTASY) solo se aplica si `captainEnabled` y la API expone el capitán real del rival. Si no, se calcula «sin capitán» y se indica en `dataQuality` (no inventar el capitán rival).

### 4.2 Endpoint propio

Nuevo endpoint `GET /api/puntuacion?leagueId=&teamId=` siguiendo el patrón de `src/pages/api/league-analysis.ts` (misma estructura: token → `Promise.all` de fetchs → análisis → caché en memoria 5 min):

1. Fetch oficial: `standing`, `week/current`, `calendar?weekNumber=`, `players` (catálogo), y `teams-master` (para enriquecer equipos).
2. Para **cada equipo de la liga** (con `withConcurrency`, reutilizando el helper): `leagues/{leagueId}/teams/{teamId}` (plantilla) y `teams/{teamId}/lineup/week/{week}` (once de la jornada). Reintentos para 403 transitorios, igual que `league-analysis.ts`.
3. Construir `estimatorContext` **igual** que en `league-analysis.ts` (para que la predicción sea coherente con el resto de la app).
4. Por cada equipo: `estimatePointsDetailed` por jugador del once (y suplentes/entrenador si procede), detectar capitán (ver §4.3), sumar `totalXp`.
5. Persistir (`persistTeamWeekPredictions`) y devolver: predicción de la jornada + histórico persistido + clasificación por puntos.

```ts
// src/pages/api/puntuacion.ts (esquema)
export const GET: APIRoute = async ({ url, cookies, session }) => {
  // validar params, token, caché 5 min
  // 1) datos base de la liga
  // 2) predictions = forEachTeam(standing) → once + estimatePointsDetailed
  // 3) persisted = await persistTeamWeekPredictions(week, records) // primera escritura gana
  // 4) history = await readTeamWeekPredictions(leagueId)
  // 5) response: { week, standings: [{ teamId, manager, totalXp, starters, captain, coach, bench, dataQuality, actualPoints }], history, generatedAt }
};
```

### 4.3 Detección de capitán y banquillo (paso previo obligatorio)

Antes de implementar, hacer **API discovery** (con las herramientas de `agent-docs/browser-automation/`) sobre:

- `GET /v1/competition/1/teams/{teamId}/lineup?x-lang=es`
- `GET /v1/competition/1/teams/{teamId}/lineup/week/{week}?x-lang=es`

Objetivo: localizar (a) el campo del capitán, (b) si la respuesta incluye banquillo/suplentes y (c) si incluye al entrenador. Decisiones de diseño según el hallazgo:

- **Capitán presente** → mapearlo a `isCaptain` en el registro y aplicar multiplicador (si la liga tiene la feature).
- **Capitán ausente** → `captainEnabled` se marca con la config de la liga pero sin capitán real de cada rival la predicción se calcula sin multiplicador (`dataQuality: 'low'` para ese equipo) y la UI muestra «capitán no disponible».
- **Banquillo ausente** → derivarlo de `teamData.players` menos el once (`bench = players - starters`); sin estimar a todos, solo los suplentes razonables (los del 18). Si ni siquiera hay once fiable, se estima sobre toda la plantilla con `starterInfo` (score de titularidad de `src/lib/analysis/starter-status.ts`).

### 4.4 Persistencia

Nuevo módulo `src/lib/engine/team-predictions.ts` reutilizando los helpers de `track-record.ts`:

```
data/track-record/team-predictions-w{week}.jsonl   // predicción por equipo y jornada (append-only, dedup por teamId)
data/track-record/team-predictions-metrics.json    // resumen para consulta externa (opcional)
```

- `persistTeamWeekPredictions(week, records)`: **primera escritura de la jornada gana** (mismo criterio honesto que `persistPredictions`).
- `settleTeamPredictions(currentWeek, resolveTeamOutcome)`: al cerrar la jornada, rellenar `actualPoints` con los puntos reales del equipo esa jornada (fuente: `standing/{week}` o la suma de `playerStats[].totalPoints` de los titulares, igual que hace `settleTrackRecord`). Esto permite medir la calidad de la predicción.
- `readTeamWeekPredictions(leagueId)`: histórico para la vista «por jornadas».

> Si se prefiere no tocar `data/track-record/`, se puede usar `data/team-predictions/`; se recomienda mantenerlo junto al track record por coherencia de liquidación.

### 4.5 UI

Nueva pestaña registrada en `DashboardContainer.tsx` (`case 'puntuacion'`) y componente `src/components/dashboard/PuntuacionTab.tsx`:

- **Cabecera**: jornada actual, fecha de la predicción, `dataQuality` global, botón «Actualizar».
- **Clasificación por puntos** (R4): tabla/cards por equipo ordenadas por `totalXp` desc:
  - Escudo o avatar del manager, nombre, `totalXp` (grande), once resumido (11 chips con xP, capitán con corona/«C»), entrenador y nº de suplentes.
  - Badge de estado: `predicción` vs `real` cuando la jornada esté liquidada (comparativa `totalXp` vs `actualPoints`).
- **Evolución por jornadas** (R5): gráfico de líneas Recharts con el histórico del equipo propio (y selector para rivales), marcando jornadas liquidadas (puntos reales) frente a pendientes (predicción).
- **Desglose por jugador**: expansión por equipo mostrando `starters` con su xP individual (reutilizar `PlayerRow`/`PlayerAvatar` de `src/components/shared/`).
- Estados: `LoadingSection`/`Skeleton` y `ErrorState` (ya en `shared/`). Refresco con `refetchInterval` bajo durante la jornada (p. ej. 5 min) y manual.

## 5. Fases de implementación

| Fase | Tarea | Verificación |
|------|-------|--------------|
| 0 | API discovery de capitán/banquillo/entrenador en `lineup` (browser-automation) | Nota en `agent-docs/useful-docs/api-endpoints.md` |
| 1 | Ampliar tipos (`TeamWeekPrediction`, captain en `TeamLineup` si procede) | `pnpm typecheck` |
| 2 | `src/lib/engine/team-predictions.ts` (persistir, leer, liquidar) | Test unitario de dedup + liquidación |
| 3 | `src/pages/api/puntuacion.ts` (endpoint + caché + contexto estimador) | Test del endpoint con token de dev |
| 4 | `PuntuacionTab.tsx` + registro en `DashboardContainer` | E2E Playwright: la pestaña carga con 1+ equipos |
| 5 | Gráfico de evolución por jornadas | Revisión visual + snapshot |

## 6. Riesgos y mitigaciones

- **La API no expone capitán/banquillo rival** → la funcionalidad no bloquea: predicción sin multiplicador + `dataQuality`; se habilita cuando el discovery lo confirme. Documentar en la UI («predicción sin capitán»).
- **Coste de llamadas** (plantilla + once de N rivales) → concurrencia limitada (5), reintentos, caché en memoria 5 min y `fetchWithRetry` como en `league-analysis.ts`. El coste es idéntico al de la pestaña Rivales ya existente.
- **Saturación durante la jornada** (refrescos) → caché de endpoint + refresco manual primario y polling conservador.
- **Comparativa injusta entre equipos con/sin capitán** → nunca mezclar: la clasificación se ordena por `totalXp` calculado de forma homogénea (misma regla para todos) y la UI indica qué campos se usaron por equipo.

## 7. Validación

- `pnpm typecheck` y `pnpm lint` sin errores nuevos.
- Test unitario: persistencia dedup (misma jornada+equipo no se sobrescribe), liquidación con `actualPoints`.
- Test del endpoint: respuesta con `standings` de todos los equipos y `history` no vacío tras 2 semanas simuladas.
- E2E Playwright: navegar a la pestaña, ver clasificación y gráfico; comparar predicción vs real en una jornada liquidada.
