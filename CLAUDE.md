# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **React 19** with `react-dom`, web only
- **mise**: installs the dev tools at the versions in `mise.toml` (Bun, flyctl and the Docker CLI), locked with checksums in `mise.lock` for macOS arm64 and Linux x64; loads the env files; and runs the project tasks. After changing a version in `mise.toml`, run `mise lock --platform macos-arm64,linux-x64` and commit both files. CI installs from the lockfile with `jdx/mise-action`.
- **Bun 1.3.10**: package manager, runtime, bundler, dev server and test runner (use `bun` for everything, never `npm` or `yarn`). The same version is pinned in `mise.toml`, the `Dockerfile` and `@types/bun`; change them together.
- **MapLibre**: `react-map-gl/maplibre` + `maplibre-gl` (pinned 5.24.1); OSM Bright basemap style on OpenFreeMap tiles
- **TypeScript**: strict mode

## Commands

Run project tasks through mise (`mise tasks ls` lists them); it uses the locked tool versions and loads the env files:

```sh
mise install --locked   # install the tools exactly as mise.lock records them
mise run dev            # build the production image and run it in Docker (nginx + Bun) on http://localhost:8080; Ctrl+C stops it
mise run dev:hot        # Bun dev server on http://localhost:8080 with hot reload, plus the API (same port as `mise run dev`, so run only one; `PORT` overrides it)
mise run check          # typecheck and test (what CI runs)
mise run test           # bun test with happy-dom and React Testing Library
mise run typecheck      # tsc --noEmit
mise run build          # build the image on Fly's remote builder without deploying
mise run deploy         # build on Fly and deploy (asks first; never run without being asked)
```

`mise run dev` needs a running Docker daemon, which each developer brings (Docker Desktop, colima, OrbStack, ...); mise only provides the Docker CLI. The underlying `bun run dev|build|test|typecheck` scripts in `package.json` still work on their own.

Env precedence is the same with and without mise: a shell variable wins, then `.env`, then `.env.template`. mise loads both files under `[env]`, which would normally override the shell, so each overridable variable also gets a line in `mise.toml` that prefers the shell's value (see `PUBLIC_EXAMPLE_BANS`); add one for each new variable.

## Architecture

