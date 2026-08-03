# Motor de recomendaciones 3x — diseño y fundamentación

> Documento de diseño para la próxima generación del motor de recomendaciones
> de fantasy-manager. Contiene: auditoría del motor actual, catálogo verificado
> de fuentes de datos, arquitectura del modelo predictivo, métricas para
> demostrar la mejora y roadmap de implementación.
>
> Fecha: agosto 2026. Estado: propuesta (no implementado).

---

## 1. Resumen ejecutivo

El motor actual (`src/lib/recommendations/*`, `src/lib/analysis/*`) es un
sistema de **reglas heurísticas con constantes inventadas** sobre un estimador
de puntos estático. Funciona, pero deja valor sobre la mesa en cuatro frentes:

1. **Predicción**: no usa forma reciente, minutos esperados, fuerza de rival
   real, ni el desglose de puntos por acción que la propia API devuelve.
2. **Validación**: cero backtesting; ningún peso está calibrado contra
   resultados reales.
3. **Mercado**: ignora la dinámica de pujas, tendencias de valor y la fórmula
   real del presupuesto (ya corregida solo en el módulo nuevo
   `tactical-scheme.ts`).
4. **Persistencia**: sin snapshots no hay tendencias, aprendizaje ni track
   record.

La propuesta es reconstruir el motor en tres capas:

- **Capa de datos**: API oficial + polling propio (snapshots diarios) +
  fuentes externas verificadas (onces probables, xG/xA, ELO, tendencias de
  mercado, bajas).
- **Capa de predicción**: modelo por componentes (minutos esperados × puntos
  por 90 derivados de xG/xA/xGC, Poisson para portería a cero, multiplicadores
  de fixture por tier × localía, shrinkage jerárquico con pocas muestras),
  calibrado por backtesting walk-forward.
- **Capa de decisión**: optimizador exacto por jornada (ya existe vía frentes
  de Pareto en `tactical-scheme.ts`) + MILP multi-jornada para fichajes,
  capitán co-optimizado, y motor de mercado con dinámica real de pujas.

**Sobre el "3 veces mejor"**: la literatura es tajante — en MAE/RMSE nadie
mejora una media simple más de un 5-34% porque el fútbol tiene varianza
irreducible (techo estimado: MAE ≈ 1.96 en jugadores activos, ver §6.3).
Donde sí es realista un factor **2-3x** es en las métricas que mueven
clasificaciones: acierto de once titular, puntos del capitán recomendado
(+57% publicado y replicado), Precision@k de compras y ROI de fichajes. El
objetivo cuantificado del proyecto se define en §6.

---

## 2. Auditoría del motor actual (gap analysis)

Resumen de las debilidades detectadas (auditoría completa con citas
`archivo:línea` realizada sobre el código de agosto 2026):

### 2.1 Debilidades transversales

1. **Cero aprendizaje y cero calibración**: todos los pesos y umbrales son
   constantes repartidas por 10 archivos (`points-estimator.ts:5-11,45,50-51,59,62,65-66`;
   `engine.ts:15,17,50,126-127,238`; `captain.ts:25-30`; `clause-risk.ts:67-74`).
2. **Cero backtesting**: no hay comparación de predicciones vs puntos reales,
   ni métricas de error, ni tests del motor.
3. **Sin forma reciente**: el concepto "últimos N partidos" no existe aunque
   `playerStats` por jornada está tipado y disponible (`starter-status.ts:16-20`
   solo lee `mins_played`).
4. **Presupuesto inconsistente**: `engine.ts:98,224` filtra solo por
   `teamMoney`; `tactical-scheme.ts:41-51` usa la fórmula del 20%;
   `clause-risk.ts:47` no la aplica a rivales. Tres "verdades" distintas.
5. **Sin probabilidad de rotación ni minutos esperados**: la titularidad es un
   multiplicador de ±10% (`points-estimator.ts:62`).
6. **Fuerza de rival = valor de mercado agregado** (`points-estimator.ts:76-91`),
   con efecto máximo ±8% — no usa clasificación, goles ni xGA real.
7. **Regresión a la media solo en el módulo nuevo** y con baseline circular
   (media del propio pool de candidatos, `tactical-scheme.ts:149-158`).
8. **Doble/triple contabilidad**: peso de posición y localía se aplican en el
   estimador y otra vez en capitán (delantero en casa acumula ×1.38 y ×1.13);
   noticias penalizan en estimador × capitán × engine.
9. **Sin persistencia**: cada request recalcula todo; sin snapshots no hay
   tendencias de valor ni comportamiento rival.
