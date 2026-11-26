# openRMS-Site

**Role:** the public website: project home, docs, and the human interface to Atlas.
It's **just another client of Atlas API**, with no private back end, which proves the
API is complete.
**License:** AGPL-3.0-or-later (code), CC-BY-4.0 (content)

## Features

- Map and list of gateways with filters (mode, band, distance from a grid square, emcomm
  attributes, online now).
- Gateway pages: channels, real waveforms, schedule, emcomm readiness, uptime history.
- Sysop dashboard: claim and verify callsign, manage gateways, API keys.
- "Download for offline use" (all dump formats) and a link to the API docs (Swagger/Redoc).
- Project docs, the funding ledger view (rendered from `ledger/`), and the transparency reports.

## Stack

SvelteKit 3 static SPA (adapter-static) with Svelte 5, Leaflet, and the Better Auth client.
Hand-written typed client in `src/lib/api.ts` for now; generate it from the OpenAPI spec once the
spec is frozen. A lightweight "text mode" for low bandwidth is still to do.

## Phases

- **P3:** map, list, gateway pages, downloads, API docs. **Done (alpha) 2026-11-25.**
- **P3b:** sysop dashboard (sign-up with callsign, gateway editor, API keys). **Done (alpha) 2026-11-25.**
  Still open: moderator UI (the API exists), text mode.
- **Later:** funding ledger pages, translations.
