# Notas de implementación — `fantasy-manager`

> Fecha de última actualización: 2026-07-31  
> Rama/estado: desarrollo local, pre-MVP

## Estado actual

- Proyecto Astro 7 + React 19 + Tailwind 3 + pnpm inicializado y compilando sin errores.
- Proxy genérico a `https://fantasy-api.llt-services.com/api` funcionando con token de respaldo desde `LALIGA_FANTASY_TOKEN`.
- Login ROPC contra Azure B2C implementado en `/api/auth/login`.
- Endpoint propio `/api/recommendations?leagueId=...&teamId=...` que orquesta llamadas a la API oficial y genera recomendaciones.
- Dashboard con selector de liga, resumen de equipo y panel de recomendaciones integrado.

## Datos de prueba del usuario

- Usuario: `nicotiza fc` (`id: 11789333`)
- Liga creada: `princesos` — `leagueId: 017833924`
- Equipo en esa liga: `teamId: 37390189`
- Dinero inicial: `100.000.000 €`
- Competición: `1` (LaLiga EA Sports)

## Comandos útiles

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev                 # http://localhost:4321

# Build de producción (standalone Node)
CI=true pnpm build

# Previsualizar build
pnpm preview
```

## Endpoints propios verificados

| Ruta | Descripción |
|------|-------------|
| `POST /api/auth/login` | Login email/password ROPC. Devuelve cookie `fantasy_tokens`. |
| `POST /api/auth/token` | Guarda un access token JWT en la cookie. Útil para cuentas creadas con Google. |
| `POST /api/auth/logout` | Borra la cookie de sesión. |
| `GET /api/proxy/{ruta-oficial}` | Proxy genérico. Reenvía cualquier ruta de la API oficial añadiendo auth y headers. |
| `GET /api/recommendations?leagueId=&teamId=` | Devuelve recomendaciones de compra, venta, alineación, cláusulas y capitán. |
| `GET /api/league-analysis?leagueId=&teamId=` | Análisis completo de la liga: plantillas rivales, agregados, riesgos de cláusula, capitán y estadísticas. Cache en servidor de 5 minutos. |

## Notas sobre autenticación

- El login ROPC (`/api/auth/login`) requiere que la cuenta tenga una contraseña **local** en el tenant Azure B2C de LALIGA.
- Si el usuario inició sesión únicamente con Google/Facebook/Apple, la cuenta no tiene esa contraseña local y el ROPC devolverá `access_denied`.
- La app web oficial usa un flujo diferente (authorization code / PKCE o similar) con otro `client_id` (`49715409-2718-42c4-9775-1cec7c50d3f3` en el token capturado).
- Para esas cuentas se puede usar `/api/auth/token` pegando el `access_token` que la web guarda en `localStorage` (`fz-accessToken`).
- El proxy y el endpoint de recomendaciones usan la cookie `fantasy_tokens` primero; si no existe, caen en `LALIGA_FANTASY_TOKEN` como respaldo de desarrollo.

## Notas sobre autenticación actual

- Se usa el sistema de **sesiones de Astro** (`Astro.session`) con driver `fs` para guardar el token en el servidor.
- La cookie que se envía al navegador es solo un ID de sesión pequeño, evitando problemas de tamaño con tokens JWT grandes.
- Todos los endpoints (login, token, logout, proxy, recommendations) leen el token de la sesión si está disponible.
- Si las sesiones no estuvieran disponibles, los endpoints caen a una cookie `fantasy_tokens` o a `LALIGA_FANTASY_TOKEN` como respaldo.
- El login ROPC por email/password sigue sin funcionar para cuentas federadas (Google). La alternativa es la pestaña “Token”.

## Problemas resueltos (actualizados)

1. **La variable `LALIGA_FANTASY_TOKEN` no se leía en desarrollo**
   - Astro 7 en dev usa `import.meta.env`, no `process.env`.
   - Se actualizó `src/lib/env.ts` para leer primero `import.meta.env` y luego `process.env`.

2. **Import relativo erróneo en `src/pages/api/recommendations.ts`**
   - El archivo está en `src/pages/api/`, por lo que para llegar a `src/lib/` se necesita `../../lib/...`, no `../../../lib/...`.
   - Esto provocaba `[UNRESOLVED_IMPORT]` en el build.

3. **Proxy apuntaba al path correcto**
   - El proxy reconstruye la URL como `${TARGET}/api/${path}${query}`, siendo `TARGET` `https://fantasy-api.llt-services.com`.

4. **`No QueryClient set` en el dashboard**
   - En Astro, cada `client:load` crea una isla React independiente. El contexto de React Query no cruza islas.
   - Se creó `src/components/DashboardClient.tsx` que envuelve `QueryProvider` + `DashboardContainer` y se usa como una única isla en `dashboard.astro`.

5. **Los botones de la interfaz no respondían (error de hidratación de React 19 + Vite)**
   - El navegador cargaba `react-dom/client.js` con el query string de cache de Vite, pero no encontraba `createRoot`.
   - Se bajó React de 19 a 18.3.1 y se añadió `vite.optimizeDeps.include` para `react`, `react-dom` y `react-dom/client`.
   - Se pasó `LoginForm` y `DashboardClient` a `client:only="react"` con un `slot="fallback"` mientras carga.
   - Se añadió un test de Playwright que verifica el flujo login por token → dashboard.

## Estructura actual de componentes clave

