// workspace/runtimeBridge.js

import {
  createBoundaryIndex,
  findContainingBoundary,
  getBoundaryKey,
  getBoundaryName
} from "./boundaries.js";
import {
  firstNonEmpty,
  normalizeText,
  parsePossibleDate,
  toNumber
} from "./utils.js";

const APPOINTMENT_TYPES = Object.freeze({
  "bfqu2a3urejcnobl2p80tebo0g@group.calendar.google.com": {
    key: "installers",
    label: "Installers"
  },
  "e8gq6ptj73o1p36cm3cl6c42j4@group.calendar.google.com": {
    key: "countertop_template",
    label: "Countertop Template"
  },
  "5cel8t58jaldjfm4suvu64i6tg@group.calendar.google.com": {
    key: "cabinet_delivery",
    label: "Cabinet Delivery"
  },
  "v9tgaibikbcts6uu92lkum8qc0@group.calendar.google.com": {
    key: "initial_template",
    label: "Initial Template"
  }
});

export function projectRuntimeForWorkspace(runtime) {
  const safeRuntime = {
    boundariesGeojson: runtime?.boundariesGeojson || null,
    manifest: runtime?.manifest || null,
    summary: runtime?.summary || {},
    candidateRows: Array.isArray(runtime?.candidateRows) ? runtime.candidateRows : [],
    originRows: Array.isArray(runtime?.originRows) ? runtime.originRows : []
  };

  const boundaryIndex = createBoundaryIndex(safeRuntime.boundariesGeojson);

  const candidateRows = safeRuntime.candidateRows.map((row) =>
    enrichCandidateRow(row, boundaryIndex)
  );

  const visitCounts = buildVisitCounts(candidateRows);

  candidateRows.forEach((row) => {
    row._visitCount = visitCounts.get(row._siteKey || "") || 0;
    row._visitBucket = getVisitBucket(row._visitCount);
  });

  const originRows = safeRuntime.originRows.map((origin) =>
    enrichOriginRow(origin, boundaryIndex)
  );

  return {
    boundariesGeojson: safeRuntime.boundariesGeojson,
    manifest: safeRuntime.manifest,
    summary: {
      ...safeRuntime.summary,
      candidateCount: candidateRows.length,
      originCount: originRows.length,
      updatedAt:
        safeRuntime.summary?.updatedAt ||
        safeRuntime.manifest?.updated_at ||
        ""
    },
    candidateRows,
    originRows
  };
}

function enrichCandidateRow(row, boundaryIndex) {
  const latitude = toNumber(
    row._latitude ?? row.latitude ?? row.lat ?? row.y ?? row.decimal_latitude
  );

  const longitude = toNumber(
    row._longitude ?? row.longitude ?? row.lng ?? row.lon ?? row.x ?? row.decimal_longitude
  );

  const parsedDate =
    row._parsedDate instanceof Date
      ? row._parsedDate
      : parsePossibleDate(
          firstNonEmpty(
            row.date,
            row.start_date,
            row.event_date,
            row.start_time,
            row.created_at,
            row.updated_at
          )
        );

  const calendarId = firstNonEmpty(
    row._calendarId,
    row.calendar_id,
    row.organizer,
    row.creator,
    row.created_by
  );

  const appointmentMeta = getAppointmentMeta(
    calendarId,
    row._appointmentKey,
    row._appointmentLabel
  );

  const boundaryFeature =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? findContainingBoundary(boundaryIndex, [longitude, latitude])
      : null;

  const dayInfo = getDayInfo(parsedDate);
  const timeBucket = getTimeBucket(parsedDate);

  return {
    ...row,

    _latitude: latitude,
    _longitude: longitude,
    _hasCoordinates: Number.isFinite(latitude) && Number.isFinite(longitude),

    _title:
      firstNonEmpty(row._title, row.title, row.summary, row.customer_name, row.name) ||
      "Record",

    _dateDisplay:
      firstNonEmpty(row._dateDisplay, row.date, row.start_date, row.event_date, row.start_time) ||
      "—",

    _parsedDate: parsedDate,
    _year: row._year || (parsedDate ? String(parsedDate.getFullYear()) : ""),

    _calendarId: calendarId,
    _appointmentKey: appointmentMeta.key,
    _appointmentLabel: appointmentMeta.label,

    _organizerText:
      firstNonEmpty(row._organizerText, row.organizer, row.calendar_id, row.creator) ||
      "unknown",

    _organizerKey:
      normalizeText(
        firstNonEmpty(row._organizerKey, row._organizerText, row.organizer, row.calendar_id)
      ) || "unknown",

    _addressText:
      firstNonEmpty(
        row._addressText,
        row.address,
        row.address_raw,
        row.location,
        [row.street_name_number, row.city, row.province, row.postal_code]
          .filter(Boolean)
          .join(", ")
      ) || "—",

    _siteKey:
      firstNonEmpty(
        row._siteKey,
        normalizeText(
          [row.street_name_number, row.city, row.province].filter(Boolean).join("|")
        ),
        normalizeText(firstNonEmpty(row.address, row.address_raw, row.location))
      ) || "",

    _dayKey: row._dayKey || dayInfo.key,
    _dayLabel: row._dayLabel || dayInfo.label,
    _dayIndex: Number.isFinite(row._dayIndex) ? row._dayIndex : dayInfo.index,
    _dayColor: row._dayColor || dayInfo.color,

    _boundaryKey: boundaryFeature ? getBoundaryKey(boundaryFeature) : "",
    _boundaryName: boundaryFeature ? getBoundaryName(boundaryFeature) || "" : "",

    _timeBucket: row._timeBucket || timeBucket,
    _visitCount: Number.isFinite(row._visitCount) ? row._visitCount : 0,
    _visitBucket: row._visitBucket || ""
  };
}

