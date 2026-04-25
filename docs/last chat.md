id component bfqu2a3urejcnobl2p80tebo0g@group.calendar.google.com Installers e8gq6ptj73o1p36cm3cl6c42j4@group.calendar.google.com Countertop Template 5cel8t58jaldjfm4suvu64i6tg@group.calendar.google.com Cabinet Delivery v9tgaibikbcts6uu92lkum8qc0@group.calendar.google.com Initial Template --- Hi, the map view is coming along really well. Something that is missing, however, is introducing a panel to filter by calendar type. I think the header of the filter should be called like appointment. I think appointment makes sense. So I'm currently adding more calendar IDs to my scraper tool, which eventually populates the CSV that which is the data source for this project. So I'm updating the CSV, same directory, same name and everything. I'm updating the CSV now in the Supabase bucket, but essentially I'm no longer just using four, or I'm no longer just using two, I'm using four different calendar IDs for four different types of appointments. Those types of appointments, I've listed them above in the text by ID and component. There are installers, there's countertop template, there's cabinet delivery, and there's initial template. Essentially, I need to be able to filter by those appointments. Or those components independently as well. So based on the source ID from the calendar, toggling on and off on the side panel would be really helpful. I'm hoping to introduce that into the map view. I also think that the debug panel is rather overbearing. I think it would be much better if it was collapsed to be, to always remain directly underneath the map, whether it's mobile or it's desktop view, and to make sure that it is as collapsed as possible and it just runs in full text. So it just, it's cumbersome. It takes up a lot of space currently on the side panel. I think it should be distinctly on its own in the bottom panel, and every interaction is logged into the same style, same visual, like black text, that's great. However, each value doesn't need its own line. Every interaction can maybe just be like comma space delimited or delimited by like a vertical bar that distinguishes between interactions, and they can fill up the entire contents of the screen to be as compressed as possible. But essentially that should not be front and center with all of the user-friendly options for the side panel. It should be distinctly on its own on the bottom panel. Perhaps. So that would be really great to introduce that. So there should be three primary filters, or rather four primary panels. There's population filters, there's origins, there's appointments, or rather appointment types, and then there's selection. If we can introduce that and allow me to filter by appointment type, then the map view is pretty well ready to go. So I'm just updating the data source now to retrieve all four calendar ID values. If you could help me comprehensively update all files that are relevant to this batch of updates, that would be appreciated.

---

I can help with this push. I reviewed the uploaded export context, including the current workspace shell, filters, runtime parsing, debug panel, and panel layout.

This update should touch these files:

config/renderConfig.schema.js
data/parseRuntimeData.js
workspace/state.js
workspace/runtimeBridge.js
workspace/filters.js
workspace/panels.js
workspace/renderWorkspaceShell.js
workspace.html
workspace/debug.js
workspace/controller.js
workspace/popup.js
style.css

Because the replacements are long, I’ll split this into clean drop-in blocks. Start with these first.

1. Replace config/renderConfig.schema.js
// config/renderConfig.schema.js

export const DEFAULT_RENDER_CONFIG = Object.freeze({
  meta: {
    presetId: null,
    selectionPath: null,
    label: null,
    description: null
  },

  filters: {
    keyword: "",
    organizers: [],
    appointmentTypes: [],
    days: [],
    year: "all",
    visitBuckets: [],
    timeWindow: "all"
  },

  boundary: {
    selectedBoundaryKey: "",
    selectedBoundaryKeys: [],
    fitToBoundary: false
  },

  origins: {
    includeOrigins: true,
    selectedOriginId: "",
    originTypes: [],
    nearestOriginOnly: false
  },

  visualization: {
    showMap: true,
    showBoundaries: true,
    showJobs: true,
    showOrigins: true,
    fitToVisible: false,
    emphasizeSelectedBoundary: false
  },

  analytics: {
    mode: "standard",
    groupBy: null,
    sortBy: null
  }
});

export function cloneRenderConfig(base = DEFAULT_RENDER_CONFIG) {
  return structuredClone(base);
}

export function createRenderConfig(overrides = {}) {
  const base = cloneRenderConfig(DEFAULT_RENDER_CONFIG);

  const boundaryOverrides = overrides.boundary || {};
  const selectedBoundaryKeys = Array.isArray(boundaryOverrides.selectedBoundaryKeys)
    ? [...boundaryOverrides.selectedBoundaryKeys]
    : boundaryOverrides.selectedBoundaryKey
      ? [boundaryOverrides.selectedBoundaryKey]
      : [];

  return {
    ...base,
    ...overrides,

    meta: {
      ...base.meta,
      ...(overrides.meta || {})
    },

    filters: {
      ...base.filters,
      ...(overrides.filters || {})
    },

    boundary: {
      ...base.boundary,
      ...boundaryOverrides,
      selectedBoundaryKey:
        boundaryOverrides.selectedBoundaryKey ||
        selectedBoundaryKeys[0] ||
        "",
      selectedBoundaryKeys
    },

    origins: {
      ...base.origins,
      ...(overrides.origins || {})
    },

    visualization: {
      ...base.visualization,
      ...(overrides.visualization || {})
    },

    analytics: {
      ...base.analytics,
      ...(overrides.analytics || {})
    }
  };
}

export function isRenderConfig(value) {
  return Boolean(
    value &&
      value.meta &&
      value.filters &&
      value.boundary &&
      value.origins &&
      value.visualization &&
      value.analytics
  );
}
2. Replace data/parseRuntimeData.js
// data/parseRuntimeData.js

