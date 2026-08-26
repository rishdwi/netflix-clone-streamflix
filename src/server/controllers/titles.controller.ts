// ============================================================================
// TITLES CONTROLLER — browse catalogue, search, and admin CRUD.
// ----------------------------------------------------------------------------
// The "catalog rows" payload (hero + trending + top rated + genre rows) is
// identical for every user, so we cache it for 60s (see server/cache.ts).
// Watch the `x-cache: HIT/MISS` response header — great for the viva demo.
// ============================================================================
import { ok, err } from "@/server/utils/respond";
import { cache, CATALOG_KEY } from "@/server/cache";
import { requireUser, requireAdmin } from "@/server/middleware/auth";
import {
  getAllTitles,
  getGenreRows,
  getHeroTitle,
  getTitleById,
  getTopRated,
  getTrending,
  searchTitles,
  createTitle,
  updateTitle,
  deleteTitle,
} from "@/server/models/title.model";
import { isInWatchlist } from "@/server/models/list.model";
import { getProgress } from "@/server/models/progress.model";
import { AVAILABLE_STREAMS, BACKDROPS, MATURITY_RATINGS } from "@/lib/constants";
import type { NewTitle } from "@/server/models/title.model";

// ---- GET /api/movies — the whole browse page in one round trip ---------------
export async function catalog() {
  const user = await requireUser();
  if (!user) return err(401, "Sign in to browse");

  const cached = cache.get(CATALOG_KEY);
  if (cached) {
    return new Response(cached, {
      headers: { "content-type": "application/json", "x-cache": "HIT" },
    });
  }

  const [hero, trending, topRated, genres] = await Promise.all([
    getHeroTitle(),
    getTrending(12),
    getTopRated(12),
    getGenreRows(),
  ]);
  const payload = JSON.stringify({ ok: true, data: { hero, trending, topRated, genres } });
  cache.set(CATALOG_KEY, payload, 60); // TTL 60s — admin writes also invalidate
  return new Response(payload, {
    headers: { "content-type": "application/json", "x-cache": "MISS" },
  });
}

// ---- GET /api/movies/:id — title details + per-user state --------------------
export async function titleDetails(id: string) {
  const user = await requireUser();
  if (!user) return err(401, "Sign in to view titles");

  const title = await getTitleById(id);
  if (!title) return err(404, "Title not found");

  const titleId = title._id.toString();
  const [inMyList, progress] = await Promise.all([
    isInWatchlist(user.id, titleId),
    getProgress(user.id, titleId),
  ]);
  return ok({ title, inMyList, progress });
}

// ---- GET /api/search?q= ------------------------------------------------------
export async function search(req: Request) {
  const user = await requireUser();
  if (!user) return err(401, "Sign in to search");

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length === 0) return ok({ query: q, results: await getTrending(12) });
  if (q.length > 80) return err(400, "Query too long");

  const results = await searchTitles(q);
  return ok({ query: q, results });
}

// ---- ADMIN: GET /api/admin/titles --------------------------------------------
export async function adminListTitles() {
  const admin = await requireAdmin();
  if (!admin) return err(403, "Admin access required");
  return ok({ titles: await getAllTitles() });
}

// ---- ADMIN: POST /api/admin/titles -------------------------------------------
function validateTitleInput(body: Record<string, unknown>): { data?: NewTitle; error?: string } {
  const title = String(body.title ?? "").trim();
  const synopsis = String(body.synopsis ?? "").trim();
  const genre = String(body.genre ?? "").trim();
  const year = Number(body.year);
  const rating = Number(body.rating);
  const durationSec = Number(body.durationSec);
  const maturity = String(body.maturity ?? "TV-14");
  const backdropUrl = String(body.backdropUrl ?? "");
  const streamSlug = String(body.streamSlug ?? "");
  const trendingScore = Number(body.trendingScore ?? 50);

  if (title.length < 2 || title.length > 100) return { error: "Title must be 2-100 characters" };
  if (synopsis.length < 10 || synopsis.length > 600) return { error: "Synopsis must be 10-600 characters" };
  if (genre.length < 2 || genre.length > 30 || !/^[a-zA-Z -]+$/.test(genre))
    return { error: "Genre must be 2-30 letters (e.g. 'Sci-Fi')" };
  if (!Number.isInteger(year) || year < 1920 || year > 2035) return { error: "Year must be 1920-2035" };
  if (!(rating >= 0 && rating <= 10)) return { error: "Rating must be 0-10" };
  if (!Number.isInteger(durationSec) || durationSec < 0 || durationSec > 86400)
    return { error: "Duration must be 0-86400 seconds" };
  if (!MATURITY_RATINGS.includes(maturity)) return { error: "Invalid maturity rating" };
  if (!BACKDROPS.some((b) => b.url === backdropUrl)) return { error: "Backdrop must be one of the provided assets" };
  if (!AVAILABLE_STREAMS.includes(streamSlug)) return { error: "Unknown stream slug" };
  if (!(trendingScore >= 0 && trendingScore <= 100)) return { error: "Trending score must be 0-100" };

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return {
    data: {
      slug,
      title,
      synopsis,
      genre: genre[0].toUpperCase() + genre.slice(1),
      year,
      rating,
      durationSec,
      maturity,
      backdropUrl,
      streamSlug,
      trendingScore: Math.round(trendingScore),
      featured: Boolean(body.featured),
    },
  };
}

export async function adminCreateTitle(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return err(403, "Admin access required");

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return err(400, "Invalid JSON body");

  const { data, error } = validateTitleInput(body as Record<string, unknown>);
  if (error || !data) return err(400, error ?? "Invalid input");

  try {
    // If another admin made this title featured, un-feature it first (single hero).
    const title = await createTitle(data);
    cache.invalidatePrefix("catalog:"); // bust the cached browse payload
    return ok({ title }, { status: 201 });
  } catch (e) {
    // unique violation on slug
    return err(409, "A title with a similar name already exists");
  }
}

// ---- ADMIN: PATCH /api/admin/titles/:id ---------------------------------------
export async function adminUpdateTitle(req: Request, id: string) {
  const admin = await requireAdmin();
  if (!admin) return err(403, "Admin access required");

  const existing = await getTitleById(id);
  if (!existing) return err(404, "Title not found");

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return err(400, "Invalid JSON body");

  const merged = { ...existing.toObject(), ...(body as Record<string, unknown>) };
  if (!(body as Record<string, unknown>).title) merged.slug = existing.slug;

  const { data, error } = validateTitleInput(merged as Record<string, unknown>);
  if (error || !data) return err(400, error ?? "Invalid input");

  const updated = await updateTitle(id, { ...data, slug: (body as Record<string, unknown>).title ? data.slug : existing.slug });
  cache.invalidatePrefix("catalog:");
  return ok({ title: updated });
}

// ---- ADMIN: DELETE /api/admin/titles/:id --------------------------------------
export async function adminDeleteTitle(id: string) {
  const admin = await requireAdmin();
  if (!admin) return err(403, "Admin access required");

  const existing = await getTitleById(id);
  if (!existing) return err(404, "Title not found");

  await deleteTitle(id);
  cache.invalidatePrefix("catalog:");
  return ok({ deleted: id });
}
