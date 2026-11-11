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
- `hooks/useFireZones.ts` — fetches BC fire zone boundaries from the BC government WFS API, parses GeoJSON (handling both `Polygon` and `MultiPolygon`), and computes each zone's centroid for label placement
- `utils/logger.ts` — thin wrapper around `console.log`/`console.error` that also appends to a file via `expo-file-system`
- `app.json` — Expo configuration (name, slug, icons, splash, platform-specific settings)
- `assets/` — static assets (icons, splash screens)

## Data

BC fire zone boundaries are fetched at runtime from BC's public WFS service:
```
https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&...&typeName=pub:WHSE_LEGAL_ADMIN_BOUNDARIES.DRP_MOF_FIRE_ZONES_SP&srsName=EPSG:4326
```
Returns 32 zones as GeoJSON. `srsName=EPSG:4326` is required — without it the server returns BC Albers projected coordinates (metres) which are invalid lat/lng values.

## Expo Config

App is configured in `app.json` (not `app.config.ts`). Platform-specific settings live under `expo.ios` and `expo.android` keys.

## Reading Logs

The app writes logs to a file via `utils/logger.ts`. On startup, the Metro console prints the exact path:

```
[logger] log file: /path/to/app/Documents/debug.log
```

Use the Read tool on that path to inspect logs. All calls to `logger.log` / `logger.error` write to both the console and that file.

## Style

- Code is written in a minimal, functional style as much as possible
- Use logging generously
- Document each function above its definition
