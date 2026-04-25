// workspace/popup.js

/*
  Privacy-hardened popup module.

  Row-level map popups are intentionally disabled. Do not expose appointment
  title, address, customer/client fields, row IDs, event IDs, coordinates,
  notes, descriptions, or other record-level details through map interaction.

  This file remains as a compatibility guard in case any stale import remains.
  Active marker rendering does not call these functions.
*/

export function buildJobPopupHtml() {
  return "";
}

export function buildOriginPopupHtml() {
  return "";
}