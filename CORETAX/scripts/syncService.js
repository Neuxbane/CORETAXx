// Lightweight sync service that queues local changes and sends them when online

const SYNC_QUEUE_KEY = 'syncQueue';
const LAST_SYNC_KEY = 'lastSyncAt';
const SYNC_ENDPOINT = '/api/sync.php'; // Single PHP endpoint for all persisted data

function readQueue() {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Sync queue read error', err);
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('Sync queue write error', err);
  }
}

async function recordChange(key, payload) {
  const queue = readQueue();
  queue.push({
    key,
    payload,
    timestamp: new Date().toISOString(),
    userId: window.storage ? window.storage.getSession() : null,
  });
  writeQueue(queue);

  if (navigator.onLine) {
    await flush();
  }
}

async function flush() {
  const queue = readQueue();
  if (queue.length === 0) return { success: true, sent: 0 };

  try {
    const response = await fetch(SYNC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: window.storage ? window.storage.getSession() : null,
        changes: queue,
      }),
    });

    if (!response.ok) {
      throw new Error('Sync failed with status ' + response.status);
    }

    writeQueue([]);
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return { success: true, sent: queue.length };
  } catch (err) {
    console.warn('Sync failed, keeping queue', err);
    return { success: false, error: err.message };
  }
}

function init() {
  window.addEventListener('online', () => {
    flush();
  });
}

function getLastSync() {
  return localStorage.getItem(LAST_SYNC_KEY);
}

async function pullSnapshot(userId) {
  if (!userId) return { applied: false };
  try {
    const res = await fetch(`${SYNC_ENDPOINT}?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch snapshot');
    const data = await res.json();
    if (data && data.data) {
      Object.entries(data.data).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
          console.warn('Snapshot apply error', key, err);
        }
      });
      if (data.lastSync) {
        localStorage.setItem(LAST_SYNC_KEY, data.lastSync);
      }
      return { applied: true };
    }
  } catch (err) {
    console.warn('Snapshot pull failed', err);
  }
  return { applied: false };
}

window.sync = {
  recordChange,
  flush,
  getQueue: readQueue,
  init,
  getLastSync,
  pullSnapshot,
};
