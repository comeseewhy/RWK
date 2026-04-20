export function createWorkspaceDebug(target) {
  function clear() {
    if (target) {
      target.textContent = "";
    }
  }

  function log(message) {
    if (!target) {
      return;
    }

    const stamp = new Date().toLocaleTimeString();
    const line = `[${stamp}] ${message}`;

    target.textContent = target.textContent
      ? `${target.textContent}\n${line}`
      : line;

    target.scrollTop = target.scrollHeight;
  }

  return {
    clear,
    log
  };
}