# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

True Size Map — a React app that visualizes the true geographic size of countries by overlaying them on a Mercator projection Google Map. Users search for countries, place them on the map, and drag them across latitudes to see how Mercator distortion affects apparent size. Multiple countries can be active simultaneously for comparison.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — type-check with `tsc -b` then build with Vite
- `npm run lint` — ESLint across all files
- `npm run preview` — preview production build
- `node scripts/process-countries.mjs` — regenerate `public/countries.json` from Natural Earth GeoJSON

## Environment

Requires `VITE_GOOGLE_MAPS_API_KEY` in `.env.local` (Maps JavaScript API must be enabled).

## Architecture

**Stack:** React 19, Vite 8, TypeScript 6, Tailwind CSS v4, shadcn/ui (base-nova style), `@vis.gl/react-google-maps`.

**Path alias:** `@/` maps to `src/`.

### Key data flow

1. `App.tsx` loads country data from `/countries.json` via `loadCountries()`, wraps everything in `<APIProvider>`.
2. `SearchCard` provides search input + selected country list. On selection, calls `useMapStore.addCountry()`.
3. `mapStore` (React Context + `useReducer`) is the single source of truth for placed countries, active selection, and country positions.
4. `MapContainer` renders a Google `<Map>` with grayscale styling and maps `placedCountries` into `<CountryOverlay>` components.
5. `CountryOverlay` imperatively creates `google.maps.Polygon` instances (not React-rendered) via `useEffect`. Handles click-to-activate and native Google Maps drag.

### True-size projection (`src/lib/projection.ts`)

Uses a spherical bearing + distance approach. For each vertex, `precomputeOffsets` stores the angular distance and heading from the country's centroid on the sphere. `applyOffsetsToPath` places each vertex by computing the spherical destination point from a given center. Combined with `geodesic: true` on the Google Maps Polygon, this gives correct Mercator distortion at all latitudes including the poles.

### Drag implementation

Drag uses native Google Maps polygon dragging (`draggable: true, geodesic: true`). The `geodesic: true` flag makes the polygon visually resize in real-time as it crosses latitudes (zero JS per frame). On `dragend`, `computeNewCenterFromDrag` reverses the destination formula to find the new center from the moved vertex position, then `applyOffsetsToPath` snaps the paths to exact spherical positions.

### Country data

`public/countries.json` is a pre-processed array of `Country` objects (name, ISO code, centroid `[lng, lat]`, GeoJSON geometry). Generated from Natural Earth 110m data by `scripts/process-countries.mjs`. Flag emojis are derived at runtime from ISO codes.

### Color assignment

`src/lib/colors.ts` cycles through a 10-color palette via a module-level counter. Colors are assigned on `addCountry` and cycle if more than 10 countries are placed.
