# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Expo 58** — web is the primary target; native (iOS/Android) is a roadmap item
- **React Native 0.88** with **react-native-web**
- **MapLibre** on both platforms — `react-map-gl/maplibre` + `maplibre-gl` (pinned 5.24.1) on web, `@maplibre/maplibre-react-native` on native; OpenFreeMap basemap
- **Bun** — package manager and runtime (use `bun` for all installs and script execution, never `npm` or `yarn`)
- **TypeScript** — strict mode enabled

## Commands

```sh
bun run start       # start Expo dev server
bun run web         # start in browser
bun run build:web   # static web export to dist/
bun run ios         # build and run the iOS dev client (currently blocked, see Native status)
bun run android     # build and run the Android dev client
bun install         # install dependencies
```

## Architecture

- `index.ts` — entry point, registers the root component via `registerRootComponent`
- `App.tsx` — root component; owns the selected-location state and composes the map layers and `BanPanel`
- `components/BaseMap.tsx` / `BaseMap.web.tsx` — platform adapters for the map and its press/click event; shared props in `BaseMap.types.ts`
- `components/MapSource.tsx` / `MapSource.web.tsx` — platform adapters for a GeoJSON source; `MapLayer.tsx` / `MapLayer.web.tsx` re-export each library's `Layer`
- `components/FireZoneOutlines.tsx`, `ZoneLabels.tsx`, `BanPolygons.tsx`, `SelectedPin.tsx` — map layers, written once for both platforms on top of `MapSource` and `MapLayer`
- `components/BanPanel.tsx`, `BanCard.tsx` — results panel (centred and width-limited on wide screens)
- `hooks/useFireZones.ts` — parses the bundled BC fire zone GeoJSON (handling both `Polygon` and `MultiPolygon`), and computes each zone's centroid for label placement
- `hooks/useFireBans.ts` — returns the bans whose polygon contains the selected location, using `utils/pointInPolygon.ts`
- `utils/geojson.ts` — converts zones, bans and points to GeoJSON for the map sources
- `utils/logger.ts` — thin wrapper around `console.log`/`console.error`, shared by all platforms
- `constants/` — map style/camera (`map.ts`) and ban colours and labels (`banStyle.ts`)
- `data/` — bundled fire zones (`fireZones.json`) and example fire bans (`fireBans.ts`)
- `css.d.ts` — lets TypeScript accept the `maplibre-gl` CSS import
- `app.json` — Expo configuration (name, slug, icons, splash, platform-specific settings)
- `assets/` — static assets (icons, splash screens)

## Data

Fire zone boundaries are bundled in `data/fireZones.json` (32 zones, simplified to 3%). Regenerate with:
```
bunx mapshaper zones.json -filter-fields MOF_FIRE_ZONE_ID,MOF_FIRE_ZONE_NAME,MOF_FIRE_CENTRE_NAME -simplify 3% keep-shapes -o data/fireZones.json format=geojson precision=0.0001
```
where `zones.json` is the WFS response from `https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&...&typeName=pub:WHSE_LEGAL_ADMIN_BOUNDARIES.DRP_MOF_FIRE_ZONES_SP&srsName=EPSG:4326`. `srsName=EPSG:4326` is required — without it the server returns BC Albers projected coordinates (metres) which are invalid lat/lng values.

## Deploy

The web build is a static export served by nginx. `Dockerfile` builds it with `bun run build:web` and copies `dist/` into a non-root nginx image (`nginx.conf` for rate limiting and server settings, `security-headers.conf` for response headers incl. the CSP, port 8080); `fly.toml` configures Fly.io (`fly deploy`). The CSP allows only `self` plus `https://tiles.openfreemap.org`; changing the basemap host means updating it.

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