10. **Señales externas frágiles**: keywords sin manejo de negación, matching
    por apellidos comunes sin desambiguación por equipo, confianzas sumadas
    sin deduplicar la misma noticia en varios medios, y ausencia de noticias
    indistinguible de "todo OK".

### 2.2 Datos disponibles que el motor ignora hoy

| Dato | Fuente | Uso actual |
|---|---|---|
| `playerStats[].totalPoints` por jornada (forma) | API oficial, detalle de jugador | Ignorado |
| Desglose por acción: `goals`, `goal_assist`, `saves`, `ball_recovery`, `won_contest`, `yellow_card`, `red_card`, `marca_points`... | API oficial (`PlayerDetailModal.js:699-713` en LaLigaApp) | Ignorado |
| `isInIdealFormation` por jornada | API oficial | Ignorado |
| `MarketPlayer.expirationDate`, `numberOfOffers`, `directOffer`, `numberOfBids` | API oficial mercado | Ignorados (solo texto) |
| Alineaciones de rivales (`/teams/{id}/lineup`) | API oficial | Nunca consultadas |
| Actividad de liga (movimientos de mercado rivales) | `{CMP}/leagues/{id}/activity/{i}` | No usada |
| `league.config.premiumFeatures` (capitán, banquillo, once ideal) | API oficial | Nunca leído |
| Catálogo completo (percentiles y baselines por posición) | `{CMP}/players` | Solo suma de valores |
| `Match.matchDate`, `matchState` | Calendario | Solo local/visitante |
| Histórico de valor de mercado | Snapshots propios (no existe endpoint actual) | No hay persistencia |

### 2.3 Errores de modelado concretos a corregir

- `lastSeasonPoints / 38` asume 38 partidos jugados: sobreestima a jugadores
  con media temporada (`points-estimator.ts:43`).
- El peso de posición (DEL ×1.2) infla a delanteros cuya media ya refleja que
  puntúan más (`points-estimator.ts:47`).
- Jugadores sin datos reciben base plana de 2 puntos sin incertidumbre
  (`points-estimator.ts:48`).
- No se detecta si el equipo juega la jornada: un jugador en jornada de
  descanso conserva sus puntos esperados.
- El score de titularidad premia partidos únicos: 90' una vez en 4 jornadas →
  0.75 "Habitual" (`starter-status.ts:43-50`).
- `impactScore` usa una escala distinta por rama (85 fijo, 30 fijo,
  `expected*10`...) y `computeBestMoves` los ordena como homogéneos
  (`engine.ts:48,89,139,185,255,291`).
- La regla "vender si cláusula/valor > 1.3" castiga haber protegido bien;
  confunde protección con rendimiento (`engine.ts:50-61`).
- Recomendaciones contradictorias sin deduplicar: un jugador puede recibir
  `sell` y `protect_clause` a la vez.

---

## 3. Fuentes de datos (catálogo verificado, agosto 2026)

Leyenda de riesgo ToS: **bajo** (API con datos abiertos o uso razonable),
**medio** (scraping tolerado con caché y pocas peticiones), **alto** (scraping
prohibido expresamente / baneo de IP).

### 3.1 Tier 1 — fuente de verdad (ya integrada)

- **API oficial LaLiga Fantasy** (`https://fantasy-api.llt-services.com`):
  plantillas, mercado, puntos, `playerStats` por jornada con desglose por
  acción, calendario, actividad de liga. Auth JWT (~24 h, refrescar con
  `refresh_token`). Es la única fuente para: puntos fantasy reales, cláusulas,
  pujas, dinero.
- **Polling propio diario** (nuevo, §7.2): snapshots de valor de mercado,
  puntos y estado de cada jugador del catálogo → histórico de precios gratis y
  sin riesgo, base de todas las tendencias y del backtesting.

### 3.2 Tier 2 — fantasy-específico (verificado hoy)

- **FútbolFantasy Analytics — Mercado**
  (`https://www.futbolfantasy.com/analytics/laliga-fantasy/mercado`) ✅:
  serie histórica de valor por jugador (7 puntos), variación €/%, y
  **probabilidad de subida/bajada** — específico de LaLiga Fantasy oficial.
  HTML scraping, sin auth. Riesgo: medio.
- **Comuniate — Mercado Fantasy** (`https://www.comuniate.com/mercado/fantasy`)
  ✅: subidas/bajadas de precio diarias para LaLiga Fantasy. HTML/RSS. Riesgo:
  medio.
- **Jornada Perfecta** (`https://www.jornadaperfecta.com/onces-posibles/` y
  `/lesionados`) ✅: onces probables por jornada + centro de partido por equipo
  con lesionados, sancionados y dudas. En español, +9 temporadas activo. HTML.
  Riesgo: bajo-medio. **Fuente principal de probabilidad de titularidad.**
