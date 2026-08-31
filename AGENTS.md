## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Interfaz de usuario y sistema de diseño

El sistema completo vive en `src/styles/global.css` (tokens) y
`tailwind.config.mjs` (puente). **Ningún componente define un color, una
sombra, un radio o una duración propios**: si un valor no existe, se añade
primero como token.

### Tokens (tres capas: primitivo → semántico → componente)

- **Rampa neutra `--ink-000..900`**. Cada peldaño es un nivel de elevación.
  `--ink-050` es el lienzo `#151515` y `--ink-900` la tinta `#ECECEC`: los dos
  valores de marca, inmutables.
- **Acento «Verde Campo» `--lime-100..900`** (base `hsl(74 84% 55%)`).
  Reservado a tres cosas: la ÚNICA acción primaria de cada pantalla, el anillo
  de foco y la voz del motor de recomendaciones (capitán, jugada sugerida,
  serie propia en los gráficos). No es decorativo; si aparece en dos sitios de
  la misma vista compitiendo, sobra uno.
- **Estado**: `--positive` (158°), `--negative` (354°), `--caution` (32°),
  `--info` (199°). Separados ≥40° entre sí y del acento. **Nunca van solos**:
  siempre con icono o con signo, porque el color no puede ser la única señal.
- **Demarcaciones** `--pos-gk/df/mf/fw/co`, siempre acompañadas de la sigla.
- **Escalas fijas**: opacidad (`.05 .1 .2 .4 .6 .8`), radios (`--r-xs..xl`),
  cinco elevaciones (`--elev-1..5`), duraciones (`--dur-instant..slow`),
  curvas (`--ease-out/in/spring`) y capas (`--z-raised..toast`).
- **Contraste**: `--ink-600` (bordes de control) cumple 3:1 y `--ink-700`
  (texto terciario) cumple 4,5:1 **contra la superficie más clara en la que
  aparecen** (`--ink-300`), no solo contra el lienzo. Si se tocan esos tres
  grises hay que volver a medir.

### Tipografía

Par real, no un solo tipo en dos pesos: **Archivo** para titulares
(`font-display`, tracking negativo que se cierra al crecer el cuerpo),
**Inter** para interfaz y **JetBrains Mono** para toda cifra que se compare en
columna. Cualquier número escaneable lleva la utilidad `.numeral` (cifras
tabulares); sin ella las columnas bailan al ordenar una tabla.

### Piezas

- `src/components/ui/`: primitivos shadcn/Radix. `button` (variantes por
  JERARQUÍA: `default`, `accent`, `secondary`, `outline`, `ghost`, `danger`,
  `link`; prop `loading`), `card` (variantes por elevación: `sunken`, `flat`,
  `default`, `raised`, `interactive`, `accent`, `critical`), `badge` (acepta
  `icon`), `input` + `Field` (etiqueta visible, ayuda persistente, error
  debajo con `role="alert"`), `tabs` (`segmented` | `underline`), `stat`
  (cifra tabular con signo), `motion` (respeta `prefers-reduced-motion`).
- `src/components/brand/Logo.tsx`: marca propia (línea de medio campo +
  círculo central + punto de acento). No usar un icono de librería como logo.
- `src/lib/chart-theme.ts`: tema único de Recharts. Las series se distinguen
  por luminosidad y por trazo (continuo / discontinuo), no solo por tono.
- `src/components/shared/`: `KpiCard`, `TrendBadge`, `PlayerCard`,
  `PlayerRow`, `PlayerAvatar`, `PlayerDetailDialog`, `AlertPanel`,
  `FilterBar`, `DataTable`, `EmptyState`, `ErrorState`, `LoadingSection`,
  `SectionHeader`.
- `src/components/layout/`: `AppLayout` (enlace de salto + panel + cabecera +
  barra inferior), `Sidebar` (raíl de 248 px / 72 px plegado), `Header`,
  `MobileNav` (4 destinos + «Más»), `CommandPalette`.

### Reglas que no se saltan

