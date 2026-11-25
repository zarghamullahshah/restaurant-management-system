# Cloud backend — Neon + Cloudflare Workers

The site works fully offline on localStorage. This folder adds the
optional cloud layer so every device sees the same floor: one Neon
Postgres project holds the state, one Cloudflare Worker serves it.

## How it works

- `neon-schema.sql` — one table, `app_state (app, state, updated_at)`.
  The whole app state is one JSONB document, the exact shape in
  `js/store.js`. Each future business system gets its own row under
  its own app id, so one Neon project holds the whole showcase.
- `worker.js` — the Worker API. It talks to Neon over the serverless
  driver's HTTP mode (plain `fetch`, no npm package): each query is a
  POST to the `/sql` endpoint with the connection string in the
  `Neon-Connection-String` header.
- `../js/cloud.js` — the site side. Every `saveState` also pushes to
  the cloud (debounced); on load the cloud copy wins if it is newer.
  If the cloud is down or unconfigured, the site keeps working
  locally and says so in the status pill.

## Setup (free tier, no card)

1. **Neon** (neon.tech) — sign in with GitHub, create a project
   (e.g. `copper-kitchen`), open the SQL Editor and run
   `neon-schema.sql`. Copy the connection string.
2. **Cloudflare** (dash.cloudflare.com) — Workers & Pages, create a
   Worker (e.g. `copper-kitchen-api`), paste `worker.js`, deploy.
   In Settings → Variables, add two secrets:
   - `DATABASE_URL` — the Neon connection string
   - `API_KEY` — the demo key in `js/cloud.js` (`CLOUD_KEY`)
3. **Wire the site** — set `CLOUD_URL` in `js/cloud.js` to the Worker
   URL (`https://copper-kitchen-api.<you>.workers.dev`) and include
   `<script src="js/cloud.js"></script>` after `store.js` on every
   app page. The status pill (`#cloud-status`) shows the sync state.

## Limits to know

- Neon free: 100 projects, 1 GB storage each; compute sleeps after
  5 idle minutes and wakes on the next query (a few hundred ms).
- The demo API key is public by design (it ships in the site's JS).
  It only guards casual abuse — the Worker never runs arbitrary SQL
  and caps bodies at 1 MB. Real per-user auth is a later step if a
  system ever needs it.
