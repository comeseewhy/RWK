// workspace/debug.js

const MAX_SEGMENTS = 80;

export function createWorkspaceDebug(target) {
  const entries = [];

  function clear() {
    entries.length = 0;

    if (target) {
      target.textContent = "";
    }
  }

  function log(message) {
    if (!target) return;

    const stamp = new Date().toLocaleTimeString();
    const entry = `[${stamp}] ${message}`;

    entries.push(entry);

    while (entries.length > MAX_SEGMENTS) {
      entries.shift();
    }

    target.textContent = entries.join(" | ");
    target.scrollLeft = target.scrollWidth;
  }

  return {
    clear,
    log
  };
}