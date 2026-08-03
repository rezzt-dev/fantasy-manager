# Endpoints de la API de LALIGA FANTASY

Última actualización: 2026-07-31

## Base y configuración

- **Base URL:** `https://fantasy-api.llt-services.com`
- **Path base API:** `/api`
- **Competición por defecto:** `1` (LaLiga EA Sports)
- **Prefijo competición:** `CMP = /api/v1/competition/1`
- **Idioma:** añadir `?x-lang=es` a todas las peticiones.
- **Headers comunes:**
  - `Authorization: Bearer <token>`
  - `x-app: 2` (o el valor que use la app oficial)
  - `x-lang: es`
  - `Content-Type: application/json` (solo cuando haya body)

## Endpoints por categoría

### Usuario
- `GET /api/v4/user/me?x-lang=es`
  - Devuelve el usuario actual con `id`, `userId`, `managerId`, etc.
  - Sirve para validar el token y obtener el ID numérico real del manager.

### Ligas
- `GET /api/v1/competition/1/leagues?x-lang=es`
  - Lista las ligas en las que participa el usuario.
  - Respuesta envuelta: `response.data.elements` o `response.data.leagues`.
  - Cada elemento: `{ id, name, ... }`.

- `GET /api/v1/competition/1/leagues/{leagueId}/standing?x-lang=es`
  - Clasificación de la liga y datos de todos los equipos.
  - Permite identificar el `teamId` del usuario comparando `manager.id` o `userId`.

- `GET /api/v1/competition/1/leagues/{leagueId}/standing/{week}?x-lang=es`
  - Clasificación por jornada concreta.

- `GET /api/v1/competition/1/leagues/{leagueId}/activity/{index}?x-lang=es`
  - Actividad reciente de la liga (página por índice).

### Equipos / Plantillas
- `GET /api/v1/competition/1/leagues/{leagueId}/teams/{teamId}?x-lang=es`
  - Plantilla completa de un equipo.
  - Datos clave: jugadores, posiciones, valores de mercado, puntos, medias, estado, cláusulas, blindajes, manager.

- `GET /api/v1/competition/1/teams/{teamId}/money?x-lang=es`
  - **Dinero en efectivo** del equipo.
  - La respuesta puede ser un número plano o un objeto `{ teamMoney, money }`.
  - Ver función `readTeamMoney()` en LaLigaApp para normalizar.

- `GET /api/v1/competition/1/teams/{teamId}/lineup?x-lang=es`
  - Alineación actual del equipo.

- `GET /api/v1/competition/1/teams/{teamId}/lineup/week/{week}?x-lang=es`
  - Alineación de una jornada específica.

### Mercado
- `GET /api/v1/competition/1/league/{leagueId}/market?x-lang=es`
  - Mercado de la liga: jugadores en venta, ofertas, pujas, propietarios, precios, fechas de expiración.

- `GET /api/v1/competition/1/league/{leagueId}/playerTeam/{playerTeamId}/offer?x-lang=es`
  - Ofertas sobre un jugador concreto de un equipo.

- `POST /api/v1/competition/1/league/{leagueId}/market/{marketId}/bid?x-lang=es`
  - Body: `{ money: <cantidad> }`
  - Realizar una puja.

- `DELETE /api/v1/competition/1/league/{leagueId}/market/{marketId}/bid/{bidId}/cancel?x-lang=es`
  - Cancelar puja.

- `PUT /api/v1/competition/1/league/{leagueId}/market/{marketId}/bid/{bidId}?x-lang=es`
  - Body: `{ money: <cantidad> }`
  - Modificar puja.

- `POST /api/v1/competition/1/league/{leagueId}/market/{marketId}/offer/{offerId}/accept?x-lang=es`
  - Body: `{ offerMoney: <cantidad> }`
  - Aceptar oferta.

- `POST /api/v1/competition/1/league/{leagueId}/market/{marketId}/offer/{offerId}/reject?x-lang=es`
  - Rechazar oferta (sin body ni Content-Type).

- `POST /api/v1/competition/1/league/{leagueId}/market/sell?x-lang=es`
  - Body: `{ playerId, salePrice }`
  - Poner jugador en venta.

