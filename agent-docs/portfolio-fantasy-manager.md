## Datos generales

- **Slug**: `laliga-fantasy-manager`
- **Categoría**: `web`
- **Año**: `2026`
- **Tags**: `Astro, React, TypeScript, TailwindCSS, TanStack Query, TanStack Table, Radix UI, Framer Motion, Zustand, Playwright, Node.js`
- **Link en producción**: `sin publicar`
- **Link de GitHub**: `https://github.com/rezzt-dev/fantasy-manager`

## Contenido en español

- **Título**: LALIGA FANTASY Manager
- **Subtítulo**: Asistente web profesional que conecta con la API oficial de LALIGA FANTASY para analizar tu equipo y recomendar decisiones con un motor predictivo propio.
- **Descripción corta**: Dashboard profesional que analiza tu liga de LALIGA FANTASY en tiempo real y recomienda fichajes, alineaciones, capitán y clausulazos mediante un motor de puntos esperados (xP).
- **Descripción completa**: LALIGA FANTASY Manager es una aplicación web full-stack construida con Astro y React que se conecta directamente a la API oficial de LALIGA FANTASY para dar a los managers del juego una capa de análisis que la app oficial no ofrece. Resuelve el problema de tomar decisiones (fichajes, alineación, capitanía, protección de cláusulas) sin datos objetivos, cruzando rendimiento histórico, fuerza del rival, onces probables, noticias de prensa deportiva y riesgo de clausulazos en un motor predictivo por fases que además se autocalibra con los resultados reales de cada jornada. Incluye también predicción de puntuación por equipo rival, partidos en vivo vía SofaScore y un panel de "Track Record" que audita la precisión del propio modelo. Está pensado para managers de LALIGA FANTASY que gestionan una o varias ligas privadas y quieren competir con ventaja analítica.
- **Rol**: Desarrollador Full Stack (arquitectura, backend/proxy de API, motor de recomendaciones, integración de contribuciones externas y estabilización post-merge)
- **Duración**: En curso (inicio 3 agosto 2026, última actividad registrada 20 agosto 2026)

**Cita del proceso**: "El valor no está en mostrar los datos de LALIGA FANTASY, sino en convertirlos en una decisión: comprar, vender, alinear o proteger — y en medir si esa decisión acertó."

**Pasos del proceso**:
1. `Ingeniería inversa y proxy seguro de la API oficial` — La API oficial de LALIGA FANTASY no es pública ni documentada, así que se construyó un proxy propio en Astro que replica su autenticación (ROPC de Azure B2C y tokens JWT para cuentas Google) guardando los tokens únicamente en sesiones de servidor, sin exponerlos nunca al cliente. El proxy prueba varios endpoints en cascada para casos como obtener la alineación real de la jornada, quedándose con la respuesta más completa cuando la API oficial es inconsistente.
2. `Motor de recomendaciones evolutivo por fases` — En vez de un modelo monolítico, el motor se diseñó en cuatro fases incrementales (estimación base por componentes → fuentes externas como Elo y onces probables → decisión avanzada con planificación multi-jornada → aprendizaje con calibración automática cuando hay ≥30 muestras jugador-jornada), lo que permitió lanzar valor pronto y mejorar la precisión del modelo con datos reales sin rehacer la arquitectura.
3. `Integración y estabilización de contribuciones externas` — Un colaborador (ImNacho0) desarrolló en un fork el rediseño completo del dashboard, el motor predictivo, los partidos en vivo y las predicciones por equipo; esas funcionalidades se replicaron e integraron en el repositorio principal y, tras el merge, se dedicó un ciclo específico a corregir errores reales introducidos (referencias a funciones inexistentes, estados vacíos sin manejar) y a sanear la alineación oficial filtrando jugadores sancionados o que ya no pertenecen a la plantilla.

