# openRMS-Site

**Provides:** the public website for the openRMS Atlas: map and list with filters
(mode, band, status, source, distance from a grid), gateway pages, on-air evidence from
watchers, a sysop dashboard (list and edit gateways, confirm "still on the air", API keys), and developer
docs for the API and Pat. · **Consumes:** the openRMS-Atlas API, and openRMS-Accounts for
sign-in, clubs and staff user tools (the Site gets short-lived JWTs from Accounts for Atlas calls). · **Status:** alpha.
· **License:** AGPL-3.0-or-later (code, `LICENSE`), CC-BY-4.0 (written page content and docs,
`LICENSE-CC-BY-4.0`).

SvelteKit 3 (static SPA via adapter-static), Svelte 5, Leaflet with OpenStreetMap tiles, and
the Better Auth client.

```sh
pnpm install
pnpm dev        # http://localhost:5173; proxies /api → Atlas (:8787) and /accounts/* → Accounts (:8789)
pnpm check      # svelte-check
pnpm build      # static files in build/
```

Production: serve `build/` with SPA fallback to `index.html` at `https://openrms.dev`, built with
`VITE_ACCOUNTS_URL=https://auth.openrms.dev` (API), `VITE_ACCOUNTS_UI_URL=https://auth.openrms.dev`
(account pages), `VITE_ATLAS_URL=https://atlas.openrms.dev` and
`VITE_ATLAS_AUDIENCE=https://atlas.openrms.dev` (see `src/lib/config.ts`).

Sign-in, sign-up, account settings, clubs and device linking are pages of openRMS-Accounts
(dev http://localhost:8789). The Site links there with `?next=<this page>`, and keeps `/login`,
`/signup` and `/link` only as redirects so old links work.

SvelteKit 3 note: shared code is imported as `#lib/...` (package.json `imports`), not `$lib`.