export const APPOINTMENT_TYPES = Object.freeze({
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

const ORGANIZER_ALIASES = Object.freeze({
  "bfqu2a3urejcnobl2p80tebo0g@group.calendar.google.com": "install",
  "e8gq6ptj73o1p36cm3cl6c42j4@group.calendar.google.com": "template",
  "5cel8t58jaldjfm4suvu64i6tg@group.calendar.google.com": "delivery",
  "v9tgaibikbcts6uu92lkum8qc0@group.calendar.google.com": "template"
});

const DAY_META = Object.freeze({
  sunday: { index: 0, label: "Sun", color: "#dc2626" },
  monday: { index: 1, label: "Mon", color: "#ea580c" },
  tuesday: { index: 2, label: "Tue", color: "#ca8a04" },
  wednesday: { index: 3, label: "Wed", color: "#16a34a" },
  thursday: { index: 4, label: "Thu", color: "#0891b2" },
  friday: { index: 5, label: "Fri", color: "#2563eb" },
  saturday: { index: 6, label: "Sat", color: "#7c3aed" }
});

export function normalizeRuntimeData({
  boundariesGeojson,
  origins,
  manifest,
  eventsCsvText,
  exportCsvText
}) {
  const eventsRows = parseCsv(eventsCsvText);
  const exportRows = parseCsv(exportCsvText);
  const originRows = Array.isArray(origins) ? origins.map(deriveOriginRow) : [];
  const joinedRows = joinRows(eventsRows, exportRows);
  const derivedRows = joinedRows.map(deriveRow);
  const candidateRows = derivedRows.filter((row) => row._hasCoordinates);

  return {
    boundariesGeojson,
    manifest,
    eventsRows,
    exportRows,
    joinedRows,
    derivedRows,
    candidateRows,
    originRows,
    summary: {
      boundaryFeatureCount: Array.isArray(boundariesGeojson?.features)
        ? boundariesGeojson.features.length
        : 0,
      originCount: originRows.length,
      eventsCount: eventsRows.length,
      exportCount: exportRows.length,
      joinedCount: joinedRows.length,
      candidateCount: candidateRows.length,
      updatedAt: manifest?.updated_at || ""
    }
  };
}

export function parseCsv(csvText) {
  if (!csvText || !csvText.trim()) {
    return [];
  }

  const normalized = csvText.replace(/^\uFEFF/, "");
  const lines = splitCsvLines(normalized);

  if (!lines.length) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((value) => value.trim());
  const records = [];

  for (let i = 1; i < lines.length; i += 1) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;

    const values = parseCsvLine(rawLine);
    const record = {};

    headers.forEach((header, index) => {
      record[header] = (values[index] ?? "").trim();
    });

    records.push(record);
  }

  return records;
}

function splitCsvLines(text) {
  const lines = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      current += char;

      if (inQuotes && next === '"') {
        current += next;
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      lines.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current) lines.push(current);
  return lines;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

export function joinRows(eventsRows, exportRows) {
  const eventIndex = new Map();

  for (const row of eventsRows) {
    const joinKey = getJoinKey(row);
    if (joinKey) {
      eventIndex.set(joinKey, row);
    }
  }

  return exportRows.map((exportRow) => {
    const joinKey = getJoinKey(exportRow);
    const eventRow = joinKey ? eventIndex.get(joinKey) : null;
    return buildJoinedRow(exportRow, eventRow);
  });
}

function buildJoinedRow(exportRow, eventRow) {
  const latitude = toNumber(
    exportRow.latitude ??
      exportRow.lat ??
      exportRow.y ??
      exportRow.decimal_latitude
  );

  const longitude = toNumber(
    exportRow.longitude ??
      exportRow.lng ??
      exportRow.lon ??
      exportRow.x ??
      exportRow.decimal_longitude
  );

  return {
    ...eventRow,
    ...exportRow,
    _joined: Boolean(eventRow),
    _joinKey: getJoinKey(exportRow) || getJoinKey(eventRow),
    _latitude: latitude,
    _longitude: longitude,
    _hasCoordinates: Number.isFinite(latitude) && Number.isFinite(longitude)
  };
}

export function deriveRow(row) {
  const parsedDate = parsePossibleDate(
    firstNonEmpty(
      row.date,
      row.start_date,
      row.event_date,
      row.start_time,
      row.created_at,
      row.updated_at
    )
  );

  const calendarId = firstNonEmpty(row.calendar_id, row.organizer, row.creator, row.created_by);
  const appointmentMeta = getAppointmentMeta(calendarId);
  const organizerText = getOrganizerLabel(calendarId);
  const dayInfo = getDayInfo(parsedDate);
  const addressText = composeAddress(row);
  const siteKey = buildSiteKey(row);
  const year = parsedDate ? String(parsedDate.getFullYear()) : "";

  return {
    ...row,

    _title:
      firstNonEmpty(row.title, row.summary, row.customer_name, row.name) || "Record",

    _parsedDate: parsedDate,

    _dateDisplay:
      firstNonEmpty(
        row.date,
        row.start_date,
        row.event_date,
        row.start_time,
        formatDate(parsedDate)
      ) || "—",

    _year: year,

    _calendarId: calendarId,
    _appointmentKey: appointmentMeta.key,
    _appointmentLabel: appointmentMeta.label,

    _organizerText: organizerText,
    _organizerKey: normalizeText(organizerText),

    _dayKey: dayInfo.key,
    _dayLabel: dayInfo.label,
    _dayIndex: dayInfo.index,
    _dayColor: dayInfo.color,

    _addressText: addressText,
    _siteKey: siteKey,
    _visitCount: 0,
    _visitBucket: "",

    _keywordBlob: normalizeText(
      [
        row.title,
        row.summary,
        appointmentMeta.label,
        organizerText,
        addressText,
        row.notes,
        row.description,
        year,
        dayInfo.label
      ]
        .filter(Boolean)
        .join(" ")
    )
  };
}

export function deriveOriginRow(origin) {
  const latitude = toNumber(origin.latitude ?? origin.lat);
  const longitude = toNumber(origin.longitude ?? origin.lng ?? origin.lon);

  return {
    ...origin,
    _latitude: latitude,
    _longitude: longitude,
    _hasCoordinates: Number.isFinite(latitude) && Number.isFinite(longitude),
    _isActive: origin.isActive !== false,
    _typeKey: normalizeText(origin.type || "other"),
    _typeLabel: toTitleCase(origin.type || "other")
  };
}

export function getJoinKey(row) {
  if (!row) return "";

  const parts = [
    row.row_id || row.source_row_id || "",
    row.event_id || "",
    row.calendar_id || ""
  ].map((value) => String(value).trim());

  return parts.some(Boolean) ? parts.join("|") : "";
}

function getAppointmentMeta(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return { key: "unknown", label: "Unknown" };
  }

  return APPOINTMENT_TYPES[raw] || {
    key: normalizeText(raw).replace(/[^\w]+/g, "_"),
    label: raw
  };
}

function getOrganizerLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "unknown";
  return ORGANIZER_ALIASES[raw] || raw;
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
  const meta = DAY_META[key];

  return {
    key,
    label: meta?.label || "",
    index: meta?.index ?? -1,
    color: meta?.color || "#2563eb"
  };
}

