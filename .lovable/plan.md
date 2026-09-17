# OSIRIS Viewport and Command Runtime Refactor

## Goal
Rebuild AURA-NET as a fixed, full-screen command workspace where the map, data panel, and terminal have isolated bounds and browser-safe command execution.

## Implementation
- Replace the current dashboard composition with a strict four-region shell: fixed header, bounded map viewport, independently scrolling side panel, and docked terminal.
- Keep globe/map canvases entirely inside `#map-viewport`, preserve direct pointer and touch input, and move projection and zoom controls into that viewport.
- Add mobile `THREATS`, `TENANTS`, and `TERMINAL` tabs that show one bounded panel at a time without root scrolling; desktop retains the side panel and docked terminal simultaneously.
- Recompose the side panel into live threat ingestion, tenant onboarding/listing, and ghost-egress status/cycling sections.
- Remove fixed HUD layers that collide with workspace regions and constrain remaining overlays to safe local bounds.
- Replace unsafe/dynamic command execution paths with statically imported ESM handlers and a direct command dispatch registry; align command fields with current telemetry types.
- Correct related strict TypeScript failures in the touched dashboard, onboarding, globe, and terminal paths.
- Lock document/root overflow and viewport sizing so map and feed scrolling remain independent.

## Verification
- Check for all `require`, `eval`, and `new Function` usage across browser-reachable source.
- Validate the preview at 1280×1800 and 411×791, including map interaction, mobile tabs, side-panel scrolling, terminal input, zoom/projection controls, and no root scroll.
- Inspect build, runtime, and console diagnostics; resolve errors attributable to the active app paths and confirm no `require is not defined` failure remains.

## Technical notes
- React state remains frontend-only; Lovable Cloud will not be enabled.
- Existing semantic colors and Button controls remain authoritative.
