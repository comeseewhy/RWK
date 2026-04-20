export function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }

  const num = Number(String(value).trim());
  return Number.isFinite(num) ? num : NaN;
}

export function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function formatTimestamp(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value ?? "");
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function toggleArrayValue(array, value) {
  const index = array.indexOf(value);

  if (index >= 0) {
    array.splice(index, 1);
  } else {
    array.push(value);
  }

  return array;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

export function parsePossibleDate(value) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}