# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Expo 58** — web is the primary target; native (iOS/Android) is a roadmap item
- **React Native 0.88** with **react-native-web**
- **MapLibre** on both platforms — `react-map-gl/maplibre` + `maplibre-gl` (pinned 5.24.1) on web, `@maplibre/maplibre-react-native` on native; OSM Bright basemap style on OpenFreeMap tiles
- **Bun** — package manager and runtime (use `bun` for all installs and script execution, never `npm` or `yarn`)
- **TypeScript** — strict mode enabled

## Commands

```sh
bun run start       # start Expo dev server
bun run web         # start in browser
bun run build:web   # static web export to dist/
bun run test        # Jest (jest-expo) + React Native Testing Library; never plain `bun test`, which runs Bun's own runner
bun run ios         # build and run the iOS dev client (currently blocked, see Native status)
bun run android     # build and run the Android dev client
bun install         # install dependencies
```

## Architecture

- `index.ts` — entry point, registers the root component via `registerRootComponent`
- `App.tsx` — root component; provides the react-query client, owns the selected-location state and composes the map layers and `BanPanel`
- `components/BaseMap.tsx` / `BaseMap.web.tsx` — platform adapters for the map and its press/click event; shared props in `BaseMap.types.ts`
- `components/MapSource.tsx` / `MapSource.web.tsx` — platform adapters for a GeoJSON source; `MapLayer.tsx` / `MapLayer.web.tsx` re-export each library's `Layer`
- `components/FireZones.tsx`, `BanPolygons.tsx`, `SelectedPin.tsx` — map layers, written once for both platforms on top of `MapSource` and `MapLayer`
- `components/BanPanel.tsx`, `BanCard.tsx` — results panel (centred and width-limited on wide screens); lists the bans at the tapped point plus each source's status, coverage and attribution
- `collectors/` — one `Collector` per data source (`types.ts`): `collect()` fetches and normalizes to `FireBan[]`. `provincial.ts` is the BC Wildfire Service ArcGIS feed, `example.ts` is fake dev data (made-up bans shaped like the real Kamloops Fire Centre, whose zones are merged into one outline with `polygon-clipping`, and the Penticton Fire Zone, fetched at runtime from the zones service, plus hand-drawn local ones; the real collector does no merging and uses each row's own polygon), `index.ts` lists the active collectors, `fetchJson.ts` adds timeout and abort handling, `classifyBan.ts` maps free text to a `BanType`
- `hooks/useBans.ts` — runs every collector on its own schedule (react-query), merges the bans and reports per-source status, keeping the last good data if a refresh fails
- `hooks/useFireBans.ts` — returns the bans whose area contains the selected location, broadest first, using `utils/geometry.ts` (Polygon/MultiPolygon with holes) and `utils/pointInPolygon.ts`
- `lib/queryClient.ts` — shared react-query client (retries with backoff)
- `utils/geojson.ts` — converts bans and points to GeoJSON for the map sources
- `types/` — shared types: `LatLng` (`geo.ts`) and `FireBan` (`ban.ts`)
- `env.d.ts` — declares `process.env` for `EXPO_PUBLIC_*` variables
- `utils/logger.ts` — thin wrapper around `console.log`/`console.error`, shared by all platforms
- `constants/` — map style/camera, fire zones URL and the `SHOW_FIRE_ZONES` flag (`map.ts`), ban colours and labels (`banStyle.ts`)
- `css.d.ts` — lets TypeScript accept the `maplibre-gl` CSS import
- `app.json` — Expo configuration (name, slug, icons, splash, platform-specific settings)
- `assets/` — static assets (icons, splash screens)

## Data

Fire zone boundaries are not stored in the repo. `components/FireZones.tsx` gives the map a URL (`FIRE_ZONES_URL` in `constants/map.ts`) to the BC government's ArcGIS feature service, and the map fetches it at runtime. The query asks the server to simplify the geometry (`maxAllowableOffset`), which keeps the response around 280 KB. The service allows cross-origin reads, unlike BC's WFS server. The ArcGIS copy has 31 zones (no Mid Island Fire Zone). The layer is currently off (`SHOW_FIRE_ZONES = false`) pending licensing clarification.

### Basemap

The basemap style is [OSM Bright](https://github.com/openmaptiles/osm-bright-gl-style), bundled unchanged in `assets/map-style/osm-bright.json` with its licence (`osm-bright-LICENSE.md`: BSD-3 code, CC BY 4.0 design, so credit is required; it is in the source attribution in `constants/map.ts`). The original points at MapTiler and needs an API key, so `constants/map.ts` overrides three fields: the vector tile source and the font glyphs now come from OpenFreeMap (same OpenMapTiles schema, and the same Noto Sans fonts), and the source attribution is replaced with the combined credit. The sprite (icons) is still loaded from `openmaptiles.github.io`. Layers added by this app (zone labels) must use a font OpenFreeMap serves: Noto Sans Regular, Bold or Italic.

### Fire bans

Bans come from collectors that run in the client at runtime (a backend that runs the same collectors is a possible later step). `collectors/provincial.ts` reads the BC Wildfire Service "Bans and Prohibition Areas" ArcGIS layer (Open Government Licence – British Columbia, so the attribution is shown in the panel). It excludes municipal and regional district bans, and the panel says so. The layer was empty (off-season) when the collector was written, so the free-text `TYPE`, `CATEGORY` and `ACCESS_PROHIBITION_DESCRIPTION` values are unverified: the card shows the source's own text and `classifyBan` falls back to `other`. Geometry is simplified server-side (`maxAllowableOffset=0.001`, about 100 m), so lookups near a boundary are approximate.

To add a source: write a `Collector` in `collectors/` that returns `FireBan[]` (reuse `fetchJson`, validate the response, skip bad features instead of throwing), then add it to `COLLECTORS` in `collectors/index.ts`. Set `EXPO_PUBLIC_EXAMPLE_BANS=true` when starting the app to add the fake example collector. `collectors/index.ts` loads it with a `require` inside an `if` on that variable, so without the flag the build tool folds the branch away and neither the example collector nor `polygon-clipping` is in the bundle (checked on a production export). Keep the `require` in that form, and never set the variable for production builds.

## Deploy

The web build is a static export served by nginx. `Dockerfile` builds it with `bun run build:web` and copies `dist/` into a non-root nginx image (`nginx.conf` for rate limiting and server settings, `security-headers.conf` for response headers incl. the CSP, port 8080); `fly.toml` configures Fly.io (`fly deploy`). The CSP allows only `self` plus `https://tiles.openfreemap.org` (tiles, fonts), `https://openmaptiles.github.io` (map icons) and `https://services6.arcgis.com` (BC Wildfire Service data); adding or changing a data or basemap host means updating it.

## Native status

The iOS dev build fails on Xcode 26.3 in `expo-modules-jsi` (expo/expo#52754). A community patch exists but isn't applied. Native code paths are written but untested.

## Expo Config

App is configured in `app.json` (not `app.config.ts`). Platform-specific settings live under `expo.ios` and `expo.android` keys.

## Reading Logs

All logging goes through `utils/logger.ts`, which writes to `console` only. On native, output appears in the Metro terminal running `bun run start`; on web, it appears in the browser console. To read logs, run the dev server in the background with Bash and read its output, or ask the user to paste the terminal output.

## Style

- Code is written in a minimal, functional style as much as possible
- Use logging generously
- Document each function above its definition with one plain line; don't record rationale or history in code
- Platform variants (`Foo.tsx` / `Foo.web.tsx`) keep the same structure and style (named handlers, same ordering, same naming); they differ only where a library's API requires it