- El foco lo pinta `:focus-visible` en `global.css`. **No** añadir
  `focus:ring-*` ni `focus-visible:outline-none` en componentes.
- El atajo `⌘/Ctrl + K` lo registra **solo** `DashboardContainer`. Registrarlo
  también en `CommandPalette` provoca dos alternancias por pulsación y la
  paleta no llega a abrirse.
- Cada pantalla diseña sus cuatro estados: carga (silueta del contenido real,
  no una ruleta), vacío (con salida), error (causa + cómo arreglarlo +
  reintentar) y el camino feliz.
- Toda superficie táctil ≥44 px (`size="touch"` / `icon-touch`).
- Mensajes de error: nunca `error.message` como descripción. La descripción
  explica qué se ha caído y qué hacer; el texto crudo va en `detail`, plegado.
- El hueco inferior para la barra móvil lo pone `AppLayout`; las pestañas no
  añaden `pb-*`.
- Modo compacto: los componentes reaccionan solos con variantes
  `[.density-dense_&]:*`; no pasar props de densidad salvo override puntual.
- Atajos: `⌘K` (buscar), `R` (recargar), `D` (compacto), `B` (plegar panel),
  `C` (clausulazos), `⌘1-9` y `⌘0` (pestañas).
- Notificaciones globales con **sonner** (`Toaster` en `AppLayout`).
- Animaciones con **Framer Motion**, contadores con **@number-flow/react**,
  tablas con **@tanstack/react-table**.
- El dashboard es **Astro + React** hidratado con `client:only="react"`. No
  migrar a Next.js.

## Motor de recomendaciones (Fase 0)

- `src/lib/engine/`: núcleo nuevo — `model.ts` (estimador por componentes v1),
  `form.ts` (forma con decaimiento), `scoring-table.ts` (tabla de puntuación
  derivada), `player-stats.ts` (caché memoria+disco de playerStats),
  `track-record.ts` (predicciones/recomendaciones persistidas y liquidación),
  `snapshots.ts` (snapshot diario de catálogo y mercado).
- `data/` (gitignored, runtime): `track-record/*.jsonl` por jornada +
  `metrics-latest.json`, `snapshots/YYYY-MM-DD.json`, `cache/player-stats/`.
- El presupuesto en todo el motor es `computeAvailableBudget` (efectivo +
  20% del valor de plantilla). `impactScore` es ΔxP en puntos (una escala).
- Verificación: `pnpm exec tsc --noEmit` limpio + `/api/recommendations` con
  datos reales. `@types/node` es devDependency (persistencia en disco).

## Fuentes externas (Fase 1)

- Adaptadores en `src/lib/engine/sources/` con contratos en `types.ts` (§3.5
  del diseño): `clubelo.ts` (Elo de equipos, 24 h), `jornadaperfecta.ts`
  (onces probables + bajas, 3 h), `futbolfantasy.ts` (tendencias de valor,
  12 h). Caché HTTP en `sources/http-cache.ts` (disco `data/cache/sources/`,
  fallback stale si la fuente cae, UA identificable).
- Cruce de equipos: `team-names.ts` (normalización + alias). Cruce de
  jugadores: slug → nombre completo contenido → apellido único (minutes.ts).
- `features/fixture.ts`: multiplicador por diferencia Elo con ventaja de campo
  dentro del factor (rango 0.85-1.15, calibrable). `features/minutes.ts`:
  xMins v1 (P(titular) ≈ 0.85 en once probable, 0.15 fuera, baja → 0,
  duda → ×0.45).
- Actividad de liga (`src/lib/fantasy/activity.ts`): liquidez real y
  clausulazos recientes de rivales para `clause-risk.ts`. La alineación de
  rivales NO está disponible en la API (403): se infiere de su plantilla.
- xG externo (Understat/FBref) DIFERIDO: ambos bloquean el scraping
  (Cloudflare / HTML sin datos). Los componentes v2 con xG quedan pendientes
  de una fuente accesible; la estructura del modelo ya lo admite.

## Decisión avanzada (Fase 2)

