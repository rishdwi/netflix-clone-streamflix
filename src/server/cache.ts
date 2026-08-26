// ============================================================================
// CACHING LAYER (Redis stand-in)
// ----------------------------------------------------------------------------
// Trending/Top-Rated rows are the SAME for every user and change rarely —
// a perfect cache target. We cache the computed "catalog rows" payload for
// 60s in process memory; admin writes invalidate it.
//
// VIVA NOTE: this is exactly the slot where Redis sits in a real deployment.
// The API would be identical: GET key -> hit? serve : compute + SETEX key 60.
// Redis is chosen because it's in-memory (sub-ms) and shared across replicas.
// ============================================================================

type Entry = { value: string; expiresAt: number };

class TTLCache {
  private store = new Map<string, Entry>();

  get(key: string): string | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return e.value;
  }

  set(key: string, value: string, ttlSeconds: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  /** Drop every key with a prefix — used for cache invalidation on writes. */
  invalidatePrefix(prefix: string) {
    for (const key of this.store.keys()) if (key.startsWith(prefix)) this.store.delete(key);
  }
}

export const cache = new TTLCache();
export const CATALOG_KEY = "catalog:rows"; // one key holds the whole browse payload
