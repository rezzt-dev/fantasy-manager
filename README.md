<div align="center">
  <img src="./public/fantasy-manager-icon.png" alt="Fantasy Manager Logo" width="80" height="80" />
  <h1 align="center">LALIGA FANTASY Manager</h1>

  <p align="center">
    <strong>Asistente profesional para gestionar, analizar y optimizar tus equipos de LALIGA FANTASY.</strong>
    <br />
    Conexión directa a la API oficial, motor predictivo de recomendaciones, predicción de puntuaciones por equipo y partidos en vivo.
  </p>

  <p align="center">
    <a href="https://astro.build/"><img src="https://img.shields.io/badge/Astro-7.1-FF5D01?style=for-the-badge&logo=astro&logoColor=white" alt="Astro" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
    <a href="https://tanstack.com/query"><img src="https://img.shields.io/badge/TanStack_Query-5-FF4154?style=for-the-badge&logo=reactquery&logoColor=white" alt="TanStack Query" /></a>
    <a href="https://www.radix-ui.com/"><img src="https://img.shields.io/badge/Radix_UI-Primitives-161618?style=for-the-badge&logo=radixui&logoColor=white" alt="Radix UI" /></a>
    <a href="https://www.framer.com/motion/"><img src="https://img.shields.io/badge/Framer_Motion-12-EA6C5D?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" /></a>
    <a href="https://playwright.dev/"><img src="https://img.shields.io/badge/Playwright-E2E-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" /></a>
  </p>
</div>

<hr />

## <img src="https://api.iconify.design/lucide/list.svg?color=white" width="24" height="24" align="absbottom" /> Tabla de Contenidos

