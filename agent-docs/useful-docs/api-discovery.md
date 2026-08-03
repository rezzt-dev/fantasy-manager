# Descubrimiento de la API de LALIGA FANTASY

> Fecha de última actualización: 2026-07-31  
> Proyecto: `fantasy-manager` en `/home/rezzt/personal-data/develop-projects/fantasy-manager`

## Estado actual

- El usuario ha creado una liga privada: `princesos` (`id`: `017833924`).
- El login funciona mediante el flujo **ROPC de Azure B2C** y también mediante el login de dos pasos `/login/v3/email/*`.
- Hay dos APIs dominantes:
  - `https://fantasy-api.llt-services.com` (usada por la app móvil/actual)
  - `https://api-fantasy.llt-services.com` (usada históricamente por la web de Relevo)
- El token **ROPC** funciona para `fantasy-api.llt-services.com`:
  - `/api/v4/user/me` ✅
  - `/api/v1/competition/1/leagues` ✅
  - `/api/v1/competition/1/players` ✅
  - `/api/v1/competition/1/week/current` ✅
  - `/api/v1/competition/1/league/{league_id}/market` ✅
- El token **v3** (`/login/v3/email/token`) también funciona para `/api/v4/user/me` en `fantasy-api.llt-services.com`, pero los endpoints `/api/v3/*` devuelven `500`.
- El token **v3** no funciona para `api-fantasy.llt-services.com` (devuelve `401`). Probablemente falta el **token de sesión web** (`fz-accessToken` de `localStorage` de `fanslaliga.laliga.com`), que es el que usan los repositorios guía para endpoints `/api/v3/*`.

## Autenticación

### Opción A: ROPC (Azure B2C) — funciona ahora

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

### Opción B: Login de dos pasos (v3) — funciona, mismo dominio que ROPC

```bash
# 1. Obtener code
curl -s -X POST "https://api-fantasy.llt-services.com/login/v3/email/auth" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "policy=B2C_1A_ResourceOwnerv2" \
  -d "username=<EMAIL>" \
  -d "password=<PASSWORD>"

# 2. Intercambiar code por access_token
curl -s -X POST "https://api-fantasy.llt-services.com/login/v3/email/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "code=<CODE>" \
  -d "policy=B2C_1A_ResourceOwnerv2"
```

Este token v3 **también funciona** para `fantasy-api.llt-services.com/api/v4/user/me`, pero **no** para `api-fantasy.llt-services.com/api/v3/*`.

### Opción C: Token de sesión web (necesario para `/api/v3/*` en `api-fantasy.llt-services.com`)

El token está en `localStorage` de la web de Relevo (`https://fanslaliga.laliga.com` / `https://fantasy.laliga.com`) bajo la clave `fz-accessToken`.

Para obtenerlo:

1. Abre la web de LALIGA FANTASY en el navegador.
2. Inicia sesión con tu cuenta (Google o email).
3. Abre las herramientas de desarrollo (F12) → Consola.
4. Escribe:
   ```js
   localStorage.getItem('fz-accessToken')
   ```
5. Copia el valor (es un string largo, no un JWT).
6. Pégalo en un fichero, por ejemplo `agent-docs/useful-docs/web-session-token.txt`.

Con ese token y los headers de la web (`X-App: Fantasy-web`, `Origin: https://fantasy.laliga.com`, etc.) los endpoints `/api/v3/*` deberían funcionar.

## Headers obligatorios para la API

Con token ROPC/v3 en `fantasy-api.llt-services.com`:

```text
Authorization: Bearer <token>
x-app: 2
x-lang: es
```

Con token web en `api-fantasy.llt-services.com` (según repositorios guía):

```text
Authorization: Bearer <fz-accessToken>
X-App: Fantasy-web
X-Lang: es
Origin: https://fantasy.laliga.com
Referer: https://fantasy.laliga.com/
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...
```

## Variables de entorno importantes

| Variable | Valor / uso |
|----------|---------------|
| `LALIGA_FANTASY_TOKEN` | JWT de acceso (ROPC o v3) |
| `LALIGA_FANTASY_REFRESH_TOKEN` | JWT de refresco (ROPC) |
| `LALIGA_CLIENT_ID` | `af88bcff-1157-40a0-b579-030728aacf0b` |
| `LALIGA_AUTH_BASE_URL` | `https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token` |
| `COMPETITION_ID` | `1` (LaLiga EA Sports) |
| `PROXY_FANTASY_TARGET` | `https://fantasy-api.llt-services.com` |

