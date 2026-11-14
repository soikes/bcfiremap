# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **React 19** with `react-dom`, web only
- **Bun 1.3.10**: package manager, runtime, bundler, dev server and test runner (use `bun` for everything, never `npm` or `yarn`). The same version is pinned in the `Dockerfile`, CI and `@types/bun`; change them together.
- **MapLibre**: `react-map-gl/maplibre` + `maplibre-gl` (pinned 5.24.1); OSM Bright basemap style on OpenFreeMap tiles
- **TypeScript**: strict mode

## Commands

```sh
bun run dev         # dev server on http://localhost:3000 (PORT to change): page with hot reload, plus the API
bun run build       # production build: static site to dist/public, API server to dist/server
bun run test        # bun test with happy-dom and React Testing Library
bun run typecheck   # tsc --noEmit
bun install         # install dependencies
```

## Architecture

- `web/index.html` — page shell; Bun bundles `web/main.tsx` and `web/index.css` from it
- `web/main.tsx` — renders `App` into `#root`
- `server/dev.ts` — dev entry: `Bun.serve` with the page (an HTML import, bundled on the fly with hot reload) and the API routes
- `server/index.ts` — production entry: `Bun.serve` on `127.0.0.1` with only the API routes; nginx serves the page
- `server/api.ts` — starts the server collectors and returns the `/api/bans` route, shared by both entries
- `server/banStore.ts` — runs the server collectors on their schedules with retries, keeps the last good data per source, and builds the `/api/bans` response
- `components/App.tsx` — root component; provides the react-query client, owns the selected-location state and composes the map layers and `BanPanel`
- `components/BaseMap.tsx` — full-size MapLibre map that reports clicks as a `LatLng`
- `components/FireZones.tsx`, `BanPolygons.tsx`, `SelectedPin.tsx` — map layers built from react-map-gl's `Source` and `Layer`
- `components/BanPanel.tsx`, `BanCard.tsx` — results panel (centred and width-limited on wide screens); lists the bans at the tapped point plus each source's status, coverage and attribution, with a warning when a source failed
- `components/SourceBanner.tsx` — banner over the map naming the sources being retried ("Retrying…") and those that failed with no data once retries ran out, so users know bans may be missing before they tap
- `components/ErrorBoundary.tsx` — catches render errors in the ban layers and the panel so the base map keeps working; tries again when its `resetKey` changes
- `collectors/` — one `Collector` per data source (`types/collector.ts`): `collect()` fetches and normalizes to `FireBan[]`. `browser.ts` lists the collectors that run in each visitor's browser, `server.ts` the ones the server runs (see Fire bans for which goes where). `provincial.ts` is the BC Wildfire Service ArcGIS feed, `example.ts` is fake dev data (made-up bans shaped like the real Kamloops Fire Centre, whose zones are merged into one outline with `polygon-clipping`, and the Penticton Fire Zone, fetched at runtime from the zones service, plus hand-drawn local ones; the real collector does no merging and uses each row's own polygon), `classifyBan.ts` maps free text to a `BanType`
- `hooks/useBans.ts` — runs the browser collectors on their own schedules (react-query), fetches `/api/bans`, and merges both, keeping the last good data if a refresh fails; a placeholder source stands in for the server until it answers
- `hooks/useFireBans.ts` — returns the bans whose area contains the selected location, broadest first, using `utils/geometry.ts` (Polygon/MultiPolygon with holes) and `utils/pointInPolygon.ts`
- `lib/queryClient.ts` — shared react-query client (retries with backoff)
- `utils/fetchJson.ts` — GET + JSON with timeout and abort handling, used by collectors and `useBans`
- `utils/validate.ts` — checks bans from collectors and the `/api/bans` answer: drops malformed bans and sources, and throws (so the source counts as failed) when a result isn't a list or the answer isn't the expected shape
- `utils/sourceStatus.ts` — which sources failed with no data or are retrying, and joining their names for messages
- `utils/geojson.ts` — converts bans and points to GeoJSON for the map sources
- `utils/logger.ts` — thin wrapper around `console.log`/`console.error`
- `types/` — every type file: `LatLng` (`geo.ts`), `FireBan` (`ban.ts`), `SourceStatus`/`BansResponse` (`api.ts`, the shape `/api/bans` returns), `Collector` (`collector.ts`), and the declarations for CSS imports (`css.d.ts`) and the jest-dom test matchers (`matchers.d.ts`). A component's `Props` and other types used by one file only stay in that file
- `constants/` — map style/camera, fire zones URL and the `SHOW_FIRE_ZONES` flag (`map.ts`), ban colours and labels (`banStyle.ts`)
- `test/` — fixtures and the `bun test` preloads (`happydom.ts`, `testingLibrary.ts`, set in `bunfig.toml`)
- `bunfig.toml` — test preloads, and which env variables the dev server inlines into the page (`PUBLIC_*`)
- `.env.template` — defaults for build-time flags (`PUBLIC_EXAMPLE_BANS=false`); a local, gitignored `.env` overrides them, and a shell variable overrides both (`bun run dev` and `bun run build` load the two files with `--env-file`)
- `assets/` — favicon, source icon art, basemap style
- `deploy/` — `nginx.conf`, `security-headers.conf` and `start.sh`, used by the `Dockerfile` (see Deploy)

