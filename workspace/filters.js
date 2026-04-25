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
    safeRefinements.appointmentTypes.length > 0 ||
    hasLauncherTimeFrame(config);

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

  const organizers = normalizeArray(config?.filters?.organizers);
  const appointmentTypes = normalizeArray(config?.filters?.appointmentTypes);
  const timeWindow = config?.filters?.timeWindow || "all";
  const visitBuckets = normalizeArray(config?.filters?.visitBuckets);
  const year = String(config?.filters?.year || "all");
  const month = normalizeMonth(config?.filters?.month || "");
  const dates = normalizeArray(config?.filters?.dates);
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

  if (!matchesYearMonthDate(row, { year, month, dates })) {
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

function matchesYearMonthDate(row, { year, month, dates }) {
  const hasYearFilter = year && year !== "all";
  const hasMonthFilter = Boolean(month);
  const hasDateFilter = Array.isArray(dates) && dates.length > 0;

  if (!hasYearFilter && !hasMonthFilter && !hasDateFilter) {
    return true;
  }

  const parts = getRowDateParts(row);

  if (!parts) {
    return false;
  }

  if (hasYearFilter && parts.year !== year) {
    return false;
  }

  if (hasMonthFilter && parts.month !== month) {
    return false;
  }

  if (hasDateFilter && !dates.includes(parts.isoDate)) {
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

function hasLauncherTimeFrame(config) {
  if (!config?.filters) {
    return false;
  }

  const year = String(config.filters.year || "all");
  const month = String(config.filters.month || "");
  const dates = normalizeArray(config.filters.dates);

  return year !== "all" || Boolean(month) || dates.length > 0;
}

function getRowDateParts(row) {
  const date = getRowDate(row);

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const year = String(date.getFullYear());
  const month = normalizeMonth(date.getMonth() + 1);
  const day = String(date.getDate()).padStart(2, "0");
  const isoDate = `${year}-${month}-${day}`;

  return {
    year,
    month,
    day,
    isoDate
  };
}

function getRowDate(row) {
  if (row?._parsedDate instanceof Date && !Number.isNaN(row._parsedDate.getTime())) {
    return row._parsedDate;
  }

  const raw =
    row?._dateValue ||
    row?.date ||
    row?.start_date ||
    row?.event_date ||
    row?.start_time ||
    row?.created_at ||
    row?.updated_at ||
    "";

  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeMonth(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1 || number > 12) {
    return "";
  }

  return String(number).padStart(2, "0");
}