- `DELETE /api/v1/competition/1/league/{leagueId}/market/{marketId}/delete?x-lang=es`
  - Retirar jugador del mercado.

### Cláusulas y blindaje
- `PUT /api/v1/competition/1/league/{leagueId}/buyout/player?x-lang=es`
  - Body: `{ playerId, factor, valueToIncrease }`
  - Subir cláusula de compra.

- `POST /api/v1/competition/1/league/{leagueId}/buyout/{playerId}/pay`
  - Body: `{ buyoutClauseToPay }`
  - Pagar cláusula de un jugador.

- `GET /api/v1/competition/1/league/{leagueId}/player-team/{playerTeamId}/check-shield?x-lang=es`
  - Verificar estado de blindaje.

- `PUT /api/v1/competition/1/league/{leagueId}/shield/player?x-lang=es`
  - Body: `{ playerId, rewardedAdType: "Blindaje", rewardedAd: 1 }`
  - Blindar jugador.

### Jugadores / Catálogo
- `GET /api/v1/competition/1/players?x-lang=es`
  - Catálogo maestro de jugadores de LaLiga.
  - Datos: nombre, nickname, posición, equipo, valor, puntos, media, estado, foto.
  - En 2026/27 es `/v6/players` en el servidor; LaLigaApp normaliza con `responseAdapters`.

- `GET /api/v1/competition/1/player/{playerId}/league/{leagueId}?x-lang=es`
  - Detalle de un jugador dentro de una liga concreta.

- `GET /api/v3/teams-master?x-lang=es`
  - Mapeo de IDs de equipos a nombres, nombres cortos, slugs, escudos.
  - Devuelve array plano en 2026/27.

### Calendario / Jornadas
- `GET /api/v1/competition/1/calendar?weekNumber={n}&x-lang=es`
  - Partidos de una jornada. En 2026/27 devuelve `localId`/`visitorId` en lugar de objetos embebidos.

- `GET /api/v1/competition/1/week/current?x-lang=es`
  - Jornada actual.

### Estadísticas de partidos
- `GET /stats/v1/competition/1/stats/week/{weekNumber}?x-lang=es`
  - Estadísticas oficiales por jornada (xG, posesión, etc.).
  - Va por un path especial `/stats` en el proxy, no por `/api`.

### Formaciones
- `GET /api/v4/teams/lineup/formations?option=free&x-lang=es`
  - Formaciones gratuitas permitidas.

- `GET /api/v4/teams/lineup/formations?option=premium&x-lang=es`
  - Formaciones premium.

- `GET /api/v4/leagues/premium-configuration?x-lang=es`
  - Configuración premium de la liga.

## Adaptaciones de respuesta (temporada 2026/27)

La API cambia shapes con frecuencia. Implementar en `src/lib/adapters.ts`:

- `adaptLeaguesResponse`: desenvolver `data.elements` o `data.leagues` a array plano.
- `adaptPlayersResponse`: enriquecer jugadores con `teams-master` (añadir `team.name`, `team.shortName`, `team.slug`, `team.badgeColor`).
- `adaptStandingResponse`: normalizar `team.teamPoints`, `team.teamValue`, `team.weekPoints`.
- `adaptCalendarResponse`: resolver `localId`/`visitorId` contra el mapa de equipos.
- `readTeamMoney`: manejar respuesta como número, `{ teamMoney }` o `{ money }`.

## Cálculo de dinero real para pujas

```
efectivo           = GET /teams/{teamId}/money
valor_plantilla    = suma(valor_mercado de cada jugador de tu equipo)
bono_20_plantilla  = floor(valor_plantilla * 0.20)
pujas_pendientes   = suma de tus pujas activas en el mercado
dinero_para_pujas  = efectivo + bono_20_plantilla - pujas_pendientes
```

Este es el valor que debe usar el motor de recomendaciones para compras y pujas.

## Notas importantes

- Todos los endpoints requieren token Bearer válido.
- El token caduca aproximadamente cada 24 horas.
- No realizar llamadas masivas ni automatizadas; respetar rate limits.
- Las llamadas deben ir siempre a través de un proxy backend propio para evitar CORS.
