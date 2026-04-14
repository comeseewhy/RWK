# RWK

A lightweight spatial visualization tool for operational map data.

## Current phase

This repo is currently in the app-shell stage.

The frontend is designed to:

- load a local boundary GeoJSON file,
- fetch live CSV exports from Supabase Storage,
- normalize and join export/event rows,
- render valid spatial rows on a Leaflet map,
- prepare for filtering and boundary interaction.

## Repo structure

- `index.html` — app shell
- `style.css` — mobile-first styles
- `app.js` — map logic, data loading, CSV parsing, boundary interaction
- `data/boundaries.geojson` — local boundary layer

## Data contract

Expected live files in Supabase Storage:

- `csv/events_active_snapshot.csv`
- `csv/export_confirmed_verified.csv`
- `meta/manifest.json`

## Setup

1. Move `boundaries.geojson` into `/data/boundaries.geojson`
2. Open `app.js`
3. Set `CONFIG.supabaseBaseUrl` to your public storage base path

Example shape:

https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/live-data

## GitHub Pages

This app is built to work as a static site on GitHub Pages.

No framework or build step is required.