function enrichOriginRow(origin, boundaryIndex) {
  const latitude = toNumber(origin._latitude ?? origin.latitude ?? origin.lat);
  const longitude = toNumber(origin._longitude ?? origin.longitude ?? origin.lng ?? origin.lon);

  const boundaryFeature =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? findContainingBoundary(boundaryIndex, [longitude, latitude])
      : null;

  return {
    ...origin,
    _latitude: latitude,
    _longitude: longitude,
    _hasCoordinates: Number.isFinite(latitude) && Number.isFinite(longitude),
    _isActive: origin._isActive !== false && origin.isActive !== false,
    _typeKey: normalizeText(origin._typeKey || origin.type || "other"),
    _typeLabel: origin._typeLabel || toTitleCase(origin.type || origin._typeKey || "other"),
    _boundaryKey: boundaryFeature ? getBoundaryKey(boundaryFeature) : "",
    _boundaryName: boundaryFeature ? getBoundaryName(boundaryFeature) || "" : ""
  };
}

function getAppointmentMeta(calendarId, existingKey = "", existingLabel = "") {
  const raw = String(calendarId || "").trim();

  if (existingKey && existingLabel) {
    return {
      key: existingKey,
      label: existingLabel
    };
  }

  if (!raw) {
    return {
      key: "unknown",
      label: "Unknown"
    };
  }

  return APPOINTMENT_TYPES[raw] || {
    key: normalizeText(raw).replace(/[^\w]+/g, "_"),
    label: raw
  };
}

function buildVisitCounts(rows) {
  const counts = new Map();

  rows.forEach((row) => {
    if (!row._siteKey) return;
    counts.set(row._siteKey, (counts.get(row._siteKey) || 0) + 1);
  });

  return counts;
}

function getVisitBucket(count) {
  if (!Number.isFinite(count) || count <= 0) return "";
  return count > 10 ? "10" : String(count);
}

function getDayInfo(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return { key: "", label: "", index: -1, color: "#2563eb" };
  }

  const keys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ];

  const key = keys[date.getDay()];
  const meta = {
    sunday: { index: 0, label: "Sun", color: "#dc2626" },
    monday: { index: 1, label: "Mon", color: "#ea580c" },
    tuesday: { index: 2, label: "Tue", color: "#ca8a04" },
    wednesday: { index: 3, label: "Wed", color: "#16a34a" },
    thursday: { index: 4, label: "Thu", color: "#0891b2" },
    friday: { index: 5, label: "Fri", color: "#2563eb" },
    saturday: { index: 6, label: "Sat", color: "#7c3aed" }
  }[key];

  return {
    key,
    label: meta.label,
    index: meta.index,
    color: meta.color
  };
}

function getTimeBucket(parsedDate) {
  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const last7 = new Date(startOfToday);
  last7.setDate(last7.getDate() - 7);

  const last30 = new Date(startOfToday);
  last30.setDate(last30.getDate() - 30);

  if (parsedDate.getTime() >= startOfToday.getTime()) return "upcoming";
  if (parsedDate.getTime() >= last7.getTime()) return "last_7_days";
  if (parsedDate.getTime() >= last30.getTime()) return "last_30_days";

  return "";
}

function toTitleCase(value) {
  return String(value ?? "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}