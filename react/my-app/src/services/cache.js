/**
 * In-memory cache that survives component unmounts (lives on the module
 * singleton). Cleared on full page reload. Strategy: stale-while-revalidate
 * — `getCachedSync` returns whatever is stored regardless of age, `isFresh`
 * tells you whether it's still within TTL, `cached` does the read-or-fetch
 * dance.
 */
const store = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedSync(key) {
  const entry = store.get(key);
  return entry ? entry.data : null;
}

export function isFresh(key, ttl = DEFAULT_TTL) {
  const entry = store.get(key);
  if (!entry) return false;
  return Date.now() - entry.ts < ttl;
}

export function setCache(key, data) {
  store.set(key, { data, ts: Date.now() });
}

export async function cached(key, fetcher, ttl = DEFAULT_TTL) {
  if (isFresh(key, ttl)) return store.get(key).data;
  const data = await fetcher();
  store.set(key, { data, ts: Date.now() });
  return data;
}

export function invalidate(prefix) {
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

export function ageMs(key) {
  const entry = store.get(key);
  return entry ? Date.now() - entry.ts : null;
}
