// workspace/renderWorkspaceShell.js

export function renderWorkspaceShell() {
  return `
    <div class="app-shell workspace-shell">
      <header class="topbar">
        <div class="topbar__title-wrap">
          <p class="topbar__eyebrow">RWK</p>
          <h1 class="topbar__title">Operational workspace</h1>
          <p class="topbar__subtitle">
            Spatial review, refinement, and boundary-driven operational inspection.
          </p>
        </div>

        <div class="topbar__status" id="headerResultPill" aria-live="polite">
          <span id="headerResultCount" class="topbar__status-count">0 coordinates</span>
          <span id="headerResultMeta" class="topbar__status-meta">Waiting for filters</span>
        </div>

        <div class="topbar__actions">
          <button
            id="backToLauncherButton"
            class="button"
            type="button"
            aria-label="Back to launcher"
          >
            Back to launcher
          </button>
        </div>
      </header>

      <main class="layout">
        <section class="map-column" aria-label="Map and diagnostics">
          <section class="map-section" aria-label="Map section">
            <div id="map" aria-label="Map"></div>
          </section>

          <section class="debug-strip" aria-labelledby="debugCardTitle">
            <h2 id="debugCardTitle" class="debug-strip__title">Debug</h2>
            <pre id="debugOutput" class="debug-output">Starting...</pre>
          </section>
        </section>

        <aside class="panel" aria-label="Workspace controls">
          <section class="panel-card" aria-labelledby="filtersCardTitle">
            <h2 id="filtersCardTitle" class="panel-card__title">Population filters</h2>

            <div class="form-grid">
              <div class="form-field">
                <span class="form-label">Day of week</span>
                <div
                  id="dayToggleGroup"
                  class="toggle-group"
                  aria-label="Day of week filters"
                ></div>
              </div>
            </div>
          </section>

          <section class="panel-card" aria-labelledby="originsCardTitle">
            <h2 id="originsCardTitle" class="panel-card__title">Origins</h2>

            <div class="form-grid">
              <div class="form-field">
                <span class="form-label">Origin type</span>
                <div
                  id="originTypeToggleGroup"
                  class="toggle-group"
                  aria-label="Origin type filters"
                ></div>
              </div>
            </div>
          </section>

          <section class="panel-card" aria-labelledby="appointmentCardTitle">
            <h2 id="appointmentCardTitle" class="panel-card__title">Appointment</h2>

            <div class="form-grid">
              <div class="form-field">
                <span class="form-label">Appointment type</span>
                <div
                  id="appointmentTypeToggleGroup"
                  class="toggle-group"
                  aria-label="Appointment type filters"
                ></div>
              </div>
            </div>
          </section>

          <section class="panel-card" aria-labelledby="selectionCardTitle">
            <h2 id="selectionCardTitle" class="panel-card__title">Selection</h2>

            <dl class="stats-list">
              <div class="stats-row">
                <dt>Selected boundary</dt>
                <dd id="selectedBoundaryName">None</dd>
              </div>
            </dl>

            <div class="button-row">
              <button id="clearBoundaryButton" class="button" type="button">
                Clear boundary
              </button>
            </div>
          </section>
        </aside>
      </main>
    </div>
  `;
}