- `web/index.html` — page shell; Bun bundles `web/main.tsx` and `web/index.css` from it
- `web/main.tsx` — renders `App` into `#root`
- `server/dev.ts` — dev entry: `Bun.serve` with the page (an HTML import, bundled on the fly with hot reload) and the API routes
- `server/index.ts` — production entry: `Bun.serve` on `127.0.0.1` with only the API routes; nginx serves the page
- `server/api.ts` — starts the server collectors and returns the `/api/bans` route, shared by both entries
- `server/banStore.ts` — fetches every server collector on start and again on its own interval (7 days for the standing bans; a failed source is retried within 10 minutes), with retries, keeps the last good data per source in memory only, and builds the `/api/bans` response
- `components/App.tsx` — root component; provides the react-query client, owns the selected-location state and composes the map layers and `BanPanel`
- `components/BaseMap.tsx` — full-size MapLibre map that reports clicks as a `LatLng`
- `components/FireZones.tsx`, `BanPolygons.tsx`, `SelectedPin.tsx` — map layers built from react-map-gl's `Source` and `Layer`
- `components/LocationSearch.tsx` — search box and "My location" button over the map. A search goes to Nominatim (see Place search): one match is chosen straight away, several are listed, and a "not found" or failure message hides itself after 6 seconds. Reports the chosen place as a `LatLng`; `App` selects it and asks `MapFocus` to move
- `components/MapFocus.tsx` — draws nothing; each time its `target` is a new object it fits the map to the bans covering the point (`fitBounds`, padded for the results panel, `maxZoom` 12), or flies to the point at zoom 12 when no ban covers it. Map taps never move the camera. Its `bans` are read when `target` changes, so bans that finish loading afterwards don't move the map again
- `components/BanPanel.tsx`, `BanCard.tsx` — results panel (centred and width-limited on wide screens); lists the bans at the tapped point (each card names what the ban regulates, its `title` or a label for its type, followed by a red ✕ "Not permitted" while it is in force or a green ✓ "Permitted" while it is not, so municipal titles name the activity, e.g. "Beach fires", never the verdict) plus each source's status, coverage and attribution, with a warning when a source failed
- `components/SourceBanner.tsx` — a stack of rows over the map, one per source that is loading (quiet, spinner; any request in flight, first load or refresh), being retried (yellow, spinner) or failed with no data once retries ran out (yellow, "Bans may be missing"). Rows keep source order and change state in place; a row leaves as soon as its source has loaded, and a failed source that tries again shows as loading. Text wraps instead of being cut off
- `components/ErrorBoundary.tsx` — catches render errors in the ban layers and the panel so the base map keeps working; tries again when its `resetKey` changes
- `collectors/` — one `Collector` per data source (`types/collector.ts`): `collect()` fetches and normalizes to `FireBan[]`. `constants/browser.ts` lists the collectors that run in each visitor's browser, `constants/server.ts` the ones the server runs (see Fire bans for which goes where); keep them in separate files so each bundle only contains its own collectors. `provincial.ts` is the BC Wildfire Service ArcGIS feed, `example.ts` is fake dev data (made-up bans shaped like the real Kamloops Fire Centre, whose zones are merged into one outline with `polygon-clipping`, and the Penticton Fire Zone, fetched at runtime from the zones service, plus hand-drawn local ones; the real collector does no merging and uses each row's own polygon), `standingBan.ts` builds a municipality's standing bans (year-round or seasonal, one or several per municipality) over its ABMS boundary; each municipality's file (`victoria.ts`, `oakBay.ts`, `saanich.ts`, `esquimalt.ts`, `sidney.ts`, `colwood.ts`, `viewRoyal.ts`, `metchosin.ts`, `centralSaanich.ts`, `langford.ts`, `sooke.ts`) is its config, run by the server. Where a municipality only allows burning in some months, the ban covers the months it doesn't (a ban's `annualEffectivePeriod` can be a list of ranges when those months aren't contiguous, as for Langford). Not covered: North Saanich (permit and listed burn days, no published closing date), Highlands (permit for every fire, no ban) and the CRD electoral areas (bylaw 4489 sets no standing ban; fire chiefs' bans arrive through the BC Wildfire Service layer), `crd.ts` fetches the Capital Regional District's areas (no CRD ban source yet)
- `hooks/useBans.ts` — runs the browser collectors on their own schedules (react-query), fetches `/api/bans`, and merges both, keeping the last good data if a refresh fails; a placeholder source stands in for the server until it answers
- `hooks/useFireBans.ts` — returns the bans whose area contains the selected location, broadest first, using `pointInGeometry` from `utils/geometry.ts` (Polygon/MultiPolygon with holes)
- `utils/` — helpers grouped by what they do, one file each:
  - `bans.ts` — checks ban data from collectors and the `/api/bans` answer (drops malformed bans and sources, and throws, so the source counts as failed, when a result isn't a list or the answer isn't the expected shape), and says which sources failed with no data or are retrying
  - `geometry.ts` — point-in-area checks (Polygon/MultiPolygon with holes) and converting bans and points to GeoJSON for the map
  - `classifyBan.ts` — maps free text to a `BanType`
  - `abms.ts` — fetches and parses BC administrative boundaries (regional districts, electoral areas, municipalities) into `Area`s
  - `areas.ts` — `areasAt` (which areas contain a point) and `appliesAt` (whether a ban binds there, using its `applicability` rule)
  - `geocode.ts` — `searchPlaces`: Nominatim lookup limited to BC (see Place search)
  - `geolocation.ts` — `currentLocation`: the browser's position as a `LatLng`, with a message fit to show when it is blocked or unavailable
  - `bounds.ts` — `focusBounds`: the box containing a point and the areas of the bans covering it
  - `web.ts` — `fetchJson`: GET + JSON with timeout and abort handling, used by collectors and `useBans`
  - `logger.ts` — thin wrapper around `console.log`/`console.error`

  A helper used by one file only lives in that file (the react-query client in `components/App.tsx`).
