# F1 Pulse

**Every lap. Every gap. Every update.**

F1 Pulse is a desktop-first Formula 1 race-control workspace built with React 19, TypeScript, Vite and Tailwind CSS. It combines live timing, historical replay, race weekends, championship standings, driver/team/circuit directories, race control, technical updates and FIA documents without fabricating live values.

## Data sources

- **Jolpica F1** — season calendars, driver/constructor standings, race results, qualifying, sprint data, laps, pit stops and circuit listings. Base API: https://api.jolpi.ca/ergast/f1
- **OpenF1** — historical session timing, drivers, laps, positions, weather, race control, stints and pit data. Base API: https://api.openf1.org/v1
- **FIA official RSS** — FIA news and press releases: https://www.fia.com/rss/news and https://www.fia.com/rss/press-release
- **Formula 1 official live timing** — the local proxy connects to https://livetiming.formula1.com/signalrcore during an active session. The browser never connects to this upstream socket directly.
- **Repository refresh data** — official FIA/F1 feed snapshots are refreshed into public/data by the scheduled GitHub Action.

Every provider result keeps provenance and explicit unavailable/error states. The UI does not generate substitute timing values when a source is unavailable.

## Run locally

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

npm run dev starts both processes:

- Vite frontend: http://localhost:3000
- F1 live-timing proxy: http://localhost:8787

The proxy exposes GET /api/health and GET /api/live-timing (SSE relay). The proxy performs the Formula 1 pre-negotiate/cookie step and maintains the upstream WebSocket connection server-side, which avoids the browser cookie/CORS limitation.

To run the pieces separately:

```bash
npm run dev:proxy
npm run dev:client
```

The proxy port can be changed with F1_PROXY_PORT in .env.example.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Vitest tests are network-free. Parser and normalizer tests use the deterministic fixtures under src/data/replays/.

## Automated intelligence refresh

.github/workflows/refresh-f1-intelligence.yml runs every 30 minutes (*/30 * * * *) and can also be started manually. It executes scripts/refresh-f1-intelligence.py and commits refreshed public/data/fia-news.json and public/data/technical-updates.json when those files change.

## Styling architecture

F1 Pulse uses one deliberate styling split:

- **Tailwind utilities** for layout, spacing, responsive structure and small local composition.
- **.f1-* CSS classes** for themed workstation components, typography, states, timing tables and team-accent behavior.

The global favorite-team accent is preserved through CSS variables. A contrast-aware readable foreground is derived for text/focus/borders while the original team color remains the source swatch/accent value.

## Known limits

- Formula 1 live timing is only available while the official feed is publishing a session. Outside a live session the UI explicitly reports NO LIVE SESSION.
- The live proxy is required for the official SignalR stream; opening the Vite frontend without the proxy cannot provide live timing.
- OpenF1 is a public historical/live-data service with rate limits. F1 Pulse serializes uncached requests, caches results briefly and surfaces provider-unavailable states rather than fabricating data.
- Historical replay availability depends on the sessions and topics published by OpenF1. A requested race/session is never silently replaced by a different session.
- FIA documents/news are source-backed. If an official source is unavailable, F1 Pulse retains the last verified repository snapshot rather than inventing a document.
- Some technical and circuit metadata is enrichment data and is intentionally shown only when a verified source provides it.

## Project structure

- src/components/ — workstation UI and shared components
- src/hooks/ — season, live-session and favorite-team state
- src/providers/ — Jolpica, OpenF1, enrichment, replay and live-timing adapters
- src/providers/f1live/parsers/ — SignalR packet parsers
- src/data/replays/ — deterministic historical test fixtures
- server/ — Node/Express live-timing proxy
- public/data/ — scheduled intelligence snapshots
- .github/workflows/ — CI and scheduled data refresh
