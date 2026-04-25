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