# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Expo 55** — blank TypeScript template
- **React Native 0.83**
- **Bun** — package manager and runtime (use `bun` for all installs and script execution, never `npm` or `yarn`)
- **TypeScript** — strict mode enabled

## Commands

```sh
bun run start       # start Expo dev server
bun run ios         # start with iOS simulator
bun run android     # start with Android emulator
bun run web         # start in browser
bun install         # install dependencies
```

## Architecture

- `index.ts` — entry point, registers the root component via `registerRootComponent`
- `App.tsx` — root component; renders a full-screen `MapView` with fire zone `Polygon` overlays and zone name `Marker` labels
- `hooks/useFireZones.ts` — parses the bundled BC fire zone GeoJSON (handling both `Polygon` and `MultiPolygon`), and computes each zone's centroid for label placement
- `utils/logger.ts` — thin wrapper around `console.log`/`console.error`, shared by all platforms
- `app.json` — Expo configuration (name, slug, icons, splash, platform-specific settings)
- `assets/` — static assets (icons, splash screens)

## Data

Fire zone boundaries are bundled in `data/fireZones.json` (32 zones, simplified to 3%). Regenerate with:
```
bunx mapshaper zones.json -filter-fields MOF_FIRE_ZONE_ID,MOF_FIRE_ZONE_NAME,MOF_FIRE_CENTRE_NAME -simplify 3% keep-shapes -o data/fireZones.json format=geojson precision=0.0001
```
where `zones.json` is the WFS response from `https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&...&typeName=pub:WHSE_LEGAL_ADMIN_BOUNDARIES.DRP_MOF_FIRE_ZONES_SP&srsName=EPSG:4326`. `srsName=EPSG:4326` is required — without it the server returns BC Albers projected coordinates (metres) which are invalid lat/lng values.

## Expo Config

App is configured in `app.json` (not `app.config.ts`). Platform-specific settings live under `expo.ios` and `expo.android` keys.

## Reading Logs

All logging goes through `utils/logger.ts`, which writes to `console` only. On native, output appears in the Metro terminal running `bun run start`; on web, it appears in the browser console. To read logs, run the dev server in the background with Bash and read its output, or ask the user to paste the terminal output.

## Style

- Code is written in a minimal, functional style as much as possible
- Use logging generously
- Document each function above its definition