- **Predicted11** (`https://www.predicted11.com/es/laliga`) ✅: alineaciones
  probables por partido (mismo dueño que futbolfantasy). HTML. Riesgo: medio.

### 3.3 Tier 3 — estadística avanzada

- **FBref** (`https://fbref.com/en/comps/12/{temporada}/...-La-Liga-Stats`) ✅:
  xG, npxG, xAG, SCA/GCA por jugador y equipo, y tablas "vs" (lo concedido por
  cada equipo → fixture difficulty). Datos Opta. HTML/CSV. **Rate-limit
  agresivo (~10-20 req/min); caché fuerte obligatoria.** Riesgo: medio-alto.
- **Understat** (`https://understat.com/league/La_liga/{año}`) ✅: xG/xA por
  jugador y por tiro, xGA por equipo; JSON embebido en el JS de la página
  (`playersData`, `datesData`, `teamsData`). Sin auth. Riesgo: medio. Es la
  fuente que usa toda la literatura FPL → **fuente principal de xG/xA**.
- **Sofascore API no oficial** (`https://www.sofascore.com/api/v1/...`) ✅:
  `/unique-tournament/8/seasons` (IDs de temporada), `/event/{id}/lineups`
  (**alineaciones confirmadas ~40-60 min antes**), ratings y estadísticas de
  jugador. JSON sin auth, Cloudflare delante. Riesgo: medio. Uso: confirmación
  de onces el día del partido.
- **ClubElo** (`http://api.clubelo.com/...`) ✅: CSV sin auth.
  `/{Equipo}` = historial Elo; `/Fixtures` = próximos partidos con **matriz de
  probabilidades por marcador**; `/{YYYY-MM-DD}` = ranking a fecha. Riesgo:
  bajo. **Fuente de fixture difficulty sin fricción.**
- **API-Football** (`https://www.api-football.com`, plan Free = 100 req/día)
  ✅: fixtures con alineaciones, `/injuries`, estadísticas. JSON con API key.
  Opción legalmente limpia de respaldo si la cuota alcanza. Riesgo: bajo.
- **Transfermarkt** (`/primera-division/verletztespieler/wettbewerb/ES1` y
  `/sperren/...`) ✅ (requiere User-Agent realista): lesiones y sanciones con
  tiempo estimado. **ToS prohíbe scraping; riesgo alto** — solo como respaldo
  puntual y cacheado.

### 3.4 Fuentes muertas o descartadas

- **FiveThirtyEight SPI**: cerrado en marzo 2025; no hay sustituto oficial.
- **StatsBomb Open Data**: LaLiga solo temporadas antiguas.
- `eldesmarque.com/fantasy` y `futbolfantasy.com/laliga/lesionados-sancionados`:
  404 (no existen esas secciones).

### 3.5 Reglas de convivencia (todas las fuentes externas)

1. Caché agresivo (horas) + pocas peticiones + User-Agent identificable.
2. Fallo gracioso: si una fuente cae, se usa el último dato cacheado y se
   anota en `dataQuality` (nunca se asume "todo OK" silenciosamente).
3. Cada fuente externa detrás de un adaptador con contrato propio
   (`ProbableLineup`, `InjuryReport`, `PlayerXG`, `TeamElo`, `ValueTrend`):
   si una web cambia, solo se reescribe un adaptador.

---

## 4. Capa de predicción (el cerebro)

### 4.1 Principio rector: modelo por componentes, no caja negra

Con ~30-38 partidos por jugador y temporada, entrenar un modelo complejo de
principio a fin es receta para overfitting. La literatura coincide en que el
enfoque **por componentes deterministas + shrinkage estadístico** es el más
robusto con estos volúmenes (fpl-solver: de puesto ~2.000.000 a top 1.3% en
FPL; OpenFPL confirma que solo un ensemble GBM por posición muy regularizado
le iguala). El GBM llegará después, como capa de ajuste cuando haya 1-2
temporadas de datos propios (§4.7).

### 4.2 Paso 0 — reconstruir la tabla de puntuación real

La API devuelve por jugador y jornada cada stat como tupla `[valor, puntos]`
(`playerStats[].stats`). Con unas pocas jornadas de histórico se deriva por
regresión lineal (o inspección directa) la **tabla exacta de puntos por
acción** del juego: goles por posición, asistencia, parada, recuperación,
despeje, duelo, tarjeta, goles encajados, `marca_points` (componente de
medios, 0-4 por jornada) y bonificación de once ideal (`isInIdealFormation`).

