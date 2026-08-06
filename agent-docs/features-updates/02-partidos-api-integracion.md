# 02 — Sección «Partidos»: integración de API de partidos por jornada

> **Funcionalidad**: crear una sección «Partidos» que muestre los partidos de la jornada (pendientes, en juego y jugados) de forma atractiva: **escudos de los equipos, iconos de tarjetas/expulsiones/cambios, contador de tiempo personalizado**, etc. Este documento cubre la investigación de la API, la arquitectura de datos y la base sobre la que se construyen las vistas (docs 03, 04 y 05).

---

## 1. Objetivo

Disponer de una fuente de datos de partidos por jornada que permita:

1. Listar los partidos de la jornada con estado (**pendiente / en juego / jugado**).
2. Resultado en vivo, minuto y parte del partido (1ª parte, descanso, 2ª parte).
3. Incidencias: goles (jugador + minuto), tarjetas, expulsiones y cambios.
4. Alineaciones confirmadas (para el detalle, doc 05).
5. Identificar en qué partidos participan jugadores de nuestra plantilla (doc 03).

## 2. Investigación de APIs (resumen comparativo)

| Proveedor | Gratuito | En vivo | Alineaciones | Incidencias | Observación |
|---|---|---|---|---|---|
| **SofaScore (endpoints públicos)** | Sí (no oficial) | Sí, muy rápido | Sí | Sí (timeline completa) | Ya integrado en el proyecto (`src/lib/engine/sources/sofascore.ts`) con caché y curl (Cloudflare bloquea el fetch de Node). Sin coste. |
| **API-Football (API-Sports)** | 100 req/día | ~15 s | Sí | Sí | Límite diario muy bajo; no apto para polling en vivo de una temporada completa. |
| **football-data.org** | 10 req/min | No en free (resultados con retraso) | No en free | Parcial | El plan gratis no sirve para «en vivo» real. |
| **Highlightly** | 100 req/día | Sí | Sí | Sí | Alternativa, mismo límite bajo. |
| **Sportmonks** | Solo 2 ligas | Sí | Sí | Sí | Free irrelevante para LaLiga. |

### Recomendación

**Extender el adaptador SofaScore ya existente** (fuente primaria). Razones:

- El proyecto ya descubre temporada, eventos y alineaciones de Sofascore (`sofascore.ts`, caché en `data/cache/sources/sofa-*.txt`), con la infraestructura de descarga vía curl y degradación graciosa resuelta.
- Proporciona en vivo, incidencias, alineaciones y escudos **sin coste** y con calidad líder.
- Mantener el patrón de adaptadores (`src/lib/engine/sources/`) aísla el cambio si Sofascore altera sus endpoints.

**Fuente secundaria (fallback de calendario y escudos)**: la API oficial de LALIGA FANTASY ya expone el calendario de la jornada (`GET /v1/competition/1/calendar?weekNumber=`, mapeado en `getCalendar`) con `localId`/`visitorId`, `matchState` y resultado; y `GET /v3/teams-master` para escudos/nombres (`src/lib/fantasy/teams.ts`). Se usa para validar que la jornada de Sofascore coincide con la jornada fantasy (los partidos deben mostrarse de la jornada que puntúa).

> ⚠️ **Términos de uso**: el uso de los endpoints públicos de Sofascore es scraping no oficial. Para un proyecto **pendiente de publicación** conviene revisar los términos antes del lanzamiento; la arquitectura aísla el adaptador para poder cambiar a API-Football/Highlightly con coste económico en una sola capa.

## 3. Endpoints de Sofascore a integrar

Basado en el adaptador existente (`BASE_URL = https://www.sofascore.com/api/v1`, torneo `unique-tournament/8` = LaLiga, temporada descubierta por `currentSeasonId()`):

