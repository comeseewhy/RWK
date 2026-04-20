import { escapeHtml } from "./utils.js";

export function buildJobPopupHtml(row, context = {}) {
  const empty = "—";

  return `
    <div>
      <div class="popup-section">
        <h3 class="popup-title">${escapeHtml(row._title || "Record")}</h3>
        <p class="popup-meta"><span class="popup-label">Date:</span> ${escapeHtml(row._dateDisplay || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Day:</span> ${escapeHtml(row._dayLabel || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Organizer:</span> ${escapeHtml(row._organizerText || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Address:</span> ${escapeHtml(row._addressText || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Visit count:</span> ${escapeHtml(String(row._visitCount || empty))}</p>
        <p class="popup-meta"><span class="popup-label">Boundary:</span> ${escapeHtml(row._boundaryName || empty)}</p>
      </div>

      <div class="popup-section">
        <div class="popup-section-title">Technical details</div>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Row ID:</span> ${escapeHtml(row.row_id || row.source_row_id || empty)}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Event ID:</span> ${escapeHtml(row.event_id || empty)}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Boundary filter:</span> ${escapeHtml(context.selectedBoundaryKey || "none")}</p>
      </div>
    </div>
  `;
}

export function buildOriginPopupHtml(origin, context = {}) {
  const empty = "—";

  return `
    <div>
      <div class="popup-section">
        <h3 class="popup-title">${escapeHtml(origin.name || "Origin")}</h3>
        <p class="popup-meta"><span class="popup-label">Type:</span> ${escapeHtml(origin._typeLabel || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Address:</span> ${escapeHtml(origin.address || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Boundary:</span> ${escapeHtml(origin._boundaryName || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Selected:</span> ${escapeHtml(context.isSelected ? "Yes" : "No")}</p>
      </div>

      <div class="popup-section">
        <div class="popup-section-title">Technical details</div>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Origin ID:</span> ${escapeHtml(origin.id || empty)}</p>
      </div>
    </div>
  `;
}