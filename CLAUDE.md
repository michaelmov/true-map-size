# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

True Size Map — a React app that visualizes the true geographic size of countries by overlaying them on an interactive map using react-leaflet with OpenStreetMap/CARTO tiles. Users search for countries, place them on the map, and drag them across latitudes to see how Mercator distortion affects apparent size. Multiple countries can be active simultaneously for comparison.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — type-check with `tsc -b` then build with Vite
- `npm run lint` — ESLint across all files
- `npm run preview` — preview production build
- `node scripts/process-countries.mjs` — regenerate `public/countries.json` from Natural Earth GeoJSON

## Environment

No API keys required — uses free OpenStreetMap/CARTO tile servers.

## Architecture

**Stack:** React 19, Vite 8, TypeScript 6, Tailwind CSS v4, shadcn/ui (base-nova style), react-leaflet / Leaflet.

**Path alias:** `@/` maps to `src/`.

### Key data flow

1. `App.tsx` loads country data from `/countries.json` via `loadCountries()`, wraps everything in `<MapProvider>`.
2. `SearchCard` provides search input + selected country list. On selection, calls `useMapContext.addCountry()`.
3. `MapContext` (`src/context/MapContext.tsx`, React Context + `useReducer`) is the single source of truth for placed countries, active selection, and country positions.
4. `MapContainer` renders a react-leaflet `<MapContainer>` with CARTO light/dark tiles (theme-aware) and an extended CRS for wider panning, mapping `placedCountries` into `<CountryOverlay>` components.
5. `CountryOverlay` imperatively creates `L.Polygon` instances via `useEffect`. Handles click-to-activate and manual drag via mousedown/mousemove/mouseup events (disabling map dragging during polygon drag).

### True-size projection (`src/lib/projection.ts`)

Uses a spherical bearing + distance approach. For each vertex, `precomputeOffsets` stores the angular distance and heading from the country's centroid on the sphere. `applyOffsetsToPath` places each vertex by computing the spherical destination point from a given center, giving correct Mercator distortion at all latitudes.

### Drag implementation

Drag is implemented manually: `mousedown` on a polygon captures the start position and disables map dragging; `mousemove` computes the lat/lng delta and calls `applyOffsetsToPath` to reposition the polygon in real-time; `mouseup` re-enables map dragging and commits the new center to the store. Longitude wrapping in `toLatLngTuples` keeps vertices continuous near the antimeridian.

### Country data

`public/countries.json` is a pre-processed array of `Country` objects (name, ISO code, centroid `[lng, lat]`, GeoJSON geometry). Generated from Natural Earth 110m data by `scripts/process-countries.mjs`. Flag emojis are derived at runtime from ISO codes.

### Color assignment

`src/lib/colors.ts` cycles through a 10-color palette via a module-level counter. Colors are assigned on `addCountry` and cycle if more than 10 countries are placed.
