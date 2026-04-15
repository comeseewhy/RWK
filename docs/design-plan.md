
---

## `docs/build-plan.md`

```md
# RWK Build Plan

This file stores the current phased build path for the RWK project.

It exists so the repo itself contains the agreed development sequence.

---

## Phase 1 — Freeze the baseline shell

### Goal
Turn the current exported shell into the official repo starting point.

### What belongs in this phase
- commit the current `index.html`, `style.css`, and `app.js`
- add `data/boundaries.geojson`
- verify the map loads locally
- verify the boundary layer loads locally
- verify the refresh button works
- verify the debug panel updates
- verify the selected-boundary interaction works
- fix any visible text-encoding artifacts

### Done means done
- app opens locally without console errors
- local boundaries load successfully
- clicking a boundary updates the selection panel
- no Supabase connection is required yet for the shell to feel stable

---

## Phase 2 — Lock the data contract

### Goal
Define exactly what the frontend expects from the pipeline.

### What belongs in this phase
Create repo docs for:
- `events_active_snapshot.csv`
- `export_confirmed_verified.csv`
- `meta/manifest.json`

Define:
- canonical column names
- required join fields
- required spatial fields
- optional fallback title/date/address fields
- which file is authoritative for what purpose

### Current frontend assumptions
- join key comes from `row_id`, `event_id`, `calendar_id`
- export rows provide coordinates
- manifest provides `updated_at`

### Done means done
- `docs/data-contract.md` exists
- anyone reading the repo can tell exactly what each file must contain
- future script changes will not silently break the frontend

---

## Phase 3 — Complete the delivery pipeline

### Goal
Make the data pipeline reliable from Apps Script to Supabase.

### What belongs in this phase
- keep Drive output as fallback
- upload both canonical CSVs to stable Supabase paths
- upload `meta/manifest.json` only after both CSV uploads succeed
- store Supabase secrets in Apps Script properties
- add logging and success/failure reporting
- manually test uploads
- only then add the time trigger

### Done means done
- one manual run updates both CSVs and the manifest in Supabase
- files are readable at stable URLs
- manifest timestamp reflects the latest successful write
- failed uploads are clearly visible and not silently ignored

---

## Phase 4 — Verify live frontend loading

### Goal
Make the frontend reliably consume live Supabase data.

### What belongs in this phase
- set `CONFIG.supabaseBaseUrl`
- fetch manifest
- fetch both CSVs
- parse both cleanly
- log row counts
- verify join results
- surface failures clearly in the status panel

### Done means done
- manifest loads
- both CSVs load
- joined rows count is credible
- unmatched rows are understandable
- the app can be refreshed and reload fresh data

---

## Phase 5 — First live operational map

### Goal
Make RWK genuinely useful as a spatial viewer.

### What belongs in this phase
- render markers from verified export rows
- ensure markers only plot with valid coordinates
- improve popup content slightly
- fit map to marker bounds when visible rows exist
- verify that boundary selection filters visible markers correctly

### Done means done
- map shows real points from live data
- clicking a boundary changes visible point count
- popup data is useful enough for operational inspection
- visible count and join count are trustworthy

---

## Phase 6 — Core operational filters

### Goal
Introduce the first truly useful filtering model.

### What belongs in this phase
Add a small filter set first:
- keyword search
- year
- organizer
- status
- clear all

Then optionally:
- day of week
- confirmed-only toggle
- simple sort mode

Also in this phase:
- add derived runtime fields
- normalized date
- year
- day of week
- normalized organizer

### Done means done
- UI has a simple filter area
- filters update the visible marker set
- visible counts update live
- reset returns the expected full view

---

## Phase 7 — Derived analytics and revisit logic

### Goal
Make the data more intelligent.

### What belongs in this phase
- define `site_key`
- calculate `visit_count`
- calculate `visit_rank`
- validate site grouping against real examples
- add revisit filters

### Done means done
- repeated sites are grouped consistently
- revisit filters behave predictably
- summary metrics are accurate enough to trust

---

## Phase 8 — Saved views, origins, and route-oriented expansion

### Goal
Add higher-order usability without destabilizing the core.

### What belongs in this phase
First:
- save current filters to localStorage
- list saved views
- apply / rename / delete saved views

Then:
- add origin markers
- add warehouse/showroom dataset
- add distance bands
- add route candidate views

### Done means done
- reusable views can be restored quickly
- origin points are visually distinct
- route-oriented subsets can be explored
- core map/filter flow remains stable

---

## What to avoid early

- do not split `app.js` yet
- do not add a framework
- do not build advanced saved-query UX before basic filters
- do not mix historical backfill work into shell and pipeline stabilization

---

## Current recommended repo additions

At this stage, the repo should add:

- `data/boundaries.geojson`
- `docs/data-contract.md`
- `docs/build-plan.md`