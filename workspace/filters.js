// workspace/filters.js

export function computeWorkspaceView({
  runtime,
  config,
  refinements,
  selection
}) {
  const candidateRows = Array.isArray(runtime?.candidateRows) ? runtime.candidateRows : [];
  const originRows = Array.isArray(runtime?.originRows) ? runtime.originRows : [];

  const configFilteredRows = candidateRows.filter((row) =>
    matchesConfigFilters(row, config)
  );

  const refinementFilteredRows = configFilteredRows.filter((row) =>
    matchesWorkspaceRefinements(row, refinements)
  );

  const visibleRows = refinementFilteredRows.filter((row) =>
    matchesBoundarySelection(row, selection)
  );

  const visibleOrigins = originRows.filter((origin) =>
    matchesOriginVisibility(origin, refinements, selection)
  );

  return {
    populationRows: configFilteredRows,
    visibleRows,
    visibleOrigins,
    counts: {
      candidateCount: candidateRows.length,
      filteredCount: refinementFilteredRows.length,
      boundaryCount: visibleRows.length,
      visibleCount: visibleRows.length,
      visibleOriginCount: visibleOrigins.length
    }
  };
}

function matchesConfigFilters(row, config) {
  if (!config) return true;

  const organizers = config?.filters?.organizers || [];
  const timeWindow = config?.filters?.timeWindow || "all";
  const visitBuckets = config?.filters?.visitBuckets || [];
  const year = config?.filters?.year || "all";
  const boundaryKey = config?.boundary?.selectedBoundaryKey || "";

  if (organizers.length > 0 && !organizers.includes(row._organizerKey)) {
    return false;
  }

  if (visitBuckets.length > 0 && !visitBuckets.includes(row._visitBucket)) {
    return false;
  }

  if (year !== "all" && row._year !== year) {
    return false;
  }

  if (boundaryKey && row._boundaryKey !== boundaryKey) {
    return false;
  }

  if (timeWindow !== "all" && row._timeBucket !== timeWindow) {
    return false;
  }

  return true;
}

function matchesWorkspaceRefinements(row, refinements) {
  if (refinements.days.length > 0 && !refinements.days.includes(row._dayKey)) {
    return false;
  }

  if (
    refinements.visitBuckets.length > 0 &&
    !refinements.visitBuckets.includes(row._visitBucket)
  ) {
    return false;
  }

  return true;
}

function matchesBoundarySelection(row, selection) {
  if (!selection?.boundaryKey) return true;
  return row._boundaryKey === selection.boundaryKey;
}

function matchesOriginVisibility(origin, refinements, selection) {
  if (!origin?._isActive || !origin?._hasCoordinates) {
    return false;
  }

  if (
    refinements.originTypes.length > 0 &&
    !refinements.originTypes.includes(origin._typeKey)
  ) {
    return false;
  }

  if (selection?.boundaryKey && origin._boundaryKey !== selection.boundaryKey) {
    return false;
  }

  return true;
}