| Endpoint | Uso | TTL sugerido |
|---|---|---|
| `/unique-tournament/8/season/{seasonId}/events/next/0` | Eventos próximos (ya usado) | 15 min |
| `/unique-tournament/8/season/{seasonId}/events/round/{round}` | Todos los eventos de una ronda (jornada completa, con `status`, `homeScore`/`awayScore`, `startTimestamp`) | 60 s en vivo |
| `/event/{eventId}` | Detalle: estado, minuto, parte, árbitro, estadio | 30–60 s en vivo |
| `/event/{eventId}/incidents` | Goles, tarjetas, expulsiones, cambios, VAR (timeline) | 30–60 s en vivo |
| `/event/{eventId}/lineups` | Alineaciones confirmadas (ya usado) | 15 min |
| `/event/{eventId}/statistics` | Estadísticas (posesión, tiros…) para el detalle | 60 s en vivo |
| `/team/{teamId}/image` | Escudo del equipo | 7 días (caché inmutable) |

Campos relevantes del payload (verificado en `data/cache/sources/sofa-events-next-97268.txt`):

- `roundInfo.round` → jornada real de Sofascore.
- `status.code` / `status.description` / `status.displayed.minute` → estado y tiempo (p. ej. `"Halftime"`, `"2nd half"`, `minute: "56'"`).
- `homeScore.current` / `awayScore.current` → resultado actual.
- `startTimestamp` → hora de inicio (para contador y para el cálculo de minuto personalizado).
- `homeTeam` / `awayTeam`: `{ id, name, shortName, slug, nameCode }`.
- En `incidents`: `incidentType` (`goal`, `card`, `substitution`, `period`, …), `player.name`, `minute`, `time`, `reversedHomeAway` para normalizar local/visitante.

## 4. Arquitectura propuesta

### 4.1 Capa de datos

1. **Nuevo adaptador** `src/lib/engine/sources/sofascore-events.ts` (no tocar `sofascore.ts` para no romper las alineaciones ya consumidas por el motor). Reutiliza `fetchTextWithCache` y `curlFetch` (Cloudflare).
   - `fetchMatchdayEvents(seasonId, round)`: eventos de la jornada.
   - `fetchEventIncidents(eventId)`, `fetchEventLineups(eventId)`, `fetchTeamImage(teamId)`.
   - Normaliza a tipos propios (DTO) y **nunca lanza**: devuelve `null`/vacío y `dataQuality`.
2. **Tipos propios** `src/types/matches.ts`:

```ts
export type MatchPhase = 'pending' | 'live' | 'finished';
export type MatchPeriod = 'not_started' | 'first_half' | 'halftime' | 'second_half' | 'finished' | 'extra_time' | 'penalties';

export interface MatchEvent {              // no confundir con incident; es el partido
  eventId: number;
  round: number;
  phase: MatchPhase;
  period: MatchPeriod;
  minute: number | null;                   // minuto mostrado (null si no empezado)
  home: { teamId: number; name: string; shortName: string; score: number | null };
  away: { teamId: number; name: string; shortName: string; score: number | null };
  startTimestamp: number;
  homeShieldUrl?: string;
  awayShieldUrl?: string;
}

export interface MatchIncident {
  id: string;
  eventId: number;
  type: 'goal' | 'own_goal' | 'penalty_goal' | 'yellow_card' | 'red_card' | 'substitution' | 'var' | 'period';
  teamSide: 'home' | 'away';
  playerName: string | null;
  minute: number;
  detail?: string;                          // p. ej. "penalti fallado", "2ª amarilla"
  substitution?: { in: string; out: string };
}

export interface MatchDetail extends MatchEvent {
  incidents: MatchIncident[];
  lineups: { teamSide: 'home' | 'away'; confirmed: boolean; formation: string | null;
             starters: { name: string; shirtNumber: number | null }[];
             bench: { name: string; shirtNumber: number | null }[]; coach: string | null }[];
  stadium?: string | null;
  referee?: string | null;
}
```

3. **Cache y rate limit**: cada endpoint con su TTL (tabla anterior). El `fetchTextWithCache` ya sirve `origin: stale` si la red falla (en vivo conviene TTL cortos pero tolerancia a fallos: si `incidents` falla, la tarjeta se muestra sin timeline).

### 4.2 Endpoint propio

Nuevo endpoint `GET /api/matches?week={n}` (patrón `league-analysis.ts`):

