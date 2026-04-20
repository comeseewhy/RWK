// workspace/configBridge.js

export function configToWorkspaceState(config) {
  const next = {
    selection: {
      boundaryKey: "",
      originId: ""
    },
    refinements: {
      days: [],
      visitBuckets: [],
      originTypes: []
    }
  };

  if (!config || typeof config !== "object") {
    return next;
  }

  if (config.boundary?.selectedBoundaryKey) {
    next.selection.boundaryKey = config.boundary.selectedBoundaryKey;
  }

  if (config.origins?.selectedOriginId) {
    next.selection.originId = config.origins.selectedOriginId;
  }

  if (Array.isArray(config.filters?.days)) {
    next.refinements.days = [...config.filters.days];
  }

  if (Array.isArray(config.filters?.visitBuckets)) {
    next.refinements.visitBuckets = [...config.filters.visitBuckets];
  }

  if (Array.isArray(config.origins?.originTypes)) {
    next.refinements.originTypes = [...config.origins.originTypes];
  }

  return next;
}