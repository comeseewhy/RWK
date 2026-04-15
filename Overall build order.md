Overall build order

You are building five connected pieces:

Google Sheets / Apps Script
Supabase
GitHub repo
Leaflet frontend
Query/filter system

The safest path is:

first get data reliably from Apps Script into Supabase
then get GitHub Pages reading it
then get the map rendering
then add filters
then add boundary interaction
then add saved queries
then add routing/origin layers
Phase 1 — foundation and delivery pipeline
Goal of Phase 1

Replace “CSV written to Drive only” with:

Sheets → Apps Script trigger → Supabase Storage / tables → GitHub Pages frontend reads latest data

Step 1 — freeze the current export contract

Before changing anything, define the current outputs as canonical.

Lock in these two artifacts from your script:

events_active_snapshot.csv
export_confirmed_verified.csv

Those are already clearly defined in your script config.

Step 2 — define the job of each file

Write this down for yourself:

events_active_snapshot.csv = full event-history slice, minus cancelled
export_confirmed_verified.csv = spatially usable subset only

That distinction matters because your frontend should not assume both files do the same job.

Step 3 — keep Drive temporarily

Do not remove Drive output yet.

For the next iteration, the script should do both:

keep writing the CSVs to Drive
also push the same CSV content to Supabase

That gives you a fallback while building.

Step 4 — create the work Supabase account

Use the work email and create the project there.

Step 5 — create one Supabase project

Use a simple project name, something like:

event-log-map
ops-spatial-map
calendar-geo-map
Step 6 — record these credentials safely

You will need:

project URL
anon public key
service role key

The service role key must never go into GitHub Pages.

Step 7 — choose your first Supabase storage structure

Create a bucket for raw live exports.

I would use:

bucket: live-data

Inside it:

csv/events_active_snapshot.csv
csv/export_confirmed_verified.csv
meta/manifest.json
Step 8 — decide public vs private for MVP

For the simplest MVP:

make the bucket readable by the frontend, or
expose only what is needed publicly

If this is internal-only, private plus later authenticated access is better.
If this is just your own operational prototype, public-read for specific data files is acceptable as a first pass.

Step 9 — create a manifest.json design

This file should contain:

last updated timestamp
row counts
version/hash
filenames

Example fields:

updated_at
events_rows
export_rows
events_filename
export_filename
Step 10 — keep the filenames stable

The frontend should always request the same paths.

Do not create timestamped runtime filenames for the live app.

Use stable paths:

csv/events_active_snapshot.csv
csv/export_confirmed_verified.csv
Phase 2 — rewrite the Apps Script export to push to Supabase
Goal of Phase 2

Add an HTTP upload step after CSV generation.

Your current script:

builds both CSV payloads
upserts both into a Drive subfolder
shows a success popup with counts

We will preserve that logic and swap in a second destination.

Step 11 — do not rewrite the filtering logic yet

The filtering logic is already correct enough for your current phase:

Events excludes cancelled
Export requires confirmed + complete location fields

Leave those functions alone for now.

Step 12 — isolate the storage layer conceptually

Mentally split the script into:

CSV building
storage destination(s)
summary reporting

That way you can later support:

Drive only
Supabase only
Drive + Supabase
Step 13 — add script properties for Supabase secrets

In Apps Script, store:

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
maybe SUPABASE_BUCKET

Do not hardcode them in the file.

Step 14 — plan the upload method

Apps Script will upload to Supabase Storage using UrlFetchApp.fetch().

Step 15 — upload each CSV to a fixed object path

After generating each CSV string, push it to:

live-data/csv/events_active_snapshot.csv
live-data/csv/export_confirmed_verified.csv
Step 16 — upload a manifest after both succeed

Only write manifest.json after both CSV uploads succeed.

That way the frontend does not detect “new data” before both files are in place.

Step 17 — include row counts in the manifest

Use the counts you already compute:

sourceRowCount
exportedRowCount
exclusions, if helpful
Step 18 — include runtime timestamp in the manifest

This becomes the frontend freshness check.

Step 19 — make the upload idempotent

The object paths stay the same.
Each run overwrites the previous object.

Step 20 — retain the Drive write for now

Do not remove:

getOrCreateOutputFolder_
upsertCsvFile_

yet.

Step 21 — update the popup summary

The summary should now say:

