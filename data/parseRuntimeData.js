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