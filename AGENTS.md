## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

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

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