A failing source never takes the page down: a source that throws, times out, or returns malformed data is reported as failed (status `error`, no data), the other sources' bans stay on the map, and the banner and panel say which source is missing. Every `SourceStatus` carries `retrying` (its last attempt failed and another is coming): browser sources take it from react-query (`failureCount > 0` while still fetching), server sources from `banStore`, and while a request to the server itself is retried a "BC Fire Bans server" entry is flagged. While retrying, the banner says so instead of saying bans are missing. A refresh that fails after a success keeps the last good data and the panel shows its time. `components/App.test.tsx` checks this end to end with a fake map (`mock.module` on `react-map-gl/maplibre`) and `fetch` answered per URL; Bun runs all test files in one process, so module mocks there apply to later files too.

Each component's styles live in a plain CSS file next to it (`BanPanel.css`), with class names prefixed by the component name (`ban-panel-title`). CSS modules don't work in Bun 1.3.10's dev server (the class name object is never defined).

## Data

Fire zone boundaries are not stored in the repo. `components/FireZones.tsx` gives the map a URL (`FIRE_ZONES_URL` in `constants/map.ts`) to the BC government's ArcGIS feature service, and the browser fetches it at runtime. The query asks the server to simplify the geometry (`maxAllowableOffset`), which keeps the response around 280 KB. The service allows cross-origin reads, unlike BC's WFS server. The ArcGIS copy has 31 zones (no Mid Island Fire Zone). The layer is currently off (`SHOW_FIRE_ZONES = false`) pending licensing clarification.

### Basemap

