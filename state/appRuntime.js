// state/appRuntime.js

let runtimeData = null;
let runtimeStatus = "idle"; // idle | loading | ready | error
let runtimeError = null;
let runtimePromise = null;
const listeners = new Set();

function emit() {
  const snapshot = getRuntimeState();
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.warn("[RWK] appRuntime listener failed:", error);
    }
  });
}

export function subscribeAppRuntime(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  listeners.add(listener);

  try {
    listener(getRuntimeState());
  } catch (error) {
    console.warn("[RWK] appRuntime listener bootstrap failed:", error);
  }

  return () => {
    listeners.delete(listener);
  };
}

export function getRuntimeState() {
  return {
    data: runtimeData,
    status: runtimeStatus,
    error: runtimeError,
    isReady: runtimeStatus === "ready" && Boolean(runtimeData),
    isLoading: runtimeStatus === "loading",
    hasError: runtimeStatus === "error"
  };
}

export function getAppRuntime() {
  return runtimeData;
}

export function hasAppRuntime() {
  return Boolean(runtimeData);
}

export function setAppRuntime(data) {
  runtimeData = data || null;
  runtimeStatus = runtimeData ? "ready" : "idle";
  runtimeError = null;
  runtimePromise = null;
  emit();
  return runtimeData;
}

export function setAppRuntimeLoading(promise = null) {
  runtimeStatus = "loading";
  runtimeError = null;
  if (promise) {
    runtimePromise = promise;
  }
  emit();
}

export function setAppRuntimeError(error) {
  runtimeStatus = "error";
  runtimeError = error instanceof Error ? error : new Error(String(error || "Unknown runtime error"));
  runtimePromise = null;
  emit();
}

export function clearAppRuntime() {
  runtimeData = null;
  runtimeStatus = "idle";
  runtimeError = null;
  runtimePromise = null;
  emit();
}

export async function ensureAppRuntime(loader) {
  if (runtimeData) {
    return runtimeData;
  }

  if (runtimePromise) {
    return runtimePromise;
  }

  if (typeof loader !== "function") {
    throw new Error("ensureAppRuntime requires a loader function when runtime is not ready.");
  }

  runtimeStatus = "loading";
  runtimeError = null;

  runtimePromise = Promise.resolve()
    .then(() => loader())
    .then((data) => {
      runtimeData = data;
      runtimeStatus = "ready";
      runtimeError = null;
      runtimePromise = null;
      emit();
      return runtimeData;
    })
    .catch((error) => {
      runtimeData = null;
      runtimeStatus = "error";
      runtimeError = error instanceof Error ? error : new Error(String(error || "Unknown runtime error"));
      runtimePromise = null;
      emit();
      throw runtimeError;
    });

  emit();
  return runtimePromise;
}