**Esto es un multiplicador de todo lo demás**: hoy el motor predice "puntos"
en abstracto; el motor nuevo predice *eventos* (goles, asistencias, portería
a cero, minutos) y los convierte en puntos con la tabla real → cada mejora en
la predicción de eventos se traduce limpiamente.

Entregable: `src/lib/engine/scoring-table.ts` generado por
`scripts/derive-scoring-table.ts` a partir de `playerStats` acumulados.

### 4.3 Modelo de puntos esperados por componentes

Para cada jugador y jornada:

```
xP = E[puntos por minutos] + E[goles] + E[asistencias] + E[portería a cero]
   + E[stats defensivos/ofensivos] + E[puntos de medios] − E[tarjetas]
```

Con fórmulas concretas (calibrables por backtesting):

- **Minutos esperados (xMins)**: `P(titular)`, `P(sustituto)`, `E[mins]` — el
  feature con más impacto individual de toda la literatura (Frees et al.,
  arXiv 2405.02412). Se modela por separado (§4.4).
- **Goles**: `xG90_ajustado × E[mins]/90 × pts_gol(posición)`, donde
  `xG90_ajustado = media_movil(xG/90 propio) × mult_fixture(tier propio, tier
  rival, localía, gol)`. Penaltis: +0.78 xG × penaltis esperados del equipo
  para el lanzador designado (fuente: prensa/Once Probable).
- **Asistencias**: igual con xA y `pts_asistencia`.
- **Portería a cero (DEF/POR)**: Poisson — `P(CS) = e^(−λ)` con
  `λ = xGC90_rival_ajustado × mult_fixture`; puntos `= P(CS) × pts_CS`.
- **Stats defensivos/ofensivos** (recuperaciones, despejes, duelos, paradas):
  medias móviles por 90 × multiplicador, con la tabla de §4.2.
- **Puntos de medios (`marca_points`)**: media móvil del propio histórico del
  jugador (es parcialmente predecible: correlaciona con buenas actuaciones),
  escalado por E[mins].
- **Ventana temporal**: móvil de **10 partidos** (óptimo bias-varianza según
  fpl-solver) con **decaimiento exponencial ξ ≈ 0.0065/día** (vida media ~107
  días, parámetro Dixon-Coles estándar), filtrando partidos de <60' para las
  medias por 90.
- **Multiplicadores de fixture**: tabla posición × tier propio (1-5) × tier
  rival (1-5) × localía, estimada sobre el histórico acumulado. Tiers desde
  **ClubElo** (o xGA de FBref/Understat cuando haya datos de la temporada).
  Sustituye al actual "valor de mercado agregado" (±8% de efecto máximo,
  claramente insuficiente).
- **Localía**: dentro del multiplicador de fixture (nunca como factor
  duplicado aparte — corrige la doble/triple contabilidad actual).

### 4.4 Minutos esperados (xMins) y probabilidad de titularidad

Submodelo propio con salida `P(titular)`, `P(entra de suplente)`, `E[mins]`:

1. **Base por minutos históricos**: ratio de minutos sobre jornadas
   disponibles (corrige el bug actual: promediar también las jornadas con 0
   minutos, no solo las jugadas, `starter-status.ts:43-47`).
2. **Onces probables** (Jornada Perfecta / Predicted11): titular →
   `P(titular) ≈ 0.85`; banquillo → `P ≈ 0.15` (la precisión publicada de las
   alineaciones previstas es 75-88% según liga, Sportmonks).
3. **Bajas y dudas** (Jornada Perfecta lesionados, Transfermarkt, RSS
   clasificado): baja confirmada → 0; duda → ×0.4-0.5.
4. **Rotación por congestión**: si el equipo jugó/juega partido entre semana
   (calendario oficial + fechas), penalizar jugadores con muchos minutos
   recientes y rotación histórica del entrenador.
5. **Confirmación el día del partido** (Sofascore lineups ~1 h antes):
   override a 1/0 — la app puede re-calcular el once recomendado con este
   dato si el usuario consulta cerca del deadline.

### 4.5 Shrinkage jerárquico (pretemporada y pocas muestras)

Sustituye y generaliza el "encogimiento por confianza" de
`tactical-scheme.ts` (que usa un baseline circular: la media del propio pool):

- **Partial pooling**: la estimación de cada jugador es una mezcla de su media
  observada y la media de su grupo (posición × tier de equipo), con peso
  proporcional a la evidencia: `est = (n·media_jugador + k·prior) / (n + k)`,
  donde `n` = minutos/partidos observados y `k` ≈ 5-10 partidos (calibrable).
