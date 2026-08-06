# 05 — Detalle de partido: alineaciones, entrenador y resumen

> **Funcionalidad**: al hacer clic en una tarjeta de partido (siempre que **se esté jugando o ya se haya jugado**), se abre el detalle con la **misma información** que la tarjeta y además: las **alineaciones de los equipos**, los **titulares**, el **entrenador**, qué equipo es **local y cuál visitante**, y —si es posible— un **resumen del partido** recogido de alguna página de información (Marca, FútbolFantasy, etc.).

---

## 1. Objetivo

Una vista de detalle que convierta la tarjeta en «ficha completa del partido»: once de cada equipo con banquillo y entrenador, local/visitante explícito, timeline de incidencias y un resumen contextual (noticias).

## 2. Contexto actual

- Sofascore ya entrega las **alineaciones confirmadas** vía `/event/{eventId}/lineups` (integrado en `src/lib/engine/sources/sofascore.ts`): `confirmed`, `home`/`away` con `players[]` (`player.name`, `substitute`, `shirtNumber`) y `supportStaff` (entrenador). Fixture real en `data/cache/sources/sofa-lineups-16416293.txt`.
- **Incidencias** (`/event/{eventId}/incidents`): timeline con goles, tarjetas, expulsiones, cambios y VAR (doc 02).
- **Noticias**: el proyecto ya tiene un módulo completo de noticias en `src/lib/news/` (`sources.ts`, `rss.ts`, `classifier.ts`, `matcher.ts`) que agrega RSS y clasifica por jugador/equipo/categoría. Es la base para el «resumen del partido».
- `buildTeamMatcher` (`src/lib/engine/team-names.ts`) permite cruzar nombres de fuente → `teamId` oficial; se puede reutilizar para marcar qué jugadores de la alineación son de nuestra plantilla (cruzándolos por nombre con el catálogo).
- Diálogos: `src/components/ui/dialog.tsx` ya existe (usado por `PlayerDetailDialog`).

## 3. Contenido del detalle

### 3.1 Cabecera (lo mismo que la tarjeta)

- Escudos + nombres + resultado + minuto/parte + hora (pendientes no abren detalle, doc 04).
- Badge de importancia (doc 03) y nº de jugadores propios.
- Chip local/visitante: «**Local**» y «**Visitante**» junto a cada equipo (explícito, con icono 🏠/✈ o equivalente).

### 3.2 Alineaciones (pestaña «Alineaciones»)

Por cada equipo (local/visitante):

- **Once titular**: 11 jugadores con dorsal, en formación aproximada. Si `lineups.confirmed` es `true`, es la alineación oficial; si no, mostrar como «Alineación no confirmada» (o la probable del `starterInfo` de nuestra app, con `dataQuality`).
- **Banquillo**: lista de suplentes con dorsal.
- **Entrenador**: `supportStaff` → nombre (campo `coach` en nuestro DTO del doc 02).
- **Jugadores de nuestra plantilla**: resaltado (borde/acento y badge «tuyo»), cruzándolos por nombre contra el catálogo (`buildTeamMatcher` + matcher de nombres de jugador; fallos → sin resaltar, nunca adivinar).
- Selección de equipo activa (toggle Local/Visitante o ambas alineaciones lado a lado en escritorio).

### 3.3 Incidencias / timeline (pestaña «Incidencias»)

- Timeline cronológica reutilizando `MatchIncident` (goles ⚽, amarillas 🟨, rojas 🟥, cambios ↑↓, VAR, inicio/descanso/fin de cada parte).
- Es el «resumen estructurado» del partido, 100% fiable y ya disponible.

### 3.4 Resumen del partido (pestaña «Resumen» — noticias)

Objetivo: contexto narrativo del partido. Fuentes, en orden de preferencia:

1. **Módulo de noticias propio** (`src/lib/news/`): buscar artículos de los 2 equipos del partido **publicados en el día del partido** (filtrado por equipos + términos «partido», «victoria», «derrota», marcador…). Reutilizar `sources.ts` (RSS ya configurados) y `matcher.ts` (emparejar por nombre de equipo). Presentar como lista de artículos con enlace.
2. **Timeline de incidencias + estadísticas** (`/event/{eventId}/statistics`): posesión, tiros, córners… como «resumen de datos» (fiable, sin scraping).
3. **Scraping de crónicas (Marca, FútbolFantasy)**: *opcional y desaconsejado como fuente primaria* — frágil (HTML cambia), lento y con riesgo de bloqueo. Si se hace, detrás de un adaptador en `src/lib/engine/sources/` con caché (`http-cache`), TTL largo y degradación graciosa; nunca bloquear la vista si falla.

> 📌 **Recomendación de arquitectura**: el «Resumen» = noticias del día (módulo propio) + estadísticas del partido. El scraping de crónicas se deja para una fase posterior y solo si se valida que merece la pena. Esto mantiene el detalle rápido y robusto.

### 3.5 UI / interacción

- `MatchDetailDialog` (modal, patrón `PlayerDetailDialog`) o vista a pantalla completa en móvil (sheet). Recomendado: **Dialog** en escritorio y **Sheet** (`src/components/ui/sheet.tsx`, ya existe) en móvil.
- **Tabs internas**: «Alineaciones» / «Incidencias» / «Resumen» (componente `Tabs` de `src/components/ui/tabs.tsx`).
- **Carga incremental**: primero cabecera + alineaciones (fast), luego incidencias y resumen (React Query con `enabled` cuando el diálogo está abierto y `phase !== 'pending'`).
- Fetch: `GET /api/matches/detail?eventId=` (nuevo endpoint ligero que orquesta `lineups` + `incidents` + `statistics` + noticias, con caché 30–60 s en vivo).
- Estados: skeleton por pestaña, `ErrorState` por fuente fallida (una pestaña puede fallar sin romper las demás).

## 4. Fases de implementación

| Fase | Tarea | Verificación |
|------|-------|--------------|
| 1 | Endpoint `/api/matches/detail` (lineups + incidents + statistics, cacheado) | Test del endpoint con fixture real |
| 2 | `MatchDetailDialog` con cabecera, local/visitante y alineaciones | E2E: se abre solo en vivo/jugado |
| 3 | Pestaña Incidencias (timeline) | Test unitario del normalizador |
| 4 | Pestaña Resumen: noticias del módulo `src/lib/news/` + estadísticas | E2E + revisión visual |
| 5 | (Opcional) adaptador de crónicas Marca/FútbolFantasy | Evaluación de valor/riesgo |

## 5. Riesgos y mitigaciones

- **Alineaciones no confirmadas** (antes de ~1 h) → mostrar «no confirmada» y, si hay, once probable de `starterInfo`; nunca presentar como oficial.
- **Scraping frágil** → no usar como fuente primaria; detrás de adaptador con caché y `dataQuality`; la pestaña Resumen funciona con noticias + estadísticas sin el scraping.
- **Nombres de jugadores que no cruzan con el catálogo** (acentos, sobrenombres) → matcher tolerante (normalizar como `team-names.ts`), fallback sin resaltar y log.
- **Coste del detalle** (3–4 llamadas a Sofascore por apertura) → caché en servidor (TTL en vivo) y solo cargar al abrir el diálogo.

## 6. Validación

- `pnpm typecheck` y `pnpm lint`.
- Test unitario: normalización de `lineups` (titulares/suplentes/entrenador) y de `incidents` (local/visitante, `reversedHomeAway`).
- E2E: abrir detalle desde tarjeta en vivo → ver alineaciones y entrenador; tarjetas pendientes no abren.
- Revisión visual: diálogo en escritorio y sheet en móvil.