function composeAddress(row) {
  return [
    row.address,
    row.address_raw,
    row.location,
    row.street_name_number,
    row.city,
    row.province,
    row.postal_code
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .filter(
      (value, index, array) =>
        array.findIndex((v) => v.toLowerCase() === value.toLowerCase()) === index
    )
    .join(", ");
}

function buildSiteKey(row) {
  const primary = [
    normalizeSitePart(row.street_name_number),
    normalizeSitePart(row.city),
    normalizeSitePart(row.province)
  ].filter(Boolean);

  if (primary.length >= 2) {
    return primary.join("|");
  }

  return normalizeSitePart(row.address || row.address_raw || row.location || "");
}

function normalizeSitePart(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePossibleDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium"
  }).format(date);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }

  const result = Number(String(value).trim());
  return Number.isFinite(result) ? result : NaN;
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function toTitleCase(value) {
  return String(value ?? "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
3. Replace workspace/state.js
// workspace/state.js

export function createWorkspaceState() {
  return {
    runtime: null,
    config: null,

    map: null,
    layers: {
      boundaries: null,
      jobs: null,
      origins: null
    },

    boundaryIndex: {
      features: [],
      featuresByKey: new Map()
    },

    selection: {
      boundaryKeys: [],
      originId: ""
    },

    refinements: {
      days: [],
      appointmentTypes: [],
      visitBuckets: [],
      originTypes: []
    },

    populationRows: [],
    visibleRows: [],
    visibleOrigins: [],

    results: {
      candidateCount: 0,
      filteredCount: 0,
      boundaryCount: 0,
      visibleCount: 0,
      visibleOriginCount: 0
    }
  };
}
4. Replace workspace/configBridge.js
// workspace/configBridge.js

export function configToWorkspaceState(config) {
  const next = {
    selection: {
      boundaryKeys: [],
      originId: ""
    },
    refinements: {
      days: [],
      appointmentTypes: [],
      visitBuckets: [],
      originTypes: []
    }
  };

  if (!config || typeof config !== "object") {
    return next;
  }

  if (Array.isArray(config.boundary?.selectedBoundaryKeys)) {
    next.selection.boundaryKeys = [...config.boundary.selectedBoundaryKeys].filter(Boolean);
  } else if (config.boundary?.selectedBoundaryKey) {
    next.selection.boundaryKeys = [config.boundary.selectedBoundaryKey];
  }

  if (config.origins?.selectedOriginId) {
    next.selection.originId = config.origins.selectedOriginId;
  }

  if (Array.isArray(config.filters?.days)) {
    next.refinements.days = [...config.filters.days];
  }

  if (Array.isArray(config.filters?.appointmentTypes)) {
    next.refinements.appointmentTypes = [...config.filters.appointmentTypes];
  }

  if (Array.isArray(config.filters?.visitBuckets)) {
    next.refinements.visitBuckets = [...config.filters.visitBuckets];
  }

  if (Array.isArray(config.origins?.originTypes)) {
    next.refinements.originTypes = [...config.origins.originTypes];
  }

  return next;
}
5. Replace workspace/debug.js
// workspace/debug.js

const MAX_SEGMENTS = 80;

export function createWorkspaceDebug(target) {
  const entries = [];

  function clear() {
    entries.length = 0;

    if (target) {
      target.textContent = "";
    }
  }

  function log(message) {
    if (!target) return;

    const stamp = new Date().toLocaleTimeString();
    const entry = `[${stamp}] ${message}`;

    entries.push(entry);

    while (entries.length > MAX_SEGMENTS) {
      entries.shift();
    }

    target.textContent = entries.join(" | ");
    target.scrollLeft = target.scrollWidth;
  }

  return {
    clear,
    log
  };
}

Next replace the remaining files in the next batch:

workspace/runtimeBridge.js, workspace/filters.js, workspace/panels.js, workspace/renderWorkspaceShell.js, workspace.html, workspace/controller.js, workspace/popup.js, and style.css.

---

Okay, I've updated the initial, the first batch of files. Can you help me update the rest according to the updates that we've covered in this conversation? They're attached as well for context.

---

Yes — this second batch completes the appointment-type filter, moves Debug into a compact bottom strip, and leaves the side panel focused on Population filters / Origins / Appointment / Selection as requested. The four calendar IDs/components are carried through as appointment metadata and workspace toggle filters.

Replace the files below in full.

workspace/runtimeBridge.js
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
workspace/filters.js
// workspace/filters.js

const ENABLED_ORIGIN_TYPES = new Set(["warehouse", "showroom"]);

export function computeWorkspaceView({
  runtime,
  config,
  refinements,
  selection
}) {
  const candidateRows = Array.isArray(runtime?.candidateRows)
    ? runtime.candidateRows
    : [];

  const originRows = Array.isArray(runtime?.originRows)
    ? runtime.originRows
    : [];

  const safeRefinements = normalizeRefinements(refinements);
  const safeSelection = normalizeSelection(selection);

  const configFilteredRows = candidateRows.filter((row) =>
    matchesConfigFilters(row, config)
  );

  const jobsAreEnabled =
    safeRefinements.days.length > 0 ||
    safeRefinements.appointmentTypes.length > 0;

  const refinementFilteredRows = configFilteredRows.filter((row) =>
    matchesWorkspaceRefinements(row, safeRefinements)
  );

  const boundaryFilteredRows = refinementFilteredRows.filter((row) =>
    matchesBoundarySelection(row, safeSelection)
  );

  const visibleRows = jobsAreEnabled ? boundaryFilteredRows : [];

  const visibleOrigins = originRows.filter((origin) =>
    matchesOriginVisibility(origin, safeRefinements)
  );

  return {
    populationRows: configFilteredRows,
    visibleRows,
    visibleOrigins,
    counts: {
      candidateCount: candidateRows.length,
      filteredCount: refinementFilteredRows.length,
      boundaryCount: boundaryFilteredRows.length,
      visibleCount: visibleRows.length,
      visibleOriginCount: visibleOrigins.length
    },
    gates: {
      jobsAreEnabled,
      originsAreEnabled: safeRefinements.originTypes.length > 0,
      markerSelectionEnabled: safeSelection.boundaryKeys.length > 0
    }
  };
}

function normalizeRefinements(refinements = {}) {
  return {
    days: Array.isArray(refinements.days) ? refinements.days.filter(Boolean) : [],
    appointmentTypes: Array.isArray(refinements.appointmentTypes)
      ? refinements.appointmentTypes.filter(Boolean)
      : [],
    visitBuckets: [],
    originTypes: Array.isArray(refinements.originTypes)
      ? refinements.originTypes.filter((type) => ENABLED_ORIGIN_TYPES.has(type))
      : []
  };
}

function normalizeSelection(selection = {}) {
  return {
    boundaryKeys: Array.isArray(selection.boundaryKeys)
      ? selection.boundaryKeys.filter(Boolean)
      : selection.boundaryKey
        ? [selection.boundaryKey]
        : [],
    originId: selection.originId || ""
  };
}

function matchesConfigFilters(row, config) {
  if (!config) return true;

  const organizers = config?.filters?.organizers || [];
  const appointmentTypes = config?.filters?.appointmentTypes || [];
  const timeWindow = config?.filters?.timeWindow || "all";
  const visitBuckets = config?.filters?.visitBuckets || [];
  const year = config?.filters?.year || "all";
  const keyword = String(config?.filters?.keyword || "").trim().toLowerCase();

  const configBoundaryKeys = Array.isArray(config?.boundary?.selectedBoundaryKeys)
    ? config.boundary.selectedBoundaryKeys.filter(Boolean)
    : config?.boundary?.selectedBoundaryKey
      ? [config.boundary.selectedBoundaryKey]
      : [];

  if (organizers.length > 0 && !organizers.includes(row._organizerKey)) {
    return false;
  }

  if (appointmentTypes.length > 0 && !appointmentTypes.includes(row._appointmentKey)) {
    return false;
  }

  if (visitBuckets.length > 0 && !visitBuckets.includes(row._visitBucket)) {
    return false;
  }

  if (year !== "all" && row._year !== year) {
    return false;
  }

  if (configBoundaryKeys.length > 0 && !configBoundaryKeys.includes(row._boundaryKey)) {
    return false;
  }

  if (timeWindow !== "all" && row._timeBucket !== timeWindow) {
    return false;
  }

  if (keyword && !String(row._keywordBlob || "").includes(keyword)) {
    return false;
  }

  return true;
}

function matchesWorkspaceRefinements(row, refinements) {
  if (refinements.days.length > 0 && !refinements.days.includes(row._dayKey)) {
    return false;
  }

  if (
    refinements.appointmentTypes.length > 0 &&
    !refinements.appointmentTypes.includes(row._appointmentKey)
  ) {
    return false;
  }

  return true;
}

function matchesBoundarySelection(row, selection) {
  if (selection.boundaryKeys.length === 0) return true;
  return selection.boundaryKeys.includes(row._boundaryKey);
}

function matchesOriginVisibility(origin, refinements) {
  if (!origin?._isActive || !origin?._hasCoordinates) {
    return false;
  }

  if (!ENABLED_ORIGIN_TYPES.has(origin._typeKey)) {
    return false;
  }

  if (refinements.originTypes.length === 0) {
    return false;
  }

  return refinements.originTypes.includes(origin._typeKey);
}
workspace/panels.js
// workspace/panels.js

import { formatTimestamp } from "./utils.js";

const DAY_META = [
  { value: "monday", label: "Mon", color: "#ea580c" },
  { value: "tuesday", label: "Tue", color: "#ca8a04" },
  { value: "wednesday", label: "Wed", color: "#16a34a" },
  { value: "thursday", label: "Thu", color: "#0891b2" },
  { value: "friday", label: "Fri", color: "#2563eb" },
  { value: "saturday", label: "Sat", color: "#7c3aed" },
  { value: "sunday", label: "Sun", color: "#dc2626" }
];

const ORIGIN_TYPE_META = [
  { value: "warehouse", label: "Warehouse", color: "#0f766e" },
  { value: "showroom", label: "Showroom", color: "#7c3aed" }
];

const APPOINTMENT_TYPE_META = [
  { value: "installers", label: "Installers", color: "#1d4ed8" },
  { value: "countertop_template", label: "Countertop Template", color: "#7c3aed" },
  { value: "cabinet_delivery", label: "Cabinet Delivery", color: "#0f766e" },
  { value: "initial_template", label: "Initial Template", color: "#d97706" }
];

export function cacheWorkspacePanelUi(root = document) {
  return {
    backToLauncherButton: root.getElementById("backToLauncherButton"),

    headerResultPill: root.getElementById("headerResultPill"),
    headerResultCount: root.getElementById("headerResultCount"),
    headerResultMeta: root.getElementById("headerResultMeta"),

    dayToggleGroup: root.getElementById("dayToggleGroup"),
    appointmentTypeToggleGroup: root.getElementById("appointmentTypeToggleGroup"),
    originTypeToggleGroup: root.getElementById("originTypeToggleGroup"),

    candidateMarkerCount: root.getElementById("candidateMarkerCount"),
    filteredRowCount: root.getElementById("filteredRowCount"),
    boundaryMatchedCount: root.getElementById("boundaryMatchedCount"),
    visibleMarkerCount: root.getElementById("visibleMarkerCount"),
    resultsMessage: root.getElementById("resultsMessage"),

    selectedBoundaryName: root.getElementById("selectedBoundaryName"),

    clearBoundaryButton: root.getElementById("clearBoundaryButton"),

    debugOutput: root.getElementById("debugOutput")
  };
}

export function bindWorkspacePanelEvents(ui, handlers = {}) {
  ui.clearBoundaryButton?.addEventListener("click", () => {
    handlers.onClearBoundary?.();
  });

  bindToggleGroup(ui.dayToggleGroup, "day", handlers.onToggleDay);
  bindToggleGroup(
    ui.appointmentTypeToggleGroup,
    "appointmentType",
    handlers.onToggleAppointmentType
  );
  bindToggleGroup(ui.originTypeToggleGroup, "originType", handlers.onToggleOriginType);
}

export function renderWorkspaceFilters(ui, state) {
  renderDayToggles(ui.dayToggleGroup, state.refinements.days || []);
  renderAppointmentTypeToggles(
    ui.appointmentTypeToggleGroup,
    state.refinements.appointmentTypes || []
  );
  renderOriginTypeToggles(
    ui.originTypeToggleGroup,
    state.refinements.originTypes || []
  );
}

export function renderWorkspaceResults(ui, results) {
  setText(ui.candidateMarkerCount, String(results.candidateCount || 0));
  setText(ui.filteredRowCount, String(results.filteredCount || 0));
  setText(ui.boundaryMatchedCount, String(results.boundaryCount || 0));
  setText(ui.visibleMarkerCount, String(results.visibleCount || 0));
}

export function renderHeaderResults(
  ui,
  {
    visibleRows = 0,
    visibleOrigins = 0,
    filteredRows = 0,
    selectedBoundaryNames = [],
    selectedDays = 0,
    selectedAppointmentTypes = 0,
    selectedOriginTypes = 0
  } = {}
) {
  const activeFilters = selectedDays + selectedAppointmentTypes + selectedOriginTypes;
  const countLabel = `${visibleRows.toLocaleString()} coordinates`;
  const boundaryNames = Array.isArray(selectedBoundaryNames)
    ? selectedBoundaryNames.filter(Boolean)
    : [];

  const parts = [];

  if (visibleOrigins > 0) {
    parts.push(`${visibleOrigins.toLocaleString()} origins`);
  }

  if (boundaryNames.length === 1) {
    parts.push(boundaryNames[0]);
  } else if (boundaryNames.length > 1) {
    parts.push(`${boundaryNames.length} boundaries selected`);
  }

  if (activeFilters === 0) {
    parts.push("blank until filtered");
  } else if (visibleRows === 0 && visibleOrigins === 0) {
    parts.push(`${filteredRows.toLocaleString()} filtered records`);
  } else {
    parts.push(`${activeFilters} active filter${activeFilters === 1 ? "" : "s"}`);
  }

  setText(ui.headerResultCount, countLabel);
  setText(ui.headerResultMeta, parts.join(" • "));

  if (ui.headerResultPill) {
    ui.headerResultPill.classList.toggle(
      "is-empty",
      activeFilters === 0 || (visibleRows === 0 && visibleOrigins === 0)
    );
  }
}

export function renderWorkspaceSelection(
  ui,
  {
    selectedBoundaryName = "None"
  } = {}
) {
  setText(ui.selectedBoundaryName, selectedBoundaryName || "None");
}

export function renderWorkspaceRuntimeStatus(ui, summary = {}) {
  if (!summary?.updatedAt) return;

  setWorkspaceMessage(
    ui,
    `Runtime ready. Updated ${formatTimestamp(summary.updatedAt)}.`
  );
}

export function setWorkspaceMessage(ui, text) {
  setText(ui.resultsMessage, text || "Ready.");
  setText(ui.headerResultMeta, text || "Ready.");
}

function renderDayToggles(container, selectedValues) {
  renderToggleButtons({
    container,
    options: DAY_META,
    selectedValues,
    className: "toggle-chip toggle-chip--day",
    decorate(button, option) {
      button.style.setProperty("--day-color", option.color);
    },
    datasetKey: "day"
  });
}

function renderAppointmentTypeToggles(container, selectedValues) {
  renderToggleButtons({
    container,
    options: APPOINTMENT_TYPE_META,
    selectedValues,
    className: "toggle-chip toggle-chip--appointment",
    decorate(button, option) {
      button.style.setProperty("--appointment-color", option.color);
    },
    datasetKey: "appointmentType"
  });
}

function renderOriginTypeToggles(container, selectedValues) {
  renderToggleButtons({
    container,
    options: ORIGIN_TYPE_META,
    selectedValues,
    className: "toggle-chip toggle-chip--origin",
    decorate(button, option) {
      button.style.setProperty("--origin-color", option.color);
    },
    datasetKey: "originType"
  });
}

function renderToggleButtons({
  container,
  options,
  selectedValues,
  className,
  decorate = null,
  datasetKey
}) {
  if (!container) return;

  const selected = new Set(selectedValues || []);
  container.innerHTML = "";

  const fragment = document.createDocumentFragment();

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = option.label;
    button.dataset[datasetKey] = option.value;

    const isActive = selected.has(option.value);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));

    if (typeof decorate === "function") {
      decorate(button, option);
    }

    fragment.appendChild(button);
  });

  container.appendChild(fragment);
}