- Jerarquía de priors en pretemporada: temporada pasada del jugador (si
  existe) → media de posición×tier del equipo → media de posición global del
  catálogo (¡el catálogo completo `allPlayers`, hoy ignorado, es el baseline
  correcto!).
- Usar **xG/xA en vez de goles/asistencias reales** siempre que haya datos
  (Understat/FBref): estabilizan con muchas menos muestras — un delantero con
  5 goles de 1.5 xG regresa a la media; uno con 1 gol de 3.0 xG va a explotar.

### 4.6 Noticias y señales externas (rehacer `news/` y `external-intelligence`)

- Clasificador: manejo de **negación y especulación** ("descartan lesión",
  "podría ser baja"), combinación de evidencias en vez de "primera regla que
  casa gana", y confianza **ponderada por fuente** (aprendida por track
  record) y **decaimiento exponencial** por antigüedad dentro de la ventana
  (no binaria de 7 días).
- Matcher: desambiguación por **equipo** mencionado en la noticia (acabar con
  los García/López), y deduplicación de la misma historia en varios medios
  (similitud de titulares) para no inflar confianza.
- **Ausencia de señal ≠ señal neutra**: propagar cobertura real a
  `dataQuality` en todas las salidas.
- Mantener categorías (injury/doubt/return/form...) hasta el modelo — no
  aplanar a buy/sell/hold al combinar (la información de "duda al 55%" vs
  "lesión al 85%" se pierde hoy).

### 4.7 Capa ML (cuando haya datos propios)

Tras 1-2 temporadas de snapshots + resultados reales:

- Ensemble **XGBoost + Random Forest por posición** (receta OpenFPL:
  mediana de ~50 modelos, hiperparámetros conservadores: ~50 árboles,
  profundidad 3, L2=10) sobre las features ya construidas (componentes,
  xMins, fixture, señales), con **5 horizontes temporales** por stat
  (1/3/5/10/38 partidos).
- Alternativa sorprendentemente competitiva con pocos datos: **Ridge
  regularizado** (Frees et al.: empata con LightGBM fuera de muestra).
- La predicción del modelo por componentes entra como **feature** del GBM
  (igual que FPL Pulse usa el xP oficial: "el modelo aprende cuándo fiarse de
  él").
- Ponderación de muestras por segmento de retorno (Zeros/Blanks/Tickers/
  Haulers) para no ignorar a los jugadores decisivos.

---

## 5. Capa de decisión

### 5.1 Presupuesto unificado (corrección inmediata)

Una sola función `computeAvailableBudget` (la de `tactical-scheme.ts:41-51`:
`efectivo + ⌊20%·valor_plantilla⌋ − pujas_activas`) usada en TODO el motor:
compras de `engine.ts`, clausulazos, y poder adquisitivo de rivales en
`clause-risk.ts` (hoy tres criterios distintos). Investigar si la actividad de
liga o el mercado exponen las pujas propias activas para el último término.

### 5.2 Optimizador de once (jornada única)

- El solver exacto actual (frentes de Pareto, `tactical-scheme.ts`) ya es
  suficiente para una jornada — la literatura confirma que greedy/exacto da
  igual a este tamaño; **lo que domina es la calidad de las predicciones**.
- Mejoras pendientes: **capitán co-optimizado** (al doblar puntos, el once
  óptimo con capitán puede diferir; entra en la función objetivo), penalización
  por varianza/riesgo de rotación (maximizar `xP − λ·σ` opcional), y respeto a
  `premiumFeatures` de la liga (capitán, banquillo que puntúa, entrenador) —
  hoy nunca se leen.

### 5.3 Optimizador multi-jornada (MILP)

El salto cualitativo: planificar fichajes, onces y capitanes varias jornadas
por delante (calendario completo disponible en la API). Formulación estándar
de la literatura (arXiv 2505.02170):

- Variables: `x_j,w` titular, `y_j,w` capitán, `b_j,w` compra, `s_j,w` venta.
- Objetivo: `max Σ_w Σ_j xP_j,w·(x_j,w + y_j,w)` menos penalización por cada
  movimiento (fricción real: las ventas tardan, las cláusulas suben).
- Restricciones: presupuesto dinámico por jornada (con la fórmula del 20% y
  ventas realizadas), formación válida, 1 capitán `y ≤ x`, tamaño de plantilla,
  jugador solo comprable si está en mercado/clausulable esa jornada.
- Solver: PuLP/OR-Tools en un script Node/Python sidecar; para 3-5 jornadas y
  ~100 candidatos resuelve en segundos.
- Variante robusta opcional: maximizar el peor caso ante incertidumbre de
  predicción (box uncertainty).

### 5.4 Motor de mercado y cláusulas

- **Tendencias de valor**: snapshots diarios propios + probabilidad de
  subida/bajada de FútbolFantasy Analytics/Comuniate → comprar antes de
  subidas, vender antes de bajadas (el ROI real del fantasy está aquí).
- **Dinámica de pujas**: `numberOfBids`, `numberOfOffers`, `expirationDate`,
  `directOffer` (todos ignorados hoy) → estimar competencia y precio mínimo
  ganador; no asumir compra a `salePrice` como coste cierto.
- **Actividad de liga** (`{CMP}/leagues/{id}/activity/{i}`, documentada y sin
  usar): revela pujas y movimientos de rivales → estimar liquidez real de cada
  rival (mejor que el proxy `teamValue`) y su comportamiento (quién ataca
  cláusulas).
- **Clausulazos**: `clause-risk.ts` con poder adquisitivo rival corregido
  (regla del 20%), alineación real del rival (endpoint de lineup, nunca
  consultado) y coste de subir cláusula en el cálculo de protección.
- **Recomendaciones emparejadas vender→comprar**: "vende a X (tendencia ↓,
  cláusula baja) para financiar a Y" — hoy no existe el concepto.
