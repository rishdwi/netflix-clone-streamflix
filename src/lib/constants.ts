// ============================================================================
// SHARED CONSTANTS (safe for both server & client bundles)
// ============================================================================

// The stream slugs that exist under media/hls/<slug>/ or public/videos/<slug>.mp4
export const AVAILABLE_STREAMS: readonly string[] = [
  "bunny",
  "meadow",
  "sintel_lo",
  "movie300",
  "peach",
  "dragon",
  "animal",
  "kgf-2",
  "toxic",
];

// Local key-art assets (in public/images/backdrops)
export const BACKDROPS = [
  { url: "/images/backdrops/animal.jpg", label: "Animal" },
  { url: "/images/backdrops/kgf-2.jpg", label: "KGF Chapter 2" },
  { url: "/images/backdrops/toxic.jpg", label: "Toxic" },
  { url: "/images/backdrops/ember-and-claw.jpg", label: "Ember & Claw" },
  { url: "/images/backdrops/neon-requiem.jpg", label: "Neon Requiem" },
  { url: "/images/backdrops/big-meadow.jpg", label: "The Big Meadow" },
  { url: "/images/backdrops/dragonkeeper.jpg", label: "The Dragonkeeper" },
  { url: "/images/backdrops/crimson-protocol.jpg", label: "Crimson Protocol" },
  { url: "/images/backdrops/thumpers-revenge.jpg", label: "Thumper's Revenge" },
  { url: "/images/backdrops/orbit-decay.jpg", label: "Orbit Decay" },
  { url: "/images/backdrops/rodent-royale.jpg", label: "Rodent Royale" },
  { url: "/images/backdrops/signal-lost.jpg", label: "Signal Lost" },
  { url: "/images/backdrops/quiet-between-stars.jpg", label: "Quiet Between Stars" },
] as const;

export const MATURITY_RATINGS = ["TV-Y7", "TV-PG", "TV-14", "TV-MA"];

/** Tiny typed fetch helper used by every client component. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin", // always send the httpOnly JWT cookie
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const body = (await res.json().catch(() => null)) as { ok?: boolean; data?: T; error?: string } | null;
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body.data as T;
}