Drive updated: yes/no
Supabase updated: yes/no
rows exported
manifest refreshed
Step 22 — fail loudly if Supabase upload fails

Do not silently succeed on Drive if Supabase failed.

At minimum the popup should indicate partial failure.

Step 23 — add lightweight logging

Use Logger.log() or your own sheet/log pattern to record:

run timestamp
upload success/failure
HTTP status
filenames
counts
Step 24 — test with manual run first

Do not use a trigger yet for the new upload path.

Step 25 — verify the CSVs appear in Supabase Storage

Open the bucket and confirm both files are replaced in place.

Step 26 — open the uploaded CSVs directly

Confirm encoding and contents are clean.

Your script currently builds UTF-8 CSV with BOM, which is good for compatibility.

Step 27 — verify the manifest updates only after both uploads

This prevents broken reads.

Step 28 — only after manual success, attach time trigger

Start with a slow cadence:

every 4 hours

Later:

hourly
or more often if needed
Phase 3 — create the GitHub repo and app shell
Goal of Phase 3

Get a live static app online that can read the latest files.

Step 29 — create the GitHub repo

Use a simple repo name, for example:

ops-map
event-log-map
calendar-spatial-viewer
Step 30 — start with the same lightweight structure

Use exactly this base:

index.html
style.css
app.js
/data/ for GeoJSON and static assets

That matches the architecture you prefer.

Step 31 — create a README immediately

Describe:

what the app does
where the data comes from
how the CSVs are refreshed
what the map is supposed to show
Step 32 — enable GitHub Pages early

Even before the map is working.

Step 33 — create a minimal index.html

Just:

map container
toolbar / filter area
stats area
Step 34 — create a minimal style.css

Mobile-first:

full-screen map
bottom sheet or side panel
simple cards/chips/buttons
Step 35 — create a minimal app.js

Initial job:

fetch manifest.json
fetch both CSV files
log parsed row counts to the console

Not map yet. Just data loading.

Step 36 — add a CSV parser

Either:

lightweight custom parser
or a tiny dependency like Papa Parse

Given your preference for simplicity, a small parser is fine if the CSV structure is stable.

Step 37 — normalize the two CSVs into JS objects

Load both into arrays of objects keyed by header names.

Step 38 — define shared ID join logic

Join on:

row_id
event_id
calendar_id

based on what your files actually contain.

Step 39 — create one unified runtime array

Example concept:

joinedRows = exportRows.map(...)

This becomes the plotted dataset.

Step 40 — log unmatched rows too

You want to know:

export rows with no events match
event rows with no export match

That is valuable QA.

Phase 4 — first map render
Goal of Phase 4

Plot the verified export file spatially.

Step 41 — add Leaflet to the app

Basic base map only.

Step 42 — create the map and a marker layer

No filters yet.

Step 43 — plot one marker per verified export row

Use:

latitude
longitude

Those are already required by your export CSV rules.

Step 44 — build a simple popup

Popup fields:

title/name if present
organizer ID
date
row ID
event ID
address
Step 45 — fit bounds to all markers

Now you have the first working live map.

Step 46 — show summary counts

At minimum:

total plotted points
data updated timestamp
Step 47 — add refresh-on-load only

No polling yet.

Step 48 — verify end-to-end

Run Apps Script, confirm:

Supabase updates
GitHub Pages loads latest
markers match the CSV
Phase 5 — boundary layer and spatial interaction
Goal of Phase 5

Integrate county/municipal GeoJSON as a clickable filter layer.

Step 49 — place your GeoJSON into /data/

For example:

/data/counties.geojson
Step 50 — load the GeoJSON in app.js

Display it above the basemap but below markers.

Step 51 — add hover styling

On hover:

thicken outline
subtle fill
Step 52 — add click selection

On click:

select boundary
update active filter state
redraw markers
Step 53 — store the selected boundary in state

Example concept:

state.selectedBoundaryIds = []
Step 54 — implement point-in-polygon filtering

Use a simple geospatial helper, likely Turf.js later, to determine which plotted points fall inside the selected boundary.

Step 55 — update the stats panel on boundary click

Show:

selected boundary name
points inside
percentage of total
Step 56 — support deselect

Click again or use a clear filter button.

Step 57 — keep map-first interaction

The boundary click should feed the same filter state as other filters.
No special parallel logic.

Phase 6 — operational filters
Goal of Phase 6

