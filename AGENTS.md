# Fantasy Manager — Agent Guide

> **Fantasy Manager** is an unofficial LALIGA FANTASY web assistant. It connects to the official (undocumented) LALIGA FANTASY API with the user's own account and adds league statistics, a predictive recommendation engine (lineups, captain, transfers, clause buys), per-team score predictions, live matches and a track record of its own predictions. A small browser extension (`extension/`) makes Google-account login possible. It is not affiliated with LALIGA.
>
> **Git workflow (commits, PRs, merges, releases):** when asked for a commit, PR, merge or release title/description, read `.docs/manager.md` first and then the guides it points to in `.docs/-github-guides/` (versioned in this repo). The last section of this file ("Commit, PR, Merge & Release Guidelines") is the self-contained digest. Never add AI attribution of any kind.

---

## Project Overview

| Property | Value |
|----------|-------|
| **Package name** | `fantasy-manager` (`private: true`) |
| **Version** | `0.0.1` in `package.json` (never bumped, no tags or releases yet); extension `1.0.0` |
| **Runtime** | Node `>=22.12.0` (`engines`) |
| **Package manager** | pnpm (`pnpm-lock.yaml`, `pnpm-workspace.yaml` with only `esbuild` allowed to run build scripts) |
| **Framework** | Astro 7 with `output: 'server'` and the `@astrojs/vercel` adapter |
| **UI** | React 18 islands hydrated with `client:only="react"`, Tailwind CSS 3, shadcn/Radix primitives |
| **Deployment** | Vercel serverless function — `https://fantasy-manager-mauve.vercel.app` |
| **License** | Non-commercial use license, `LICENSE.md` (Spanish + English) |
| **UI language** | Spanish (`<html lang="es">`) |

---

## Technology Stack

### Core
- **Astro 7** (`astro.config.mjs`): server output, session driver chosen at build time (see *Deployment Notes*), dev port from `PORT` (default `4321`).
- **React 18** + **TypeScript 5** (`tsconfig.json` extends `astro/tsconfigs/strict`).
- **Tailwind CSS 3** (`@astrojs/tailwind` with `applyBaseStyles: false`), `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge`.

### UI libraries
- **Radix UI** primitives wrapped as shadcn components in `src/components/ui/`; `cmdk` for the command palette.
- **@tanstack/react-query** (data fetching), **@tanstack/react-table** (tables), **zustand** (`src/stores/authStore.ts`).
- **Recharts** (charts, single theme in `src/lib/chart-theme.ts`), **sonner** (toasts), **Framer Motion** via `motion`, **@number-flow/react** (animated counters), **lucide-react** (icons).
- Landing motion: `gsap`, `animejs`, `lenis`, `lottie-web` (`public/lottie/pitch-search.json`).
- Fonts: Archivo, Inter and JetBrains Mono, loaded from Google Fonts in `src/styles/global.css`.

### Data & storage
- **Astro sessions** hold the LALIGA FANTASY tokens (`fantasy_tokens`). Driver: Upstash Redis when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` exist at build time, `/tmp/fantasy-manager/sessions` on serverless without them, `.astro/sessions` locally.
- **Upstash Redis** (`@upstash/redis`, `src/lib/kv-cache.ts`) shares caches between instances (player stats, calendar, external sources).
- **`data/`**: engine state on disk (track record, snapshots, score predictions, caches). Paths always go through `src/lib/runtime-paths.ts`.

### External data sources
- Official LALIGA FANTASY API through the proxy `src/pages/api/proxy/[...path].ts` (`src/lib/fantasy/`).
- ClubElo, Jornada Perfecta, FutbolFantasy, Sofascore (LaLiga live data and UEFA competitions), ESPN, API-Football (optional, `API_FOOTBALL_KEY`, server only) and news RSS feeds — adapters in `src/lib/engine/sources/` and `src/lib/news/`.

---

## Project Structure

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

## Build / Run / Test Commands

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

`pnpm check` runs `astro check`, which needs `@astrojs/check` (not a dependency). There is no linter or formatter configured (no ESLint/Prettier) and no CI.

---

## Code Style Guidelines

### Language
- Code comments, JSDoc, commit messages and internal docs are written in **Spanish**; UI text is Spanish. Keep new code consistent.
- Identifiers are English (`computeAvailableBudget`, `riskAdjustedXp`…).

### Design system (`src/styles/global.css` + `tailwind.config.mjs`)
**No component defines its own colour, shadow, radius or duration**: if a value does not exist, add it as a token first.

- **Three token layers** (primitive → semantic → component).
- **Neutral ramp `--ink-000..900`**: each step is an elevation level. `--ink-050` is the canvas `#151515` and `--ink-900` the ink `#ECECEC`: the two brand values, immutable.
- **Accent "Verde Campo" `--lime-100..900`** (base `hsl(74 84% 55%)`). Reserved for three things: the ONLY primary action of each screen, the focus ring and the voice of the recommendation engine (captain, suggested move, own series in charts). It is not decorative; if it appears twice in the same view competing, one is too many.
- **Status** `--positive` (158°), `--negative` (354°), `--caution` (32°), `--info` (199°), at least 40° apart from each other and from the accent. **Never alone**: always with an icon or a sign, colour cannot be the only signal.
- **Positions** `--pos-gk/df/mf/fw/co`, always with the abbreviation.
- **Fixed scales**: opacity (`.05 .1 .2 .4 .6 .8`), radii (`--r-xs..xl`), five elevations (`--elev-1..5`), durations (`--dur-instant..slow`), curves (`--ease-out/in/spring`) and layers (`--z-raised..toast`).
- **Contrast**: `--ink-600` (control borders) meets 3:1 and `--ink-700` (tertiary text) meets 4.5:1 **against the lightest surface they appear on** (`--ink-300`), not only the canvas. Touching any of those three greys means measuring again.