1. `week/current` de la API oficial para resolver la jornada fantasy.
2. `calendar?weekNumber=` oficial para cruzar partidos (IDs de equipos fantasy) con los eventos de Sofascore (match por nombre de equipo con `buildTeamMatcher` de `src/lib/engine/team-names.ts`). Así el partido queda enlazado a `localId`/`visitorId` fantasy (necesario para el doc 03: «¿juega un jugador de mi plantilla?»).
3. `events/round/{round}` de Sofascore + `incidents` para los partidos en juego (o todos, con caché).
4. Enriquecer con escudos (`/team/{id}/image` vía proxy de imágenes o URL absoluta) y responder.

```ts
// src/pages/api/matches.ts (esquema)
export const GET: APIRoute = async ({ url, cookies, session }) => {
  // token, week (default: current)
  // calendar = fetchOfficialAPI(calendar?weekNumber=week)
  // events = fetchMatchdayEvents(season, round)   // round = week
  // merged = mergeCalendarWithEvents(calendar, events)  // team-names matcher
  // live = events.filter(live).map(fetchIncidents) // con Promise.all limitado
  // return { week, generatedAt, matches: merged }
};
```

> **Proxy de imágenes**: los escudos pueden servirse como URL absoluta de Sofascore o bien cachearse y servirse por el propio backend (`/api/team-image?teamId=` con caché 7 días) para evitar dependencias en el cliente. Recomendado: URL absoluta al principio (simplicidad), proxy de imagen si hay problemas de CORS o rendimiento.

### 4.3 UI base (vista general)

- Nueva pestaña `partidos` en `DashboardContainer.tsx` → `src/components/dashboard/PartidosTab.tsx`.
- **Tabs de estado**: «Pendientes / En juego / Jugados» con contadores; dentro, grupos por día.
- **En vivo**: `refetchInterval` de React Query (p. ej. 30–60 s) solo mientras haya partidos `live`; al terminar todos, parar el polling.
- **Contador de tiempo personalizado**: si `status.displayed.minute` no está disponible, calcularlo en el cliente como `minuto = floor((now - startTimestamp) / 60_000)` con animación (tic por segundo) usando el `startTimestamp` del evento — de ahí lo de «contador personalizado».
- **Iconos**: `lucide-react` (ya en el proyecto) para tarjetas (amarilla/roja), cambios (flechas ↑↓), expulsiones (roja), goles (balón ⚽).
- Estados de carga/error con `shared/LoadingSection`, `shared/ErrorState` y skeletons (componentes existentes).

### 4.4 Fases de implementación

| Fase | Tarea | Verificación |
|------|-------|--------------|
| 1 | Descubrir y documentar el shape real de `events/round`, `incidents` y `event/{id}` (browser-automation) | Nota en `agent-docs/useful-docs/api-reference.md` |
| 2 | Tipos `src/types/matches.ts` + adaptador `sofascore-events.ts` (normalización y degradación) | Test unitario con fixtures del caché |
| 3 | Endpoint `/api/matches` + cruce con calendario oficial (team-names matcher) | Test del endpoint |
| 4 | `PartidosTab.tsx` con tabs pendientes/en juego/jugados y polling | E2E Playwright |
| 5 | Escudos + contador de tiempo + microinteracciones | Revisión visual |

## 5. Riesgos y mitigaciones

- **Sofascore cambia el shape / bloquea** → adaptador aislado; degradación a calendario oficial (sin en vivo). Revisar términos antes de publicar.
- **Rate limits en vivo** → TTL por endpoint, `Promise.all` con límite de concurrencia, un solo endpoint de orquestación que cachea.
- **Desfase jornada Sofascore vs fantasy** → el cruce con `calendar` oficial es la fuente de verdad de «qué partidos puntúan»; los eventos de Sofascore que no cuadren se marcan como auxiliares.
- **Polling pesado** → solo se pollea mientras hay `live`; el servidor cachea (memoria + disco) y el cliente no vuelve a pedir datos ya frescos.

## 6. Validación

- `pnpm typecheck` y `pnpm lint`.
- Test unitario del adaptador con fixtures reales de `data/cache/sources/sofa-*.txt`.
- Test del endpoint `/api/matches` (con y sin partidos en vivo).
- E2E: la pestaña muestra pendientes/en juego/jugados con resultado y minuto; el polling se detiene al finalizar la jornada.