function bindToggleGroup(container, datasetKey, handler) {
  if (!container || typeof handler !== "function") return;

  container.addEventListener("click", (event) => {
    const button = event.target.closest(`button[data-${camelToKebab(datasetKey)}]`);
    if (!button) return;

    handler(button.dataset[datasetKey]);
  });
}

function camelToKebab(value) {
  return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}
workspace/renderWorkspaceShell.js
// workspace/renderWorkspaceShell.js

export function renderWorkspaceShell() {
  return `
    <div class="app-shell workspace-shell">
      <header class="topbar">
        <div class="topbar__title-wrap">
          <p class="topbar__eyebrow">RWK</p>
          <h1 class="topbar__title">Operational workspace</h1>
          <p class="topbar__subtitle">
            Spatial review, refinement, and boundary-driven operational inspection.
          </p>
        </div>

        <div class="topbar__status" id="headerResultPill" aria-live="polite">
          <span id="headerResultCount" class="topbar__status-count">0 coordinates</span>
          <span id="headerResultMeta" class="topbar__status-meta">Waiting for filters</span>
        </div>

        <div class="topbar__actions">
          <button
            id="backToLauncherButton"
            class="button"
            type="button"
            aria-label="Back to launcher"
          >
            Back to launcher
          </button>
        </div>
      </header>

      <main class="layout">
        <section class="map-column" aria-label="Map and diagnostics">
          <section class="map-section" aria-label="Map section">
            <div id="map" aria-label="Map"></div>
          </section>

          <section class="debug-strip" aria-labelledby="debugCardTitle">
            <h2 id="debugCardTitle" class="debug-strip__title">Debug</h2>
            <pre id="debugOutput" class="debug-output">Starting...</pre>
          </section>
        </section>

        <aside class="panel" aria-label="Workspace controls">
          <section class="panel-card" aria-labelledby="filtersCardTitle">
            <h2 id="filtersCardTitle" class="panel-card__title">Population filters</h2>

            <div class="form-grid">
              <div class="form-field">
                <span class="form-label">Day of week</span>
                <div
                  id="dayToggleGroup"
                  class="toggle-group"
                  aria-label="Day of week filters"
                ></div>
              </div>
            </div>
          </section>

          <section class="panel-card" aria-labelledby="originsCardTitle">
            <h2 id="originsCardTitle" class="panel-card__title">Origins</h2>

            <div class="form-grid">
              <div class="form-field">
                <span class="form-label">Origin type</span>
                <div
                  id="originTypeToggleGroup"
                  class="toggle-group"
                  aria-label="Origin type filters"
                ></div>
              </div>
            </div>
          </section>

          <section class="panel-card" aria-labelledby="appointmentCardTitle">
            <h2 id="appointmentCardTitle" class="panel-card__title">Appointment</h2>

            <div class="form-grid">
              <div class="form-field">
                <span class="form-label">Appointment type</span>
                <div
                  id="appointmentTypeToggleGroup"
                  class="toggle-group"
                  aria-label="Appointment type filters"
                ></div>
              </div>
            </div>
          </section>

          <section class="panel-card" aria-labelledby="selectionCardTitle">
            <h2 id="selectionCardTitle" class="panel-card__title">Selection</h2>

            <dl class="stats-list">
              <div class="stats-row">
                <dt>Selected boundary</dt>
                <dd id="selectedBoundaryName">None</dd>
              </div>
            </dl>

            <div class="button-row">
              <button id="clearBoundaryButton" class="button" type="button">
                Clear boundary
              </button>
            </div>
          </section>
        </aside>
      </main>
    </div>
  `;
}
workspace.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, viewport-fit=cover"
  />
  <title>RWK Workspace</title>
  <meta
    name="description"
    content="RWK operational workspace for compact spatial viewing and refinement."
  />

  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""
  />
  <link rel="stylesheet" href="./style.css" />
</head>
<body class="workspace-page">
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar__title-wrap">
        <p class="topbar__eyebrow">RWK</p>
        <h1 class="topbar__title">RWK Workspace</h1>
        <p class="topbar__subtitle">Operational spatial viewer</p>
      </div>

      <div class="topbar__status" id="headerResultPill" aria-live="polite">
        <span id="headerResultCount" class="topbar__status-count">0 coordinates</span>
        <span id="headerResultMeta" class="topbar__status-meta">Waiting for filters</span>
      </div>

      <div class="topbar__actions">
        <button
          id="backToLauncherButton"
          class="button"
          type="button"
          aria-label="Back to launcher"
        >
          Back to launcher
        </button>
      </div>
    </header>

    <main class="layout">
      <section class="map-column" aria-label="Map and diagnostics">
        <section class="map-section" aria-label="Map section">
          <div id="map" aria-label="Map"></div>
        </section>

        <section class="debug-strip" aria-labelledby="debugCardTitle">
          <h2 id="debugCardTitle" class="debug-strip__title">Debug</h2>
          <pre id="debugOutput" class="debug-output">Starting...</pre>
        </section>
      </section>

      <aside class="panel" aria-label="Workspace controls">
        <section class="panel-card" aria-labelledby="filtersCardTitle">
          <h2 id="filtersCardTitle" class="panel-card__title">Population filters</h2>

          <div class="form-grid">
            <div class="form-field">
              <span class="form-label">Day of week</span>
              <div
                id="dayToggleGroup"
                class="toggle-group"
                aria-label="Day of week filters"
              ></div>
            </div>
          </div>
        </section>

        <section class="panel-card" aria-labelledby="originsCardTitle">
          <h2 id="originsCardTitle" class="panel-card__title">Origins</h2>

          <div class="form-grid">
            <div class="form-field">
              <span class="form-label">Origin type</span>
              <div
                id="originTypeToggleGroup"
                class="toggle-group"
                aria-label="Origin type filters"
              ></div>
            </div>
          </div>
        </section>

        <section class="panel-card" aria-labelledby="appointmentCardTitle">
          <h2 id="appointmentCardTitle" class="panel-card__title">Appointment</h2>

          <div class="form-grid">
            <div class="form-field">
              <span class="form-label">Appointment type</span>
              <div
                id="appointmentTypeToggleGroup"
                class="toggle-group"
                aria-label="Appointment type filters"
              ></div>
            </div>
          </div>
        </section>

        <section class="panel-card" aria-labelledby="selectionCardTitle">
          <h2 id="selectionCardTitle" class="panel-card__title">Selection</h2>

          <dl class="stats-list">
            <div class="stats-row">
              <dt>Selected boundary</dt>
              <dd id="selectedBoundaryName">None</dd>
            </div>
          </dl>

          <div class="button-row">
            <button id="clearBoundaryButton" class="button" type="button">
              Clear boundary
            </button>
          </div>
        </section>
      </aside>
    </main>
  </div>

  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
    crossorigin=""
  ></script>
  <script type="module" src="./workspace.js"></script>
