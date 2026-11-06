# FANTASY-MANAGER: REPOSITORY GUIDE

## ESPAÑOL DE ESPAÑA: USO OBLIGATORIO DE Ñ

- todo texto en castellano debe usar español de españa (`es-ES`) y su ortografia, tambien en titulos y cuerpos de commits, changelogs, pull requests, merges y documentacion
- escribir siempre `ñ` en las palabras que la llevan y `Ñ` cuando corresponda la mayuscula; nunca sustituirlas por `n` o `N`
- la `ñ` es una letra distinta de la `n`; las instrucciones «sin acentos» o «sin tildes» solo afectan a las tildes de las vocales y nunca permiten eliminar la eñe
- ejemplos correctos: `añadir`, `diseño`, `año`, `tamaño`, `contraseña`, `español`, `españa` y `AÑADIDO`; sus formas con `n` son incorrectas cuando se refieren a esas palabras españolas
- conservar literalmente rutas, urls, nombres de archivo, identificadores tecnicos y texto de otros idiomas; esta regla no autoriza renombrarlos ni aplicar sustituciones indiscriminadas
- antes de entregar o publicar texto en castellano, revisar que ninguna palabra haya perdido su `ñ` o `Ñ`; esta regla prevalece sobre cualquier normalizacion a ascii o instruccion generica de eliminar acentos


fantasy football dashboard with recommendations, external data sources and a browser extension. this guide covers the repository; nested agent instructions apply within their own folders.

## PROJECT OVERVIEW

| property | verified value |
| --- | --- |
| repository | `rezzt-dev/fantasy-manager` |
| active source | `./` |
| development base for this change | `main` |
| remote default branch | `main` |
| version source | `package.json`: `0.0.1` |
| continuous integration | no tracked github actions workflows |

## TECHNOLOGY STACK

- `package.json`: `astro` ^7.1.6, `react` ^18.3.1, `tailwindcss` ^3.4.17, `typescript` ^5.7.3

## PROJECT STRUCTURE

- `LICENSE.md`
- `README.md`
- `agent-docs/`
- `astro.config.mjs`
- `changelog.md`
- `data/`
- `e2e/`
- `extension/`
- `package.json`
- `playwright.config.ts`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `public/`
- `scripts/`
- `src/`
- `tailwind.config.mjs`
- `tsconfig.json`

management documentation lives in `.docs/manager.md`, `.docs/-github-guides/` and `.docs/repo-audit-and-fix.md`. keep this file and `CLAUDE.md` consistent.

## BUILD, RUN AND TEST COMMANDS

from `./`, the available package scripts are:

| command | implementation |
| --- | --- |
| `npm run dev` | `astro dev` |
| `npm run build` | `astro build` |
| `npm run preview` | `astro preview` |
| `npm run astro` | `astro` |
| `npm run check` | `astro check` |
| `npm run verify:deploy` | `node scripts/verify-deploy.mjs` |
| `npm run test:unit` | `node scripts/run-unit-tests.mjs` |
| `npm run test:e2e` | `playwright test` |

for application changes, run these checks from `./`:

```bash
pnpm check
pnpm test:unit
pnpm build
```

## CODE STYLE AND ARCHITECTURAL DECISIONS

keep authentication tokens and runtime data private; preserve provider fallbacks and extension login contracts; distinguish predictions from facts. follow the existing formatter and naming of the changed module. verify manifest versions when dependencies change.

## TESTING STRATEGY

documentation-only changes require `git diff --check`, existing-path checks and a review of the staged file list. run module checks for application changes, with disposable data. report unavailable tooling and failed checks; never claim a check passed without running it.

## SECURITY AND DEPLOYMENT

keep credentials, local configuration, signing material and user data out of commits. do not print secret values while auditing. inspect configuration names and code references instead.

existing legal and community files: `LICENSE.md`. when changing dependencies, permissions, storage or network services, review those files against the implementation. record missing policies as audit work; do not invent licence terms or ownership decisions.

deployment, signing, store publication, migrations against hosted databases and repository settings require their own explicit request. this documentation task prepares management instructions and pull requests.

## COMMON TASKS

1. read the relevant module and its nearest agent instructions
2. inspect the working tree and choose the smallest change that solves the request
3. update the affected documentation and changelog with evidence from the diff
4. run checks appropriate to the changed module and report their actual results
5. for git operations, follow the manager and the digest below

## EXISTING PROJECT CONVENTIONS

the following project-specific context is retained from the previous guide. paths are relative to the active module when stated. for git operations, the manager and final digest supersede previous workflow examples.

## FANTASY MANAGER — AGENT GUIDE

> **fantasy manager** is an unofficial laliga fantasy web assistant. it connects to the official (undocumented) laliga fantasy api with the user's own account and adds league statistics, a predictive recommendation engine (lineups, captain, transfers, clause buys), per-team score predictions, live matches and a track record of its own predictions. a small browser extension (`extension/`) makes google-account login possible. it is not affiliated with laliga.
>
> **git workflow (commits, prs, merges, releases):** when asked for a commit, pr, merge or release title/description, read `.docs/manager.md` first and then the guides it points to in `.docs/-github-guides/` (versioned in this repo). the last section of this file ("commit, pr, merge & release guidelines") is the self-contained digest. never add ai attribution of any kind.

---

## PROJECT OVERVIEW