## Endpoints probados y resultados

### Usuario

| Endpoint | Dominio | Estado | Nota |
|----------|---------|--------|------|
| `GET /api/v4/user/me` | fantasy-api | ✅ 200 | Devuelve `id`, `managerName`, `region`. |

### Ligas

| Endpoint | Dominio | Estado | Nota |
|----------|---------|--------|------|
| `GET /api/v1/competition/1/leagues` | fantasy-api | ✅ 200 | Devuelve las ligas del usuario. |
| `GET /api/v4/leagues` | fantasy-api | ❌ 500 | No funciona con este token. |
| `GET /api/v3/leagues` | api-fantasy | ❌ 401 | Requiere token web. |

### Jugadores (catálogo)

| Endpoint | Dominio | Estado | Nota |
|----------|---------|--------|------|
| `GET /api/v1/competition/1/players` | fantasy-api | ✅ 200 | Catálogo global con `marketValue`, `positionId`, etc. |

### Mercado

| Endpoint | Dominio | Estado | Nota |
|----------|---------|--------|------|
| `GET /api/v1/competition/1/league/{league_id}/market` | fantasy-api | ✅ 200 | Lista de jugadores en venta en la liga. |
| `GET /api/v3/league/{league_id}/market` | api-fantasy | ❌ 401 | Requiere token web. |

### Equipo / plantilla / alineación

| Endpoint | Dominio | Estado | Nota |
|----------|---------|--------|------|
| Varios intentos con `/team/{id}`, `/league/{id}/team/...`, `/competition/1/league/{id}/team/...` | fantasy-api | ❌ 404 | No se ha encontrado el endpoint correcto. |
| `GET /api/v3/leagues/{league_id}/teams/{manager_id}` | api-fantasy | ❌ 401 | Requiere token web (según repositorios). |

### Jornada

| Endpoint | Dominio | Estado | Nota |
|----------|---------|--------|------|
| `GET /api/v1/competition/1/week/current` | fantasy-api | ✅ 200 | Jornada 1, no iniciada. |

### Clasificación / ranking

| Endpoint | Dominio | Estado | Nota |
|----------|---------|--------|------|
| Varios intentos | fantasy-api / api-fantasy | ❌ 404/401 | Pendiente de descubrir. |

### Valor histórico de mercado

| Endpoint | Dominio | Estado | Nota |
|----------|---------|--------|------|
| `GET /api/v3/player/{player_id}/market-value` | api-fantasy | ✅ 200 | No requiere auth. Devuelve histórico de valor. |

## Datos de la liga del usuario

```json
{
  "id": "017833924",
  "access": "private",
  "name": "princesos",
  "token": "ahpqsjnm",
  "premium": false,
  "team": {
    "id": 37390189,
    "money": 100000000,
    "teamPoints": 0,
    "playersNumber": 14,
    "teamValue": 133827682,
    "canPunctuate": true,
    "position": null,
    "isAdmin": true
  }
}
```

## Nota importante sobre el formato de IDs

El endpoint de mercado solo funcionó con el ID de liga tal cual viene en `/api/v1/competition/1/leagues`: `017833924` (con ceros a la izquierda). Con el ID numérico `7833924` devolvió `404`.

## Siguientes pasos

1. **Obtener token web** (`fz-accessToken`) para poder probar `/api/v3/*` en `api-fantasy.llt-services.com`.
2. Descubrir endpoints de:
   - plantilla del usuario (`/api/v3/leagues/{id}/teams/{id}` o similar),
   - alineación,
   - clasificación,
   - pujas y ofertas.
3. Inicializar el proyecto Astro + React + pnpm.
4. Crear proxy con el token ROPC/v3 (más estable) y, si es posible, token web.
5. Implementar motor de recomendaciones usando:
   - jugadores propios,
   - dinero disponible (`team.money`),
   - valor del equipo (`team.teamValue`),
   - mercado actual,
   - estadísticas de jugadores y calendario.

## Referencias externas

- `https://github.com/carlosgeos/laligafantasy` (usado como referencia de endpoints `/api/v3/*`).
- `https://github.com/alxgarci/marca-fantasy-api-scraper-updated` (usado como referencia de endpoints y headers web).
- `https://api-contenthub.laliga.com/`
- `https://www.futbolfantasy.com/`
- `https://www.futbolfantasy.com/analytics`
