
---

## `docs/build-plan.md`

You’ve got the core map shell working, plus a meaningful first operational filtering model. The project is no longer in “prove the pipeline” mode. It is now at the point where the missing work is less about basic loading and more about turning RWK into an operational decision tool.

What appears completed already

The current build has these foundations in place:

local boundary loading and clickable boundary selection
live Supabase manifest + CSV loading
CSV parsing and join logic
derived runtime fields for organizer, year, weekday, time-window, site key, visit count, and boundary membership
dynamic filter UI for organizer, weekday, visit count, time window, year, and keyword
revisit/site-count logic up to 10 visits
status, results, and debug panels
popup content that is useful for inspection already

That means Phases 1 through 7 are largely present in functional form, even if the documentation and sequencing got blurred during iteration.

What is still missing

There are six major gaps.

1. Origin-point architecture
Your own note is correct: warehouse, showroom, and other origin points are not yet implemented. The existing app only knows how to render job/event points. There is no second dataset class with its own marker symbology, popup model, enable/disable toggles, or relationship to jobs. The original plan explicitly called for origin markers, warehouse/showroom data, distance bands, and route-oriented subsets; those are not in the current code yet.

2. Statistics layer
You have derived fields, but not a real analytics surface. Right now the app reports counts like joined rows, visible markers, and filtered rows. What’s missing is a metrics engine that can answer operational questions such as:

jobs by organizer
jobs by municipality
visits per site
unique sites vs total visits
upcoming jobs by next 7/30 days
revisit-heavy addresses
jobs by weekday
origin-to-job proximity summaries
municipal coverage summaries

The plan called for “derived analytics,” but the UI is still mostly a filter shell rather than a dashboard.

3. Downloadable reports
There is no report-generation path yet. No CSV export from filtered results, no summary export, no per-boundary report, no “current view” download, no route candidate output. That is a major missing bridge between visualization and action.

4. Saved views / persistence
The plan called for localStorage-backed saved views, but the current implementation does not preserve filter states, saved named presets, or view restoration. That becomes important once the filter model grows more complex.

5. Text-encoding cleanup and repo/doc cleanup
The export still shows encoding artifacts like â€” and Bootingâ€¦. There is also a structural doc inconsistency: plan.txt and docs/design-plan.md both appear to contain the same build-plan content, and the repo references docs/build-plan.md while the export shows docs/design-plan.md. That should be normalized so the repo has one authoritative roadmap file.

6. Route-oriented decision support
The plan mentioned route candidate views and distance bands, but nothing in app.js currently computes distance from an origin, groups jobs by proximity, or ranks route candidates. This is the big missing piece if RWK is meant to support dispatch and planning rather than simple map inspection.

Where I would go from here

I would re-establish the project in a new, clearer phase sequence based on the reality of what is already built.

Recommended current phase map

Phase A — Stabilization and cleanup
This is a short correction pass.

Deliverables:

fix all encoding artifacts in HTML/CSS/JS/docs
normalize docs so there is one authoritative build-plan file
confirm current filters are still behaving correctly after cleanup
add a small “data schema notes” section for future origin/report files

This is quick, but worthwhile, because it prevents drift before adding more systems.

Phase B — Origin dataset support
This should be the next real feature phase.

Add:

a new origin data source, ideally data/origins.json or data/origins.geojson
origin types: warehouse, showroom, office, supplier, other
a distinct marker style from job markers
origin visibility toggles
popup fields for name, type, address, notes, active status
optional “default origin” selection in UI

At the code level, this means creating a second runtime collection, probably something like:

state.originRows
state.visibleOriginRows
state.selectedOriginId

Do not merge origins into the same row model as jobs. Keep them as a separate entity class.

Phase C — Distance and route analytics
Once origins exist, make them useful.

Add derived calculations:

straight-line distance from selected origin to each visible job
distance band classification, such as 0–10 km, 10–25 km, 25–50 km, 50+ km
nearest-origin assignment for each job
summary counts by origin
filter for “jobs near selected origin”
sort visible results by nearest distance

This gives you the first route-oriented decision surface without forcing full routing APIs yet.

Phase D — Statistics engine
Build a reusable analytics layer from the already-derived rows.

I would add a pure function that receives the current filtered/visible rows and returns a stats object. For example:

total visits
unique sites
revisit rate
jobs by organizer
jobs by municipality
jobs by weekday
jobs by year
upcoming counts
average visits per site
top 10 revisited sites
top municipalities by job volume
selected-origin summaries when applicable

Then expose that in a new “Analytics” card in the sidebar.

Phase E — Download/report system
After stats exist, add downloads.

Start simple with three outputs:

filtered jobs CSV
summary metrics CSV
site summary CSV

Then later:

municipality summary CSV
origin distance report CSV
upcoming jobs CSV
current map view JSON snapshot

This is likely best done client-side first using Blob downloads. No server is needed yet.

Phase F — Saved views
Only after origin + distance + stats + reports are working.

Persist:

organizer filters
weekday filters
visit count filters
time window
year
keyword
selected boundary
selected origin
distance band
sort mode

Then add:

save current view
load saved view
rename saved view
delete saved view

That will make the app operationally reusable day-to-day.

Practical next steps I’d recommend now

Do a cleanup pass first.
Then implement origins before reports.
Then implement a small analytics engine.
Then add downloadable reports from the analytics + filtered rows.
Then add saved views.

That order matters because reports should export meaningful analysis, not just raw rows.

Concrete design updates I would introduce

For data files, I would add these new repo artifacts:

data/origins.json or data/origins.geojson
docs/origin-data-contract.md
docs/report-spec.md

For runtime architecture, I would add these state areas:

state.origins
state.visibleOrigins
state.selectedOrigin
state.analytics
state.savedViews

For UI, I would add these sidebar cards:

Origins
Analytics
Reports
Saved views

For filters, I would add next:

origin selector
distance band selector
sort selector
maybe municipality toggle/search if that becomes operationally important

Suggested report set for v1

A good first reporting bundle would be:

Filtered jobs export
Every currently visible row, with all derived fields appended:

organizer
weekday
boundary name
visit count
visit bucket
time window
selected origin
distance from origin

Site summary export
One row per _siteKey:

normalized address/site label
total visits
first date
last date
organizers involved
municipality

Municipality summary export
One row per boundary:

total jobs
unique sites
upcoming jobs
revisit-heavy sites count

Origin proximity export
If an origin is selected:

each visible row
distance from origin
distance band
rank by distance

What has been accomplished so far, in project terms

You’ve already solved the hard early-risk items:

data pipeline contract
live ingestion
join reliability
boundary interaction
derived filters
revisit classification
temporal filtering

Those were the uncertain parts. The remaining work is now mostly product-shaping and operational modeling rather than technical rescue.

What is left before the project feels “whole”

The app becomes substantially more complete once it can do these four things together:

show jobs
show origins
explain the current dataset statistically
let the user export the current analysis

That is the shortest path from “viewer” to “operational platform.”

My recommendation for the very next implementation target

Build origin support + distance derivation next. That unlocks the rest:

analytics become richer
reports become meaningful
route-oriented filtering becomes possible
saved views become worth having

After that, the report system should come immediately.

A good discipline going forward: every new phase should end with three artifacts updated together — the code, the data contract doc, and the build-plan status note. That will keep the plot from getting lost again.