| property | value |
|----------|-------|
| **package name** | `fantasy-manager` (`private: true`) |
| **version** | `0.0.1` in `package.json` (never bumped, no tags or releases yet); extension `1.0.0` |
| **runtime** | node `>=22.12.0` (`engines`) |
| **package manager** | pnpm (`pnpm-lock.yaml`, `pnpm-workspace.yaml` with only `esbuild` allowed to run build scripts) |
| **framework** | astro 7 with `output: 'server'` and the `@astrojs/vercel` adapter |
| **ui** | react 18 islands hydrated with `client:only="react"`, tailwind css 3, shadcn/radix primitives |
| **deployment** | vercel serverless function — `https://fantasy-manager-mauve.vercel.app` |
| **license** | non-commercial use license, `LICENSE.md` (spanish + english) |
| **ui language** | spanish (`<html lang="es">`) |

---

## TECHNOLOGY STACK

### CORE
- **astro 7** (`astro.config.mjs`): server output, session driver chosen at build time (see *deployment notes*), dev port from `PORT` (default `4321`).
- **react 18** + **typescript 5** (`tsconfig.json` extends `astro/tsconfigs/strict`).
- **tailwind css 3** (`@astrojs/tailwind` with `applyBaseStyles: false`), `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge`.

### UI LIBRARIES
- **radix ui** primitives wrapped as shadcn components in `src/components/ui/`; `cmdk` for the command palette.
- **@tanstack/react-query** (data fetching), **@tanstack/react-table** (tables), **zustand** (`src/stores/authStore.ts`).
- **recharts** (charts, single theme in `src/lib/chart-theme.ts`), **sonner** (toasts), **framer motion** via `motion`, **@number-flow/react** (animated counters), **lucide-react** (icons).
- landing motion: `gsap`, `animejs`, `lenis`, `lottie-web` (`public/lottie/pitch-search.json`).
- fonts: archivo, inter and jetbrains mono, loaded from google fonts in `src/styles/global.css`.

### DATA & STORAGE
- **astro sessions** hold the laliga fantasy tokens (`fantasy_tokens`). driver: upstash redis when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` exist at build time, `/tmp/fantasy-manager/sessions` on serverless without them, `.astro/sessions` locally.
- **upstash redis** (`@upstash/redis`, `src/lib/kv-cache.ts`) shares caches between instances (player stats, calendar, external sources).
- **`data/`**: engine state on disk (track record, snapshots, score predictions, caches). paths always go through `src/lib/runtime-paths.ts`.

### EXTERNAL DATA SOURCES
- official laliga fantasy api through the proxy `src/pages/api/proxy/[...path].ts` (`src/lib/fantasy/`).
- clubelo, jornada perfecta, futbolfantasy, sofascore (laliga live data and uefa competitions), espn, api-football (optional, `API_FOOTBALL_KEY`, server only) and news rss feeds — adapters in `src/lib/engine/sources/` and `src/lib/news/`.

---

## PROJECT STRUCTURE

```
fantasy-manager/
├── astro.config.mjs          # Server output, vercel adapter, session driver decided at build time
├── tailwind.config.mjs       # Bridge from the CSS tokens to Tailwind utilities
├── playwright.config.ts      # E2E: ./e2e, chromium, baseURL http://localhost:4321, 1 worker
├── package.json / pnpm-lock.yaml / pnpm-workspace.yaml
├── .env.example              # Variable names only (Upstash, optional LALIGA/proxy overrides, API-Football)
├── changelog.md              # Bilingual changelog (since 2026-11-06)
├── LICENSE.md                # Non-commercial license, Spanish + English
├── README.md                 # Spanish readme
├── AGENTS.md / CLAUDE.md     # Agent guides
├── .docs/                    # manager.md, repo-audit-and-fix.md, -github-guides/ (versioned)
├── scripts/
│   ├── run-unit-tests.mjs    # Bundles each src/test/*.test.ts with Vite's esbuild and runs node --test
│   └── verify-deploy.mjs     # Builds with VERCEL=1 and boots the real function on a read-only dir
├── src/
│   ├── pages/
│   │   ├── index.astro       # Landing (marketing components + src/scripts/landing-motion.ts)
│   │   ├── login.astro       # Login (LoginForm, client:only)
│   │   ├── dashboard.astro   # Redirects to /login without session tokens; mounts DashboardClient
│   │   ├── extension.astro   # Extension install instructions
│   │   └── api/
│   │       ├── auth/{login,logout,token}.ts   # ROPC email login, logout, token persistence
│   │       ├── proxy/[...path].ts            # Proxy to the official API
│   │       ├── recommendations.ts            # Engine output (+ multiWeekPlan, fixtures, track record)
│   │       ├── clause-market.ts              # Clause targets (3 min in-memory cache)
│   │       ├── score-predictions.ts          # Expected points per league team
│   │       ├── matches.ts                    # Live matchday (Sofascore)
│   │       ├── league-analysis.ts / teams.ts / track-record.ts
│   │       └── debug/lineup.ts
│   ├── components/
│   │   ├── DashboardClient.tsx / DashboardContainer.tsx / QueryProvider.tsx
│   │   ├── dashboard/        # One component per tab (Overview, Lineup, Market, ClauseMarket, Matches, ScorePredictions, TrackRecord…)
│   │   ├── layout/           # AppLayout, Sidebar, Header, MobileNav, CommandPalette
│   │   ├── shared/           # KpiCard, PlayerCard, PlayerDetailDialog, FixtureChip/Panel, EuropeanChip/Panel…
│   │   ├── statistics/       # Charts and tables of the statistics tab
│   │   ├── ui/               # shadcn/Radix primitives (button, card, badge, input, tabs, stat, motion…)
│   │   ├── brand/Logo.tsx    # Own mark
│   │   ├── auth/LoginForm.tsx, league/, marketing/, recommendations/
│   ├── lib/
│   │   ├── engine/           # Prediction engine: model, form, scoring table, calibration, optimizer, track record, snapshots, matches
│   │   │   ├── features/     # match-model, fixture-components, fixture, minutes, shrinkage, european-load
│   │   │   └── sources/      # clubelo, jornadaperfecta, futbolfantasy, sofascore, uefa, espn, api-football, http-cache, types
│   │   ├── analysis/         # lineup-optimizer, tactical-scheme, clause-market, team-score-predictor, starter-*
│   │   ├── recommendations/  # engine, captain, clause-risk, points-estimator, external-intelligence
│   │   ├── fantasy/          # Official API client, proxy, activity, calendar cache, enrichers
│   │   ├── news/             # RSS, classifier, matcher, sources
│   │   ├── auth/extension-bridge.ts
│   │   ├── runtime-paths.ts  # Read-only bundle root vs writable root (/tmp on serverless)
│   │   ├── kv-cache.ts       # Upstash-backed shared cache
│   │   └── chart-theme.ts, clause-availability.ts, env.ts, format.ts, motion*.ts, utils.ts
│   ├── hooks/                # useDashboardTab, useDensity, useNotifications, useSidebarCollapsed
│   ├── stores/authStore.ts
│   ├── styles/global.css     # Design tokens (the whole design system)
│   ├── test/                 # Unit tests (*.test.ts, node --test)
│   └── types/
├── extension/                # MV3 browser extension (Chrome + Firefox manifest), see extension/README.md
│   ├── manifest.json / manifest.firefox.json
│   └── src/{background,bridge,config,pkce,popup}.js, popup.html
├── e2e/                      # Playwright specs (+ tmp-* experiments and screenshots, see audit)
├── data/                     # Runtime data; gitignored, but the seed files are tracked
├── public/                   # favicon, icon, lottie animation
└── agent-docs/               # Internal notes, extension publishing guide, third-party skills (gitignored, partly tracked)
```

---

## BUILD / RUN / TEST COMMANDS

```bash
pnpm install                 # install dependencies (only esbuild may run build scripts)