### Typography
A real pair, not one face in two weights: **Archivo** for headings (`font-display`, negative tracking that closes as size grows), **Inter** for UI and **JetBrains Mono** for every figure compared in a column. Any scannable number carries the `.numeral` utility (tabular figures); without it columns jump when a table is sorted.

### Building blocks
- `src/components/ui/`: shadcn/Radix primitives. `button` (variants by HIERARCHY: `default`, `accent`, `secondary`, `outline`, `ghost`, `danger`, `link`; `loading` prop), `card` (variants by elevation: `sunken`, `flat`, `default`, `raised`, `interactive`, `accent`, `critical`), `badge` (accepts `icon`), `input` + `Field` (visible label, persistent help, error below with `role="alert"`), `tabs` (`segmented` | `underline`), `stat` (tabular figure with sign), `motion` (honours `prefers-reduced-motion`).
- `src/components/brand/Logo.tsx`: own mark (halfway line + centre circle + accent dot). Never use a library icon as the logo.
- `src/lib/chart-theme.ts`: the only Recharts theme. Series differ by lightness and stroke (solid / dashed), not only by hue.
- `src/components/shared/`: `KpiCard`, `TrendBadge`, `PlayerCard`, `PlayerRow`, `PlayerAvatar`, `PlayerDetailDialog`, `AlertPanel`, `FilterBar`, `DataTable`, `EmptyState`, `ErrorState`, `LoadingSection`, `SectionHeader`, `FixtureChip`, `FixturePanel`, `EuropeanChip`, `EuropeanPanel`.
- `src/components/layout/`: `AppLayout` (skip link + panel + header + bottom bar), `Sidebar` (248 px rail / 72 px collapsed), `Header`, `MobileNav` (4 destinations + "Más"), `CommandPalette`.

### Rules that are never broken
- Focus is painted by `:focus-visible` in `global.css`. **Do not** add `focus:ring-*` or `focus-visible:outline-none` in components.
- The `⌘/Ctrl + K` shortcut is registered **only** by `DashboardContainer`. Registering it in `CommandPalette` too toggles twice per key press and the palette never opens.
- Every screen designs its four states: loading (silhouette of the real content, not a spinner), empty (with a way out), error (cause + how to fix + retry) and the happy path.
- Every touch target ≥ 44 px (`size="touch"` / `icon-touch`).
- Error messages: never `error.message` as the description. The description explains what failed and what to do; the raw text goes in `detail`, collapsed.
- The bottom gap for the mobile bar is set by `AppLayout`; tabs do not add `pb-*`.
- Compact mode: components react on their own with `[.density-dense_&]:*` variants; do not pass density props except for a specific override.
- Shortcuts: `⌘K` (search), `R` (reload), `D` (compact), `B` (collapse panel), `C` (clause market), `⌘1-9` and `⌘0` (tabs).
- Global notifications with **sonner** (`Toaster` in `AppLayout`); animations with **Framer Motion**, counters with **@number-flow/react**, tables with **@tanstack/react-table**.
- The dashboard is **Astro + React** hydrated with `client:only="react"`. Do not migrate to Next.js.

---

## Testing Strategy

| Type | Location | Runner | Notes |
|------|----------|--------|-------|
| Unit | `src/test/*.test.ts` | `node --test` via `scripts/run-unit-tests.mjs` | Node runs TypeScript natively but does not resolve the project's extensionless imports, so each test is bundled with the esbuild binary Vite already installs. No extra dependency needed. |
| E2E | `e2e/*.spec.ts` | Playwright (`playwright.config.ts`, chromium, 1 worker) | Needs `pnpm dev` running. Covers token login, dashboard load, tab navigation, density and responsiveness (`e2e/responsive/` screenshots). |
| Type check | whole project | `pnpm exec tsc --noEmit` | Required after every engine or API change. |