</body>
</html>
Give feedback
workspace/popup.js
// workspace/popup.js

import { escapeHtml } from "./utils.js";

export function buildJobPopupHtml(row, context = {}) {
  const empty = "—";

  return `
    <div>
      <div class="popup-section">
        <h3 class="popup-title">${escapeHtml(row._title || "Record")}</h3>
        <p class="popup-meta"><span class="popup-label">Date:</span> ${escapeHtml(row._dateDisplay || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Day:</span> ${escapeHtml(row._dayLabel || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Appointment:</span> ${escapeHtml(row._appointmentLabel || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Address:</span> ${escapeHtml(row._addressText || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Boundary:</span> ${escapeHtml(row._boundaryName || empty)}</p>
      </div>

      <div class="popup-section">
        <div class="popup-section-title">Technical details</div>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Calendar ID:</span> ${escapeHtml(row._calendarId || row.calendar_id || empty)}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Appointment key:</span> ${escapeHtml(row._appointmentKey || empty)}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Row ID:</span> ${escapeHtml(row.row_id || row.source_row_id || empty)}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Event ID:</span> ${escapeHtml(row.event_id || empty)}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Boundary filter:</span> ${escapeHtml(context.selectedBoundaryKey || "none")}</p>
      </div>
    </div>
  `;
}

export function buildOriginPopupHtml(origin, context = {}) {
  const empty = "—";

  return `
    <div>
      <div class="popup-section">
        <h3 class="popup-title">${escapeHtml(origin.name || "Origin")}</h3>
        <p class="popup-meta"><span class="popup-label">Type:</span> ${escapeHtml(origin._typeLabel || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Address:</span> ${escapeHtml(origin.address || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Boundary:</span> ${escapeHtml(origin._boundaryName || empty)}</p>
      </div>

      <div class="popup-section">
        <div class="popup-section-title">Technical details</div>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Origin ID:</span> ${escapeHtml(origin.id || empty)}</p>
      </div>
    </div>
  `;
}
workspace/controller.js
// workspace/controller.js

import { getConfig } from "../state/session.js";
import { loadRuntimeData } from "../data/loadRuntimeData.js";

import { createWorkspaceState } from "./state.js";
import {
  initWorkspaceMap,
  ensureWorkspaceLayers,
  clearWorkspaceLayers,
  fitWorkspaceToData
} from "./mapCore.js";
import { computeWorkspaceView } from "./filters.js";
import {
  createBoundaryIndex,
  getBoundaryKey,
  getBoundaryName,
  getBoundaryStyle
} from "./boundaries.js";
import { renderJobMarkers, renderOriginMarkers } from "./markers.js";
import {
  cacheWorkspacePanelUi,
  bindWorkspacePanelEvents,
  renderWorkspaceResults,
  renderHeaderResults,
  renderWorkspaceFilters,
  renderWorkspaceSelection,
  renderWorkspaceRuntimeStatus,
  setWorkspaceMessage
} from "./panels.js";
import { createWorkspaceDebug } from "./debug.js";
import { configToWorkspaceState } from "./configBridge.js";
import { projectRuntimeForWorkspace } from "./runtimeBridge.js";