pnpm dev                     # astro dev on http://localhost:4321
astro dev --background       # agents: start the dev server in background mode
astro dev stop | status | logs

pnpm build                   # astro build (vercel output in .vercel/, never committed)
pnpm preview

pnpm exec tsc --noEmit       # type check, must stay clean
pnpm test:unit               # all unit tests in src/test/
pnpm test:unit fixture-model # only files whose name contains the filter
pnpm verify:deploy           # build with VERCEL=1 and boot the function read-only (--no-build reuses the build)

pnpm exec playwright install chromium   # first time only
pnpm test:e2e                # Playwright; needs the app running on :4321 in another terminal

pnpm dlx web-ext lint        # in extension/: must report 0 errors before a Firefox upload
./agent-docs/publicacion-extension/empaquetar.sh   # → dist-extension/chrome.zip and firefox.zip
```

`pnpm check` runs `astro check`, which needs `@astrojs/check` (not a dependency). there is no linter or formatter configured (no eslint/prettier) and no ci.

---

## CODE STYLE GUIDELINES

### LANGUAGE
- code comments, jsdoc, commit messages and internal docs are written in **spanish**; ui text is spanish. keep new code consistent.
- identifiers are english (`computeAvailableBudget`, `riskAdjustedXp`…).

### DESIGN SYSTEM (`src/styles/global.css` + `tailwind.config.mjs`)
**no component defines its own colour, shadow, radius or duration**: if a value does not exist, add it as a token first.

- **three token layers** (primitive → semantic → component).
- **neutral ramp `--ink-000..900`**: each step is an elevation level. `--ink-050` is the canvas `#151515` and `--ink-900` the ink `#ECECEC`: the two brand values, immutable.
- **accent "verde campo" `--lime-100..900`** (base `hsl(74 84% 55%)`). reserved for three things: the only primary action of each screen, the focus ring and the voice of the recommendation engine (captain, suggested move, own series in charts). it is not decorative; if it appears twice in the same view competing, one is too many.
- **status** `--positive` (158°), `--negative` (354°), `--caution` (32°), `--info` (199°), at least 40° apart from each other and from the accent. **never alone**: always with an icon or a sign, colour cannot be the only signal.
- **positions** `--pos-gk/df/mf/fw/co`, always with the abbreviation.
- **fixed scales**: opacity (`.05 .1 .2 .4 .6 .8`), radii (`--r-xs..xl`), five elevations (`--elev-1..5`), durations (`--dur-instant..slow`), curves (`--ease-out/in/spring`) and layers (`--z-raised..toast`).
- **contrast**: `--ink-600` (control borders) meets 3:1 and `--ink-700` (tertiary text) meets 4.5:1 **against the lightest surface they appear on** (`--ink-300`), not only the canvas. touching any of those three greys means measuring again.

### TYPOGRAPHY
a real pair, not one face in two weights: **archivo** for headings (`font-display`, negative tracking that closes as size grows), **inter** for ui and **jetbrains mono** for every figure compared in a column. any scannable number carries the `.numeral` utility (tabular figures); without it columns jump when a table is sorted.

