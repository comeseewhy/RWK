# RWK Data Contract

This document defines the data contract between the RWK frontend and the upstream export pipeline.

The purpose of this file is to prevent frontend drift.

If the Apps Script / Drive / Supabase pipeline changes, it must continue to satisfy this contract unless the frontend is updated intentionally at the same time.

---

## Canonical live files

The frontend expects these exact public object paths in Supabase Storage:

- `csv/events_active_snapshot.csv`
- `csv/export_confirmed_verified.csv`
- `meta/manifest.json`

These names and relative paths should be treated as stable.

---

## File responsibilities

### 1) `events_active_snapshot.csv`
Purpose:

- authoritative event snapshot
- broader event metadata source
- used mainly for join enrichment

This file should contain all active event rows intended for app consumption.

Current upstream intent:

- rows 2..n from the Events tab
- cancelled events excluded

The frontend does **not** currently require coordinates from this file.

### 2) `export_confirmed_verified.csv`
Purpose:

- authoritative spatial plotting source
- used for marker rendering
- used as the primary source for coordinates and operational location records

Current upstream intent:

- only rows with `status=confirmed`
- only rows with complete address components
- only rows with valid latitude and longitude should be expected for mapping

The frontend currently assumes this is the main spatial dataset.

### 3) `meta/manifest.json`
Purpose:

- lightweight freshness / delivery metadata
- indicates when the current live dataset was last successfully published

The frontend currently uses this file to surface update timing and overall delivery status.

---

## Join contract

The frontend currently joins event rows and export rows using a composite key made from:

- `row_id`
- `event_id`
- `calendar_id`

Equivalent logic in the current app is effectively:

`row_id + "|" + event_id + "|" + calendar_id`

That means:

- both CSV files should include these fields
- field names should match exactly
- values should be stable strings
- whitespace should be avoided
- null or blank values weaken join reliability

### Required join fields in both CSVs

| Column | Required | Notes |
|---|---:|---|
| `row_id` | Yes | Stable row-level identifier |
| `event_id` | Yes | Calendar event identifier |
| `calendar_id` | Yes | Source calendar identifier |

### Join expectations

- The same real-world record should have the same join triple in both files.
- If an export row has no matching event row, the frontend will still render it spatially if coordinates are valid.
- If an event row has no usable join key, it cannot enrich export data.

---

## Spatial contract

The frontend currently renders markers from `export_confirmed_verified.csv`.

### Required spatial fields in `export_confirmed_verified.csv`

| Column | Required | Notes |
|---|---:|---|
| `latitude` | Yes | Decimal latitude |
| `longitude` | Yes | Decimal longitude |

### Coordinate rules

- Coordinates must be decimal degrees in WGS84 / EPSG:4326.
- `latitude` must be parseable as a number.
- `longitude` must be parseable as a number.
- Blank, malformed, or non-numeric coordinates will cause the row to be skipped for map rendering.
- The frontend currently also tolerates fallback coordinate names, but the canonical names should remain `latitude` and `longitude`.

### Current frontend fallback aliases for coordinates

These are tolerated by the current shell, but should not be preferred in the pipeline:

For latitude:

- `latitude`
- `lat`
- `y`
- `decimal_latitude`

For longitude:

- `longitude`
- `lng`
- `lon`
- `x`
- `decimal_longitude`

Pipeline guidance:

- always publish canonical `latitude` and `longitude`
- do not rely on aliases long-term

---

## Display field contract

The frontend can build popups even when some display fields are missing, but the following canonical names are recommended.

### Preferred display fields in `export_confirmed_verified.csv`

| Column | Required | Purpose |
|---|---:|---|
| `title` | Recommended | Primary popup title |
| `date` | Recommended | Primary display date |
| `address` | Recommended | Full formatted address |
| `row_id` | Yes | Popup metadata |
| `event_id` | Yes | Popup metadata |

### Current frontend fallback logic

#### Title fallback order
The popup title is currently derived in this order:

1. `title`
2. `summary`
3. `customer_name`
4. joined event row `title`
5. joined event row `summary`
6. `"Record"`

#### Date fallback order
The popup date is currently derived in this order:

1. `date`
2. `start_date`
3. `event_date`
4. `"—"`

#### Address fallback order
The popup address is currently derived from:

1. `address`
2. `street`
3. `city`
4. `province`
5. `postal_code`

Pipeline guidance:

- provide canonical `title`, `date`, and `address` where possible
- avoid forcing the frontend to depend on fallback fields over time

---

## Recommended canonical columns

The frontend does not need every upstream column, but these are the recommended stable columns for each file.

### Recommended canonical columns for `events_active_snapshot.csv`

| Column | Required | Notes |
|---|---:|---|
| `row_id` | Yes | Join key |
| `event_id` | Yes | Join key |
| `calendar_id` | Yes | Join key |
| `title` | Recommended | Event label |
| `date` | Recommended | Human-readable or normalized event date |
| `status` | Recommended | Useful for inspection |
| `start_time` | Optional | Future filtering |
| `end_time` | Optional | Future filtering |
| `organizer` | Optional | Future filtering |
| `updated_at` | Optional | Debugging / QA |

### Recommended canonical columns for `export_confirmed_verified.csv`

| Column | Required | Notes |
|---|---:|---|
| `row_id` | Yes | Join key |
| `event_id` | Yes | Join key |
| `calendar_id` | Yes | Join key |
| `latitude` | Yes | Marker rendering |
| `longitude` | Yes | Marker rendering |
| `title` | Recommended | Popup title |
| `date` | Recommended | Popup date |
| `address` | Recommended | Popup address |
| `status` | Recommended | Operational inspection |
| `street` | Optional | Address fallback |
| `city` | Optional | Address fallback |
| `province` | Optional | Address fallback |
| `postal_code` | Optional | Address fallback |

---

## Manifest contract

The manifest file must be valid JSON.

### Minimum required structure

```json
{
  "updated_at": "2026-04-15T14:00:00Z"
}