export function createWorkspaceController(deps = {}) {
  const state = createWorkspaceState();

  let ui = null;
  let debug = null;
  let isInitialized = false;
  let lastProjectBounds = null;

  async function init({
    root = document,
    mapElementId = "map",
    runtimeData = null
  } = {}) {
    if (isInitialized) {
      destroyMap();
      isInitialized = false;
    }

    ui = cacheWorkspacePanelUi(root);
    debug = createWorkspaceDebug(ui.debugOutput);

    bindTopLevelUi();

    debug.clear();
    debug.log("Workspace bootstrap started");
    setWorkspaceMessage(ui, "Preparing workspace runtime...");

    try {
      state.config = getConfig();

      debug.log(
        `Session config ${
          state.config
            ? `loaded:${state.config?.meta?.presetId || "custom"}`
            : "not found"
        }`
      );

      state.map = initWorkspaceMap({ elementId: mapElementId });
      state.layers = ensureWorkspaceLayers(state.map);

      const rawRuntime =
        runtimeData ||
        (await loadRuntimeData(handleProgressUpdate));

      debug.log(
        runtimeData
          ? "Shared runtime received"
          : "Runtime loaded directly"
      );

      state.runtime = projectRuntimeForWorkspace(rawRuntime);
      state.boundaryIndex = createBoundaryIndex(state.runtime.boundariesGeojson);

      applyBridgedConfig();
      normalizeCurrentStateForPanelModel();
      bindWorkspaceUi();

      renderWorkspaceRuntimeStatus(ui, state.runtime.summary);
      renderWorkspaceFilters(ui, state);
      refreshView({ fitMode: "initial" });

      isInitialized = true;
      debug.log("Workspace initialized");

      return api;
    } catch (error) {
      console.error("[RWK] workspace init failed:", error);
      debug?.log(`Init failed:${error.message}`);
      setWorkspaceMessage(ui, `Workspace failed to initialize: ${error.message}`);
      throw error;
    }
  }

  function bindTopLevelUi() {
    ui.backToLauncherButton?.addEventListener("click", () => {
      if (typeof deps.onBack === "function") {
        deps.onBack();
        return;
      }

      window.location.href = "./index.html";
    });
  }

  function bindWorkspaceUi() {
    bindWorkspacePanelEvents(ui, {
      onToggleDay(dayKey) {
        toggleArrayValueSafe(state.refinements.days, dayKey);
        refreshView({ fitMode: getBoundaryAwareFitMode() });
      },

      onToggleAppointmentType(appointmentType) {
        toggleArrayValueSafe(state.refinements.appointmentTypes, appointmentType);
        refreshView({ fitMode: getBoundaryAwareFitMode() });
      },

      onToggleOriginType(originType) {
        toggleArrayValueSafe(state.refinements.originTypes, originType);
        refreshView({ fitMode: "preserve" });
      },

      onClearBoundary() {
        state.selection.boundaryKeys = [];
        refreshView({ fitMode: "project-subset" });
      }
    });
  }

  function handleProgressUpdate(progress) {
    const map = {
      starting: "Preparing runtime data",
      boundaries: "Boundaries loaded",
      origins: "Origins loaded",
      manifest: "Manifest loaded",
      events: "Events snapshot loaded",
      export: "Spatial export loaded",
      complete: "Workspace runtime ready"
    };

    const message = map[progress?.step] || progress?.label || "Working";
    setWorkspaceMessage(ui, message);
    debug?.log(message);
  }

  function applyBridgedConfig() {
    const bridged = configToWorkspaceState(state.config);

    state.selection = {
      ...state.selection,
      ...(bridged.selection || {}),
      boundaryKeys: Array.isArray(bridged.selection?.boundaryKeys)
        ? [...bridged.selection.boundaryKeys]
        : []
    };

    state.refinements = {
      ...state.refinements,
      ...(bridged.refinements || {})
    };
  }

  function normalizeCurrentStateForPanelModel() {
    state.refinements.visitBuckets = [];
    state.selection.originId = "";

    if (!Array.isArray(state.refinements.appointmentTypes)) {
      state.refinements.appointmentTypes = [];
    }
  }

  function applyConfig(config = null) {
    state.config = config || null;
    applyBridgedConfig();
    normalizeCurrentStateForPanelModel();

    debug?.log(
      `Config applied:${
        state.config?.meta?.presetId ||
        state.config?.meta?.label ||
        "custom"
      }`
    );

    refreshView({ fitMode: getBoundaryAwareFitMode() });
  }

  function refreshView({ fitMode = "active-subset" } = {}) {
    if (!state.runtime) {
      debug?.log("Refresh skipped:no runtime");
      return;
    }

    normalizeCurrentStateForPanelModel();

    const view = computeWorkspaceView({
      runtime: state.runtime,
      config: state.config,
      refinements: state.refinements,
      selection: state.selection
    });

    state.populationRows = view.populationRows;
    state.visibleRows = view.visibleRows;
    state.visibleOrigins = view.visibleOrigins;
    state.results = {
      ...state.results,
      ...view.counts
    };

    lastProjectBounds = buildProjectSubsetBounds();

    clearWorkspaceLayers(state.layers);
    renderBoundaryLayer();

    renderJobMarkers({
      rows: state.visibleRows,
      layerGroup: state.layers.jobs,
      selectedBoundaryKeys: state.selection.boundaryKeys
    });

    renderOriginMarkers({
      origins: state.visibleOrigins,
      layerGroup: state.layers.origins,
      selectedOriginId: ""
    });

    renderWorkspaceResults(ui, state.results);
    renderWorkspaceFilters(ui, state);

    const selectedBoundaryNames = getSelectedBoundaryNames();
    const selectedBoundaryName = formatBoundarySelectionLabel(selectedBoundaryNames);

    renderWorkspaceSelection(ui, {
      selectedBoundaryName
    });

    renderHeaderResults(ui, {
      visibleRows: state.visibleRows.length,
      visibleOrigins: state.visibleOrigins.length,
      filteredRows: state.results.filteredCount,
      selectedBoundaryNames,
      selectedDays: state.refinements.days.length,
      selectedAppointmentTypes: state.refinements.appointmentTypes.length,
      selectedOriginTypes: state.refinements.originTypes.length
    });

    applyMapFit(fitMode);

    debug?.log(
      [
        `candidate=${state.results.candidateCount}`,
        `filtered=${state.results.filteredCount}`,
        `boundary=${state.results.boundaryCount}`,
        `visible=${state.results.visibleCount}`,
        `origins=${state.results.visibleOriginCount}`,
        `boundaries=${state.selection.boundaryKeys.length ? state.selection.boundaryKeys.join(",") : "none"}`,
        `days=${state.refinements.days.length}`,
        `appointments=${state.refinements.appointmentTypes.length}`,
        `originTypes=${state.refinements.originTypes.length}`,
        `markerSelection=${state.selection.boundaryKeys.length > 0 ? "on" : "off"}`
      ].join(", ")
    );
  }

  function renderBoundaryLayer() {
    if (!state.runtime.boundariesGeojson || !state.layers.boundaries) {
      return;
    }

    const activeCountsByBoundary = new Map();
    const selectedBoundaryKeys = new Set(state.selection.boundaryKeys || []);

    state.visibleRows.forEach((row) => {
      if (!row._boundaryKey) return;

      activeCountsByBoundary.set(
        row._boundaryKey,
        (activeCountsByBoundary.get(row._boundaryKey) || 0) + 1
      );
    });

    const boundaryLayer = L.geoJSON(state.runtime.boundariesGeojson, {
      style: (feature) => {
        const key = getBoundaryKey(feature);
        const activeCount = activeCountsByBoundary.get(key) || 0;
        const isSelected = selectedBoundaryKeys.has(key);

        return getBoundaryStyle({
          isSelected,
          activeCount
        });
      },

      onEachFeature: (feature, layer) => {
        const key = getBoundaryKey(feature);
        const name = getBoundaryName(feature) || key || "Boundary";

        layer.bindTooltip(name, { sticky: true });

        layer.on("click", () => {
          toggleBoundarySelection(key);

          refreshView({
            fitMode:
              state.selection.boundaryKeys.length > 0
                ? "selected-boundaries"
                : "project-subset"
          });
        });
      }
    });

    boundaryLayer.addTo(state.layers.boundaries);
  }

  function toggleBoundarySelection(boundaryKey) {
    if (!boundaryKey) return;

    const index = state.selection.boundaryKeys.indexOf(boundaryKey);

    if (index >= 0) {
      state.selection.boundaryKeys.splice(index, 1);
    } else {
      state.selection.boundaryKeys.push(boundaryKey);
    }
  }

  function applyMapFit(fitMode) {
    if (!state.map) return;

    if (fitMode === "preserve") return;

    if (fitMode === "selected-boundaries" || fitMode === "selected-boundary") {
      fitToSelectedBoundaries();
      return;
    }

    if (fitMode === "project-subset" || fitMode === "initial") {
      fitToProjectSubset();
      return;
    }

    if (fitMode === "active-subset") {
      if (state.selection.boundaryKeys.length > 0) {
        fitToSelectedBoundaries();
        return;
      }

      if (state.visibleRows.length > 0) {
        fitWorkspaceToData(state.map, state.visibleRows, {
          padding: [48, 48]
        });
        return;
      }

      fitToProjectSubset();
    }
  }

  function fitToSelectedBoundaries() {
    const features = getSelectedBoundaryFeatures();

    if (features.length === 0) {
      fitToProjectSubset();
      return;
    }

    const bounds = L.latLngBounds([]);

    features.forEach((feature) => {
      const featureBounds = L.geoJSON(feature).getBounds();
      if (featureBounds?.isValid?.()) {
        bounds.extend(featureBounds);
      }
    });

    if (bounds?.isValid?.()) {
      state.map.fitBounds(bounds, {
        paddingTopLeft: [42, 42],
        paddingBottomRight: [430, 74],
        maxZoom: 12
      });
    }
  }

  function fitToProjectSubset() {
    if (lastProjectBounds?.isValid?.()) {
      state.map.fitBounds(lastProjectBounds, {
        padding: [44, 44],
        maxZoom: 12
      });
      return;
    }

    const boundaryBounds = state.layers.boundaries?.getBounds?.();
    if (boundaryBounds?.isValid?.()) {
      fitWorkspaceToData(state.map, boundaryBounds, {
        padding: [36, 36]
      });
    }
  }

  function buildProjectSubsetBounds() {
    const bounds = L.latLngBounds([]);

    state.populationRows.forEach((row) => {
      if (Number.isFinite(row._latitude) && Number.isFinite(row._longitude)) {
        bounds.extend([row._latitude, row._longitude]);
      }
    });

    return bounds.isValid() ? bounds : null;
  }

  function getSelectedBoundaryFeatures() {
    return state.selection.boundaryKeys
      .map((boundaryKey) => state.boundaryIndex.featuresByKey.get(boundaryKey))
      .filter(Boolean);
  }

  function getSelectedBoundaryNames() {
    return getSelectedBoundaryFeatures().map((feature) => {
      const key = getBoundaryKey(feature);
      return getBoundaryName(feature) || key || "Boundary";
    });
  }

  function formatBoundarySelectionLabel(names) {
    if (!Array.isArray(names) || names.length === 0) {
      return "None";
    }

    if (names.length === 1) {
      return names[0];
    }

    return `${names.length} boundaries selected`;
  }

  function getBoundaryAwareFitMode() {
    return state.selection.boundaryKeys.length > 0
      ? "selected-boundaries"
      : "active-subset";
  }

  function destroyMap() {
    try {
      state.map?.remove?.();
    } catch (error) {
      console.warn("[RWK] failed to destroy map cleanly:", error);
    }

    state.map = null;
    state.layers = {
      boundaries: null,
      jobs: null,
      origins: null
    };
  }

  function exitWorkspace() {
    debug?.log("Exited workspace");
    destroyMap();
    isInitialized = false;
  }

  const api = {
    init,
    applyConfig,
    refreshView,
    exitWorkspace,
    getState: () => state
  };

  return api;
}

function toggleArrayValueSafe(array, value) {
  if (!Array.isArray(array) || !value) return;

  const index = array.indexOf(value);

  if (index >= 0) {
    array.splice(index, 1);
  } else {
    array.push(value);
  }
}
Add/replace these style.css sections

Replace the existing Workspace layout/debug portions with this block. Keep the launcher and shared styles above it.

/* Workspace */

.topbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: var(--topbar-height);
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border);
}

.topbar__title-wrap {
  min-width: 0;
}