### BUILDING BLOCKS
- `src/components/ui/`: shadcn/radix primitives. `button` (variants by hierarchy: `default`, `accent`, `secondary`, `outline`, `ghost`, `danger`, `link`; `loading` prop), `card` (variants by elevation: `sunken`, `flat`, `default`, `raised`, `interactive`, `accent`, `critical`), `badge` (accepts `icon`), `input` + `Field` (visible label, persistent help, error below with `role="alert"`), `tabs` (`segmented` | `underline`), `stat` (tabular figure with sign), `motion` (honours `prefers-reduced-motion`).
- `src/components/brand/Logo.tsx`: own mark (halfway line + centre circle + accent dot). never use a library icon as the logo.
- `src/lib/chart-theme.ts`: the only recharts theme. series differ by lightness and stroke (solid / dashed), not only by hue.
- `src/components/shared/`: `KpiCard`, `TrendBadge`, `PlayerCard`, `PlayerRow`, `PlayerAvatar`, `PlayerDetailDialog`, `AlertPanel`, `FilterBar`, `DataTable`, `EmptyState`, `ErrorState`, `LoadingSection`, `SectionHeader`, `FixtureChip`, `FixturePanel`, `EuropeanChip`, `EuropeanPanel`.
- `src/components/layout/`: `AppLayout` (skip link + panel + header + bottom bar), `Sidebar` (248 px rail / 72 px collapsed), `Header`, `MobileNav` (4 destinations + "más"), `CommandPalette`.

### RULES THAT ARE NEVER BROKEN
- focus is painted by `:focus-visible` in `global.css`. **do not** add `focus:ring-*` or `focus-visible:outline-none` in components.
- the `⌘/Ctrl + K` shortcut is registered **only** by `DashboardContainer`. registering it in `CommandPalette` too toggles twice per key press and the palette never opens.
- every screen designs its four states: loading (silhouette of the real content, not a spinner), empty (with a way out), error (cause + how to fix + retry) and the happy path.
- every touch target ≥ 44 px (`size="touch"` / `icon-touch`).
- error messages: never `error.message` as the description. the description explains what failed and what to do; the raw text goes in `detail`, collapsed.
- the bottom gap for the mobile bar is set by `AppLayout`; tabs do not add `pb-*`.
- compact mode: components react on their own with `[.density-dense_&]:*` variants; do not pass density props except for a specific override.
- shortcuts: `⌘K` (search), `R` (reload), `D` (compact), `B` (collapse panel), `C` (clause market), `⌘1-9` and `⌘0` (tabs).
- global notifications with **sonner** (`Toaster` in `AppLayout`); animations with **framer motion**, counters with **@number-flow/react**, tables with **@tanstack/react-table**.
- the dashboard is **astro + react** hydrated with `client:only="react"`. do not migrate to next.js.

---

## TESTING STRATEGY

| type | location | runner | notes |
|------|----------|--------|-------|
| unit | `src/test/*.test.ts` | `node --test` via `scripts/run-unit-tests.mjs` | node runs typescript natively but does not resolve the project's extensionless imports, so each test is bundled with the esbuild binary vite already installs. no extra dependency needed. |
| e2e | `e2e/*.spec.ts` | playwright (`playwright.config.ts`, chromium, 1 worker) | needs `pnpm dev` running. covers token login, dashboard load, tab navigation, density and responsiveness (`e2e/responsive/` screenshots). |
| type check | whole project | `pnpm exec tsc --noEmit` | required after every engine or api change. |

current unit files: `european-load`, `european-source`, `fixture-model`, `laliga-actions`, `matches`, `source-cache`, `strategy`. some tests guard model invariants (the elo→log-goals divisor, rotation δp summing to zero): never relax them to make a change pass.

the usual verification for an engine or api change is `pnpm test:unit` + `pnpm exec tsc --noEmit` + `pnpm build` + the affected endpoint with real data from a league (`/api/recommendations`, `/api/clause-market`, `/api/score-predictions`, `/api/matches`).

---

## KEY ARCHITECTURAL DECISIONS

### 1. RECOMMENDATION ENGINE CORE (PHASE 0)
- `src/lib/engine/`: `model.ts` (component-based estimator v1), `form.ts` (form with decay), `scoring-table.ts` (derived scoring table), `player-stats.ts` (memory + disk cache of playerstats), `track-record.ts` (persisted predictions/recommendations and settlement), `snapshots.ts` (daily catalogue and market snapshot).
- `data/` (runtime): `track-record/*.jsonl` per matchday + `metrics-latest.json`, `snapshots/YYYY-MM-DD.json`, `cache/player-stats/`.
- the budget everywhere in the engine is `computeAvailableBudget` (cash + 20 % of squad value). `impactScore` is δxp in points (one scale).
- `@types/node` is a devdependency (disk persistence).