The basemap style is [OSM Bright](https://github.com/openmaptiles/osm-bright-gl-style), bundled unchanged in `assets/map-style/osm-bright.json` with its licence (`osm-bright-LICENSE.md`: BSD-3 code, CC BY 4.0 design, so credit is required; it is in the source attribution in `constants/map.ts`). The original points at MapTiler and needs an API key, so `constants/map.ts` overrides three fields: the vector tile source and the font glyphs now come from OpenFreeMap (same OpenMapTiles schema, and the same Noto Sans fonts), and the source attribution is replaced with the combined credit. The sprite (icons) is still loaded from `openmaptiles.github.io`. Layers added by this app (zone labels) must use a font OpenFreeMap serves: Noto Sans Regular, Bold or Italic.

### Fire bans

Where a collector runs depends on its source's licence. Both BC ArcGIS sources (Bans and Prohibitions, and Fire Zones) are listed as **Access Only** in the BC Data Catalogue: reproduction is not permitted without written permission. So they are browser collectors: each visitor's browser fetches them directly, and the server must not fetch, store or re-serve them (this includes the example collector, which builds on the fire zone shapes). The ArcGIS item for the bans layer says Open Government Licence – British Columbia instead, which is where the panel's attribution text comes from; the conflict is unresolved. Sources whose licence allows redistribution can be server collectors.

`collectors/provincial.ts` reads the BC Wildfire Service "Bans and Prohibition Areas" ArcGIS layer. It excludes municipal and regional district bans, and the panel says so. The layer was empty (off-season) when the collector was written, so the free-text `TYPE`, `CATEGORY` and `ACCESS_PROHIBITION_DESCRIPTION` values are unverified: the card shows the source's own text and `classifyBan` falls back to `other`. Geometry is simplified server-side (`maxAllowableOffset=0.001`, about 100 m), so lookups near a boundary are approximate.

To add a source: write a `Collector` in `collectors/` that returns `FireBan[]` (reuse `fetchJson`, validate the response, skip bad features instead of throwing), then add it to `BROWSER_COLLECTORS` (`collectors/browser.ts`) or `SERVER_COLLECTORS` (`collectors/server.ts`) according to its licence. A browser source's host must also be added to the CSP. Before relying on server collectors in production, keep one machine running: Fly stops idle machines (`auto_stop_machines`), which pauses the schedule, so set `min_machines_running = 1` and run a single machine (`fly scale count 1`) so sources aren't fetched twice. In dev, `bun --hot` re-runs `server/dev.ts` when server code changes and the earlier schedules keep running, so restart `bun run dev` after editing server code.

Set `PUBLIC_EXAMPLE_BANS=true` (in the shell or in `.env`) when running `bun run dev` or `bun run build` to add the fake example collector. The bundler replaces `process.env.PUBLIC_EXAMPLE_BANS` with its value at build time; `.env.template` sets it to `false` so it is always defined (left unset, the reference would stay in the page and fail in the browser, where there is no `process`). `collectors/browser.ts` loads the example with a `require` inside an `if` on that variable, so without the flag the bundler drops the branch and neither the example collector nor `polygon-clipping` is in the bundle (checked on a production build). Keep the `require` in that form, and don't set the variable for real production builds. `fly.toml` currently sets it as a build arg (passed through the `Dockerfile`) so the deployed site shows the example data; remove it from `[build.args]` to turn that off.

## Deploy

nginx sits in front of the Bun API server, in one container. `Dockerfile` builds with `bun run build`, then starts from a non-root nginx image, copies in the `bun` binary, the static site (`dist/public`) and the API server (`dist/server`). `deploy/start.sh` runs both processes and exits when either one stops, so Fly restarts the machine. nginx listens on port 8080, serves the static files and proxies `/api/` to Bun on `127.0.0.1:3000`. `deploy/nginx.conf` holds per-IP rate limiting, gzip, long-lived caching for content-hashed files and the server settings; `deploy/security-headers.conf` holds the response headers incl. the CSP. Keep these in nginx rather than in `fly.toml`, so the app isn't tied to Fly. `fly.toml` configures Fly.io (`fly deploy`); CI deploys on pushes to `main` after typecheck and tests. The CSP allows only `self` plus `https://tiles.openfreemap.org` (tiles, fonts), `https://openmaptiles.github.io` (map icons) and `https://services6.arcgis.com` (BC Wildfire Service data, fetched by the browser); adding or changing a data or basemap host means updating it.

## Reading Logs

All logging goes through `utils/logger.ts`, which writes to `console` only. Server logs appear in the terminal running `bun run dev`; in dev, the browser's console output is echoed there too. In production, browser logs appear only in the browser console. To read logs, run the dev server in the background with Bash and read its output, or ask the user to paste the terminal output.

## Style

- Code is written in a minimal, functional style as much as possible
- Use logging generously
- Document each function above its definition with one plain line; don't record rationale or history in code