- **`impactScore` homogéneo**: una sola escala — ΔxP de la jornada (y a 3-5
  jornadas) por acción, en puntos — comparable entre tipos y con corte
  significativo. Deduplicación por jugador (una acción coherente por jugador).

---

## 6. Validación: cómo se demuestra el "3x"

### 6.1 Track record obligatorio (la pieza que falta)

Desde el primer día, persistir **cada predicción y cada recomendación** con su
contexto y, tras la jornada, los puntos reales (`playerStats[].totalPoints`
vía API — verdad absoluta, sin scraping):

```
predictions(week, player_id, xp, p_starter, e_mins, model_version)
lineups(week, team_id, formation, starters, captain, source: recommended|official)
moves(week, type, player_id, expected_delta, price, outcome_points)
```

Sin esto, ninguna mejora es demostrable. Es barato (SQLite o JSONL en
`data/`) y habilita todo lo demás.

### 6.2 Metodología

- **Walk-forward por jornadas**: predecir solo con información disponible
  antes del deadline (sin leakage; splits por jugador, no por fila).
- **Baselines**: (a) media simple de puntos (≈ el motor actual), (b) media
  ponderada con localía, (c) el motor nuevo. Mismos datos, mismas jornadas.
- **Segmentación** (OpenFPL): Zeros / Blanks (≤2) / Tickers (3-4) / Haulers
  (≥5) — la mejora que importa se concentra en Tickers/Haulers.

### 6.3 Métricas y objetivos cuantificados

| Métrica | Qué mide | Baseline esperado | Objetivo motor 3x | Referencia |
|---|---|---|---|---|
| MAE/RMSE (calibración) | Error de puntos por jugador | ≈ modelo actual | **−20-30%** (más es imposible: techo MAE ≈ 1.96) | OpenFPL: −5-34% |
| **Spearman (ranking)** | Ordenar jugadores por rendimiento | ~0.35-0.45 | **≥ 0.6 (≈1.5-2x)** | Frees, jasminex21: 0.66 |
| **Top-11 hit rate** | % del once recomendado que está en el once ideal real de la jornada | medir | **2-3x** | — |
| **Puntos once recomendado vs once-por-media** | Valor del optimizador+modelo | medir | **+30-50% por jornada** | — |
| **Puntos capitán recomendado** | La decisión más apalancada (×2) | medir | **+50-100%** | FPL Pulse: +57% publicado |
| **Precision@5 de compras** | % de compras recomendadas que superan a su sustituido | medir | ≥ 60-70% | — |
| **ROI de fichajes** | Δpuntos/€ gastado vs seguir la media | medir | **2-3x** | — |
| Calibración de probabilidades | P(titular) predicha vs frecuencia real | — | Brier ↓, curva calibrada | — |

**Honestidad**: "3x en MAE" es matemáticamente inalcanzable (superaría al
modelo perfecto). El compromiso de este diseño es **2-3x en las métricas de
decisión** (once, capitán, ROI), que son las que ganan ligas, con −20-30% de
MAE como calibración. El dashboard de track record mostrará estas métricas
por jornada contra el baseline — la mejora será visible y medible, no una
afirmación.

---

## 7. Arquitectura propuesta

### 7.1 Módulos nuevos (en `src/lib/engine/`)