Add the first useful toggles.

Step 58 — define app state object

Keep one central state store.

Example concept:

selected days
selected organizers
selected statuses
selected visit filters
selected boundary
keyword search
Step 59 — start with day-of-week filters

These are high value and easy to understand.

Step 60 — assign a color per day

Monday through Friday distinct colors, as you described.

Step 61 — add organizer filters

At minimum:

installer organizer
template organizer
Step 62 — add status filter

Start with:

confirmed only
all
Step 63 — add year filter

Because your archive will expand over time.

Step 64 — add one clear reset button

Very important.

Step 65 — redraw markers from filtered rows only

Never mutate the source array permanently.

Step 66 — show counts live

For example:

total visible jobs
visible organizers
visible boundaries
visible days
Phase 7 — derive analytics fields
Goal of Phase 7

Make revisit analysis possible.

Step 67 — define site_key

This is crucial.

Likely based on:

normalized address
maybe plus city/province/postal
Step 68 — define visit_count

Count how many rows belong to the same site_key.

Step 69 — define visit_rank

Order the visits chronologically for each site_key.

Step 70 — enrich each joined row with derived values

Add:

site_key
visit_count
visit_rank
day_of_week
year
Step 71 — validate the identity logic manually

Check 10–20 known sites by hand.

This matters a lot.

Step 72 — add visit filters

Examples:

1 visit
2 visits
3+
revisit only
Step 73 — add summary metrics for revisits

Examples:

unique sites visible
repeat-visit sites visible
Phase 8 — saved query system
Goal of Phase 8

Let the user store reusable query combinations.

Step 74 — define the query object schema

Each saved query should contain:

id
name
conditions
createdAt
updatedAt
Step 75 — start with localStorage

Do not jump to Supabase for saved queries yet.

Step 76 — add “Save current filters”

This turns the active state into a saved query.

Step 77 — add query list UI

Cards are fine.

Step 78 — add edit / delete / duplicate

Keep it simple.

Step 79 — add one-click apply

Selecting a saved query should restore the app state and redraw the map.

Phase 9 — origin points and routing foundation
Goal of Phase 9

Introduce warehouse/showroom markers and prepare for routing.

Step 80 — create a small static origin dataset

For example:

warehouse
showroom A
showroom B
Step 81 — plot them as special markers

Different iconography from customer points.

Step 82 — add distance-from-origin field

Start with warehouse only if that’s easiest.

Step 83 — add filter by distance band

Examples:

within 25 km
within 50 km
beyond 50 km
Step 84 — add selected-day route preview concept

Not full routing yet. Just ordered points.

Step 85 — build route candidate subsets

For example:

Thursday + installer organizer + selected boundary

That becomes a route candidate set.

Phase 10 — historical completeness and data quality
Goal of Phase 10

Turn the current partial archive into a durable long-history dataset.

Step 86 — backfill older calendar history

Eventually go beyond 2026.

Step 87 — decide how historical backfills merge

You want one continuously growing archive, not disconnected yearly files.

Step 88 — validate duplicate handling

Especially when backfilling and then continuing live updates.

Step 89 — define your canonical archival rule

Which row wins if the same event is encountered twice?

Step 90 — keep row IDs stable

Very important for joins.

Step 91 — test yearly filters once multiple years are present

Make sure:

year filtering
counts
revisit analysis
still behave correctly.
Immediate rewrite strategy for StoreCsv.gs

The first code rewrite should do this:

keep buildEventsCsvPayload_() exactly as-is
keep buildVerifiedExportCsvPayload_() exactly as-is
keep Drive output temporarily
add:
uploadTextToSupabaseStorage_(path, content, contentType)
buildManifestPayload_(eventsResult, exportResult, startedAt)
uploadManifestToSupabase_()
update storeCsvFiles() to:
build both CSVs
write to Drive
upload both CSVs to Supabase
upload manifest
report success/failure for each destination

That is the correct first rewrite.

What I think you should do first, in order

This week, the highest-value sequence is:

create the Supabase project
create the live-data bucket
add Apps Script project properties for Supabase secrets
rewrite StoreCsv.gs to upload both CSVs + manifest
test the uploads manually
create the GitHub repo
create the minimal Leaflet app shell
fetch and log the Supabase CSVs
plot the verified export points
add the GeoJSON boundaries

That gets you from concept to live prototype quickly.