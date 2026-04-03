# Fu-ball Live Table — Frontend

Mobile-first PWA for editing remaining football fixtures and instantly seeing the updated league table. Built with React + Vite + TypeScript. No backend required.

---

## Quick Start

```bash
# 1. Generate app data from scraped output
python ../scripts/build_app_data.py

# 2. Copy data into the frontend
bash ../scripts/copy_data.sh

# 3. Install dependencies
npm install

# 4. Start dev server
npm run dev
```

Open `http://localhost:5173` in your browser (or on your phone via your local IP).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Type-check + build production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | TypeScript type-check (no emit) |
| `npm run test` | Run vitest unit tests once |
| `npm run test:watch` | Run vitest in watch mode |
| `npm run ci` | Type-check + run tests (for CI pipelines) |

---

## Project Structure

```
frontend/
├── public/
│   ├── data/               # App data (copied from output/app_data/)
│   │   ├── teams.json
│   │   ├── fixtures.json
│   │   ├── prefill_predictions.json
│   │   ├── baseline_table.json
│   │   └── data_version.json
│   ├── _headers            # Netlify cache headers
│   ├── favicon.svg
│   └── icon-192.png / icon-512.png
├── src/
│   ├── components/
│   │   ├── BottomNav.tsx       # 4-tab sticky bottom navigation
│   │   ├── MatchdayView.tsx    # Accordion fixture editor (default page)
│   │   ├── FixtureCard.tsx     # Single match with +/- score controls
│   │   ├── LiveTable.tsx       # Live league table with rank deltas
│   │   ├── ScenariosView.tsx   # Scenario CRUD + compare view
│   │   └── SettingsView.tsx    # Data info + reset actions
│   ├── App.tsx             # Root component, data loading, page routing
│   ├── store.ts            # Context + useReducer state management
│   ├── tableEngine.ts      # Pure function: fixtures → sorted TableRow[]
│   ├── dataLoader.ts       # Parallel fetch of all /data/*.json files
│   ├── types.ts            # All TypeScript interfaces
│   ├── tableEngine.test.ts # Vitest unit tests for table calculation
│   └── index.css           # Mobile-first dark theme CSS variables
├── index.html
├── vite.config.ts          # Vite + PWA plugin config
├── tsconfig.json
└── vercel.json             # Vercel routing + cache headers
```

---

## Pages

### Spieltage (Matchdays)
- Fixtures grouped by matchday, collapsed by default
- First unplayed matchday auto-expands on load
- **Score editing**: tap `−`/`+` buttons or type directly into the score field
- **Edit badge**: shows how many matches you've changed in that matchday
- **Action chips** per open matchday:
  - `↺ Baseline` — reset all fixtures to AI predictions
  - `🎲 Zufällig` — randomize scores ±1 around the prediction
- **Focus team strip**: sticky bar showing the league leader's rank and points delta vs baseline

### Tabelle (Live Table)
- Recalculates on every score edit
- **Rank delta** (▲/▼/=) vs the official baseline (played matches only)
- **Promotion zone** (top 3, green) and **relegation zone** (bottom 3, red) highlighted
- Tap `# ⓘ` to see the tie-break rules
- Tap any team row to **pin/highlight** that team
- `CSV ↓` button exports the current table to a spreadsheet

### Szenarien (Scenarios)
- Create multiple named scenarios, each with independent score overrides
- **Duplicate** (⧉) any scenario to branch from it
- **Compare** (⇄) two scenarios side-by-side with position deltas
- **Unsaved-changes guard**: warned before switching away from an edited scenario
- **Export/Import** as JSON (share between devices)
- All scenarios persist in `localStorage`

### Einstellungen (Settings)
- Data snapshot timestamp and model version
- Team and fixture counts
- Reset all overrides in the active scenario
- Delete all scenarios from localStorage

---

## Data Flow

```
output/standings.json  ─┐
output/matchdays.json  ─┤─► scripts/build_app_data.py ─► output/app_data/*.json
output/match_details/  ─┘                                        │
                                                                  ▼
                                                scripts/copy_data.sh
                                                                  │
                                                                  ▼
                                                frontend/public/data/*.json
                                                                  │
                                                                  ▼
                                              App loads → store → tableEngine
                                                                  │
                                                                  ▼
                                                      Live Table (re-renders)
```

**Score priority** (highest to lowest):
1. Official result (played matches — never overridden)
2. User override (stored in active scenario)
3. AI prediction (from `prefill_predictions.json`)

---

## State Management

Uses React Context + `useReducer`. No external library.

```
AppProvider
├── appData          — loaded JSON (read-only)
├── scenarios[]      — all saved scenarios (persisted to localStorage)
├── activeScenarioId — which scenario is currently active
├── loading / error  — async state
```

**Key hooks:**

```ts
useAppState()       // full state
useAppDispatch()    // dispatch actions
useActiveScenario() // current Scenario object
```

**Key actions:**

| Action | Effect |
|---|---|
| `SET_SCORE_OVERRIDE` | Edit a match score in the active scenario |
| `RESET_MATCH` | Remove override for one match |
| `RESET_MATCHDAY` | Remove all overrides for a matchday |
| `RESET_ALL` | Clear all overrides |
| `CREATE_SCENARIO` | New scenario pre-filled with AI predictions |
| `DUPLICATE_SCENARIO` | Clone a scenario with "(Kopie)" suffix |
| `SWITCH_SCENARIO` | Change active scenario |
| `APPLY_BASELINE` | Reset active scenario to AI predictions |
| `IMPORT_SCENARIO` | Load a scenario from exported JSON |

---

## Table Engine

`src/tableEngine.ts` exports one pure function:

```ts
computeTable(
  fixtures: Fixture[],
  predictions: Record<string, Prediction>,
  overrides: Record<string, ScoreOverride>
): TableRow[]
```

Tie-break order: **points → goal difference → goals scored → team name (A–Z)**

Covered by unit tests in `src/tableEngine.test.ts`. Run with `npm test`.

---

## Data Refresh

When new match results are scraped, refresh the app data:

```bash
# From repo root
python scripts/build_app_data.py
bash scripts/copy_data.sh
```

Then rebuild/redeploy the frontend.

---

## Deployment

### Netlify
Drop the `dist/` folder (after `npm run build`) into Netlify, or connect the repo. The `public/_headers` file sets cache headers automatically.

### Vercel
`vercel.json` is already configured with cache headers and SPA routing rewrites. Deploy with:
```bash
vercel --prod
```

### Any static host (GitHub Pages, S3, Caddy…)
```bash
npm run build
# Serve frontend/dist/ as a static site
# Ensure your server rewrites all 404s to /index.html (SPA routing)
```

### Mobile home screen (PWA install)
1. Open the app URL in Chrome (Android) or Safari (iOS)
2. Android: tap the browser menu → "Add to Home Screen"
3. iOS: tap the Share button → "Add to Home Screen"

The app works offline after the first load (service worker caches all static assets).

---

## Hosting config

### Netlify — `public/_headers`
Already included. Immutable cache for hashed assets, `no-cache` for data files so refreshes always fetch the latest JSON.

### Vercel — `vercel.json`
Already included. Same caching strategy + SPA rewrite so deep links work.

---

## Testing & CI

```bash
# Type-check
npm run lint

# Unit tests
npm run test

# Both (use in CI)
npm run ci
```

Schema validation for the data pipeline:
```bash
python ../scripts/validate_schema.py
```

Build size check (fails if > 2MB):
```bash
bash ../scripts/build_and_verify.sh
```