- `features/shrinkage.ts`: partial pooling (n·obs + k·prior)/(n+k), k=8, con
  priors posición×tier (tiers 1-5 desde Elo) y jerarquía temporada
  pasada → posición×tier → posición global. El baseline circular del esquema
  táctico quedó eliminado.
- Capitán co-optimizado: el bonus del mejor titular entra en el objetivo de
  `lineup-optimizer.ts` y `tactical-scheme.ts` (ambos exponen `captain`).
  Penalización por riesgo: `riskAdjustedXp = xP − 0.3·σ` del modelo (σ del
  histórico; en pretemporada es xP tal cual).
- `optimize.ts`: planificador multi-jornada (DP sobre los frentes de Pareto,
  efectivo como estado, plantilla arrastrada, fricción 1.5 pts/movimiento).
  Se expone como `multiWeekPlan` en /api/recommendations (campo aditivo).
- Noticias (§4.6): `news/classifier.ts` con negación ("descartan lesión") y
  especulación ("podría"), `news/matcher.ts` con desambiguación por equipo
  (apellidos compartidos exigen mención del equipo), `news/index.ts` con peso
  por fuente, decaimiento exponencial (τ=3 días), deduplicación de la misma
  historia (Jaccard ≥ 0.6) y cobertura real de feeds → dataQuality.
- Sofascore (`sources/sofascore.ts`): alineaciones confirmadas ~1 h antes;
  Cloudflare bloquea el fetch de Node → descarga vía curl. Override de xMins
  a P=1/0 cuando existe confirmada (solo en días de partido).

## Aprendizaje (Fase 3)

- `/api/track-record` + pestaña Track Record del dashboard: métricas §6.3 por
  jornada y en total (MAE vs baseline, Spearman, top-11 hit rate, puntos del
  capitán, Precision@5, ROI). Los onces recomendados se persisten
  (`lineups-w{N}.jsonl`) y la liquidación guarda `idealXi` de cada jugador.
- Calibración automática (`engine/calibrate.ts` + `engine/params.ts`): rejilla
  walk-forward sobre shrinkageK × divisor Elo con el código de producción
  (paramOverrides). Se activa sola con ≥30 muestras jugador-jornada; solo
  aplica si mejora el MAE en producción (`data/engine-params.json`).
- GBM por posición (§4.7): DIFERIDO — el propio diseño lo condiciona a 1-2
  temporadas de datos propios (track record + xG). Hasta entonces el modelo
  por componentes es la predicción de producción y su salida será feature del
  futuro ensemble.

## Predicción de puntuación por equipo (Puntuación)

- Nueva pestaña `score-predictions` en el dashboard (sidebar, mobile nav, command
  palette y `Cmd/Ctrl + 8`). Muestra una clasificación por puntos esperados (xP)
  de cada equipo de la liga para la jornada actual.
- Backend: `/api/score-predictions?leagueId=&teamId=` usa
  `src/lib/analysis/team-score-predictor.ts` para calcular, por cada equipo:
  - once titular (real para el equipo propio, inferido para rivales desde la
    plantilla con `computeOptimalLineup` adaptado a `currentLineup` opcional),
  - capitán co-optimizado (mejor titular por xP),
  - entrenador estimado por Elo + resultado esperado (`engine/coach-points.ts`),
  - banquillo de 5 suplentes con mayor xP (mostrado como reserva potencial).
- Persistencia: `data/score-predictions/{leagueId}-w{week}.json` (snapshot
  completo) y `data/score-predictions/history.jsonl` (resumen por equipo/jornada,
  append-only deduplicado). El endpoint devuelve también el histórico para
  evolución por jornadas.
- Limitaciones: la API oficial no expone la alineación de rivales (403), por lo
  que las alineaciones rivales se infieren. El entrenador es un modelo MVP
  basado en Elo hasta disponer de datos reales de goles encajados. El banquillo
  no se suma al total directamente porque las reglas de sustitución de
  LALIGA FANTASY son complejas; se muestra como potencial aparte.