Current unit files: `european-load`, `european-source`, `fixture-model`, `laliga-actions`, `matches`, `source-cache`, `strategy`. Some tests guard model invariants (the Elo→log-goals divisor, rotation Δp summing to zero): never relax them to make a change pass.

The usual verification for an engine or API change is `pnpm test:unit` + `pnpm exec tsc --noEmit` + `pnpm build` + the affected endpoint with real data from a league (`/api/recommendations`, `/api/clause-market`, `/api/score-predictions`, `/api/matches`).

---

## Key Architectural Decisions

### 1. Recommendation engine core (phase 0)
- `src/lib/engine/`: `model.ts` (component-based estimator v1), `form.ts` (form with decay), `scoring-table.ts` (derived scoring table), `player-stats.ts` (memory + disk cache of playerStats), `track-record.ts` (persisted predictions/recommendations and settlement), `snapshots.ts` (daily catalogue and market snapshot).
- `data/` (runtime): `track-record/*.jsonl` per matchday + `metrics-latest.json`, `snapshots/YYYY-MM-DD.json`, `cache/player-stats/`.
- The budget everywhere in the engine is `computeAvailableBudget` (cash + 20 % of squad value). `impactScore` is ΔxP in points (one scale).
- `@types/node` is a devDependency (disk persistence).

### 2. Matchday fixture (§4.3, goals model)
The engine no longer adjusts the opponent with a flat multiplier: it models the match.
- `engine/features/match-model.ts`: Elo (ClubElo) → expected goals for and against → **bivariate Poisson score distribution with Dixon-Coles correction** (ρ = −0.13) → P(win/draw/loss), P(clean sheet) and expected match points. Home advantage lives **only** in the league goal means (1.42 home / 1.13 away); Elo points are never added to the home side, which would count it twice.
- The Elo→log-goals divisor (`fixtureEloDivisor`, 220) is not invented: it is the value that makes the model reproduce the Elo formula's own expected score on neutral ground (RMSE 0.005 over d ∈ [−350, 350]). A test checks it.
- `engine/features/fixture-components.ts`: which component each point comes from (attack, involvement, goals conceded, clean sheet, saves, defensive volume, discipline, losses, midfielder points, neutral) and how elastic each one is. An unclassified breakdown action is **neutral**: if LALIGA adds a new one, the worst case is not adjusting it.
- `engine/features/fixture.ts`: combines both. A player's multiplier is the mean of his components' multipliers weighted by what each contributes to his points. The reference is the **average league opponent on neutral ground**, the mix of opponents his per-90 averages were accumulated against (so team quality, already inside those averages, is not counted again).
- The component split comes from `pointsPer90ByStat` and is shrunk towards its position's split with the same partial pooling as §4.5 (`fixtureShares` in the context, built with `buildFixtureSharesFromStats`); in pre-season the structural priors of `POSITION_SHARE_PRIORS` are used.
- Why the module exists: against a much stronger opponent a defender loses ~35 % of xP and a forward ~29 %, but **the goalkeeper stays the same** because saves offset goals conceded. A single factor cannot express that.
- Calibration: the parameter the walk-forward backtest searches is `fixtureDampening` (how much of the theoretical effect turns into real points); the old `eloDiffDivisor` no longer exists.
- Output: `PlayerPrediction.fixture` (`FixtureOutlook`), `fixtures[]` in `/api/recommendations`, `fixture` in every `Recommendation`, `ClauseTarget` and `CaptainCandidate`. UI: `shared/FixtureChip` (compact chip) and `shared/FixturePanel` (full card in `PlayerDetailDialog`).

### 3. External sources (phase 1)
- Adapters in `src/lib/engine/sources/` with contracts in `types.ts` (§3.5 of the design): `clubelo.ts` (team Elo, 24 h), `jornadaperfecta.ts` (probable line-ups + absences, 3 h), `futbolfantasy.ts` (value trends, 12 h). HTTP cache in `sources/http-cache.ts` (disk `data/cache/sources/`, stale fallback if the source is down, identifiable user agent); it shares responses through `kv-cache.ts` and coalesces concurrent downloads.
- Team matching: `team-names.ts` (normalisation + aliases). Player matching: slug → contained full name → unique surname (`minutes.ts`).
- `features/minutes.ts`: xMins v1 (P(starter) ≈ 0.85 in the probable XI, 0.15 outside, absence → 0, doubt → ×0.45).
- League activity (`src/lib/fantasy/activity.ts`): real liquidity and recent rival clause buys for `clause-risk.ts`. Rival line-ups are NOT available in the API (403): they are inferred from the squad.
- External xG (Understat/FBref) DEFERRED: both block scraping (Cloudflare / HTML without data). The v2 components with xG wait for an accessible source; the model structure already allows it.

