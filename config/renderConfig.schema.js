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