- [<img src="https://api.iconify.design/lucide/sparkles.svg?color=white" width="16" height="16" align="absbottom" /> Características Principales](#-características-principales)
- [<img src="https://api.iconify.design/lucide/layout-dashboard.svg?color=white" width="16" height="16" align="absbottom" /> El Dashboard](#-el-dashboard)
- [<img src="https://api.iconify.design/lucide/layers.svg?color=white" width="16" height="16" align="absbottom" /> Stack Tecnológico](#-stack-tecnológico)
- [<img src="https://api.iconify.design/lucide/folder-tree.svg?color=white" width="16" height="16" align="absbottom" /> Estructura del Proyecto](#-estructura-del-proyecto)
- [<img src="https://api.iconify.design/lucide/rocket.svg?color=white" width="16" height="16" align="absbottom" /> Instalación y Uso](#-instalación-y-uso)
- [<img src="https://api.iconify.design/lucide/settings.svg?color=white" width="16" height="16" align="absbottom" /> Configuración](#-configuración)
- [<img src="https://api.iconify.design/lucide/brain.svg?color=white" width="16" height="16" align="absbottom" /> Motor de Recomendaciones](#-motor-de-recomendaciones)
- [<img src="https://api.iconify.design/lucide/webhook.svg?color=white" width="16" height="16" align="absbottom" /> API Propia](#-api-propia)
- [<img src="https://api.iconify.design/lucide/test-tube.svg?color=white" width="16" height="16" align="absbottom" /> Pruebas](#-pruebas)
- [<img src="https://api.iconify.design/lucide/book-open.svg?color=white" width="16" height="16" align="absbottom" /> Documentación Técnica](#-documentación-técnica)

---

## <img src="https://api.iconify.design/lucide/sparkles.svg?color=white" width="24" height="24" align="absbottom" /> Características Principales

<details open>
<summary><b><img src="https://api.iconify.design/lucide/layout-dashboard.svg?color=white" width="18" height="18" align="absbottom" /> Dashboard Profesional y Productivo</b></summary>
<br/>
Interfaz rediseñada como aplicación web profesional: sidebar fija plegable, header global, navegación móvil, paleta de comandos (<code>Cmd/Ctrl + K</code>), notificaciones con <strong>sonner</strong>, modo compacto (<code>D</code>) y atajos de teclado para cada pestaña. Animaciones con <strong>Framer Motion</strong> y contadores animados con <strong>@number-flow/react</strong>. El fondo base es <code>#151515</code> con acento <code>#ECECEC</code> para mantener un contraste oscuro y elegante.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/brain.svg?color=white" width="18" height="18" align="absbottom" /> Motor de Recomendaciones Inteligentes</b></summary>
<br/>
El núcleo de la aplicación es un motor predictivo en <code>src/lib/engine/</code> que estima puntos esperados (xP) por componentes: rendimiento histórico, fuerza del rival (Elo), probabilidad de titularidad (onces probables + confirmaciones), noticias, riesgo de lesión y riesgo de clausulazos rivales. Ofrece recomendaciones de <strong>compra, venta, alineación óptima, clausulazos, protección de cláusulas, capitán y mejores movimientos</strong>.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/calendar-range.svg?color=white" width="18" height="18" align="absbottom" /> Planificación Multi-Jornada</b></summary>
<br/>
El planificador <code>optimize.ts</code> evalúa movimientos a lo largo de varias jornadas con una optimización de Pareto que incluye efectivo, plantilla arrastrada y fricción de 1.5 pts por movimiento. Devuelve un <strong>plan multi-jornada</strong> con capitán co-optimizado para maximizar la puntuación esperada a medio plazo.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/trending-up.svg?color=white" width="18" height="18" align="absbottom" /> Predicción de Puntuación por Equipo</b></summary>
<br/>
Nueva pestaña <strong>Score Predictions</strong> que estima los puntos esperados de cada equipo de la liga para la jornada actual. Cruza el once titular (real para el propio equipo, inferido para rivales), capitán co-optimizado, entrenador estimado y banquillo de 5 suplentes con mayor xP. Persiste snapshots en <code>data/score-predictions/</code>.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/radio.svg?color=white" width="18" height="18" align="absbottom" /> Partidos en Vivo</b></summary>
<br/>
Nueva pestaña <strong>Matches</strong> con el calendario de LaLiga de la jornada actual, marcador, minuto, estado (pendiente, en vivo, descanso, finalizado), escudos y eventos (goles, tarjetas, sustituciones). Los partidos de tus jugadores se destacan automáticamente como <em>importantes</em>. Datos vía SofaScore con caché de corta duración.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/line-chart.svg?color=white" width="18" height="18" align="absbottom" /> Track Record y Calibración Automática</b></summary>
<br/>
La pestaña <strong>Track Record</strong> muestra métricas de calidad del modelo por jornada y en total: MAE vs baseline, Spearman, top-11 hit rate, puntos del capitán, Precision@5 y ROI. El sistema persiste predicciones y recomendaciones, liquida resultados reales y calibra automáticamente los parámetros del modelo cuando acumula ≥30 muestras jugador-jornada.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/newspaper.svg?color=white" width="18" height="18" align="absbottom" /> Inteligencia de Noticias</b></summary>
<br/>
Procesa feeds RSS de la prensa deportiva (Marca, AS, Mundo Deportivo, Sport, 20minutos) con un clasificador que detecta lesiones, sanciones, dudas, rotaciones y especulación. Las noticias se asocian a jugadores, se ponderan por fuente, decaen con τ=3 días y se deduplican, impactando directamente en las probabilidades de minutos y las recomendaciones.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/users.svg?color=white" width="18" height="18" align="absbottom" /> Análisis de Rivales y Mercado</b></summary>
<br/>
Explora la plantilla completa de cada rival, el estado de protección de cada jugador (disponible, protegido por fecha, blindado), oportunidades de clausulazos estratégicos y riesgos de que te roben tus jugadores clave. El análisis cruza la actividad real de la liga con tu presupuesto disponible.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/bar-chart-3.svg?color=white" width="18" height="18" align="absbottom" /> Estadísticas Profesionales</b></summary>
<br/>
Gráficos y tablas avanzadas para comparar el valor de los equipos, distribución por posiciones, riesgo de cláusulas, evolución de la clasificación, comparación de managers y relación puntos/valor. Las tablas usan <strong>@tanstack/react-table</strong> con sorting, paginación, export CSV y modo denso.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/shield-check.svg?color=white" width="18" height="18" align="absbottom" /> Autenticación Segura</b></summary>
<br/>
Inicia sesión con email y contraseña de LALIGA FANTASY (flujo ROPC de Azure B2C) o con tu <i>access token</i> JWT para cuentas vinculadas con Google. Los tokens se almacenan de forma segura en sesiones de servidor Astro; al cliente solo se envía un ID de sesión.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/bell.svg?color=white" width="18" height="18" align="absbottom" /> Notificaciones Persistentes</b></summary>
<br/>
La campana de notificaciones del header agrupa las alertas de la liga (lesiones, dudas, cláusulas en riesgo, oportunidades de mercado). El hook <code>useNotifications</code> persiste el estado de lectura en <code>localStorage</code> con sincronización entre pestañas del navegador: marcar todo como leído o descartar una alerta individual oculta esa alerta en el badge del header, en <strong>Overview</strong> y en el propio panel, incluso tras recargar la página.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/list-checks.svg?color=white" width="18" height="18" align="absbottom" /> Alineación Real vs. Recomendada</b></summary>
<br/>
La pestaña <strong>Alineación</strong> separa dos vistas: la alineación <em>actual</em> que declaraste en LALIGA FANTASY (saneada automáticamente: se descartan jugadores que ya no están en tu plantilla, se infiere el entrenador cuando falta y se avisa si el once está incompleto o hay descartes) y la alineación <em>recomendada</em> por el motor, con puntos esperados y banquillo sugerido. Los jugadores sancionados o expulsados (<code>isSuspended</code>) quedan excluidos de cualquier alineación óptima, capitanía o predicción de puntuación.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/shield.svg?color=white" width="18" height="18" align="absbottom" /> Robustez Frente a la API Oficial</b></summary>
<br/>
El cliente hacia la API oficial (<code>src/lib/fantasy/</code>) prueba varios endpoints en cascada para obtener la alineación de la jornada actual (equipo genérico y por jornada) y se queda con la respuesta con más jugadores de campo válidos. La persistencia en disco (track record, predicciones de puntuación, snapshots) usa <strong>escritura atómica</strong> y <strong>file locks</strong> (<code>engine/jsonl.ts</code>, <code>engine/file-lock.ts</code>) para evitar corrupción por escrituras concurrentes.
</details>

---

## <img src="https://api.iconify.design/lucide/layout-dashboard.svg?color=white" width="24" height="24" align="absbottom" /> El Dashboard

El dashboard está organizado en pestañas accesibles desde la sidebar, la navegación móvil y la paleta de comandos:

| Pestaña | Atajo | Descripción |
|---------|-------|-------------|
| **Overview** | `Cmd/Ctrl + 1` | Resumen ejecutivo de la liga: dinero, valor de plantilla, próximo partido, alertas y actividad. |
| **Mi Equipo** | `Cmd/Ctrl + 2` | Plantilla completa con estado, cláusulas, valores y puntos de cada jugador. |
| **Alineación** | `Cmd/Ctrl + 3` | Vista dual: alineación real declarada (saneada) y alineación recomendada que maximiza xP, con capitán y banquillo incluidos. |
| **Mercado** | `Cmd/Ctrl + 4` | Jugadores en venta, ofertas y oportunidades de compra recomendadas. |
| **Rivales** | `Cmd/Ctrl + 5` | Plantillas de los managers rivales, cláusulas y riesgos. |
| **Clasificación** | `Cmd/Ctrl + 6` | Tabla de clasificación y gráficos de evolución. |
| **Estadísticas** | `Cmd/Ctrl + 7` | Análisis avanzado de la liga con gráficos y tablas comparativas. |
| **Score Predictions** | `Cmd/Ctrl + 8` | Predicción de puntos esperados por equipo para la jornada. |
| **Matches** | `Cmd/Ctrl + 0` | Partidos en vivo de la jornada con marcador y eventos. |
| **Track Record** | — | Métricas del modelo, calibración y evolución de predicciones. |

> **Atajos globales:** `Cmd/Ctrl + K` (paleta de comandos), `R` (recargar datos), `D` (modo compacto), `B` (plegar sidebar).

---

## <img src="https://api.iconify.design/lucide/layers.svg?color=white" width="24" height="24" align="absbottom" /> Stack Tecnológico

La aplicación está construida con un stack moderno orientado al rendimiento, el tipado seguro y una excelente experiencia de desarrollador:

| Tecnología | Rol en el Proyecto |
|------------|--------------------|
| **[Astro 7.1](https://astro.build/)** | Framework principal. SSR, rutas de API integradas y almacenamiento de sesiones en servidor vía `@astrojs/node`. |
| **[React 18.3](https://react.dev/)** | Componentes interactivos e islas hidratadas con `client:only="react"`. Se mantiene en v18 para evitar problemas de hidratación. |
| **[Tailwind CSS 3.4](https://tailwindcss.com/)** | Sistema de diseño basado en utilidades con paleta oscura personalizada. |
| **[TanStack Query](https://tanstack.com/query)** | Gestión del estado asíncrono, fetching de datos y caché en cliente. |
| **[TanStack Table](https://tanstack.com/table)** | Tablas profesionales con sorting, filtrado, paginación y export CSV. |
| **[Radix UI](https://www.radix-ui.com/)** | Primitivos accesibles para diálogos, tabs, dropdowns, tooltips, command palette, etc. |
| **[Framer Motion](https://www.framer.com/motion/)** | Animaciones de layout, transiciones de pestañas y micro-interacciones. |
| **[@number-flow/react](https://github.com/barvian/number-flow)** | Contadores animados para KPIs y valores monetarios. |
| **[Zustand](https://github.com/pmndrs/zustand)** | Estado global ligero para preferencias de UI (densidad, sidebar). |
| **[sonner](https://sonner.emilkowal.ski/)** | Notificaciones toast globales. |
| **[Recharts](https://recharts.org/)** | Gráficos de estadísticas y evolución de la liga. |
| **[Playwright](https://playwright.dev/)** | Tests End-to-End de flujos críticos (login, dashboard). |
| **[@cmdk](https://cmdk.paco.me/)** | Paleta de comandos accesible. |

---

## <img src="https://api.iconify.design/lucide/folder-tree.svg?color=white" width="24" height="24" align="absbottom" /> Estructura del Proyecto

```
fantasy-manager/
├── .env.credentials              # Email/password (no versionar)
├── .env.local                    # Tokens y configuración (no versionar)
├── .env.example                  # Plantilla de variables de entorno
├── astro.config.mjs
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tailwind.config.mjs
├── playwright.config.ts
├── public/
│   ├── favicon.ico
│   └── fantasy-manager-icon.png
├── src/
│   ├── components/
│   │   ├── auth/                 # Formularios de autenticación
│   │   ├── dashboard/            # Pestañas del dashboard (Overview, Team, Lineup, Market, Rivals, Standings, Statistics, Score Predictions, Matches, Track Record)
│   │   ├── layout/               # AppLayout, Sidebar, Header, MobileNav, CommandPalette, NotificationBell
│   │   ├── league/               # Resumen de liga y equipo
│   │   ├── market/               # Componentes específicos de la pestaña Mercado
│   │   ├── recommendations/      # Panel de recomendaciones
│   │   ├── shared/               # Componentes reutilizables (KpiCard, DataTable, PlayerCard, etc.)
│   │   ├── statistics/           # Gráficos y tablas analíticas
│   │   ├── team/                 # Componentes específicos de la pestaña Mi Equipo
│   │   └── ui/                   # Primitivos UI estilo shadcn (Radix + Tailwind)
│   ├── hooks/                    # useDashboardTab, useDensity, useSidebarCollapsed, useNotifications
│   ├── lib/
│   │   ├── analysis/             # Análisis de liga, alineación óptima, estado de titulares, predictor de puntuación por equipo
│   │   ├── engine/               # Motor predictivo, fuentes externas, partidos, track record, calibración y persistencia atómica
│   │   ├── fantasy/              # Cliente hacia API oficial, proxy, formaciones, mercado, calendario, actividad de liga
│   │   ├── news/                 # Ingesta RSS, clasificador y matcher de noticias
│   │   ├── recommendations/      # Motor de recomendaciones, capitán, riesgo de cláusulas, inteligencia externa
│   │   └── utils/                # Utilidades compartidas
│   ├── pages/
│   │   ├── api/                  # Endpoints propios (auth, proxy, recommendations, league-analysis, matches, score-predictions, track-record, debug)
│   │   ├── dashboard.astro
│   │   ├── login.astro
│   │   └── index.astro
│   ├── stores/                   # Estado global con Zustand (authStore)
│   ├── styles/                   # Estilos globales y tema oscuro
│   └── types/                    # Modelos de datos TypeScript
├── data/                         # Datos de runtime (cachés, snapshots, track record, score predictions)
├── e2e/                          # Tests End-to-End con Playwright (login, densidad, responsive)
└── agent-docs/
    └── useful-docs/              # Documentación técnica detallada
```

---

## <img src="https://api.iconify.design/lucide/rocket.svg?color=white" width="24" height="24" align="absbottom" /> Instalación y Uso

### Prerrequisitos

- <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg" alt="Node.js" width="16" height="16" /> Node.js `>= 22.12.0`
- <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/pnpm/pnpm-original.svg" alt="pnpm" width="16" height="16" /> pnpm

### Pasos de Instalación

1. **Clona el repositorio e instala las dependencias**:
   ```bash
   pnpm install
   ```

2. **Configura el entorno** (ver sección <a href="#-configuración">Configuración</a>):
   ```bash
   cp .env.example .env.local
   # Edita .env.local con tus tokens/credenciales
   ```

3. **Inicia el servidor en modo desarrollo**:
   ```bash
   pnpm dev
   ```
   > <img src="https://api.iconify.design/lucide/link.svg?color=white" width="14" height="14" align="absbottom" /> *La aplicación estará disponible en `http://localhost:4321`*

4. **Compilación para Producción**:
   ```bash
   CI=true pnpm build
   pnpm preview
   ```
   > <img src="https://api.iconify.design/lucide/package.svg?color=white" width="14" height="14" align="absbottom" /> *El build genera funciones serverless en `dist/` gracias a `@astrojs/vercel`, listas para desplegar en Vercel.*

---

## <img src="https://api.iconify.design/lucide/settings.svg?color=white" width="24" height="24" align="absbottom" /> Configuración

Antes de ejecutar la aplicación, crea los archivos de entorno en la raíz. Puedes partir de `.env.example`:

```bash
cp .env.example .env.local
cp .env.example .env.credentials  # opcional, solo para login automático ROPC
```

Tu `.env.local` debería contener tokens y configuración del proxy. Las credenciales de email/password deben ir en `.env.credentials` si usas el login automático ROPC; **nunca en `.env.local` ni en commits**:

```env
# --- .env.credentials (nunca versionar, nunca subir) ---
LALIGA_FANTASY_EMAIL=tu-email@example.com
LALIGA_FANTASY_PASSWORD=tu-password

# --- .env.local (tokens y configuración, nunca versionar) ---
# Token de acceso de LALIGA FANTASY (fallback para desarrollo o cuentas Google)
LALIGA_FANTASY_TOKEN=
LALIGA_FANTASY_REFRESH_TOKEN=

# Configuración de Azure B2C / LaLiga
LALIGA_CLIENT_ID=af88bcff-1157-40a0-b579-030728aacf0b
LALIGA_AUTH_BASE_URL=https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token
LALIGA_REDIRECT_URI=authredirect://com.lfp.laligafantasy

# Competición (1 = LaLiga EA Sports)
COMPETITION_ID=1

# Proxy local hacia la API oficial de LALIGA FANTASY
PROXY_FANTASY_TARGET=https://fantasy-api.llt-services.com
PROXY_BASE_PATH=/api
PROXY_TIMEOUT_MS=15000
PROXY_DEFAULT_X_APP=2
PROXY_DEFAULT_X_LANG=es
PROXY_DEFAULT_USER_AGENT="fantasy-manager/0.1"

# Orígenes permitidos para CORS en desarrollo
APP_ALLOWED_ORIGINS=http://localhost:*,http://127.0.0.1:*

# Inteligencia externa (opcional)
# NEWS_RSS_FEEDS=https://e00-marca.uecdn.es/rss/futbol/primera-division.xml,...
# NEWS_CACHE_TTL_MS=1800000
# PLAYER_STATS_JSON_URL=https://example.com/stats.json

# Puerto del servidor de desarrollo de Astro
PORT=4321

# Upstash Redis (sesiones + caché de player-stats/calendario en producción/Vercel)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

> <img src="https://api.iconify.design/lucide/alert-triangle.svg?color=white" width="16" height="16" align="absbottom" /> **IMPORTANTE:** Nunca incluyas en tus commits los archivos `.env.local`, `.env.credentials`, `.env` o el contenido de la carpeta `.astro/sessions` y `data/`.

### <img src="https://api.iconify.design/lucide/cloud-upload.svg?color=white" width="20" height="20" align="absbottom" /> Despliegue en Vercel

El proyecto usa `output: 'server'` con el adaptador `@astrojs/vercel`, así que Vercel detecta el framework Astro y despliega automáticamente frontend + funciones serverless al importar el repositorio.

1. Crea una base **Upstash Redis** (desde el [Marketplace de integraciones de Vercel](https://vercel.com/marketplace) o directamente en [upstash.com](https://upstash.com)) — sustituye al caché en disco y a las sesiones, que en funciones serverless no persisten entre invocaciones.
2. En el proyecto de Vercel, define en *Environment Variables* todas las variables de `.env.local` (tokens, `LALIGA_CLIENT_ID`, etc.) más:
   ```env
   UPSTASH_REDIS_REST_URL=
   UPSTASH_REDIS_REST_TOKEN=
   ```
3. Despliega (`git push` o `vercel deploy`). No hace falta configurar nada más: `astro.config.mjs` ya usa el adaptador de Vercel y el driver de sesión `upstash`.

### <img src="https://api.iconify.design/lucide/key.svg?color=white" width="20" height="20" align="absbottom" /> ¿Cómo obtener el Token de Acceso Manualmente?

Si tu cuenta usa Google Sign-In, el flujo de usuario/contraseña no funcionará. Para obtener tu token:
1. Inicia sesión normalmente en la web oficial de LALIGA FANTASY.
2. Abre la consola de desarrollador (F12) y ejecuta:
   ```js
   JSON.parse(localStorage.getItem('fz-accessToken')).access_token
   ```
3. Copia el resultado y pégalo en la pestaña "Token" de la aplicación, o asígnalo a `LALIGA_FANTASY_TOKEN` en tu `.env.local`.

---

## <img src="https://api.iconify.design/lucide/brain.svg?color=white" width="24" height="24" align="absbottom" /> Motor de Recomendaciones

El motor de **LALIGA FANTASY Manager** evoluciona por fases, desde un estimador por componentes hasta un sistema de aprendizaje automático:

| Fase | Componente | Descripción |
|------|------------|-------------|
| **Fase 0 — Modelo base** | `src/lib/engine/model.ts`, `form.ts`, `scoring-table.ts` | Estimador por componentes v1: minutos, fixture, posición, puntos base y penalización por riesgo. |
| **Fase 1 — Fuentes externas** | `sources/clubelo.ts`, `sources/jornadaperfecta.ts`, `sources/futbolfantasy.ts`, `sources/sofascore.ts` | Elo de equipos, onces probables, bajas/dudas, tendencias de valor y alineaciones confirmadas. |
| **Fase 2 — Decisión avanzada** | `features/shrinkage.ts`, `optimize.ts`, `news/` | Partial pooling por posición/tier, capitán co-optimizado, planificación multi-jornada y noticias con clasificador de negación/especulación. |
| **Fase 3 — Aprendizaje** | `track-record.ts`, `calibrate.ts`, `params.ts` | Persistencia de predicciones, liquidación automática, métricas de calidad y calibración walk-forward cuando hay ≥30 muestras. |

El resultado se traduce en acciones concretas:

- <img src="https://api.iconify.design/lucide/trending-up.svg?color=white" width="16" height="16" align="absbottom" /> **Comprar**: jugadores del mercado con excelente relación precio/xP, titulares probables y sin noticias negativas recientes.
- <img src="https://api.iconify.design/lucide/trending-down.svg?color=white" width="16" height="16" align="absbottom" /> **Vender**: jugadores lesionados, dudosos, sancionados o con baja expectativa de puntos y valor retenido.
- <img src="https://api.iconify.design/lucide/refresh-cw.svg?color=white" width="16" height="16" align="absbottom" /> **Alineación Óptima**: simulador interno que prueba formaciones y elige el XI inicial que maximiza xP, con capitán incluido.
- <img src="https://api.iconify.design/lucide/coins.svg?color=white" width="16" height="16" align="absbottom" /> **Clausulazos Estratégicos**: cruza tu presupuesto con jugadores rivales desprotegidos que mejorarían tu once.
- <img src="https://api.iconify.design/lucide/shield-alert.svg?color=white" width="16" height="16" align="absbottom" /> **Protección de Cláusulas**: calcula el riesgo de que te roben jugadores y sugiere a quién proteger.
- <img src="https://api.iconify.design/lucide/crown.svg?color=white" width="16" height="16" align="absbottom" /> **Mejor Capitán**: análisis predictivo que elige el capitán entre titulares, penalizando riesgos y rotaciones.
- <img src="https://api.iconify.design/lucide/star.svg?color=white" width="16" height="16" align="absbottom" /> **Mejores Movimientos**: top 5 de acciones de mayor impacto para la jornada actual.
- <img src="https://api.iconify.design/lucide/calendar-check.svg?color=white" width="16" height="16" align="absbottom" /> **Plan Multi-Jornada**: secuencia de movimientos óptimos a medio plazo con efectivo y plantilla arrastrados.

---

## <img src="https://api.iconify.design/lucide/webhook.svg?color=white" width="24" height="24" align="absbottom" /> API Propia

Los endpoints propios actúan como proxy seguro hacia la API oficial y orquestan el motor de análisis:

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/auth/login` | POST | Login con email/password (ROPC Azure B2C). |
| `/api/auth/token` | POST | Guarda un access token JWT en la sesión (cuentas Google). |
| `/api/auth/logout` | POST | Cierra la sesión. |
| `/api/proxy/{ruta-oficial}` | GET/POST/PUT/DELETE/PATCH | Proxy genérico a la API de LALIGA FANTASY. |
| `/api/recommendations?leagueId=&teamId=` | GET | Recomendaciones completas de compra, venta, alineación, cláusulas, capitán y plan multi-jornada. |
| `/api/league-analysis?leagueId=&teamId=` | GET | Análisis agregado de la liga: rivales, riesgos, capitán y estadísticas. |
| `/api/score-predictions?leagueId=&teamId=` | GET | Predicción de puntos esperados por equipo para la jornada actual. |
| `/api/matches?leagueId=&teamId=` | GET | Partidos en vivo de la jornada con marcador, eventos e importancia. |
| `/api/track-record?leagueId=` | GET | Métricas de calidad del modelo y calibración actual. |
| `/api/debug/lineup?leagueId=&teamId=` | GET | Endpoint de diagnóstico: prueba en cascada los distintos endpoints oficiales de alineación y lista sus respuestas. |

> <img src="https://api.iconify.design/lucide/lock.svg?color=white" width="14" height="14" align="absbottom" /> Toda la persistencia en disco (track record, predicciones de puntuación, snapshots) usa escritura atómica y file locks para tolerar escrituras concurrentes sin corromper los ficheros JSONL/JSON.

---

## <img src="https://api.iconify.design/lucide/test-tube.svg?color=white" width="24" height="24" align="absbottom" /> Pruebas

La suite de pruebas End-to-End verifica los flujos críticos de la aplicación:

```bash
# 1. Instalar los binarios de Chromium (solo la primera vez)
pnpm exec playwright install chromium

# 2. Asegúrate de que la app esté corriendo (pnpm dev en otra terminal)

# 3. Ejecutar los tests E2E
pnpm test:e2e
# o directamente:
pnpm exec playwright test
```

Los tests cubren el login por token, la carga del dashboard, la navegación entre pestañas y la responsividad de la interfaz.

También es recomendable ejecutar el chequeo de tipos antes de cada build:

```bash
pnpm exec tsc --noEmit
```

---

## <img src="https://api.iconify.design/lucide/book-open.svg?color=white" width="24" height="24" align="absbottom" /> Documentación Técnica

Para información más profunda orientada al desarrollo, consulta la carpeta `agent-docs/useful-docs/`:

- <img src="https://api.iconify.design/lucide/file-text.svg?color=white" width="16" height="16" align="absbottom" /> [`api-reference.md`](./agent-docs/useful-docs/api-reference.md) — Endpoints oficiales y proxys.
- <img src="https://api.iconify.design/lucide/layout-template.svg?color=white" width="16" height="16" align="absbottom" /> [`architecture.md`](./agent-docs/useful-docs/architecture.md) — Visión general de la arquitectura y flujo de datos.
- <img src="https://api.iconify.design/lucide/edit.svg?color=white" width="16" height="16" align="absbottom" /> [`implementation-notes.md`](./agent-docs/useful-docs/implementation-notes.md) — Notas, problemas resueltos y próximos pasos.
- <img src="https://api.iconify.design/lucide/palette.svg?color=white" width="16" height="16" align="absbottom" /> [`gui-redising.md`](./agent-docs/useful-docs/gui-redising.md) — Decisiones del rediseño UX profesional.
- <img src="https://api.iconify.design/lucide/search.svg?color=white" width="16" height="16" align="absbottom" /> [`api-discovery.md`](./agent-docs/useful-docs/api-discovery.md) — Descubrimiento de endpoints de la API oficial.

---

<div align="center">
  <sub>Desarrollado para uso personal. Este proyecto no está afiliado ni patrocinado oficialmente por LALIGA ni LALIGA FANTASY.</sub>
</div>