```
src/lib/engine/
  scoring-table.ts        # tabla de puntos por acción (derivada de playerStats)
  features/
    form.ts               # medias móviles con decaimiento (1/3/5/10/38)
    fixture.ts            # tiers ClubElo + multiplicadores posición×tier×localía
    minutes.ts            # xMins: titularidad, rotación, onces probables
    shrinkage.ts          # partial pooling con priors posición×tier
  sources/
    jornadaperfecta.ts    # onces probables + bajas (adaptador + caché)
    understat.ts          # xG/xA/xGA (adaptador + caché)
    clubelo.ts            # ELO + probabilidades de marcador (CSV)
    sofascore.ts          # alineaciones confirmadas (adaptador + caché)
    futbolfantasy.ts      # tendencias de mercado (adaptador + caché)
  model.ts                # xP por componentes (§4.3)
  predict.ts              # orquesta features → xP + P(titular) + dataQuality
  optimize.ts             # MILP multi-jornada (sidecar) / re-export Pareto 1-jornada
  market.ts               # tendencias, pujas, actividad de liga, ROI
  track-record.ts         # persistencia de predicciones y resultados
```

Los módulos actuales (`points-estimator`, `captain`, `clause-risk`,
`starter-status`, `external-intelligence`, `news/*`) se reimplementan sobre
estas primitivas o se reemplazan; `engine.ts` pasa a consumir `predict.ts` y
`market.ts` con un `impactScore` homogéneo (ΔxP).

### 7.2 Recolección y persistencia

- **Snapshot diario** (cron en el servidor o `scripts/snapshot.ts` + cron del
  sistema): catálogo de jugadores (valor, puntos, estado), mercado, jornada →
  `data/snapshots/YYYY-MM-DD.json` (o SQLite `data/fantasy.db`).
- **Cierre de jornada**: al finalizar cada jornada, volcar puntos reales por
  jugador (`playerStats`) → alimenta backtesting, forma reciente y
  calibración.
- **Refresco de fuentes externas** con TTL por tipo: onces probables 3-6 h,
  lesiones 6 h, xG 24 h, ELO 24 h, tendencias mercado 12 h, alineaciones
  confirmadas 15 min (solo cerca del deadline).
- Caché en disco + fallback al último dato bueno (regla 3.5).

### 7.3 Integración con la app

- `/api/recommendations` y `/api/league-analysis` consumen `predict.ts` —
  misma forma de respuesta, mejores números, `dataQuality` completo.
- Nuevo endpoint `/api/track-record` + pestaña/sección en el dashboard:
  métricas del §6.3 por jornada contra el baseline (transparencia de la
  mejora).
- Pre-cómputo en segundo plano tras cada snapshot (el cálculo completo es
  pesado para servirlo síncrono): la API sirve el último resultado materializado.

---

## 8. Roadmap por fases

**Fase 0 — Fundamentos (1-2 semanas, sin fuentes externas nuevas)**
1. Track record + snapshots diarios (§6.1, §7.2). *Sin esto no hay "3x"
   demostrable: va primero.*
2. Presupuesto unificado con la regla del 20% en todo el motor (§5.1).
3. Forma reciente desde `playerStats` (ventana 10 con decaimiento) en el
   estimador; corregir `/38`, titularidad por partido único y detección de
   jornada de descanso.
4. Tabla de puntuación derivada de `playerStats` (§4.2) y estimador por
   componentes v1 (sin xG externo todavía: usa las stats reales de la API).
5. `impactScore` homogéneo (ΔxP) + deduplicación por jugador + respeto a
   `premiumFeatures`.

**Fase 1 — Fuentes externas (2-3 semanas)**

6. ClubElo (fixture difficulty real) y multiplicadores posición×tier×localía.
7. Jornada Perfecta (onces probables + bajas) → xMins v1; eliminar la doble
   contabilidad del estimador/capitán.
8. Snapshots de valor + FútbolFantasy Analytics (tendencias) → motor de
   mercado con timing de compra/venta.
9. Understat/FBref (xG/xA) → componentes v2 (goles/asistencias por xG,
   Poisson clean sheet con xGA).
10. Actividad de liga + alineaciones rivales → clause-risk y clausulazos con
    liquidez y necesidad reales.

**Fase 2 — Decisión avanzada (2-4 semanas)**

11. Shrinkage jerárquico con priors posición×tier (§4.5) y shrinkage
    calibrado por backtesting.
12. Capitán co-optimizado dentro del solver; penalización por riesgo.
13. MILP multi-jornada (§5.3) con presupuesto dinámico y fricción de
    movimientos.
14. Rehacer clasificador/matcher de noticias (§4.6).
15. Sofascore: override con alineación confirmada cerca del deadline.