**Features**:
1. `psychology` — Motor de recomendaciones con puntos esperados (xP) — Estima el rendimiento de cada jugador combinando forma histórica, dificultad del rival (Elo), probabilidad de titularidad, noticias y riesgo de lesión, traduciéndolo en recomendaciones de compra, venta, alineación óptima, capitán y clausulazos.
2. `calendar_month` — Planificación multi-jornada — Un optimizador evalúa movimientos a lo largo de varias jornadas con una lógica de Pareto que tiene en cuenta el efectivo disponible y una fricción de 1.5 puntos por movimiento, devolviendo un plan de varias semanas con capitán co-optimizado.
3. `insights` — Track Record con calibración automática — Audita la calidad del propio modelo por jornada (error medio, correlación de Spearman, acierto en el once ideal, ROI) y recalibra automáticamente sus parámetros cuando acumula suficientes datos reales.
4. `sports_soccer` — Partidos en vivo y noticias con impacto directo — Integra marcador y eventos en vivo vía SofaScore y un clasificador de feeds RSS de prensa deportiva que detecta lesiones y sanciones, ponderando esa información dentro del propio cálculo de probabilidades del motor.
5. `shield_lock` — Autenticación segura multi-flujo — Soporta login con email/contraseña (ROPC de Azure B2C) y con token JWT para cuentas vinculadas a Google, almacenando siempre los tokens en sesiones de servidor y enviando al cliente solo un identificador de sesión.

## Contenido en inglés

- **Title**: LALIGA FANTASY Manager
- **Subtitle**: A professional web assistant that connects to LALIGA FANTASY's official API to analyze your team and recommend decisions through a custom predictive engine.
- **Short description**: A professional dashboard that analyzes your LALIGA FANTASY league in real time and recommends transfers, lineups, captaincy and buyout clauses through an expected-points (xP) engine.
- **Full description**: LALIGA FANTASY Manager is a full-stack web app built with Astro and React that connects directly to LALIGA FANTASY's official API to give game managers an analytics layer the official app doesn't provide. It tackles the problem of making decisions (transfers, lineup, captaincy, clause protection) without objective data, blending historical performance, opponent strength, probable lineups, sports news and buyout-clause risk into a phased predictive engine that self-calibrates against each matchday's real results. It also includes rival team score predictions, live matches via SofaScore, and a "Track Record" panel that audits the model's own accuracy. It's built for LALIGA FANTASY managers running one or several private leagues who want an analytical edge.
- **Role**: Full Stack Developer (architecture, API proxy/backend, recommendation engine, integrating external contributions and post-merge stabilization)
- **Duration**: Ongoing (started August 3, 2026, last recorded activity August 20, 2026)

**Process quote**: "The value isn't in showing LALIGA FANTASY's data — it's in turning it into a decision: buy, sell, start, or protect — and measuring whether that decision was right."

**Process steps**:
1. `Reverse-engineering a secure proxy for the official API` — LALIGA FANTASY's official API is undocumented and private, so a custom Astro proxy was built to replicate its auth flows (Azure B2C ROPC and JWT tokens for Google accounts), keeping tokens exclusively in server-side sessions and never exposing them to the client. The proxy cascades across several endpoints for cases like fetching the current-matchday lineup, keeping whichever response is most complete when the official API is inconsistent.
2. `A recommendation engine built in evolutionary phases` — Instead of one monolithic model, the engine was designed in four incremental phases (baseline component estimator → external sources like Elo and probable lineups → advanced decisioning with multi-week planning → learning with automatic calibration once ≥30 player-matchday samples accumulate), delivering value early while letting the model's accuracy improve from real results without a rewrite.
3. `Integrating and stabilizing external contributions` — A collaborator (ImNacho0) built the full dashboard redesign, the predictive engine, live matches and team score predictions in a fork; those features were replicated and merged into the main repository, followed by a dedicated cycle to fix real bugs introduced by the merge (calls to undefined functions, unhandled empty states) and to sanitize the official lineup by filtering out suspended players or players no longer on the roster.