```
src/components/
├── auth/LoginForm.tsx
├── DashboardContainer.tsx                # Selector de liga + carga de datos
├── league/LeagueSummary.tsx              # Cards de dinero, valor, plantilla, alineación
├── recommendations/RecommendationPanel.tsx # Panel de recomendaciones con badges y prioridades
├── dashboard/
│   ├── RecommendationsTab.tsx            # Recomendaciones detalladas con filtros
│   └── StatisticsTab.tsx                 # Sección completa de estadísticas de liga
└── statistics/                           # Componentes de gráficos y tablas

src/lib/
├── analysis/league-analysis.ts           # Análisis de plantillas rivales y agregados
├── recommendations/
│   ├── engine.ts                         # Motor de recomendaciones
│   ├── captain.ts                        # Recomendador de capitán
│   ├── clause-risk.ts                    # Análisis de riesgo de cláusula
│   ├── external-intelligence.ts          # Fuentes externas configurables
│   └── points-estimator.ts               # Estimación de puntos por jornada
└── fantasy/api-proxy.ts                  # Helpers compartidos de llamadas a la API oficial
```

## Flujo de recomendaciones

1. El usuario entra en `/dashboard` (requiere sesión con token o `LALIGA_FANTASY_TOKEN` de respaldo).
2. Selecciona una liga del desplegable.
3. `RecommendationPanel` y `RecommendationsTab` llaman a `/api/recommendations`.
4. El endpoint carga liga, plantilla propia, mercado, clasificación, jornada, calendario y catalogo de jugadores.
5. A continuación carga las plantillas y dinero de todos los rivales para calcular riesgos de cláusula y necesidades de mercado.
6. El motor genera recomendaciones de compra, venta, alineación, cláusulas y capitán.
7. La pestaña **Estadísticas** usa `/api/league-analysis` para mostrar gráficos y tablas completas de la liga.

## Pruebas manuales realizadas

- `GET /api/proxy/v1/competition/1/leagues?x-lang=es` → devuelve la liga `princesos`.
- `GET /api/recommendations?leagueId=017833924&teamId=37390189` → devuelve recomendaciones reales (ventas por lesionados, compras, etc.).
- `GET /dashboard` con cookie falsa → renderiza la página y carga los islands de React.

## Pruebas pendientes / próximos pasos

1. Verificar login real con credenciales del usuario (ROPC). Necesita email/password; no se leen los ficheros de credenciales por seguridad.
2. Probar el flujo completo en navegador: login → selector de liga → recomendaciones y estadísticas.
3. Añadir endpoint `/api/auth/refresh` para renovar el token automáticamente.
4. Implementar acciones desde el panel: pujar, vender, subir cláusula (llamadas POST/PUT al proxy).
5. Mejorar el motor de recomendaciones con datos históricos, dureza del rival y formaciones.
6. Añadir scrapers o feeds de noticias/estadísticas concretos en `external-intelligence.ts` si el usuario los configura.
7. Añadir tests automáticos (Vitest + React Testing Library o Playwright).

## Inteligencia externa configurable

- El módulo `src/lib/recommendations/external-intelligence.ts` permite enriquecer recomendaciones con fuentes externas.
- Variables de entorno en `.env.local`:
  - `NEWS_RSS_FEEDS`: lista de feeds RSS separados por comas.
  - `PLAYER_STATS_JSON_URL`: URL de un JSON con señales por jugador.
- Por defecto no se realiza scraping de sitios de terceros; se deja el punto de extensión documentado.

## Riesgo de cláusula

- `src/lib/recommendations/clause-risk.ts` analiza para cada jugador propio:
  - Cuántos rivales pueden pagar la cláusula actual.
  - Si los rivales tienen necesidad de su posición.
  - Valor de mercado vs cláusula y puntos esperados.
- Devuelve un `riskScore` de 0 a 100 y una `recommendedClause` calculada para estar por encima del poder adquisitivo rival.

## Capitán

- `src/lib/recommendations/captain.ts` selecciona el mejor capitán entre titulares sanos.
- Puntúa por puntos esperados, localía y peso por posición (delanteros y centrocampistas tienen ligera ventaja).

## Ficheros de configuración importantes

- `.env.local` — tokens y config del proxy (no versionar).
- `.env.credentials` — email/password (no versionar, no lo lee Astro por defecto).
- `.env.example` — plantilla para crear los anteriores.

## Partidos: corrección serverless (2026-09-07)

La pestaña Partidos usa `engine/sources/espn.ts` como fuente primaria (HTTP
nativo: scoreboard por fechas y summary por evento). Recupera horarios UTC,
onces completos, suplentes y eventos para el resumen generado en español.
SofaScore queda como respaldo de partidos no encontrados: en Vercel usa fetch
con timeout y circuit breaker, sin asumir que curl está instalado. Los escudos
y el calendario oficial siguen siendo la referencia para el cruce.

Los horarios se formatean en `Europe/Madrid`. `eventId` conserva su significado
SofaScore; `dataSource`, `sourceEventId` y `dataStale` son campos aditivos. Los
fallos y datos caducados se indican en la ficha; un marcador ausente no se
interpreta como 0–0. El motor de recomendaciones conserva su fuente anterior.

Verificado con tests unitarios, TypeScript, build y una descarga real con
`VERCEL=1` y `PATH=/nonexistent` (dos onces de 11 jugadores y 21 eventos).
La prueba autenticada de `/api/matches` queda pendiente porque las sesiones
locales están caducadas y no se pudieron renovar. No se ha publicado en Vercel.
`verify:deploy` compila y pasa las rutas, pero falla por los 208 archivos previos
versionados y a la vez ignorados; no es un fallo de la nueva fuente.