.topbar__eyebrow {
  margin: 0 0 6px;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.topbar__title {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.1;
}

.topbar__subtitle {
  margin: 4px 0 0;
  font-size: 0.92rem;
  line-height: 1.35;
  color: var(--color-muted);
}

.topbar__status {
  flex: 0 1 360px;
  display: grid;
  gap: 2px;
  min-width: 180px;
  max-width: 420px;
  padding: 9px 13px;
  border: 1px solid rgba(217, 119, 6, 0.24);
  border-radius: 999px;
  background: linear-gradient(180deg, #fffbeb 0%, #ffffff 100%);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.topbar__status.is-empty {
  border-color: var(--color-border);
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.topbar__status-count {
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.15;
  color: #92400e;
  white-space: nowrap;
}

.topbar__status.is-empty .topbar__status-count {
  color: var(--color-muted);
}

.topbar__status-meta {
  overflow: hidden;
  color: var(--color-muted);
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout {
  display: grid;
  grid-template-columns: 1fr;
  min-height: calc(100vh - var(--topbar-height));
}

.map-column {
  display: grid;
  grid-template-rows: minmax(52vh, 1fr) auto;
  min-width: 0;
  min-height: 0;
}

.map-section {
  position: relative;
  min-height: 52vh;
  background: #dbe7f3;
}

#map {
  width: 100%;
  height: 52vh;
  min-height: 52vh;
  background: #dbe7f3;
}

.panel {
  display: grid;
  gap: 12px;
  padding: 12px;
}

.panel-card {
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.panel-card__title {
  margin: 0 0 12px;
  font-size: 1rem;
  line-height: 1.2;
}

.panel-text {
  margin: 0 0 10px;
  font-size: 0.93rem;
  line-height: 1.45;
  color: var(--color-muted);
}

.panel-text:last-child {
  margin-bottom: 0;
}

.panel-text--compact {
  margin-top: 12px;
  margin-bottom: 0;
  font-size: 0.88rem;
}

.form-grid {
  display: grid;
  gap: 12px;
}

.form-field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.form-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-muted);
}

.toggle-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.toggle-chip {
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: #fff;
  color: var(--color-text);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    opacity var(--transition-fast);
}

.toggle-chip:hover {
  border-color: var(--color-border-strong);
}

.toggle-chip:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12);
}

.toggle-chip.is-active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.08);
}

.toggle-chip--day {
  border-color: color-mix(in srgb, var(--day-color) 35%, #cbd5e1);
}

.toggle-chip--day.is-active {
  border-color: var(--day-color);
  background: color-mix(in srgb, var(--day-color) 14%, white);
  color: var(--day-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--day-color) 14%, white);
}

.toggle-chip--origin {
  border-color: color-mix(in srgb, var(--origin-color, #94a3b8) 35%, #cbd5e1);
}

.toggle-chip--origin:hover {
  border-color: var(--origin-color, #64748b);
}

.toggle-chip--origin.is-active {
  border-color: var(--origin-color, #475569);
  background: color-mix(in srgb, var(--origin-color, #94a3b8) 14%, white);
  color: var(--origin-color, #475569);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--origin-color, #94a3b8) 14%, white);
}

.toggle-chip--appointment {
  border-color: color-mix(in srgb, var(--appointment-color, #64748b) 35%, #cbd5e1);
}

.toggle-chip--appointment:hover {
  border-color: var(--appointment-color, #475569);
}

.toggle-chip--appointment.is-active {
  border-color: var(--appointment-color, #475569);
  background: color-mix(in srgb, var(--appointment-color, #64748b) 13%, white);
  color: var(--appointment-color, #475569);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--appointment-color, #64748b) 13%, white);
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.debug-strip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 6px 10px;
  border-top: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.96);
}

.debug-strip__title {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.74rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.debug-output {
  margin: 0;
  width: 100%;
  min-height: 24px;
  max-height: 34px;
  overflow: auto hidden;
  padding: 5px 0;
  background: transparent;
  color: #111827;
  font-size: 0.74rem;
  line-height: 1.35;
  white-space: nowrap;
  word-break: normal;
}

Then replace the existing workspace media-query sections with this:

@media (max-width: 820px) {
  .launcher-builder__grid,
  .launcher-status-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .launcher-shell {
    width: min(100% - 20px, 100%);
    padding-top: 18px;
    padding-bottom: 24px;
  }

  .launcher-hero,
  .launcher-status-card,
  .launcher-group,
  .launcher-builder,
  .panel-card {
    padding: 16px;
  }

  .topbar {
    flex-wrap: wrap;
    align-items: flex-start;
    padding: 12px 14px;
  }

  .topbar__title-wrap {
    flex: 1 1 100%;
  }

  .topbar__status {
    order: 3;
    flex: 1 1 100%;
    max-width: none;
    border-radius: var(--radius-md);
  }

  .topbar__actions {
    margin-left: auto;
  }

  .button-row .button {
    flex: 1 1 auto;
  }

  .toggle-chip,
  .launcher-chip {
    min-height: 40px;
  }

  .debug-strip {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 3px;
  }

  .debug-output {
    max-height: 48px;
    white-space: normal;
  }
}

@media (min-width: 900px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) var(--panel-width);
  }

  .map-column {
    height: calc(100vh - var(--topbar-height));
    min-height: calc(100vh - var(--topbar-height));
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .map-section {
    min-height: 0;
  }

  #map {
    min-height: 0;
    height: 100%;
  }

  .panel {
    max-height: calc(100vh - var(--topbar-height));
    overflow: auto;
    align-content: start;
    border-left: 1px solid var(--color-border);
    background: rgba(248, 250, 252, 0.88);
  }
}

After replacing, hard refresh Live Server and test this sequence: open workspace, select one appointment type, select one or more weekdays, then select a boundary. Debug should stay compressed under the map, and point popups should now show the appointment label/calendar ID.

---

can you update style.css comprehensively? Here's the suggested updates attached

---

Yes — replace style.css in full with this version. It incorporates the attached workspace/debug layout updates and keeps the launcher/shared styling intact.

:root {
  --color-bg: #eef3f9;
  --color-surface: #ffffff;
  --color-surface-muted: #f7f9fc;
  --color-border: #d9e3ef;
  --color-border-strong: #b8c7da;
  --color-text: #18222f;
  --color-muted: #617182;
  --color-primary: #1d4ed8;
  --color-primary-strong: #1e40af;
  --color-primary-soft: #dbeafe;
  --color-success: #0f766e;
  --color-warning: #b45309;
  --color-danger: #b91c1c;

  --shadow-soft: 0 12px 36px rgba(15, 23, 42, 0.08);
  --shadow-card: 0 8px 22px rgba(15, 23, 42, 0.06);

  --radius-xl: 24px;
  --radius-lg: 18px;
  --radius-md: 14px;
  --radius-sm: 10px;

  --topbar-height: 78px;
  --panel-width: 390px;

  --transition-fast: 140ms ease;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  background: linear-gradient(180deg, #eef3f9 0%, #f5f7fb 100%);
  color: var(--color-text);
  font-family: Arial, Helvetica, sans-serif;
}

body {
  min-height: 100vh;
  text-rendering: optimizeLegibility;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

input,
select,
textarea {
  width: 100%;
}

a {
  color: inherit;
}

#rwk-app-root,
.app-stage,
.app-shell {
  min-height: 100vh;
}

/* Shared */

.button {
  min-height: 42px;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: #fff;
  color: var(--color-text);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    color var(--transition-fast),
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.button:hover {
  border-color: var(--color-border-strong);
  transform: translateY(-1px);
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
  transform: none;
}

.button--primary {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}

.button--primary:hover {
  border-color: var(--color-primary-strong);
  background: var(--color-primary-strong);
}

.stats-list {
  display: grid;
  gap: 8px;
  margin: 0;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eef2f7;
}

.stats-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.stats-row dt {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.35;
  color: var(--color-muted);
}

.stats-row dd {
  margin: 0;
  text-align: right;
  font-size: 0.92rem;
  line-height: 1.35;
  font-weight: 700;
  word-break: break-word;
}

/* Boot overlay */

.boot-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(6px);
}

.boot-overlay[hidden] {
  display: none;
}

.boot-overlay__card {
  width: min(440px, 100%);
  display: grid;
  gap: 14px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: 22px;
  background: var(--color-surface);
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.18);
}

.boot-overlay__title {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.2;
}

.boot-overlay__message {
  margin: 0;
  font-size: 0.94rem;
  line-height: 1.5;
  color: var(--color-muted);
}

.boot-overlay__spinner {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 3px solid #dbeafe;
  border-top-color: var(--color-primary);
  animation: rwk-spin 0.9s linear infinite;
}

.boot-overlay.is-error .boot-overlay__spinner {
  border-color: #fecaca;
  border-top-color: var(--color-danger);
}

@keyframes rwk-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Launcher */

.launcher-shell {
  width: min(1180px, calc(100% - 28px));
  margin: 0 auto;
  padding: 28px 0 40px;
  display: grid;
  gap: 24px;
}

.launcher-hero {
  padding: 28px;
  border: 1px solid rgba(29, 78, 216, 0.12);
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: var(--shadow-soft);
}

.launcher-hero__kicker {
  margin: 0 0 8px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.launcher-hero__title {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  line-height: 1.05;
}

.launcher-hero__subtitle {
  max-width: 780px;
  margin: 12px 0 0;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--color-muted);
}

.launcher-status-card,
.launcher-group,
.launcher-builder {
  padding: 22px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.launcher-status-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.launcher-status-card__eyebrow,
.launcher-section-heading__eyebrow {
  margin: 0 0 8px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.launcher-status-card__title,
.launcher-section-heading__title {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.2;
}

.launcher-status-card__subtitle,
.launcher-section-heading__description {
  margin: 8px 0 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-muted);
}

.launcher-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 18px;
  margin: 0;
}

.launcher-status-grid .stats-row {
  margin: 0;
  padding: 10px 0;
}

.launcher-feedback {
  margin: 16px 0 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--color-muted);
}

.launcher-groups {
  display: grid;
  gap: 22px;
}

.launcher-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.launcher-card {
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  min-height: 176px;
  padding: 18px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: linear-gradient(180deg, #ffffff 0%, #f9fbfd 100%);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);
}

.launcher-card--button {
  cursor: pointer;
}

.launcher-card--button:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgba(29, 78, 216, 0.25);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
}

.launcher-card--button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.launcher-card__body {
  display: grid;
  gap: 10px;
}

.launcher-card__title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
}

.launcher-card__description {
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--color-muted);
}

.launcher-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.launcher-card__meta {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  font-size: 0.82rem;
  font-weight: 700;
}

.launcher-builder__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.launcher-field {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.launcher-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-muted);
}

.launcher-input {
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--color-text);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);
}

.launcher-input::placeholder {
  color: #8a97a6;
}

.launcher-input:hover {
  border-color: var(--color-border-strong);
}

.launcher-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12);
}

.launcher-chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.launcher-chip {
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: #fff;
  color: var(--color-text);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.launcher-chip:hover {
  border-color: var(--color-border-strong);
}

.launcher-chip.is-active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.08);
}

.launcher-builder__actions {
  margin-top: 18px;
}

/* Workspace */

.topbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: var(--topbar-height);
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border);
}

.topbar__title-wrap {
  min-width: 0;
}

.topbar__eyebrow {
  margin: 0 0 6px;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.topbar__title {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.1;
}

.topbar__subtitle {
  margin: 4px 0 0;
  font-size: 0.92rem;
  line-height: 1.35;
  color: var(--color-muted);
}

.topbar__status {
  flex: 0 1 360px;
  display: grid;
  gap: 2px;
  min-width: 180px;
  max-width: 420px;
  padding: 9px 13px;
  border: 1px solid rgba(217, 119, 6, 0.24);
  border-radius: 999px;
  background: linear-gradient(180deg, #fffbeb 0%, #ffffff 100%);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.topbar__status.is-empty {
  border-color: var(--color-border);
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.topbar__status-count {
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.15;
  color: #92400e;
  white-space: nowrap;
}

.topbar__status.is-empty .topbar__status-count {
  color: var(--color-muted);
}

.topbar__status-meta {
  overflow: hidden;
  color: var(--color-muted);
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout {
  display: grid;
  grid-template-columns: 1fr;
  min-height: calc(100vh - var(--topbar-height));
}

.map-column {
  display: grid;
  grid-template-rows: minmax(52vh, 1fr) auto;
  min-width: 0;
  min-height: 0;
}

.map-section {
  position: relative;
  min-height: 52vh;
  background: #dbe7f3;
}

#map {
  width: 100%;
  height: 52vh;
  min-height: 52vh;
  background: #dbe7f3;
}

.panel {
  display: grid;
  gap: 12px;
  padding: 12px;
}

.panel-card {
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.panel-card__title {
  margin: 0 0 12px;
  font-size: 1rem;
  line-height: 1.2;
}

.panel-text {
  margin: 0 0 10px;
  font-size: 0.93rem;
  line-height: 1.45;
  color: var(--color-muted);
}

.panel-text:last-child {
  margin-bottom: 0;
}

.panel-text--compact {
  margin-top: 12px;
  margin-bottom: 0;
  font-size: 0.88rem;
}

.form-grid {
  display: grid;
  gap: 12px;
}

.form-field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.form-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-muted);
}

.toggle-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.toggle-chip {
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: #fff;
  color: var(--color-text);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    opacity var(--transition-fast);
}

.toggle-chip:hover {
  border-color: var(--color-border-strong);
}

.toggle-chip:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12);
}

.toggle-chip.is-active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.08);
}

