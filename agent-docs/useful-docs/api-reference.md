# API de LALIGA FANTASY — Referencia técnica para `fantasy-manager`

> Fecha de última actualización: 2026-07-31  
> Proyecto: `fantasy-manager` en `/home/rezzt/personal-data/develop-projects/fantasy-manager`  
> Base URL: `https://fantasy-api.llt-services.com`  
> Competición: `1` (LaLiga EA Sports)  
> Usuario de prueba: `nicotiza fc` (`id: 11789333`), liga `princesos` (`id: 017833924`), equipo `37390189`

## Descubrimiento clave

El repositorio más completo y actual encontrado es **Externoak/LaLigaApp** (`https://github.com/Externoak/LaLigaApp`). Es una aplicación de escritorio React/Electron para gestionar LaLiga Fantasy y contiene los endpoints exactos de la temporada 2026/27, que usan el host `fantasy-api.llt-services.com` con prefijo `/api/v1/competition/1`.

Los repositorios anteriores (`carlosgeos/laligafantasy`, `alxgarci/marca-fantasy-api-scraper-updated`) usan el host antiguo `api-fantasy.llt-services.com` y endpoints `/api/v3/*` que ya no funcionan con la autenticación actual.

## Autenticación válida (app nativa / API oficial)

### Flujo ROPC (Resource Owner Password Credentials) de Azure B2C

```bash
curl -s -X POST \
  "https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_ResourceOwnerv2" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=af88bcff-1157-40a0-b579-030728aacf0b" \
  -d "scope=openid+af88bcff-1157-40a0-b579-030728aacf0b+offline_access" \
  -d "redirect_uri=authredirect%3A%2F%2Fcom.lfp.laligafantasy" \
  -d "response_type=id_token" \
  -d "username=<EMAIL>" \
  -d "password=<PASSWORD>"
```

Respuesta:

```json
{
  "access_token": "<JWT>",
  "refresh_token": "<JWT>",
  "id_token": "<JWT>",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

### Headers obligatorios para todas las llamadas

```text
Authorization: Bearer <access_token>
x-app: 2
x-lang: es
```

`x-app: 2` identifica la app nativa/móvil. Es imprescindible para que los endpoints acepten el token ROPC.

## Endpoints propios

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/proxy/{ruta-oficial}` | GET/POST/PUT/DELETE/PATCH | Proxy genérico hacia `https://fantasy-api.llt-services.com/api/{ruta-oficial}`. |
| `/api/auth/login` | POST | Login ROPC. Body: `{"username": "...", "password": "..."}`. Devuelve cookie `fantasy_tokens`. |
| `/api/auth/logout` | POST | Cierra sesión eliminando la cookie. |
| `/api/recommendations?leagueId={id}&teamId={id}` | GET | Genera recomendaciones para una liga y equipo. |
| `/api/league-analysis?leagueId={id}&teamId={id}` | GET | Análisis completo de la liga: plantillas rivales, agregados, riesgos, capitán y estadísticas. Cache de 5 minutos. |

## Endpoints confirmados y funcionando

Todos los endpoints oficiales usan `https://fantasy-api.llt-services.com/api` como base. `{CMP}` = `/v1/competition/1`.