### 2. MATCHDAY FIXTURE (§4.3, GOALS MODEL)
the engine no longer adjusts the opponent with a flat multiplier: it models the match.
- `engine/features/match-model.ts`: elo (clubelo) → expected goals for and against → **bivariate poisson score distribution with dixon-coles correction** (ρ = −0.13) → p(win/draw/loss), p(clean sheet) and expected match points. home advantage lives **only** in the league goal means (1.42 home / 1.13 away); elo points are never added to the home side, which would count it twice.
- the elo→log-goals divisor (`fixtureEloDivisor`, 220) is not invented: it is the value that makes the model reproduce the elo formula's own expected score on neutral ground (rmse 0.005 over d ∈ [−350, 350]). a test checks it.
- `engine/features/fixture-components.ts`: which component each point comes from (attack, involvement, goals conceded, clean sheet, saves, defensive volume, discipline, losses, midfielder points, neutral) and how elastic each one is. an unclassified breakdown action is **neutral**: if laliga adds a new one, the worst case is not adjusting it.
- `engine/features/fixture.ts`: combines both. a player's multiplier is the mean of his components' multipliers weighted by what each contributes to his points. the reference is the **average league opponent on neutral ground**, the mix of opponents his per-90 averages were accumulated against (so team quality, already inside those averages, is not counted again).
- the component split comes from `pointsPer90ByStat` and is shrunk towards its position's split with the same partial pooling as §4.5 (`fixtureShares` in the context, built with `buildFixtureSharesFromStats`); in pre-season the structural priors of `POSITION_SHARE_PRIORS` are used.
- why the module exists: against a much stronger opponent a defender loses ~35 % of xp and a forward ~29 %, but **the goalkeeper stays the same** because saves offset goals conceded. a single factor cannot express that.
- calibration: the parameter the walk-forward backtest searches is `fixtureDampening` (how much of the theoretical effect turns into real points); the old `eloDiffDivisor` no longer exists.
- output: `PlayerPrediction.fixture` (`FixtureOutlook`), `fixtures[]` in `/api/recommendations`, `fixture` in every `Recommendation`, `ClauseTarget` and `CaptainCandidate`. ui: `shared/FixtureChip` (compact chip) and `shared/FixturePanel` (full card in `PlayerDetailDialog`).

### 3. EXTERNAL SOURCES (PHASE 1)
- adapters in `src/lib/engine/sources/` with contracts in `types.ts` (§3.5 of the design): `clubelo.ts` (team elo, 24 h), `jornadaperfecta.ts` (probable line-ups + absences, 3 h), `futbolfantasy.ts` (value trends, 12 h). http cache in `sources/http-cache.ts` (disk `data/cache/sources/`, stale fallback if the source is down, identifiable user agent); it shares responses through `kv-cache.ts` and coalesces concurrent downloads.
- team matching: `team-names.ts` (normalisation + aliases). player matching: slug → contained full name → unique surname (`minutes.ts`).
- `features/minutes.ts`: xmins v1 (p(starter) ≈ 0.85 in the probable xi, 0.15 outside, absence → 0, doubt → ×0.45).
- league activity (`src/lib/fantasy/activity.ts`): real liquidity and recent rival clause buys for `clause-risk.ts`. rival line-ups are not available in the api (403): they are inferred from the squad.
- external xg (understat/fbref) deferred: both block scraping (cloudflare / html without data). the v2 components with xg wait for an accessible source; the model structure already allows it.

