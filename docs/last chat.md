What this phase accomplishes

After these replacements:

the boot overlay will remain visible during preload instead of being deleted
the primary shell will have Leaflet available
the launcher will render as an actual styled launcher instead of unstyled text
workspace markup will no longer live inline inside main.js
the launcher surface will be reduced to a smaller, current-phase set
workspace.html can remain as direct-access fallback without blocking the single-shell path

That aligns with the exact next-phase need described in your attached diagnostic notes.

What has already been accomplished before this phase

You already completed the important seam work:

workspace.js is thin
workspace/controller.js owns initialization
runtimeBridge.js enriches rows
panels.js owns toggle rendering
session config is the transport rather than runtime session storage

So this phase is correctly focused on shell cohesion, not data/runtime redesign.

User-side test order

Use this exact order after replacing the files:

Open index.html
Confirm the loading overlay appears before the launcher
Confirm the launcher is visually styled, not plain stacked text
Confirm runtime counts populate once
Click All activity overview
Confirm the workspace opens without a second data load
Confirm the map initializes successfully
Click a boundary polygon and verify counts update
Click Back to launcher and confirm it returns immediately
Open workspace.html directly and confirm fallback still works
Next phase after this one

Once this is stable, the next clean pass is:

reduce workspace.html to explicit fallback-only status or retire it
move runtime boot semantics into engine/indexRuntime.js
add buildClientViewConfig.js and buildDayViewConfig.js
expand the builder to include client, origin seed, boundary seed, and date-range presets