- Verificación: `pnpm exec tsc --noEmit` limpio + `/api/score-predictions` con
  datos reales de una liga.

## Clausulazos (Mercado → Clausulazos)

- Nueva pestaña `clause-market` en el dashboard (sidebar bajo *Mercado*, mobile
  nav, paleta de comandos y atajo `C`; no entra en los atajos numéricos, que
  siguen asignados a las diez pestañas originales). Lista **solo** jugadores de
  otros equipos de la liga que se pueden clausular ahora mismo y recomienda
  cuáles encajan mejor en el equipo.
- Backend: `/api/clause-market?leagueId=&teamId=` (caché en memoria 3 min) usa
  `src/lib/analysis/clause-market.ts`. Mismo pipeline de datos y mismo
  `EstimatorContext` que `/api/recommendations` (Elo, onces probables, bajas,
  alineaciones confirmadas, noticias, playerStats, tendencias de valor), sin la
  persistencia de track record ni el planificador multi-jornada.
- Métrica principal: `xiGain`, la mejora **real del once titular** al añadir al
  jugador. `bestXi()` replica numéricamente `lineup-optimizer.ts` (misma
  co-optimización del capitán) sobre xP ya calculados, de forma que se pueden
  evaluar cientos de "¿y si ficho a X?" y los combos de 2-3 clausulazos sin
  volver a estimar puntos. `deltaXp` (vs. media propia de la posición) queda
  como métrica secundaria.
- Cada objetivo trae `fitScore` 0-100 (once 45 · nivel 15 · precio 15 ·
  necesidad 10 · titularidad 10 · datos 5, con penalizaciones por estado,
  noticias y presupuesto), `urgency` 0-100 (rivales que pueden pagar la
  cláusula, ratio cláusula/valor, nivel del jugador y clausulazos recientes de
  la liga), `verdict`, motivos, avisos y `funding`: qué vender para llegar a la
  cláusula, contando que cada venta aporta 0,8·valor (la caja sube el valor
  íntegro pero baja el bonus del 20% del valor de plantilla).
- La disponibilidad sale siempre de `getClauseProtection` (`clause-availability.ts`):
  `available` va a `targets` y `locked`/`shielded` a `upcoming` con los días que
  faltan. La asequibilidad usa `computeAvailableBudget` (§5.1), igual que el
  resto del motor.
- Verificación: `pnpm exec tsc --noEmit` limpio + `pnpm build` + `/api/clause-market`
  con datos reales de una liga.

## Partidos en vivo (Partidos)

- Nueva pestaña `matches` en el dashboard (sidebar, mobile nav, command palette
  y `Cmd/Ctrl + 0`). Muestra los partidos de la jornada actual de LaLiga con
  estado, marcador, minuto, escudos y eventos.
- Backend: `/api/matches?leagueId=&teamId=` usa `src/lib/engine/matches.ts` para
  cruzar el calendario oficial de la jornada con datos en vivo de SofaScore y la
  plantilla del usuario.
- Distinción de importancia: un partido es "importante" si algún jugador de la
  plantilla del usuario pertenece a uno de los dos equipos. Se ordenan por
  número de jugadores implicados, luego por estado (en vivo > descanso > pendiente
  > finalizado) y hora de inicio.
- Datos mostrados: escudos de los equipos, estado (Pendiente / En vivo /
  Descanso / Finalizado), marcador, minuto con contador en vivo, jugadores de
  la plantilla implicados y eventos (goles, tarjetas, sustituciones).
- Fuente de datos: SofaScore API no oficial (`/event/{id}`, `/event/{id}/incidents`,
  `/unique-tournament/8/season/{id}/events/...`, `/api/v1/team/{id}/image`); se
  consume vía `curl` por el bloqueo de Cloudflare y se cachea con TTL corto
  (60 s detalles/incidentes, 15 min listados).
- Verificación: `pnpm exec tsc --noEmit` limpio + `/api/matches` con datos reales
  de una liga.

## Login con Google (extensión `extension/`)