### 4. EUROPEAN COMPETITIONS (§4.4.6)
a team that plays the champions league on tuesday does not face saturday's matchday like the others: it prioritises europe. the engine models it and warns **before** spending.
- `sources/uefa.ts`: champions league (7), europa league (679) and conference league (17015) via sofascore, ttl 6 h, pagination bounded to eight future and two past weeks; excludes postponed/cancelled matches and queries competitions in parallel. the season id is resolved against the source, never hard-coded. teams are matched with `team-names.ts`; a name that does not match is dropped (almost always a foreign team). without network, empty list and the engine behaves **exactly** as before the feature.
- `features/european-load.ts`: separates three channels a single multiplier would confuse — **rotation** (does he play?) on `pStarter`, **fatigue** (how does he perform if he plays?) on points per minute, and **xi quality** on the team's elo for that match. the third is not a new factor: it goes through the existing goals model, so it works both ways (if the opponent comes from europe, your fixture improves).
- the reference match of `fixtureAdjustment` uses `eloOwnBaseline`, the elo **without** penalty. penalising both sides would cancel the effect.
- rotation **redistributes** minutes, it does not destroy them: `Δp = k·[p(1−p)/Σp(1−p) − p²/Σp²]`, with both masses derived from the canonical team in `minutes.ts` (11 at 0.85 + 9 at 0.15). the δp sum to zero (a test checks it). `Δp = 0` at `p = 0` (a non-player does not become a starter) and `Δp < 0` at `p = 1` (not even a regular is safe).
- the **adding** side only applies with a published xi: without it nobody knows who comes in, and the error is left on the prudent side.
- no double counting (`EUROPEAN_WEIGHT_BY_MINUTES_SOURCE`): confirmed line-up and absence → 0; probable xi → 0.5; history → 1. reality always beats the rotation model.
- σ is inflated with rotation pressure, so `riskAdjustedXp = xP − λσ` makes the captain and clause buys conservative **only** in a european week. `PlayerPrediction.pointsStdDev` already is that prospective σ.
- in the clause-buy `fitScore` the european load does **not** discount points again (they are already inside `xiGain`): it penalises the **moment of spending**, and only when urgency is low, because then waiting is free.
- the snapshot `PredictionRecord.context.european` keeps the prospective european impact next to `europeanDampening` (model `components-v1.4`).
- `europeanDampening` (`data/engine-params.json`, default 1) scales the whole effect (rotation, fatigue, early substitution, σ and both teams' elo); at 0 the engine ignores the champions league again. it is **not** in the `engine/calibrate.ts` grid yet.
- the multi-week planner needs no plumbing: the context carries raw `europeanFixtures` and the model derives each matchday's load from its calendar.
- ui: `shared/EuropeanChip` and `shared/EuropeanPanel` (card in `PlayerDetailDialog`). the warning to the user is in euros, not points: the clause is paid once and the bad week passes.
- `TODO(owner)`: the previous guide pointed to `agent-docs/coordinacion-champions.md` for the full design and pending improvements; that file is not in the repository.

### 5. ADVANCED DECISION (PHASE 2)
- `features/shrinkage.ts`: partial pooling (n·obs + k·prior)/(n+k), k = 8, with position×tier priors (tiers 1-5 from elo) and hierarchy last season → position×tier → global position. the circular baseline of the tactical scheme was removed.
- co-optimised captain: the best starter's bonus enters the objective of `lineup-optimizer.ts` and `tactical-scheme.ts` (both expose `captain`). risk penalty: `riskAdjustedXp = xP − 0.3·σ` of the model (σ from history; in pre-season it is xp as is).
- `optimize.ts`: multi-week planner (dp over the pareto fronts, cash as state, squad carried over, friction 1.5 pts/move). exposed as `multiWeekPlan` in `/api/recommendations` (additive field).
- news (§4.6): `news/classifier.ts` with negation ("descartan lesión") and speculation ("podría"), `news/matcher.ts` with team disambiguation (shared surnames require a team mention), `news/index.ts` with per-source weight, exponential decay (τ = 3 days), deduplication of the same story (jaccard ≥ 0.6) and real feed coverage → `dataQuality`.
- sofascore (`sources/sofascore.ts`): confirmed line-ups ~1 h before kick-off; cloudflare blocks node's fetch → download via `curl`. xmins override to p = 1/0 when a confirmed line-up exists (match days only).

### 6. LEARNING (PHASE 3)
- `/api/track-record` + the track record tab: §6.3 metrics per matchday and overall (mae vs baseline, spearman, top-11 hit rate, captain points, precision@5, roi). recommended xis are persisted (`lineups-w{N}.jsonl`) and settlement stores each player's `idealXi`.
- automatic calibration (`engine/calibrate.ts` + `engine/params.ts`): walk-forward grid over shrinkagek × elo divisor with production code (`paramOverrides`). it activates itself with ≥ 30 player-matchday samples and only applies if it improves production mae (`data/engine-params.json`).
- per-position gbm (§4.7): deferred — the design itself requires 1-2 seasons of own data (track record + xg). until then the component model is the production prediction and its output will be a feature of the future ensemble.

### 7. SCORE PREDICTIONS PER TEAM (TAB `score-predictions`)
- in the sidebar, mobile nav, command palette and `Cmd/Ctrl + 8`. ranks every league team by expected points (xp) for the current matchday.
- `/api/score-predictions?leagueId=&teamId=` uses `src/lib/analysis/team-score-predictor.ts`: starting xi (real for the own team, inferred for rivals from the squad with `computeOptimalLineup` adapted to an optional `currentLineup`), co-optimised captain, coach estimated from elo + expected result (`engine/coach-points.ts`), and a bench of the 5 substitutes with the highest xp (shown as potential reserve).
- persistence: `data/score-predictions/{leagueId}-w{week}.json` (full snapshot) and `data/score-predictions/history.jsonl` (summary per team/matchday, append-only, deduplicated). the endpoint also returns the history.
- limits: rival line-ups are inferred (403 in the api); the coach is an elo-based mvp until real goals-conceded data exist; the bench is not added to the total because laliga fantasy substitution rules are complex.

### 8. CLAUSE MARKET (TAB `clause-market`, MARKET → CLAUSULAZOS)
- in the sidebar under *mercado*, mobile nav, command palette and the `C` shortcut; it is not in the numeric shortcuts, which stay assigned to the original ten tabs. lists **only** players of other league teams whose clause can be paid right now and recommends which fit the team best.
- `/api/clause-market?leagueId=&teamId=` (3 min in-memory cache) uses `src/lib/analysis/clause-market.ts`: same data pipeline and same `EstimatorContext` as `/api/recommendations` (elo, probable xis, absences, confirmed line-ups, news, playerstats, value trends), without track-record persistence or the multi-week planner.
- main metric: `xiGain`, the **real improvement of the starting xi** when adding the player. `bestXi()` numerically replicates `lineup-optimizer.ts` (same captain co-optimisation) on already computed xp, so hundreds of "what if i buy x?" and 2-3 clause combos can be evaluated without re-estimating points. `deltaXp` (vs the own position average) is secondary.
- each target has `fitScore` 0-100 (xi 45 · level 15 · price 15 · need 10 · starter 10 · data 5, with penalties for status, news and budget), `urgency` 0-100 (rivals able to pay the clause, clause/value ratio, player level and recent league clause buys), `verdict`, reasons, warnings and `funding`: what to sell to reach the clause, counting each sale as 0.8·value (cash rises by the full value but the 20 % squad-value bonus drops).
- availability always comes from `getClauseProtection` (`clause-availability.ts`): `available` goes to `targets` and `locked`/`shielded` to `upcoming` with the days left. affordability uses `computeAvailableBudget` (§5.1), like the rest of the engine.

### 9. LIVE MATCHES (TAB `matches`)
- in the sidebar, mobile nav, command palette and `Cmd/Ctrl + 0`. shows the current laliga matchday with status, score, minute, crests and events.
- `/api/matches?leagueId=&teamId=` uses `src/lib/engine/matches.ts` to cross the official matchday calendar with sofascore live data and the user's squad.
- a match is "important" if any player of the user's squad belongs to either team. sorted by number of involved players, then status (live > half-time > pending > finished) and kick-off time.
- source: unofficial sofascore api (`/event/{id}`, `/event/{id}/incidents`, `/unique-tournament/8/season/{id}/events/...`, `/api/v1/team/{id}/image`), fetched via `curl` because of cloudflare and cached with short ttls (60 s details/incidents, 15 min lists).

### 10. GOOGLE LOGIN THROUGH THE EXTENSION (`extension/`)
- laliga uses azure ad b2c and its only registered `redirect_uri` is the native scheme `authredirect://com.lfp.laligafantasy`. **a website cannot complete that oauth**: any own url returns `AADB2C90006`. do not waste time trying from the server or with popups.
- `extension/` (mv3, chrome + firefox variant) intercepts that redirect with `webRequest.onBeforeRedirect`, exchanges the `code` with pkce against the `B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN` policy (public client, no secret) and hands the tokens to the app tab.
- flow state lives in `chrome.storage.session` and delivery is via `tabs.sendMessage`: the service worker dies during login and neither module variables nor the initial `sendResponse` survive.
- web side: `src/lib/auth/extension-bridge.ts` (dialogue over `postMessage`, independent of the extension id), button in `LoginForm.tsx`, instructions in `src/pages/extension.astro`. tokens are persisted reusing `/api/auth/token`.
- email login (`/api/auth/login`, ropc) only works with local b2c accounts, never with google accounts.
- portability: all extension code uses the alias `api = globalThis.browser ?? globalThis.chrome` from `config.js` (and an inline copy in `bridge.js`, because content scripts do not support `import`). do not go back to `chrome.*`: in firefox that namespace is callback-based and every `await` would return `undefined`.

---

## SECURITY CONSIDERATIONS

- **secrets**: real values live only in `.env.local` (and in vercel). `.env.example` holds names and comments only. never read, print or commit `.env*` values, laliga tokens, upstash credentials or `API_FOOTBALL_KEY` (server only, never `PUBLIC_`).
- **versioned token-like files**: `agent-docs/useful-docs/web-session-token.txt` and `agent-docs/useful-docs/credentials.md` are tracked since the first commit in a public repository; see `.docs/repo-audit-and-fix.md` §1. do not copy their contents anywhere.
- **session**: laliga tokens are stored server-side in the astro session (`fantasy_tokens`), never in the client bundle; `/dashboard` redirects to `/login` without them.
- **proxy**: `src/pages/api/proxy/[...path].ts` forwards to the official api; optional overrides (`PROXY_FANTASY_TARGET`, `PROXY_DEFAULT_X_APP`, `PROXY_DEFAULT_X_LANG`, `PROXY_TIMEOUT_MS`, `LALIGA_AUTH_BASE_URL`, `LALIGA_CLIENT_ID`, `LALIGA_REDIRECT_URI`) are documented in `.env.example`.
- **extension**: public pkce client, no secret. allowed app origins are an explicit list (`ALLOWED_APP_ORIGINS` in `extension/src/config.js`); `host_permissions` are limited to `login.laliga.es`, localhost and the vercel domain.
- **scraped sources**: identifiable user agent and caching with ttls to avoid hammering third parties.

---

## COMMON TASKS FOR AGENTS

### ADDING A DASHBOARD TAB
1. create the component in `src/components/dashboard/` with its four states (loading silhouette, empty, error, happy path).
2. register it in `DashboardContainer` (tab id, shortcut), `Sidebar`, `MobileNav` and `CommandPalette` — and register the `⌘K` shortcut nowhere else.
3. add the api route under `src/pages/api/` if it needs server data; reuse the engine context instead of re-fetching sources.
4. run `pnpm exec tsc --noEmit`, `pnpm build` and check the endpoint with real data.

### CHANGING THE ENGINE
1. keep the pure maths in `src/lib/engine/features/` and add or update tests in `src/test/`.
2. never break the invariants guarded by tests (elo divisor, δp sum, neutral unclassified actions).
3. run `pnpm test:unit` + `pnpm exec tsc --noEmit` + `pnpm build` + `/api/recommendations` with real data.

### ADDING AN EXTERNAL SOURCE
1. adapter in `src/lib/engine/sources/` implementing the contracts of `types.ts`, going through `http-cache.ts` (ttl, stale fallback, identifiable user agent).
2. match teams with `team-names.ts`; with no network the engine must behave exactly as without the source.
3. mention the new third party in the privacy texts (see *deployment notes*).

### ADDING A DEPLOYMENT DOMAIN
change it in three places: `extension/manifest.json` (and `manifest.firefox.json`) `host_permissions` and `content_scripts.matches`, and `ALLOWED_APP_ORIGINS` in `extension/src/config.js`.

### READING OR WRITING RUNTIME DATA
never build paths with `path.join(process.cwd(), 'data', ...)`: use `src/lib/runtime-paths.ts` (`ensureDataDir(rel)` for read/write subdirectories, `readablePath(...)` for read-only ones). anything that must really persist goes to upstash via `kv-cache.ts`.

---

## DEPLOYMENT NOTES

the app is deployed as a vercel serverless function (`output: 'server'` + `@astrojs/vercel`). three rules that are never broken, because breaking them already took the whole deployment down:

1. **`.vercel/` is never versioned.** `.gitignore` has `dist/` and `node_modules/`, and those patterns also match inside `.vercel/output/functions/_render.func/`. committing the build output leaves a function with its `.vc-config.json` but without `dist/server/entry.mjs` or dependencies, and every route returns `FUNCTION_INVOCATION_FAILED` with no application log. the adapter regenerates the output on every build.
2. **the deployment filesystem is read-only except `/tmp`.** everything goes through `src/lib/runtime-paths.ts`, which separates the bundle root (read-only, the versioned seed) from the writable root (`/tmp` on serverless, `data/` locally). what is written to `/tmp` is per instance and ephemeral.
3. **environment variables must be in the _build_ environment, not only _runtime_.** `astro.config.mjs` picks the session driver at build time and bakes it into the bundle. without `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` visible during the build, the deployment ships with the session in `/tmp`: it works, but is lost when the instance is recycled.

- before deploying, `pnpm verify:deploy` builds with `VERCEL=1` and boots the real function with its directory read-only, checking the key routes (including login, which writes to the session). it fails locally instead of in production.
- `TODO(owner)`: confirm whether vercel deploys every push to `main` automatically (git integration) or only manually.
- versions: the web version is `version` in `package.json`; the extension version is `version` in both `extension/manifest.json` and `extension/manifest.firefox.json`, which must match (`empaquetar.sh` refuses to package otherwise). tags are `v<x.y.z>` and match the `## [x.y.z]` section of `changelog.md`.
- extension publishing: follow `agent-docs/publicacion-extension/` (start with its `README.md`); package with `empaquetar.sh`; `pnpm dlx web-ext lint` must report 0 errors before uploading to firefox.
- legal and policy files: `LICENSE.md` (non-commercial, spanish + english) and the extension privacy policy draft `agent-docs/publicacion-extension/04-politica-de-privacidad.md` (with the store texts in `03-textos-de-la-ficha.md` and `07-licencia-y-categorias.md`). a new dependency, extension permission, third-party data source or stored data type must update them, plus the non-affiliation notice in `README.md`. there is no `NOTICE` or third-party licenses file yet (`TODO(owner)`, see `.docs/repo-audit-and-fix.md`).

---

## FRAMEWORK DOCUMENTATION

full astro documentation: https://docs.astro.build. consult before working on related tasks:

- [adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [working with astro components](https://docs.astro.build/en/basics/astro-components/)
- [using react, vue, svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [adding styles or using tailwind](https://docs.astro.build/en/guides/styling/)
- [supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

---

## ADDITIONAL ENTRY-POINT CONVENTIONS

## Fantasy Manager — CLAUDE.md

> This file exists so any AI agent always has the git workflow rules of this
> repository at hand. For the full architecture, tech stack, build commands,
> design system and engine rules, see [`AGENTS.md`](./AGENTS.md) — this file only
> carries the commit / PR / merge / release conventions.
>
> **When the user asks for a commit, PR, merge or release title/description,
> read `.docs/manager.md` first (or follow the section below if `.docs/` is not
> available). Never add AI attribution of any kind.**
>
> repository layout: `changelog.md` lives at the repository root (created
> 2026-11-06, no history before that date); `LICENSE.md` (non-commercial,
> Spanish + English) and `README.md` (Spanish) are at the root; there are no
> community files (`SECURITY`, `CONTRIBUTING`, `CODE_OF_CONDUCT`) and no
> `.github/` folder yet. `.docs/` (versioned) holds `manager.md`,
> `repo-audit-and-fix.md` and the git guides in `.docs/-github-guides/`.
> `agent-docs/` holds internal project notes (gitignored, but part of it is still
> tracked). The web version lives in `package.json`; the browser extension
> version lives in `extension/manifest.json` and `extension/manifest.firefox.json`.

## COMMIT, PR, MERGE & RELEASE GUIDELINES

read `.docs/manager.md` first, then the selected guide in `.docs/-github-guides/`. these files are versioned; this digest also works without opening them.

| request | guide |
| --- | --- |
| commit title, body and changelog | `commit-guide.md`, `changelog-guide.md` |
| pull request or merge | `pr-merge-guide.md`, `branching-guide.md` |
| version and release | `release-guide.md`, `changelog-guide.md` |
| permissions and sensitive data | `agent-rules.md` |

- inspect `git status`, both diffs and recent history before describing changes
- use `<prefix> | <imperative summary>` with `update`, `fix`, `hotfix`, `changes` or `changelog`; keep titles within 72 characters
- write commit bodies as 2 to 6 markdown bullets, one logical change per line, with literal paths in backticks
- never add authorship footers, automated attribution, signatures or generation notices; preserve the configured git identity
- update `changelog.md` under `## SIN PUBLICAR / UNRELEASED` in matching `### CASTELLANO` and `### ENGLISH` sections
- use the existing changelog category vocabulary and preserve language parity; describe only changes in the actual diff
- summarize pull requests in 1 to 3 bullets per category and language, at most 110 characters per bullet
- documentation and repository-management work targets `main`; the remote default is `main`; do not silently promote development work to the default branch
- the authorization for a requested action remains valid throughout that task; creating a pull request includes pushing its branch, but does not authorize merging or publishing
- use merge commits when a merge is requested; never force-push, rewrite published history or remove branches without an explicit instruction
- releases use the approved version and an immutable tag on the verified release commit, with english notes from the closed changelog; do not create a release for documentation work
- deliver requested titles, bodies and changelog fragments in separate code blocks; report executed actions with their commit hash or pull request link