### Usuario

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/v4/user/me?x-lang=es` | GET | Datos del usuario: `id`, `managerName`, `region`. |

### Ligas

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `{CMP}/leagues?x-lang=es` | GET | Lista de ligas del usuario. Cada liga incluye `team` con `id`, `money`, `teamValue`, `playersNumber`, `isAdmin`. |
| `{CMP}/leagues/{leagueId}/standing?x-lang=es` | GET | Clasificación general de la liga. |
| `{CMP}/leagues/{leagueId}/standing/{week}?x-lang=es` | GET | Clasificación de la liga para una jornada concreta. |
| `{CMP}/leagues/{leagueId}/activity/{index}?x-lang=es` | GET | Actividad/reciente de la liga (movimientos de mercado, etc.). |

### Equipo

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `{CMP}/leagues/{leagueId}/teams/{teamId}?x-lang=es` | GET | **Plantilla completa** del equipo: jugadores, cláusulas, estado, etc. |
| `{CMP}/teams/{teamId}/lineup?x-lang=es` | GET | Alineación actual del equipo. |
| `{CMP}/teams/{teamId}/lineup/week/{week}?x-lang=es` | GET | Alineación del equipo para una jornada concreta. |
| `{CMP}/teams/{teamId}/money?x-lang=es` | GET | Dinero disponible (`teamMoney`) e inversión (`teamInvestment`). |
| `/v4/teams/lineup/formations?option=free&x-lang=es` | GET | Formaciones gratuitas disponibles. |
| `/v4/teams/lineup/formations?option=premium&x-lang=es` | GET | Formaciones premium disponibles. |
| `/v4/leagues/premium-configuration?x-lang=es` | GET | Configuración premium de ligas. |

### Mercado

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `{CMP}/league/{leagueId}/market?x-lang=es` | GET | Jugadores en venta en el mercado de la liga. |
| `{CMP}/league/{leagueId}/market/{marketId}/bid?x-lang=es` | POST | Pujar por un jugador. Body: `{"money": N}`. |
| `{CMP}/league/{leagueId}/market/{marketId}/bid/{bidId}?x-lang=es` | PUT | Modificar una puja. Body: `{"money": N}`. |
| `{CMP}/league/{leagueId}/market/{marketId}/bid/{bidId}/cancel?x-lang=es` | DELETE | Cancelar una puja. |
| `{CMP}/league/{leagueId}/market/{marketId}/offer/{offerId}/accept?x-lang=es` | POST | Aceptar una oferta. Body: `{"offerMoney": N}`. |
| `{CMP}/league/{leagueId}/market/{marketId}/offer/{offerId}/reject?x-lang=es` | POST | Rechazar una oferta. |
| `{CMP}/league/{leagueId}/market/sell?x-lang=es` | POST | Vender un jugador al mercado. Body: `{"playerId": "...", "salePrice": N}`. |
| `{CMP}/league/{leagueId}/market/{marketId}/delete?x-lang=es` | DELETE | Retirar un jugador del mercado. |
| `{CMP}/league/{leagueId}/market/direct-offer?x-lang=es` | POST | Hacer una oferta directa a otro manager. Body: `{"playerId": "...", "money": N}`. |
| `{CMP}/league/{leagueId}/market/{marketId}/offer/{offerId}/cancel?x-lang=es` | DELETE | Cancelar una oferta directa. |
| `{CMP}/league/{leagueId}/playerTeam/{playerTeamId}/offer?x-lang=es` | GET | Ver ofertas sobre un jugador de tu equipo. |
| `{CMP}/league/{leagueId}/buyout/player?x-lang=es` | PUT | Subir cláusula de rescisión. Body: `{"factor": N, "playerId": "...", "valueToIncrease": N}`. |
| `{CMP}/league/{leagueId}/buyout/{playerId}/pay` | POST | Pagar cláusula de rescisión. Body: `{"buyoutClauseToPay": N}`. |
| `{CMP}/league/{leagueId}/player-team/{playerTeamId}/check-shield?x-lang=es` | GET | Verificar si un jugador puede blindarse. |
| `{CMP}/league/{leagueId}/shield/player?x-lang=es` | PUT | Blindar un jugador. Body: `{"playerId": "...", "rewardedAdType": "Blindaje", "rewardedAd": 1}`. |

### Jugadores y catálogo

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `{CMP}/players?x-lang=es` | GET | Catálogo completo de jugadores de la competición. |
| `{CMP}/player/{playerId}/league/{leagueId}?x-lang=es` | GET | Detalles de un jugador en el contexto de una liga. |

### Jornadas y calendario

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `{CMP}/week/current?x-lang=es` | GET | Jornada actual (número, estado, etc.). |
| `{CMP}/calendar?weekNumber={week}&x-lang=es` | GET | Partidos de una jornada. |
| `/stats/v1/competition/1/stats/week/{week}?x-lang=es` | GET | Estadísticas de partidos de una jornada (vía proxy, posiblemente otro dominio). |

## Notas importantes sobre rutas

- La ruta de **mercado** usa `league` (singular): `{CMP}/league/{leagueId}/market`.
- La ruta de **equipo en liga** usa `leagues` (plural): `{CMP}/leagues/{leagueId}/teams/{teamId}`.
- La ruta de **dinero** usa `teams` directamente: `{CMP}/teams/{teamId}/money`.
- La ruta de **alineación** usa `teams` directamente: `{CMP}/teams/{teamId}/lineup`.
- El ID de liga debe enviarse **con los ceros a la izquierda** tal como viene en `/leagues` (ej. `017833924`).

## Respuestas de ejemplo

### Dinero del equipo

```json
{
  "teamMoney": 100000000,
  "teamInvestment": 0
}
```

### Jugador en plantilla

Cada jugador en `{CMP}/leagues/{leagueId}/teams/{teamId}` tiene:

```json
{
  "buyoutClause": 11223623,
  "managerId": 11789333,
  "playerTeamId": "11858586",
  "buyoutClauseLockedEndTime": "2026-08-14T19:07:34+02:00",
  "isShielded": false,
  "manager": { "id": "11789333", "managerName": "nicotiza fc" },
  "playerMaster": {
    "id": "2613",
    "name": "Matías Dituro",
    "nickname": "M. Dituro",
    "slug": "matias-dituro",
    "positionId": 1,
    "playerStatus": "doubtful",
    "lastSeasonPoints": 137,
    "marketValue": 6734174,
    "team": { "id": "7", "name": "Elche CF" }
  }
}
```

### Mercado

Cada jugador en el mercado tiene:

```json
{
  "discr": "marketPlayerLeague",
  "id": "17365124",
  "salePrice": 53202270,
  "expirationDate": "2026-08-01T19:07:00+02:00",
  "status": "on_sale",
  "leagueType": "private",
  "leagueId": 7833924,
  "numberOfBids": 0,
  "playerMaster": {
    "id": "1611",
    "name": "José Bordalás",
    "positionId": 5,
    "marketValue": 53202270,
    "playerStatus": "ok"
  }
}
```

## Variables de entorno para el proyecto

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `LALIGA_FANTASY_TOKEN` | JWT | Token de acceso actual. Se renueva automáticamente con `refresh_token`. |
| `LALIGA_FANTASY_REFRESH_TOKEN` | JWT | Token de refresco. |
| `LALIGA_AUTH_BASE_URL` | `https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token` | Endpoint de login. |
| `LALIGA_CLIENT_ID` | `af88bcff-1157-40a0-b579-030728aacf0b` | Cliente de Azure B2C. |
| `COMPETITION_ID` | `1` | LaLiga EA Sports. |
| `PROXY_FANTASY_TARGET` | `https://fantasy-api.llt-services.com` | Destino del proxy. |
| `PROXY_BASE_PATH` | `/api` | Prefijo del proxy. |
| `APP_ALLOWED_ORIGINS` | `http://localhost:*` | Orígenes CORS en desarrollo. |

## Referencias

- `https://github.com/Externoak/LaLigaApp` — Repositorio principal con endpoints actualizados.
- `https://github.com/carlosgeos/laligafantasy` — Referencia histórica (endpoints v3 antiguos).
- `https://github.com/alxgarci/marca-fantasy-api-scraper-updated` — Referencia de scraping y endpoints antiguos.
- `https://api-contenthub.laliga.com/` — API de contenido/estadísticas de LaLiga (por investigar).
- `https://www.futbolfantasy.com/` y `/analytics` — Fuente para alineaciones probables y tendencias de mercado.
