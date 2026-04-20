// map/applyConfig.js

function cloneArray(value) {
  return Array.isArray(value) ? [...value] : [];
}

export function applyConfigToLegacyApp(config, legacyState) {
  if (!config) {
    throw new Error("applyConfigToLegacyApp requires a config object.");
  }

  if (!legacyState || typeof legacyState !== "object") {
    throw new Error("Legacy workspace state object is required.");
  }

  if (!legacyState.filters || typeof legacyState.filters !== "object") {
    throw new Error("Legacy workspace state must include filters.");
  }

  const nextFilters = {
    keyword: config.filters?.keyword ?? "",
    organizers: cloneArray(config.filters?.organizers),
    days: cloneArray(config.filters?.days),
    year: config.filters?.year ?? "all",
    visitBuckets: cloneArray(config.filters?.visitBuckets),
    timeWindow: config.filters?.timeWindow ?? "all",
    originTypes: cloneArray(config.origins?.originTypes)
  };

  legacyState.filters.keyword = nextFilters.keyword;
  legacyState.filters.organizers = nextFilters.organizers;
  legacyState.filters.days = nextFilters.days;
  legacyState.filters.year = nextFilters.year;
  legacyState.filters.visitBuckets = nextFilters.visitBuckets;
  legacyState.filters.timeWindow = nextFilters.timeWindow;
  legacyState.filters.originTypes = nextFilters.originTypes;

  legacyState.selectedOriginId = config.origins?.selectedOriginId || "";

  return {
    appliedConfig: structuredClone(config),

    fitToVisible: Boolean(config.visualization?.fitToVisible),
    includeOrigins: config.origins?.includeOrigins !== false,
    showOrigins: config.visualization?.showOrigins !== false,
    showJobs: config.visualization?.showJobs !== false,
    showBoundaries: config.visualization?.showBoundaries !== false,

    selectedBoundaryKey: config.boundary?.selectedBoundaryKey || "",
    fitToBoundary: Boolean(config.boundary?.fitToBoundary),

    nearestOriginOnly: Boolean(config.origins?.nearestOriginOnly),

    analyticsMode: config.analytics?.mode || "standard",
    groupBy: config.analytics?.groupBy || null,
    sortBy: config.analytics?.sortBy || null,

    isAllActivityPreset: config.meta?.presetId === "ALL_ACTIVITY",
    presetId: config.meta?.presetId || null,
    presetLabel: config.meta?.label || null
  };
}