.toggle-chip--day {
  border-color: color-mix(in srgb, var(--day-color) 35%, #cbd5e1);
}

.toggle-chip--day.is-active {
  border-color: var(--day-color);
  background: color-mix(in srgb, var(--day-color) 14%, white);
  color: var(--day-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--day-color) 14%, white);
}

.toggle-chip--origin {
  border-color: color-mix(in srgb, var(--origin-color, #94a3b8) 35%, #cbd5e1);
}

.toggle-chip--origin:hover {
  border-color: var(--origin-color, #64748b);
}

.toggle-chip--origin.is-active {
  border-color: var(--origin-color, #475569);
  background: color-mix(in srgb, var(--origin-color, #94a3b8) 14%, white);
  color: var(--origin-color, #475569);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--origin-color, #94a3b8) 14%, white);
}

.toggle-chip--appointment {
  border-color: color-mix(in srgb, var(--appointment-color, #64748b) 35%, #cbd5e1);
}

.toggle-chip--appointment:hover {
  border-color: var(--appointment-color, #475569);
}

.toggle-chip--appointment.is-active {
  border-color: var(--appointment-color, #475569);
  background: color-mix(in srgb, var(--appointment-color, #64748b) 13%, white);
  color: var(--appointment-color, #475569);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--appointment-color, #64748b) 13%, white);
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.debug-strip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 6px 10px;
  border-top: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.96);
}

.debug-strip__title {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.74rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.debug-output {
  margin: 0;
  width: 100%;
  min-height: 24px;
  max-height: 34px;
  overflow: auto hidden;
  padding: 5px 0;
  background: transparent;
  color: #111827;
  font-size: 0.74rem;
  line-height: 1.35;
  white-space: nowrap;
  word-break: normal;
}

/* Leaflet / popups */

.leaflet-popup-content {
  min-width: 240px;
  margin: 10px 12px;
  line-height: 1.45;
}

.popup-title {
  margin: 0 0 8px;
  font-size: 1rem;
  line-height: 1.25;
}

.popup-section {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eef2f7;
}

.popup-section:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.popup-section-title {
  margin: 0 0 6px;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-muted);
}

.popup-meta {
  margin: 4px 0;
  font-size: 0.9rem;
}

.popup-label {
  font-weight: 600;
  color: var(--color-muted);
}

.popup-meta--muted {
  font-size: 0.84rem;
  color: var(--color-muted);
}

.popup-notes {
  margin: 6px 0 0;
  font-size: 0.9rem;
  line-height: 1.45;
}

.origin-label {
  border: 0;
  border-radius: 999px;
  padding: 4px 9px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.16);
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: 0.01em;
}

.origin-label::before {
  display: none;
}

.origin-label--warehouse {
  color: #0f766e;
}

.origin-label--showroom {
  color: #7c3aed;
}

/* Responsive */

@media (max-width: 820px) {
  .launcher-builder__grid,
  .launcher-status-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .launcher-shell {
    width: min(100% - 20px, 100%);
    padding-top: 18px;
    padding-bottom: 24px;
  }

  .launcher-hero,
  .launcher-status-card,
  .launcher-group,
  .launcher-builder,
  .panel-card {
    padding: 16px;
  }

  .topbar {
    flex-wrap: wrap;
    align-items: flex-start;
    padding: 12px 14px;
  }

  .topbar__title-wrap {
    flex: 1 1 100%;
  }

  .topbar__status {
    order: 3;
    flex: 1 1 100%;
    max-width: none;
    border-radius: var(--radius-md);
  }

  .topbar__actions {
    margin-left: auto;
  }

  .button-row .button {
    flex: 1 1 auto;
  }

  .toggle-chip,
  .launcher-chip {
    min-height: 40px;
  }

  .debug-strip {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 3px;
  }

  .debug-output {
    max-height: 48px;
    white-space: normal;
  }
}

@media (min-width: 900px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) var(--panel-width);
  }

  .map-column {
    height: calc(100vh - var(--topbar-height));
    min-height: calc(100vh - var(--topbar-height));
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .map-section {
    min-height: 0;
  }

  #map {
    min-height: 0;
    height: 100%;
  }

  .panel {
    max-height: calc(100vh - var(--topbar-height));
    overflow: auto;
    align-content: start;
    border-left: 1px solid var(--color-border);
    background: rgba(248, 250, 252, 0.88);
  }
}

Hard refresh after replacing. The debug panel should now sit as a compact strip below the map instead of occupying sidebar space.