- LaLiga usa Azure AD B2C y su único `redirect_uri` registrado es el esquema
  nativo `authredirect://com.lfp.laligafantasy`. **Una web no puede completar
  ese OAuth**: cualquier URL propia da `AADB2C90006`. No perder tiempo
  intentándolo desde el servidor ni con popups.
- `extension/` (MV3, Chrome + variante Firefox) intercepta esa redirección con
  `webRequest.onBeforeRedirect`, canjea el `code` con PKCE contra la política
  `B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN` (cliente público, sin secreto) y devuelve
  los tokens a la pestaña de la app.
- Estado del flujo en `chrome.storage.session` y entrega por `tabs.sendMessage`:
  el service worker muere durante el login y ni las variables de módulo ni el
  `sendResponse` inicial sobreviven.
- Web: `src/lib/auth/extension-bridge.ts` (diálogo por `postMessage`, sin
  depender del ID de la extensión), botón en `LoginForm.tsx`, instrucciones en
  `src/pages/extension.astro`. Los tokens se persisten reutilizando
  `/api/auth/token`.
- Al añadir un dominio de despliegue hay que tocarlo en tres sitios:
  `manifest.json` (`host_permissions` y `content_scripts.matches`) y
  `ALLOWED_APP_ORIGINS` de `extension/src/config.js`.
- El login por email (`/api/auth/login`, ROPC) sólo funciona con cuentas
  locales de B2C, nunca con cuentas de Google.
- Portabilidad: todo el código de la extensión usa el alias
  `api = globalThis.browser ?? globalThis.chrome` de `config.js` (y una copia
  inline en `bridge.js`, porque los content scripts no admiten `import`). No
  volver a `chrome.*`: en Firefox ese espacio de nombres es de callbacks y cada
  `await` devolvería `undefined`.
- Publicar en las stores: `agent-docs/publicacion-extension/` (empieza por su
  `README.md`). El empaquetado es `empaquetar.sh`; antes de subir a Firefox,
  `pnpm dlx web-ext lint` debe seguir dando 0 errores.

## Despliegue en Vercel

La app se despliega como función serverless (`output: 'server'` + `@astrojs/vercel`).
Tres reglas que no se saltan, porque romperlas ya tumbó el despliegue entero:

**1. `.vercel/` NUNCA se versiona.** El `.gitignore` tiene `dist/` y
`node_modules/`, y esos patrones también casan dentro de
`.vercel/output/functions/_render.func/`. Commitear la salida del build deja en
el repo una función con su `.vc-config.json` pero sin `dist/server/entry.mjs` ni
dependencias, y todas las rutas devuelven `FUNCTION_INVOCATION_FAILED` sin log
de aplicación. La salida la regenera el adaptador en cada build.

**2. El filesystem del despliegue es de solo lectura salvo `/tmp`.** Ningún
módulo construye rutas con `path.join(process.cwd(), 'data', ...)`: todo pasa
por `src/lib/runtime-paths.ts`, que separa la raíz del bundle (solo lectura, es
la semilla versionada) de la raíz escribible (`/tmp` en serverless, el propio
`data/` en local). Para un subdirectorio que se lee y se escribe se usa
`ensureDataDir(rel)`, que copia la semilla una vez por proceso; para uno que
solo se lee, `readablePath(...)`. Lo escrito en `/tmp` es por instancia y
efímero: lo que tenga que persistir de verdad va a Upstash vía `kv-cache.ts`.

**3. Las variables de entorno tienen que estar en el entorno de _Build_, no
solo en el de _Runtime_.** `astro.config.mjs` elige el driver de sesión en build
time y lo cuece en el bundle. Sin `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN` visibles durante el build, el despliegue sale con
sesión en `/tmp`: funciona, pero se pierde al reciclarse la instancia.

Antes de desplegar, `pnpm verify:deploy` construye con `VERCEL=1` y arranca la
función real con el directorio en solo lectura, comprobando las rutas clave
(incluido el login, que es el que escribe en la sesión). Falla en local en vez
de en producción.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
