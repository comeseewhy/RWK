# RWK

A lightweight spatial visualization tool for operational map data.

## Current stage

RWK is currently in the static frontend + live data wiring stage.

The app is designed to:

- load a local boundary GeoJSON file
- fetch live CSV exports from Supabase Storage
- fetch a publish manifest from Supabase Storage
- normalize and join event/export rows
- render rows with valid coordinates on a Leaflet map
- filter visible markers by clicked boundary polygons
- provide debug output for pipeline and frontend validation

---

## Core files

- `index.html` — application shell
- `style.css` — layout and visual styling
- `app.js` — map boot, remote fetch, CSV parsing, join logic, marker rendering
- `data/boundaries.geojson` — local boundary layer
- `docs/data-contract.md` — expected shape of live data files
- `docs/build-plan.md` — phased project roadmap

---

## Live data contract

The frontend expects these exact public objects inside the Supabase `live-data` bucket:

- `csv/events_active_snapshot.csv`
- `csv/export_confirmed_verified.csv`
- `meta/manifest.json`

See `docs/data-contract.md` for the full contract.

---

## Current authority model

### `events_active_snapshot.csv`
Used primarily for:

- event metadata
- join enrichment

### `export_confirmed_verified.csv`
Used primarily for:

- map plotting
- coordinates
- operational popup content

### `meta/manifest.json`
Used primarily for:

- freshness / updated timestamp
- publish validation

---

## Join logic

The frontend joins event rows and export rows using this composite key:

- `row_id`
- `event_id`
- `calendar_id`

Equivalent runtime shape:

`row_id|event_id|calendar_id`

If an export row has valid coordinates, it can still plot even if the event row does not match.

---

## Coordinate requirements

Markers render only from rows with valid numeric coordinates.

Preferred export CSV columns:

- `latitude`
- `longitude`

The current frontend also tolerates these fallback aliases:

### Latitude aliases
- `latitude`
- `lat`
- `y`
- `decimal_latitude`

### Longitude aliases
- `longitude`
- `lng`
- `lon`
- `x`
- `decimal_longitude`

Recommended upstream practice:

- always publish canonical `latitude` and `longitude`

---

## Setup

### 1. Confirm local boundaries
Make sure the local boundary file exists here:

`/data/boundaries.geojson`

### 2. Open `app.js`
Set `CONFIG.supabaseBaseUrl` to your public bucket base path.

Example:

```js
supabaseBaseUrl: "https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/live-data"