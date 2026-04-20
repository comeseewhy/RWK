// state/appMode.js

const VALID_MODES = new Set(["launcher", "workspace"]);

let currentMode = "launcher";
const listeners = new Set();

function emit() {
  const snapshot = getAppModeState();

  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.warn("[RWK] appMode listener failed:", error);
    }
  });
}

export function getAppMode() {
  return currentMode;
}

export function getAppModeState() {
  return {
    mode: currentMode,
    isLauncher: currentMode === "launcher",
    isWorkspace: currentMode === "workspace"
  };
}

export function setAppMode(mode) {
  if (!VALID_MODES.has(mode)) {
    throw new Error(`Invalid app mode: ${mode}`);
  }

  if (currentMode === mode) {
    return currentMode;
  }

  currentMode = mode;
  emit();
  return currentMode;
}

export function subscribeAppMode(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  listeners.add(listener);

  try {
    listener(getAppModeState());
  } catch (error) {
    console.warn("[RWK] appMode initial listener failed:", error);
  }

  return () => {
    listeners.delete(listener);
  };
}