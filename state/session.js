// state/session.js

import { isRenderConfig } from "../config/renderConfig.schema.js";

export const WORKSPACE_SESSION_KEY = "rwk:render-config";

export function setConfig(config) {
  if (!isRenderConfig(config)) {
    throw new Error("Invalid RWK render config passed to session.");
  }

  try {
    sessionStorage.setItem(
      WORKSPACE_SESSION_KEY,
      JSON.stringify(structuredClone(config))
    );
  } catch (error) {
    throw new Error(`Failed to persist RWK render config: ${error.message}`);
  }
}

export function getConfig() {
  try {
    const raw = sessionStorage.getItem(WORKSPACE_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return isRenderConfig(parsed) ? structuredClone(parsed) : null;
  } catch (error) {
    console.warn("[RWK] Failed to read session render config:", error);
    return null;
  }
}

export function clearConfig() {
  try {
    sessionStorage.removeItem(WORKSPACE_SESSION_KEY);
  } catch (error) {
    console.warn("[RWK] Failed to clear session render config:", error);
  }
}

export function hasConfig() {
  return getConfig() !== null;
}