# Funcionalidades pendientes — Índice

Este directorio recoge las **propuestas de implementación** de las funcionalidades pendientes del proyecto `fantasy-manager`. Cada documento es autocontenido: describe el objetivo, el contexto actual del código, la arquitectura propuesta, el modelo de datos, la persistencia, la UI, las fases de implementación y los riesgos.

> Proyecto en desarrollo, **pendiente de publicación**. Los documentos asumen el estado del código a 2026-08-04 y citan ficheros reales del repositorio (`src/lib/...`, `src/pages/api/...`, `data/...`) para que la implementación sea lo más directa posible.

## Índice de documentos

| # | Fichero | Funcionalidad |
|---|---------|---------------|
| 01 | [`01-puntuacion-prediccion-equipos.md`](./01-puntuacion-prediccion-equipos.md) | Sección **«Puntuación»**: puntos posibles de cada equipo de la liga (jugadores, capitán, entrenador + banquillo) con predicción por jornada y persistencia histórica para ver clasificaciones por puntos y por jornadas. |
| 02 | [`02-partidos-api-integracion.md`](./02-partidos-api-integracion.md) | Sección **«Partidos»**: investigación de API de partidos por jornada, integración de datos en vivo (escudos, incidencias, contador de tiempo) y estados pendiente / en juego / jugado. |
| 03 | [`03-partidos-importancia-vs-normales.md`](./03-partidos-importancia-vs-normales.md) | Distinción **partidos de importancia vs. normales**: un partido es de importancia si juega algún jugador de nuestra plantilla; se ordena por número de jugadores propios. |
| 04 | [`04-partidos-tarjetas-resumen.md`](./04-partidos-tarjetas-resumen.md) | Vista principal de partidos en **tarjetas resumidas**: escudos, resultado, contador de tiempo, parte del partido y goles (jugador + minuto). |
| 05 | [`05-partidos-detalle-alineaciones.md`](./05-partidos-detalle-alineaciones.md) | **Detalle de partido** al hacer clic en una tarjeta: alineaciones, titulares, entrenador, local/visitante y resumen del partido (incidencias estructuradas + noticias externas). |
| 06 | [`06-fix-asignacion-equipos-mercado.md`](./06-fix-asignacion-equipos-mercado.md) | **Bug**: jugadores que pertenecen a un equipo aparecen «Sin equipo» en el mercado. Fix y normalización de la asignación de equipos. |

## Orden recomendado de implementación

1. **06 — Fix de equipos en el mercado** (dependencia de datos: sin esto el resto muestra datos incorrectos).
2. **01 — Sección Puntuación** (reutiliza el motor de predicción existente, aporta persistencia).
3. **02 — Partidos: integración de API** (base de datos para las vistas 03, 04 y 05).
4. **03 — Importancia vs. normales** (sobre los datos de 02).
5. **04 — Tarjetas resumen** (vista principal).
6. **05 — Detalle de partido** (vista secundaria).

## Convenciones transversales

- **Stack**: Astro (SSR) + React + TypeScript + pnpm + Tailwind. Estado con React Query (TanStack). Gráficos con Recharts (ya disponible).
- **Proxy**: toda llamada a la API oficial pasa por `src/pages/api/proxy/[...path].ts` y `fetchOfficialAPI` (`src/lib/fantasy/api-proxy.ts`). El token nunca viaja al cliente.
- **Fuentes externas**: se integran como adaptadores en `src/lib/engine/sources/` con caché en disco (`src/lib/engine/sources/http-cache.ts`, directorio `data/cache/sources/`), TTL por tipo de dato y degradación graciosa (`origin: network | cache | stale`).
- **Persistencia**: patrón JSONL append-only de `src/lib/engine/track-record.ts` en `data/` (sin dependencias nuevas, legible, suficiente a este volumen).
- **UI**: nuevas pestañas se registran en `src/components/DashboardContainer.tsx` y se crean como `src/components/dashboard/<Nombre>Tab.tsx`; componentes compartidos en `src/components/shared/` y UI base en `src/components/ui/`.