**Fase 3 — Aprendizaje (continuo, tras 1+ temporada de datos)**

16. Dashboard de track record con las métricas del §6.3.
17. Calibración automática de pesos (búsqueda por backtesting walk-forward).
18. Ensemble GBM por posición (§4.7) cuando el dataset lo soporte.

Cada fase es desplegable y medible por separado: el track record dirá cuánto
aporta cada una.

---

## 9. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Token de la API oficial caduca (~24 h) | Snapshots fallan | Refresco con `refresh_token` (documentado en `agent-docs/useful-docs/authentication.md`); alerta si falla 2 veces |
| Baneo por scraping (FBref, Transfermarkt, Sofascore) | Pérdida de fuente | Caché agresiva, pocas peticiones, UA identificable, fallback a último dato; ninguna fuente externa es crítica por sí sola |
| Webs externas cambian estructura | Adaptador roto | Contrato por adaptador (§3.5.3) + test de humo por fuente; degradación graciosa anotada en `dataQuality` |
| xG de Understat/FBref no cubre a un jugador concreto | Feature vacía | Fallback a stats reales de la API (componentes v1) |
| Overfitting del modelo a pocas jornadas | Predicciones peores que el baseline | Componentes + shrinkage primero; GBM solo con 1+ temporada y validación walk-forward estricta; comparación contra baseline siempre visible |
| Pujas activas propias no expuestas por la API | Presupuesto ligeramente sobrestimado | Inferir de actividad de liga si es posible; si no, se anota en `dataQuality` (ya implementado) |
| Datos de pretemporada (todo prior) | Confianza baja | `dataQuality` expone el nivel; el usuario ve cuándo el motor "sabe poco" |

---

## 10. Referencias

**Literatura y modelos**
- OpenFPL (SOTA abierto, ensemble GBM por posición): https://arxiv.org/html/2508.09992v1 — código: https://github.com/daniegr/OpenFPL
- fpl-solver (modelo por componentes + MILP multi-periodo, con fórmulas): https://github.com/lisovoy7/fpl-solver — blog: https://github.com/lisovoy7/fpl-solver/blob/main/blog_part2_predictions.md
- ILP para fantasy con estimadores comparados: https://arxiv.org/html/2505.02170v1
- Frees et al. (Ridge/LightGBM/CNN; minutos como feature top): https://arxiv.org/html/2405.02412v1
- FPL Pulse (métricas reales, techo teórico MAE≈1.96): https://www.fplpulse.com/blog/fpl-predicted-points-model
- FPL Review (modelo comercial: cuotas + xMins): https://docs.fplreview.com/getting-started/about-fplreview/
- FPL Optimization Tools (workflow LP): https://github.com/sertalpbilal/FPL-Optimization-Tools
- Dataset estándar FPL: https://github.com/vaastav/Fantasy-Premier-League
- Dixon-Coles con decaimiento ξ=0.0065: https://predictionengine.app/learn/dixon-coles-soccer-model
- Partial pooling (shrinkage jerárquico): https://www.pymc.io/projects/examples/en/latest/case_studies/hierarchical_partial_pooling.html
- Puntos Relevo (componente de medios del scoring): https://www.relevo.com/fantasy/laliga-fantasy-2023-puntos-relevo-20230714181409-nt.html
- Precisión de alineaciones previstas (75-88%): https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/premium-expected-lineups

**Fuentes de datos (verificadas agosto 2026)**
- FútbolFantasy Analytics mercado: https://www.futbolfantasy.com/analytics/laliga-fantasy/mercado
- Comuniate mercado: https://www.comuniate.com/mercado/fantasy
- Jornada Perfecta onces: https://www.jornadaperfecta.com/onces-posibles/ — bajas: https://www.jornadaperfecta.com/lesionados
- Predicted11: https://www.predicted11.com/es/laliga
- FBref LaLiga: https://fbref.com/en/comps/12/La-Liga-Stats
- Understat LaLiga: https://understat.com/league/La_liga/2026
- Sofascore API: https://www.sofascore.com/api/v1/unique-tournament/8/seasons
- ClubElo API: http://api.clubelo.com/Fixtures
- API-Football: https://www.api-football.com/pricing
- Transfermarkt bajas: https://www.transfermarkt.com/primera-division/verletztespieler/wettbewerb/ES1

**Documentación interna relacionada**
- `agent-docs/laliga-fantasy-analysis.md` — análisis funcional de la API oficial
- `agent-docs/useful-docs/api-reference.md` — endpoints y respuestas de ejemplo
- Auditoría del motor actual: §2 de este documento (con citas archivo:línea)