**Features**:
1. `psychology` — Expected-points (xP) recommendation engine — Estimates each player's output by combining historical form, opponent difficulty (Elo), starting probability, news and injury risk, turning it into buy, sell, optimal lineup, captain and buyout-clause recommendations.
2. `calendar_month` — Multi-matchday planning — An optimizer evaluates moves across several matchdays using Pareto logic that accounts for available cash and a 1.5-point friction per move, returning a multi-week plan with a co-optimized captain.
3. `insights` — Track Record with automatic calibration — Audits the model's own quality per matchday (mean error, Spearman correlation, best-XI hit rate, ROI) and automatically recalibrates its parameters once enough real data accumulates.
4. `sports_soccer` — Live matches and news with direct impact — Integrates live scores and events via SofaScore and an RSS classifier for sports news that detects injuries and suspensions, feeding that signal directly into the engine's own probability calculations.
5. `shield_lock` — Secure multi-flow authentication — Supports email/password login (Azure B2C ROPC) and JWT token login for Google-linked accounts, always storing tokens in server-side sessions and sending only a session ID to the client.

## Notas y supuestos

- **Año**: inferido con alta confianza a partir de los timestamps reales de los commits de git (primer commit: 3 de agosto de 2026; último: 20 de agosto de 2026), no de una fecha declarada en el repo. Si tu sistema de control de versiones tiene fechas manipuladas o reescritas, confírmalo.
- **Estado "en curso"**: inferido porque hay una sección "Próximos pasos" con tareas pendientes en `agent-docs/useful-docs/implementation-notes.md` (refresh token automático, acciones de pujar/vender desde la UI, tests automatizados adicionales) y la última actividad es reciente. No hay ningún indicio de que el proyecto esté archivado o descontinuado.
- **URL de producción**: no encontré ningún indicio de despliegue (sin `vercel.json`, `netlify.toml`, `Dockerfile`, ni referencias a un dominio). Puse "sin publicar"; confírmame si existe una URL real.
- **Link de GitHub**: lo tomé del `git remote origin` (`https://github.com/rezzt-dev/fantasy-manager`). No puedo verificar desde aquí si el repositorio es público o privado en GitHub — el `LICENSE.md` es de "todos los derechos reservados" (propietario), lo cual es independiente de la visibilidad del repo. Confírmame si debo indicar "repositorio privado" en su lugar.
- **Rol**: el historial de git muestra un único autor de commits en el repo principal (rezztdev), pero los mensajes de merge documentan explícitamente que otro colaborador (usuario de GitHub "ImNacho0") desarrolló funcionalidades completas en un fork externo que tú replicaste, integraste y depuraste. Si "ImNacho0" es un colaborador real con quien trabajaste en equipo (y no una IA/agente con ese alias), quizá quieras mencionarlo explícitamente en el portfolio o ajustar tu "Rol" a algo como "Desarrollador Full Stack (líder técnico)".
- **Capturas/assets**: no hay screenshots del dashboard en el repo salvo capturas de test E2E en `e2e/*.png` (pensadas para debugging, no para portfolio) y un icono en `public/fantasy-manager-icon.png`. Necesitarás capturas de pantalla reales de la app corriendo para los assets visuales del portfolio.
- **Dato adicional que no encajó en la plantilla pero vale la pena mencionar**: el proyecto usa escritura atómica y file locks propios (`engine/jsonl.ts`, `engine/file-lock.ts`) para persistir predicciones y track record en disco sin corrupción por escrituras concurrentes — un detalle técnico de robustez de sistemas que podría destacarse aparte si tu portfolio tiene espacio para "detalles técnicos" adicionales.
- **React 18 vs 19**: el README y los docs internos mencionan que el proyecto se mantiene deliberadamente en React 18.3 (bajado desde 19) para evitar problemas de hidratación con Vite — es una decisión técnica real documentada que no incluí como "paso de proceso" para no sobrecargar la plantilla, pero es un buen ejemplo de resolución de problemas si quieres ampliarlo en la descripción completa.
