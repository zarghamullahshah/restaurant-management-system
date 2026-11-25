/* The Copper Kitchen — cloud API (Cloudflare Worker + Neon Postgres)
 *
 * Deploy: paste into a new Cloudflare Worker, then set two secrets:
 *   DATABASE_URL — the Neon connection string (pooled, with sslmode)
 *   API_KEY      — the demo key the site sends in the X-Api-Key header
 *
 * How it talks to Neon: the Neon serverless driver's HTTP mode. The
 * driver POSTs each query to https://<api-host>/sql with the full
 * connection string in the Neon-Connection-String header; the host
 * is the connection string's host with its first label swapped for
 * "api.". No TCP socket, no npm package — plain fetch, which is all
 * a Worker has. The response envelope is { command, rowCount,
 * fields, rows }, rows as value arrays.
 *
 * Endpoints:
 *   GET  /health          -> { ok: true }
 *   GET  /state?app=...   -> { state, updatedAt } (state null if new)
 *   POST /state           -> { app, state } with X-Api-Key, upserts
 *
 * The API key is a demo key, visible in the site's own JavaScript.
 * It keeps casual abuse out; it is not real security. The Worker
 * only ever reads or writes the one app_state row, never runs
 * arbitrary SQL, and bodies are capped at 1 MB.
 */

'use strict';

const MAX_BODY = 1000000;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
  };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders()),
  });
}

function neonEndpoint(databaseUrl) {
  const u = new URL(databaseUrl);
  const host = u.hostname.replace(/^[^.]+/, 'api');
  return 'https://' + host + '/sql';
}

async function neonQuery(env, text, params) {
  const res = await fetch(neonEndpoint(env.DATABASE_URL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': env.DATABASE_URL,
    },
    body: JSON.stringify({ query: text, params: params || [] }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error('Neon HTTP ' + res.status + ' ' + t.slice(0, 200));
  }
  return res.json();
}

function rowsAsObjects(data) {
  const fields = (data.fields || []).map((f) => f.name);
  return (data.rows || []).map((row) => {
    if (!Array.isArray(row)) return row;
    const obj = {};
    fields.forEach((name, i) => { obj[name] = row[i]; });
    return obj;
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    const url = new URL(request.url);
    try {
      if (url.pathname === '/health') return json({ ok: true });

      if (url.pathname === '/state' && request.method === 'GET') {
        const app = url.searchParams.get('app') || 'copper-kitchen';
        const data = await neonQuery(
          env,
          'SELECT state::text AS state, updated_at::text AS updated_at FROM app_state WHERE app = $1',
          [app]
        );
        const rows = rowsAsObjects(data);
        if (!rows.length) return json({ state: null, updatedAt: null });
        return json({ state: JSON.parse(rows[0].state), updatedAt: rows[0].updated_at });
      }

      if (url.pathname === '/state' && request.method === 'POST') {
        if (!env.API_KEY || request.headers.get('x-api-key') !== env.API_KEY) {
          return json({ error: 'unauthorized' }, 401);
        }
        const len = Number(request.headers.get('content-length') || 0);
        if (len > MAX_BODY) return json({ error: 'body too large' }, 413);
        const body = await request.json();
        if (!body || typeof body.app !== 'string' || !body.state || typeof body.state !== 'object') {
          return json({ error: 'bad request' }, 400);
        }
        const data = await neonQuery(
          env,
          'INSERT INTO app_state (app, state) VALUES ($1, $2::jsonb) ' +
          'ON CONFLICT (app) DO UPDATE SET state = EXCLUDED.state, updated_at = now() ' +
          'RETURNING updated_at::text AS updated_at',
          [body.app, JSON.stringify(body.state)]
        );
        const rows = rowsAsObjects(data);
        return json({ ok: true, updatedAt: rows[0] && rows[0].updated_at });
      }

      return json({ error: 'not found' }, 404);
    } catch (err) {
      return json({ error: String((err && err.message) || err) }, 500);
    }
  },
};
