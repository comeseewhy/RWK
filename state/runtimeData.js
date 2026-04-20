// state/runtimeData.js

export const RUNTIME_DATA_SESSION_KEY = "rwk:runtime-data";

export function setRuntimeData() {
  console.warn(
    "[RWK] state/runtimeData.js is deprecated in the active boot path. Runtime data is no longer persisted to sessionStorage."
  );
  return false;
}

export function getRuntimeData() {
  return null;
}

export function clearRuntimeData() {
  try {
    sessionStorage.removeItem(RUNTIME_DATA_SESSION_KEY);
  } catch (error) {
    console.warn("[RWK] Failed to clear deprecated runtime data key:", error);
  }
}

export function hasRuntimeData() {
  return false;
}

export function getRuntimeDataSummary(runtimeData = null) {
  if (!runtimeData || typeof runtimeData !== "object") {
    return {
      boundariesLoaded: false,
      originsLoaded: false,
      manifestLoaded: false,
      eventsCount: 0,
      exportCount: 0,
      joinedCount: 0,
      candidateCount: 0,
      updatedAt: ""
    };
  }

  const summary = runtimeData.summary || {};

  return {
    boundariesLoaded: Boolean(runtimeData.boundariesGeojson),
    originsLoaded: Array.isArray(runtimeData.originRows) && runtimeData.originRows.length > 0,
    manifestLoaded: Boolean(runtimeData.manifest),
    eventsCount:
      Number.isFinite(summary.eventsCount)
        ? summary.eventsCount
        : Array.isArray(runtimeData.eventsRows)
          ? runtimeData.eventsRows.length
          : 0,
    exportCount:
      Number.isFinite(summary.exportCount)
        ? summary.exportCount
        : Array.isArray(runtimeData.exportRows)
          ? runtimeData.exportRows.length
          : 0,
    joinedCount:
      Number.isFinite(summary.joinedCount)
        ? summary.joinedCount
        : Array.isArray(runtimeData.joinedRows)
          ? runtimeData.joinedRows.length
          : 0,
    candidateCount:
      Number.isFinite(summary.candidateCount)
        ? summary.candidateCount
        : Array.isArray(runtimeData.candidateRows)
          ? runtimeData.candidateRows.length
          : 0,
    updatedAt: summary.updatedAt || runtimeData.manifest?.updated_at || ""
  };
}