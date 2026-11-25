/* The Copper Kitchen — cloud sync (Neon Postgres via Cloudflare Worker)
 *
 * localStorage stays the source of truth on this device. When
 * CLOUD_URL is set, every save also pushes the full state to the
 * cloud (debounced), and on load the cloud copy wins if it is newer
 * — so the manager's phone, the waiter's tablet and the chef display
 * all see the same floor. If the cloud is unreachable or the URL is
 * empty, everything keeps working locally; the status pill says so.
 *
 * Load this AFTER js/store.js on every app page. */

'use strict';

var CLOUD_URL = ''; // Worker URL, e.g. https://copper-kitchen-api.<you>.workers.dev — empty = local only
var CLOUD_KEY = 'a9ddd605ccd4bdf30ec3b2fb8b3dd1d0'; // demo key — public by design; the Worker only accepts state writes
var CLOUD_APP = 'copper-kitchen';
var CLOUD_META_KEY = 'copper-kitchen-cloud-meta';
var CLOUD_RELOAD_KEY = 'copper-kitchen-cloud-reloaded';

var cloudStatus = 'local'; // local | synced | offline
var cloudTimer = null;

function cloudMeta() {
  try { return JSON.parse(localStorage.getItem(CLOUD_META_KEY) || '{}'); } catch (e) { return {}; }
}

function cloudSaveMeta(m) {
  try { localStorage.setItem(CLOUD_META_KEY, JSON.stringify(m)); } catch (e) { /* ignore */ }
}

function cloudSetStatus(s, label) {
  cloudStatus = s;
  var el = document.getElementById('cloud-status');
  if (el) {
    el.textContent = label;
    el.setAttribute('data-cloud', s);
  }
}

async function cloudPush() {
  if (!CLOUD_URL) return;
  try {
    var state = loadState();
    var res = await fetch(CLOUD_URL + '/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': CLOUD_KEY },
      body: JSON.stringify({ app: CLOUD_APP, state: state }),
    });
    if (!res.ok) throw new Error('push ' + res.status);
    var data = await res.json();
    cloudSaveMeta({ updatedAt: data.updatedAt, pushedAt: new Date().toISOString() });
    cloudSetStatus('synced', 'Cloud synced');
  } catch (e) {
    cloudSetStatus('offline', 'Cloud offline — saved on this device');
  }
}

function cloudSchedulePush() {
  if (!CLOUD_URL) return;
  if (cloudTimer) clearTimeout(cloudTimer);
  cloudTimer = setTimeout(cloudPush, 800);
}

async function cloudPull() {
  if (!CLOUD_URL) {
    cloudSetStatus('local', 'Local only');
    return;
  }
  try {
    var res = await fetch(CLOUD_URL + '/state?app=' + encodeURIComponent(CLOUD_APP));
    if (!res.ok) throw new Error('pull ' + res.status);
    var data = await res.json();
    if (!data || !data.state) {
      // Cloud is empty: seed it with this device's state.
      await cloudPush();
      return;
    }
    var meta = cloudMeta();
    var cloudTime = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
    var knownTime = meta.updatedAt ? new Date(meta.updatedAt).getTime() : 0;
    if (cloudTime > knownTime) {
      var local = loadState();
      if (JSON.stringify(local) !== JSON.stringify(data.state)) {
        saveState(data.state);
        cloudSaveMeta({ updatedAt: data.updatedAt, pushedAt: meta.pushedAt || null });
        if (!sessionStorage.getItem(CLOUD_RELOAD_KEY)) {
          sessionStorage.setItem(CLOUD_RELOAD_KEY, '1');
          location.reload();
          return;
        }
      } else {
        cloudSaveMeta({ updatedAt: data.updatedAt, pushedAt: meta.pushedAt || null });
      }
    }
    cloudSetStatus('synced', 'Cloud synced');
  } catch (e) {
    cloudSetStatus('offline', 'Cloud offline — saved on this device');
  }
}

/* Hook every save: keep the local write, add a debounced cloud push. */
(function () {
  if (typeof saveState !== 'function') return;
  var originalSave = saveState;
  saveState = function (state) {
    originalSave(state);
    cloudSchedulePush();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cloudPull);
  } else {
    cloudPull();
  }
})();