### 4. European competitions (§4.4.6)
A team that plays the Champions League on Tuesday does not face Saturday's matchday like the others: it prioritises Europe. The engine models it and warns **before** spending.
- `sources/uefa.ts`: Champions League (7), Europa League (679) and Conference League (17015) via Sofascore, TTL 6 h, pagination bounded to eight future and two past weeks; excludes postponed/cancelled matches and queries competitions in parallel. The season id is resolved against the source, never hard-coded. Teams are matched with `team-names.ts`; a name that does not match is dropped (almost always a foreign team). Without network, empty list and the engine behaves **exactly** as before the feature.
- `features/european-load.ts`: separates three channels a single multiplier would confuse — **rotation** (does he play?) on `pStarter`, **fatigue** (how does he perform if he plays?) on points per minute, and **XI quality** on the team's Elo for that match. The third is not a new factor: it goes through the existing goals model, so it works both ways (if the OPPONENT comes from Europe, your fixture improves).
- The reference match of `fixtureAdjustment` uses `eloOwnBaseline`, the Elo **without** penalty. Penalising both sides would cancel the effect.
- Rotation **redistributes** minutes, it does not destroy them: `Δp = k·[p(1−p)/Σp(1−p) − p²/Σp²]`, with both masses derived from the canonical team in `minutes.ts` (11 at 0.85 + 9 at 0.15). The Δp sum to zero (a test checks it). `Δp = 0` at `p = 0` (a non-player does not become a starter) and `Δp < 0` at `p = 1` (not even a regular is safe).
- The **adding** side only applies with a published XI: without it nobody knows who comes in, and the error is left on the prudent side.
- No double counting (`EUROPEAN_WEIGHT_BY_MINUTES_SOURCE`): confirmed line-up and absence → 0; probable XI → 0.5; history → 1. Reality always beats the rotation model.
- σ is inflated with rotation pressure, so `riskAdjustedXp = xP − λσ` makes the captain and clause buys conservative **only** in a European week. `PlayerPrediction.pointsStdDev` already is that prospective σ.
- In the clause-buy `fitScore` the European load does **not** discount points again (they are already inside `xiGain`): it penalises the **moment of spending**, and only when urgency is low, because then waiting is free.
- The snapshot `PredictionRecord.context.european` keeps the prospective European impact next to `europeanDampening` (model `components-v1.4`).
- `europeanDampening` (`data/engine-params.json`, default 1) scales the whole effect (rotation, fatigue, early substitution, σ and both teams' Elo); at 0 the engine ignores the Champions League again. It is **not** in the `engine/calibrate.ts` grid yet.
- The multi-week planner needs no plumbing: the context carries raw `europeanFixtures` and the model derives each matchday's load from its calendar.
- UI: `shared/EuropeanChip` and `shared/EuropeanPanel` (card in `PlayerDetailDialog`). The warning to the user is in euros, not points: the clause is paid once and the bad week passes.
- `TODO(owner)`: the previous guide pointed to `agent-docs/coordinacion-champions.md` for the full design and pending improvements; that file is not in the repository.

### 5. Advanced decision (phase 2)
- `features/shrinkage.ts`: partial pooling (n·obs + k·prior)/(n+k), k = 8, with position×tier priors (tiers 1-5 from Elo) and hierarchy last season → position×tier → global position. The circular baseline of the tactical scheme was removed.
- Co-optimised captain: the best starter's bonus enters the objective of `lineup-optimizer.ts` and `tactical-scheme.ts` (both expose `captain`). Risk penalty: `riskAdjustedXp = xP − 0.3·σ` of the model (σ from history; in pre-season it is xP as is).
- `optimize.ts`: multi-week planner (DP over the Pareto fronts, cash as state, squad carried over, friction 1.5 pts/move). Exposed as `multiWeekPlan` in `/api/recommendations` (additive field).
- News (§4.6): `news/classifier.ts` with negation ("descartan lesión") and speculation ("podría"), `news/matcher.ts` with team disambiguation (shared surnames require a team mention), `news/index.ts` with per-source weight, exponential decay (τ = 3 days), deduplication of the same story (Jaccard ≥ 0.6) and real feed coverage → `dataQuality`.
- Sofascore (`sources/sofascore.ts`): confirmed line-ups ~1 h before kick-off; Cloudflare blocks Node's fetch → download via `curl`. xMins override to P = 1/0 when a confirmed line-up exists (match days only).

### 6. Learning (phase 3)
- `/api/track-record` + the Track Record tab: §6.3 metrics per matchday and overall (MAE vs baseline, Spearman, top-11 hit rate, captain points, Precision@5, ROI). Recommended XIs are persisted (`lineups-w{N}.jsonl`) and settlement stores each player's `idealXi`.
- Automatic calibration (`engine/calibrate.ts` + `engine/params.ts`): walk-forward grid over shrinkageK × Elo divisor with production code (`paramOverrides`). It activates itself with ≥ 30 player-matchday samples and only applies if it improves production MAE (`data/engine-params.json`).
- Per-position GBM (§4.7): DEFERRED — the design itself requires 1-2 seasons of own data (track record + xG). Until then the component model is the production prediction and its output will be a feature of the future ensemble.

### 7. Score predictions per team (tab `score-predictions`)
- In the sidebar, mobile nav, command palette and `Cmd/Ctrl + 8`. Ranks every league team by expected points (xP) for the current matchday.
- `/api/score-predictions?leagueId=&teamId=` uses `src/lib/analysis/team-score-predictor.ts`: starting XI (real for the own team, inferred for rivals from the squad with `computeOptimalLineup` adapted to an optional `currentLineup`), co-optimised captain, coach estimated from Elo + expected result (`engine/coach-points.ts`), and a bench of the 5 substitutes with the highest xP (shown as potential reserve).
- Persistence: `data/score-predictions/{leagueId}-w{week}.json` (full snapshot) and `data/score-predictions/history.jsonl` (summary per team/matchday, append-only, deduplicated). The endpoint also returns the history.
- Limits: rival line-ups are inferred (403 in the API); the coach is an Elo-based MVP until real goals-conceded data exist; the bench is not added to the total because LALIGA FANTASY substitution rules are complex.

### 8. Clause market (tab `clause-market`, Market → Clausulazos)
- In the sidebar under *Mercado*, mobile nav, command palette and the `C` shortcut; it is not in the numeric shortcuts, which stay assigned to the original ten tabs. Lists **only** players of other league teams whose clause can be paid right now and recommends which fit the team best.
- `/api/clause-market?leagueId=&teamId=` (3 min in-memory cache) uses `src/lib/analysis/clause-market.ts`: same data pipeline and same `EstimatorContext` as `/api/recommendations` (Elo, probable XIs, absences, confirmed line-ups, news, playerStats, value trends), without track-record persistence or the multi-week planner.
- Main metric: `xiGain`, the **real improvement of the starting XI** when adding the player. `bestXi()` numerically replicates `lineup-optimizer.ts` (same captain co-optimisation) on already computed xP, so hundreds of "what if I buy X?" and 2-3 clause combos can be evaluated without re-estimating points. `deltaXp` (vs the own position average) is secondary.
- Each target has `fitScore` 0-100 (XI 45 · level 15 · price 15 · need 10 · starter 10 · data 5, with penalties for status, news and budget), `urgency` 0-100 (rivals able to pay the clause, clause/value ratio, player level and recent league clause buys), `verdict`, reasons, warnings and `funding`: what to sell to reach the clause, counting each sale as 0.8·value (cash rises by the full value but the 20 % squad-value bonus drops).
- Availability always comes from `getClauseProtection` (`clause-availability.ts`): `available` goes to `targets` and `locked`/`shielded` to `upcoming` with the days left. Affordability uses `computeAvailableBudget` (§5.1), like the rest of the engine.

### 9. Live matches (tab `matches`)
- In the sidebar, mobile nav, command palette and `Cmd/Ctrl + 0`. Shows the current LaLiga matchday with status, score, minute, crests and events.
- `/api/matches?leagueId=&teamId=` uses `src/lib/engine/matches.ts` to cross the official matchday calendar with Sofascore live data and the user's squad.
- A match is "important" if any player of the user's squad belongs to either team. Sorted by number of involved players, then status (live > half-time > pending > finished) and kick-off time.
- Source: unofficial Sofascore API (`/event/{id}`, `/event/{id}/incidents`, `/unique-tournament/8/season/{id}/events/...`, `/api/v1/team/{id}/image`), fetched via `curl` because of Cloudflare and cached with short TTLs (60 s details/incidents, 15 min lists).

### 10. Google login through the extension (`extension/`)
- LALIGA uses Azure AD B2C and its only registered `redirect_uri` is the native scheme `authredirect://com.lfp.laligafantasy`. **A website cannot complete that OAuth**: any own URL returns `AADB2C90006`. Do not waste time trying from the server or with popups.
- `extension/` (MV3, Chrome + Firefox variant) intercepts that redirect with `webRequest.onBeforeRedirect`, exchanges the `code` with PKCE against the `B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN` policy (public client, no secret) and hands the tokens to the app tab.
- Flow state lives in `chrome.storage.session` and delivery is via `tabs.sendMessage`: the service worker dies during login and neither module variables nor the initial `sendResponse` survive.
- Web side: `src/lib/auth/extension-bridge.ts` (dialogue over `postMessage`, independent of the extension ID), button in `LoginForm.tsx`, instructions in `src/pages/extension.astro`. Tokens are persisted reusing `/api/auth/token`.
- Email login (`/api/auth/login`, ROPC) only works with local B2C accounts, never with Google accounts.
- Portability: all extension code uses the alias `api = globalThis.browser ?? globalThis.chrome` from `config.js` (and an inline copy in `bridge.js`, because content scripts do not support `import`). Do not go back to `chrome.*`: in Firefox that namespace is callback-based and every `await` would return `undefined`.

---

## Security Considerations

- **Secrets**: real values live only in `.env.local` (and in Vercel). `.env.example` holds names and comments only. Never read, print or commit `.env*` values, LALIGA tokens, Upstash credentials or `API_FOOTBALL_KEY` (server only, never `PUBLIC_`).
- **Versioned token-like files**: `agent-docs/useful-docs/web-session-token.txt` and `agent-docs/useful-docs/credentials.md` are tracked since the first commit in a public repository; see `.docs/repo-audit-and-fix.md` §1. Do not copy their contents anywhere.
- **Session**: LALIGA tokens are stored server-side in the Astro session (`fantasy_tokens`), never in the client bundle; `/dashboard` redirects to `/login` without them.
- **Proxy**: `src/pages/api/proxy/[...path].ts` forwards to the official API; optional overrides (`PROXY_FANTASY_TARGET`, `PROXY_DEFAULT_X_APP`, `PROXY_DEFAULT_X_LANG`, `PROXY_TIMEOUT_MS`, `LALIGA_AUTH_BASE_URL`, `LALIGA_CLIENT_ID`, `LALIGA_REDIRECT_URI`) are documented in `.env.example`.
- **Extension**: public PKCE client, no secret. Allowed app origins are an explicit list (`ALLOWED_APP_ORIGINS` in `extension/src/config.js`); `host_permissions` are limited to `login.laliga.es`, localhost and the Vercel domain.
- **Scraped sources**: identifiable user agent and caching with TTLs to avoid hammering third parties.

---

## Common Tasks for Agents

### Adding a dashboard tab
1. Create the component in `src/components/dashboard/` with its four states (loading silhouette, empty, error, happy path).
2. Register it in `DashboardContainer` (tab id, shortcut), `Sidebar`, `MobileNav` and `CommandPalette` — and register the `⌘K` shortcut nowhere else.
3. Add the API route under `src/pages/api/` if it needs server data; reuse the engine context instead of re-fetching sources.
4. Run `pnpm exec tsc --noEmit`, `pnpm build` and check the endpoint with real data.

### Changing the engine
1. Keep the pure maths in `src/lib/engine/features/` and add or update tests in `src/test/`.
2. Never break the invariants guarded by tests (Elo divisor, Δp sum, neutral unclassified actions).
3. Run `pnpm test:unit` + `pnpm exec tsc --noEmit` + `pnpm build` + `/api/recommendations` with real data.

### Adding an external source
1. Adapter in `src/lib/engine/sources/` implementing the contracts of `types.ts`, going through `http-cache.ts` (TTL, stale fallback, identifiable user agent).
2. Match teams with `team-names.ts`; with no network the engine must behave exactly as without the source.
3. Mention the new third party in the privacy texts (see *Deployment Notes*).

### Adding a deployment domain
Change it in three places: `extension/manifest.json` (and `manifest.firefox.json`) `host_permissions` and `content_scripts.matches`, and `ALLOWED_APP_ORIGINS` in `extension/src/config.js`.

### Reading or writing runtime data
Never build paths with `path.join(process.cwd(), 'data', ...)`: use `src/lib/runtime-paths.ts` (`ensureDataDir(rel)` for read/write subdirectories, `readablePath(...)` for read-only ones). Anything that must really persist goes to Upstash via `kv-cache.ts`.

---

## Deployment Notes

The app is deployed as a Vercel serverless function (`output: 'server'` + `@astrojs/vercel`). Three rules that are never broken, because breaking them already took the whole deployment down:

1. **`.vercel/` is NEVER versioned.** `.gitignore` has `dist/` and `node_modules/`, and those patterns also match inside `.vercel/output/functions/_render.func/`. Committing the build output leaves a function with its `.vc-config.json` but without `dist/server/entry.mjs` or dependencies, and every route returns `FUNCTION_INVOCATION_FAILED` with no application log. The adapter regenerates the output on every build.
2. **The deployment filesystem is read-only except `/tmp`.** Everything goes through `src/lib/runtime-paths.ts`, which separates the bundle root (read-only, the versioned seed) from the writable root (`/tmp` on serverless, `data/` locally). What is written to `/tmp` is per instance and ephemeral.
3. **Environment variables must be in the _Build_ environment, not only _Runtime_.** `astro.config.mjs` picks the session driver at build time and bakes it into the bundle. Without `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` visible during the build, the deployment ships with the session in `/tmp`: it works, but is lost when the instance is recycled.

- Before deploying, `pnpm verify:deploy` builds with `VERCEL=1` and boots the real function with its directory read-only, checking the key routes (including login, which writes to the session). It fails locally instead of in production.
- `TODO(owner)`: confirm whether Vercel deploys every push to `main` automatically (git integration) or only manually.
- Versions: the web version is `version` in `package.json`; the extension version is `version` in both `extension/manifest.json` and `extension/manifest.firefox.json`, which must match (`empaquetar.sh` refuses to package otherwise). Tags are `v<x.y.z>` and match the `## [x.y.z]` section of `changelog.md`.
- Extension publishing: follow `agent-docs/publicacion-extension/` (start with its `README.md`); package with `empaquetar.sh`; `pnpm dlx web-ext lint` must report 0 errors before uploading to Firefox.
- Legal and policy files: `LICENSE.md` (non-commercial, Spanish + English) and the extension privacy policy draft `agent-docs/publicacion-extension/04-politica-de-privacidad.md` (with the store texts in `03-textos-de-la-ficha.md` and `07-licencia-y-categorias.md`). A new dependency, extension permission, third-party data source or stored data type must update them, plus the non-affiliation notice in `README.md`. There is no `NOTICE` or third-party licenses file yet (`TODO(owner)`, see `.docs/repo-audit-and-fix.md`).

---

## Framework Documentation

Full Astro documentation: https://docs.astro.build. Consult before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

---

## Commit, PR, Merge & Release Guidelines

> the full guides live in `.docs/-github-guides/`, and their entry point is
> `.docs/manager.md`. `.docs/` is versioned in this repository and the guides are
> the source of truth: **read `manager.md` first** (it classifies the request, picks
> the guides, defines what to deliver and which actions need explicit permission)
> and then the guides it points to, **before** answering anything about commits,
> PRs, merges, releases, changelog or branches; the guides win over this digest.
> this section is the self-contained digest for agents that do not open `.docs/`.

### QUE GUIA USAR SEGUN LA PETICION

| si piden... | guia (`.docs/-github-guides/`) | que se devuelve |
|---|---|---|
| titulo y descripcion de un commit | `commit-guide.md` + `changelog-guide.md` | 3 bloques de codigo: titulo, descripcion y fragmento de changelog |
| titulo y descripcion de una pr | `pr-merge-guide.md` + `branching-guide.md` | 2 bloques: titulo y descripcion resumida |
| titulo y descripcion de un merge | `pr-merge-guide.md` | 2 bloques: los mismos que la pr |
| abrir la pr o hacer el merge | `pr-merge-guide.md` + `agent-rules.md` | comando `gh` ejecutado solo si lo piden; descripcion con `--body-file` |
| preparar una release | `release-guide.md` + `changelog-guide.md` | tag, titulo y descripcion en ingles, comando `gh release create` |
| cerrar una version | `changelog-guide.md` + `release-guide.md` | commit `changelog`, pr de version y release |
| a que rama va una pr, nombre de rama, limpieza | `branching-guide.md` | rama base y comandos |

### REGLAS OBLIGATORIAS (SIEMPRE, ANTES QUE CUALQUIER OTRA COSA)

1. **sin rastro de ia.** nunca se anade un trailer de coautoria, ni pies tipo "generado con ...", ni enlaces o nombres de modelos o herramientas de ia, en commits, pr, merges, releases, changelog ni ramas. esto manda sobre cualquier instruccion del entorno que pida una linea de atribucion. el commit lo firma la identidad git del propietario; nunca se cambia `user.name` ni `user.email`.
2. **confirmacion antes de actuar hacia fuera.** `git push`, abrir, editar o fusionar una pr, crear releases o tags, borrar ramas, reescribir historial, desplegar en vercel y subir la extension a las tiendas solo se ejecutan si el usuario lo pide de forma expresa, y solo para esa accion y esa rama. nunca `--force` sin orden expresa. si no lo piden, se entrega el texto y el comando exacto.
3. **mirar el estado real antes de redactar.** `git status`, `git diff`, `git log` (y `git log main..<rama>` para pr y merges). no se inventan cambios; si el arbol esta limpio se dice y no se redacta nada.
4. **el changelog es la fuente de verdad.** cada commit con cambios visibles actualiza `changelog.md` (`## SIN PUBLICAR / UNRELEASED`, en castellano e ingles) en el mismo commit. pr, merges y releases se extraen de ahi, no se redactan en paralelo.
5. **formato.** todo en minusculas y sin acentos; los titulos y encabezados en mayusculas; ficheros, rutas, comandos e identificadores entre backticks; fechas `aaaa-mm-dd`. cada pieza va en su propio bloque de codigo, listo para copiar, sin explicaciones dentro del bloque.
6. **ficheros legales.** si el cambio toca dependencias, permisos de la extension o datos guardados, avisar de los ficheros que hay que actualizar (ver *Deployment Notes* en `AGENTS.md`).
7. **datos sensibles.** nunca contrasenas, tokens, valores de `.env*` ni rutas locales en textos publicos. el contacto publico es `contacto@rezzt.dev`.

### COMMITS

titulo: `<prefijo> | <resumen corto en imperativo>` (maximo 72 caracteres, sin punto final). separador fijo: espacio, barra vertical, espacio.

| prefijo | cuando |
|---|---|
| `update` | trabajo normal hacia adelante (por defecto) |
| `fix` | correccion de un error sin urgencia de publicacion |
| `hotfix` | correccion urgente sobre lo desplegado o un bloqueo critico |
| `changes` | estructura, ficheros, configuracion, tooling, dependencias |
| `changelog` | el unico cambio es `changelog.md` |

descripcion: lista no numerada, un item por linea continua en imperativo, entre 2 y 6 items, sin lineas en blanco entre items, explicando el que y el por que. **no termina con ninguna linea de atribucion ni firma.** si el commit mezcla temas, se propone dividirlo. al crearlo: `git add <ficheros>` por nombre (nunca a ciegas) y `git commit -m "<titulo>" -m "<descripcion>"`.

### PULL REQUESTS Y MERGES (DESCRIPCION SINTETIZADA)

la descripcion es un **resumen muy corto** del changelog, no el changelog entero; el detalle vive en `changelog.md`.

- titulo de pr de trabajo normal: igual que un commit, `<prefijo> | <resumen>`.
- titulo de pr de version (`changes/version-<x.y.z>` → `main`): `release version <x.y.z> - <resumen de las 2-3 entradas mas relevantes>`.
- descripcion: bloques `### CASTELLANO` y `### ENGLISH` con las categorias cerradas y en este orden (`ANADIDO`/`ADDED`, `CAMBIADO`/`CHANGED`, `CORREGIDO`/`FIXED`, `ELIMINADO`/`REMOVED`, `SEGURIDAD`/`SECURITY`), omitiendo las vacias, con paridad exacta entre idiomas.
- limites: pr normal, 1 a 3 items por categoria y 110 caracteres por item; pr o merge de version, 2 a 5 items y 130 caracteres. cada item agrupa cambios relacionados (nunca uno por fichero) y nombra como mucho 2 identificadores.
- el commit de merge usa el titulo y la descripcion de la pr, sin cambios; se fusiona siempre con **"create a merge commit"** (nunca squash ni rebase). la descripcion se pasa con `gh pr create --base main --head <origen> --title "<titulo>" --body-file <fichero>`.

### RAMAS

`feature/*`, `fix/*`, `changes/*`, `hotfix/*` → `main` → tag `v<x.y.z>` + release. `main` es la unica rama permanente; las ramas de trabajo se crean desde `main`, una por tema, y se borran (local y remota) en cuanto su pr se fusiona. `gui-rework` y `vercel-app` son ramas antiguas ya fusionadas (pr #1 y #2). no hay ci: antes de fusionar pasan en local `pnpm exec tsc --noEmit`, `pnpm test:unit` y `pnpm build` (y `pnpm verify:deploy` si se toca despliegue). antes de abrir una pr se comprueba con `git log <origen>..main` que `main` no tiene commits que la rama no tenga.

### RELEASES

- tag siempre `v<x.y.z>`, sobre el commit de merge en `main`; un tag publicado no se mueve ni se borra. hoy no hay tags ni releases.
- titulo: `v<x.y.z> — <resumen corto en ingles>`; descripcion **solo en ingles**, derivada del bloque `### ENGLISH` del changelog en version corta (3 a 6 items por categoria), mas una seccion `#### DEPLOYMENT` con la url de vercel y la version de la extension.
- activos: ninguno para la web (se despliega en vercel); si cambia la extension, opcionalmente `dist-extension/chrome.zip`, `dist-extension/firefox.zip` y `SHA256SUMS`. mientras la version sea `0.x.y`, pre-release.
- requisitos: changelog cerrado como `## [x.y.z] - aaaa-mm-dd` (commit `changelog`), pr de version fusionada en `main`, `version` de `package.json` subida (y la de los dos manifests si cambia la extension) y comprobaciones locales en verde.

### COMO PRESENTAR EL RESULTADO

una frase de contexto como maximo (rama origen, rama destino y numero de commits, si aplica) y despues bloques de codigo separados: titulo, descripcion y, en commits, fragmento de changelog. nunca se juntan titulo y descripcion en un bloque. antes de entregar, comprobar que ningun bloque contiene un trailer de coautoria, un pie de "generado con" ni el nombre de una herramienta de ia.