- `types/` — every type file: `LatLng`, `Place` and `Bounds` (`geo.ts`), `FireBan` (`ban.ts`), `SourceStatus`/`BansResponse` (`api.ts`, the shape `/api/bans` returns), `Collector` (`collector.ts`), and the declarations for CSS imports (`css.d.ts`) and the jest-dom test matchers (`matchers.d.ts`). A component's `Props` and other types used by one file only stay in that file
- `constants/` — every value used by more than one file, grouped by topic: ban levels and types (`ban.ts`), the `/api/bans` path and load statuses (`api.ts`), the Bun server's port behind nginx and the hot dev server's port (`server.ts`; `deploy/nginx.conf` repeats the first), ban colours and labels (`banStyle.ts`), and map style/camera, fire zones URL and the `SHOW_FIRE_ZONES` flag (`map.ts`). A value used by one file only (a timeout, a collector's own URL) stays at the top of that file. `types/` holds no values: where a type lists allowed values (`BanLevel`, `BanType`, `LoadStatus`), it is derived from the list in `constants/` with a type-only import, so the two can't drift apart
- `test/` — fixtures and the `bun test` preloads set in `bunfig.toml`: `happydom.ts` (a DOM), `testingLibrary.ts` (matchers, cleanup) and `fakeMapLibre.tsx`, which replaces `react-map-gl/maplibre` in every test (MapLibre needs WebGL). The fake renders sources and layers as nested `div`s (`source-<id>`, `layer-<id>`), records the props each was given in `rendered`, `clickMap(lat, lng)` clicks the map the way MapLibre reports it, and a fake `useMap` records the camera moves (`flyTo`, `fitBounds`) in `camera`
- `bunfig.toml` — test preloads, and which env variables the dev server inlines into the page (`PUBLIC_*`)
- `.env.template` — defaults for build-time flags (`PUBLIC_EXAMPLE_BANS=false`); a local, gitignored `.env` overrides them, and a shell variable overrides both (`bun run dev` and `bun run build` load the two files with `--env-file`)
- `assets/` — favicon, source icon art, basemap style, and the Work Sans font with its licence (`fonts/`)
- `deploy/` — `nginx.conf`, `security-headers.conf` and `start.sh`, used by the `Dockerfile` (see Deploy)

A failing source never takes the page down: a source that throws, times out, or returns malformed data is reported as failed (status `error`, no data), the other sources' bans stay on the map, and the banner and panel say which source is missing. Every `SourceStatus` carries `fetching` (a request is in flight) and `retrying` (its last attempt failed and another is coming): browser sources take it from react-query (`failureCount > 0` while still fetching), server sources from `banStore`, and while a request to the server itself is retried a "BC Fire Bans server" entry is flagged. While retrying, the banner says so instead of saying bans are missing. The server's store sets `fetching` while a collector runs, and the browser asks the server every 5 seconds while one of its sources is loading or retrying. A refresh that fails after a success keeps the last good data and the panel shows its time. `components/App.test.tsx` checks this end to end with the fake map and `fetch` answered per URL. In `waitFor` checks, compare text or plain values (as `bannerLines()` does) rather than asserting on a DOM element: each failed check prints the whole happy-dom element into its message, which is slow enough to hold up the app's own timers (retries) and make timing tests fail. Bun runs all test files in one process, so a `mock.module` in one test file applies to later files too; put shared fakes in a preload instead.

Each component's styles live in a plain CSS file next to it (`BanPanel.css`), with class names prefixed by the component name (`ban-panel-title`). CSS modules don't work in Bun 1.3.10's dev server (the class name object is never defined).

## Data

Fire zone boundaries are not stored in the repo. `components/FireZones.tsx` gives the map a URL (`FIRE_ZONES_URL` in `constants/map.ts`) to the BC government's ArcGIS feature service, and the browser fetches it at runtime. The query asks the server to simplify the geometry (`maxAllowableOffset`), which keeps the response around 280 KB. The service allows cross-origin reads, unlike BC's WFS server. The ArcGIS copy has 31 zones (no Mid Island Fire Zone). The layer is currently off (`SHOW_FIRE_ZONES = false`) pending licensing clarification.

### Font

The app's own text uses [Work Sans](https://fonts.google.com/specimen/Work+Sans), a variable font (weights 100–900) stored in `assets/fonts/` as the Latin and Latin Extended `woff2` files Google Fonts serves, with its licence (`OFL.txt`, SIL Open Font License 1.1, no Reserved Font Name). The licence asks that copies carry the copyright notice and licence: the files carry the notice and licence URL in their metadata, `OFL.txt` sits next to them in the repo and is served at `/fonts/OFL.txt`, and the `@font-face` rules credit both. Those rules live in a `<style>` block in `web/index.html` and load the files from `/fonts/`: from a CSS file, Bun's bundler would inline fonts under 128 KB as `data:` URLs (which the CSP's `font-src 'self'` blocks) or fail to resolve `/fonts/`, while inline styles are left untouched. `bun run build:web` copies `assets/fonts` to `dist/public/fonts`, nginx serves it with a 30-day cache, and `server/dev.ts` serves it in dev. Map labels can't use it: MapLibre draws them with OpenFreeMap's Noto Sans glyphs (see Basemap).

### Basemap

The basemap style is [OSM Bright](https://github.com/openmaptiles/osm-bright-gl-style), bundled unchanged in `assets/map-style/osm-bright.json` with its licence (`osm-bright-LICENSE.md`: BSD-3 code, CC BY 4.0 design, so credit is required; it is in the source attribution in `constants/map.ts`). The original points at MapTiler and needs an API key, so `constants/map.ts` overrides three fields: the vector tile source and the font glyphs now come from OpenFreeMap (same OpenMapTiles schema, and the same Noto Sans fonts), and the source attribution is replaced with the combined credit. The sprite (icons) is still loaded from `openmaptiles.github.io`. Layers added by this app (zone labels) must use a font OpenFreeMap serves: Noto Sans Regular, Bold or Italic.

### Place search

`utils/geocode.ts` sends what the user types in the search box to OpenStreetMap's public Nominatim service (`nominatim.openstreetmap.org/search`, results limited to Canada and a box around BC). That is the only thing in the app that sends user input to a third party, so keep it to searches the user submits (no search-as-you-type: Nominatim's usage policy forbids autocomplete, allows about one request per second and wants the app identifiable, which the browser's `Referer` does). It allows cross-origin reads. If traffic grows, switch to a hosted geocoder with an API key. "My location" uses the browser's geolocation and never leaves the device; the position is only used to look up bans in the browser.

### Fire bans

Where a collector runs depends on its source's licence. Both BC ArcGIS sources (Bans and Prohibitions, and Fire Zones) are listed as **Access Only** in the BC Data Catalogue: reproduction is not permitted without written permission. So they are browser collectors: each visitor's browser fetches them directly, and the server must not fetch, store or re-serve them (this includes the example collector, which builds on the fire zone shapes). The ArcGIS item for the bans layer says Open Government Licence – British Columbia instead, which is where the panel's attribution text comes from; the conflict is unresolved. Sources whose licence allows redistribution can be server collectors.

`collectors/provincial.ts` reads the BC Wildfire Service "Bans and Prohibition Areas" ArcGIS layer. It excludes municipal and regional district bans, and the panel says so. The layer was empty (off-season) when the collector was written, so the free-text `TYPE`, `CATEGORY` and `ACCESS_PROHIBITION_DESCRIPTION` values are unverified: the card shows the source's own text and `classifyBan` falls back to `other`. Geometry is simplified server-side (`maxAllowableOffset=0.001`, about 100 m), so lookups near a boundary are approximate.

To add a source: write a `Collector` in `collectors/` that returns `FireBan[]` (reuse `fetchJson`, validate the response, skip bad features instead of throwing), then add it to `BROWSER_COLLECTORS` (`collectors/constants/browser.ts`) or `SERVER_COLLECTORS` (`collectors/constants/server.ts`) according to its licence. A browser source's host must also be added to the CSP. Server data lives in each machine's memory, so every machine fetches all server sources when it starts and then on the schedule; a machine Fly stops (`auto_stop_machines`) loses its data and fetches again when it wakes, during which the banner shows those sources as loading, and extra machines each fetch the sources themselves. In dev, `bun --hot` re-runs `server/dev.ts` when server code changes and the earlier schedules keep running, so restart `mise run dev:hot` after editing server code.

Set `PUBLIC_EXAMPLE_BANS=true` (in the shell or in `.env`) when running `mise run dev`, `mise run dev:hot` or `bun run build` to add the fake example collector. The bundler replaces `process.env.PUBLIC_EXAMPLE_BANS` with its value at build time; `.env.template` sets it to `false` so it is always defined (left unset, the reference would stay in the page and fail in the browser, where there is no `process`). `collectors/constants/browser.ts` loads the example with a `require` inside an `if` on that variable, so without the flag the bundler drops the branch and neither the example collector nor `polygon-clipping` is in the bundle (checked on a production build). Keep the `require` in that form, and don't set the variable for real production builds. `fly.toml` currently sets it as a build arg (passed through the `Dockerfile`) so the deployed site shows the example data; remove it from `[build.args]` to turn that off.

## Deploy

nginx sits in front of the Bun API server, in one container. `Dockerfile` builds with `bun run build`, then starts from a non-root nginx image, copies in the `bun` binary, the static site (`dist/public`) and the API server (`dist/server`). `deploy/start.sh` runs both processes and exits when either one stops, so Fly restarts the machine. nginx listens on port 8080, serves the static files and proxies `/api/` to Bun on `127.0.0.1:3000`. `deploy/nginx.conf` holds per-IP rate limiting, gzip, long-lived caching for content-hashed files and the server settings; `deploy/security-headers.conf` holds the response headers incl. the CSP. Keep these in nginx rather than in `fly.toml`, so the app isn't tied to Fly. `fly.toml` configures Fly.io (`fly deploy`); CI deploys on pushes to `main` after typecheck and tests. The CSP allows only `self` plus `https://tiles.openfreemap.org` (tiles, fonts), `https://openmaptiles.github.io` (map icons) and `https://services6.arcgis.com` (BC Wildfire Service data, fetched by the browser) and `https://nominatim.openstreetmap.org` (place search); `Permissions-Policy` allows `geolocation` for the site itself; adding or changing a data or basemap host means updating it.

## Reading Logs

All logging goes through `utils/logger.ts`, which writes to `console` only. Server logs appear in the terminal running `mise run dev:hot`, where the browser's console output is echoed too, or `mise run dev`, which shows the container's nginx and Bun logs. In production, browser logs appear only in the browser console. To read logs, run the dev server in the background with Bash and read its output, or ask the user to paste the terminal output.

## Style

- Code is written in a minimal, functional style as much as possible
- Use logging generously
- Document each function above its definition with one plain line; don't record rationale or history in code
