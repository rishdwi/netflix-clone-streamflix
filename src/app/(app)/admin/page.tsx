"use client";

// ============================================================================
// ADMIN PANEL — title catalogue CRUD.
//   GET/POST        /api/admin/titles
//   PATCH/DELETE    /api/admin/titles/:id
// The API enforces role="admin" from the JWT; this UI is just convenience.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Film,
  Star,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { api, AVAILABLE_STREAMS, BACKDROPS, MATURITY_RATINGS } from "@/lib/constants";
import type { Title } from "@/lib/types";

// the editable subset of the Title model
type Form = {
  title: string;
  synopsis: string;
  genre: string;
  year: string;
  rating: string;
  durationSec: string;
  maturity: string;
  backdropUrl: string;
  streamSlug: string;
  trendingScore: string;
  featured: boolean;
};

const EMPTY: Form = {
  title: "",
  synopsis: "",
  genre: "Sci-Fi",
  year: "2024",
  rating: "7.5",
  durationSec: "90",
  maturity: "TV-14",
  backdropUrl: BACKDROPS[0].url,
  streamSlug: AVAILABLE_STREAMS[0],
  trendingScore: "50",
  featured: false,
};

export default function AdminPage() {
  const [titles, setTitles] = useState<Title[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Title | null>(null); // null => creating
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () =>
    api<{ titles: Title[] }>("/api/admin/titles")
      .then((d) => setTitles(d.titles))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    if (!titles) return null;
    const avg = titles.reduce((a, t) => a + t.rating, 0) / Math.max(1, titles.length);
    return { total: titles.length, avg: avg.toFixed(1), genres: new Set(titles.map((t) => t.genre)).size };
  }, [titles]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (t: Title) => {
    setEditing(t);
    setForm({
      title: t.title,
      synopsis: t.synopsis,
      genre: t.genre,
      year: String(t.year),
      rating: String(t.rating),
      durationSec: String(t.durationSec),
      maturity: t.maturity,
      backdropUrl: t.backdropUrl,
      streamSlug: t.streamSlug,
      trendingScore: String(t.trendingScore),
      featured: t.featured,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    const payload = {
      title: form.title,
      synopsis: form.synopsis,
      genre: form.genre,
      year: Number(form.year),
      rating: Number(form.rating),
      durationSec: Number(form.durationSec),
      maturity: form.maturity,
      backdropUrl: form.backdropUrl,
      streamSlug: form.streamSlug,
      trendingScore: Number(form.trendingScore),
      featured: form.featured,
    };
    try {
      const editId = editing?.id || editing?._id || "";
      if (editing) await api(`/api/admin/titles/${editId}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await api("/api/admin/titles", { method: "POST", body: JSON.stringify(payload) });
      setFormOpen(false);
      await load();
    } catch (ex) {
      setFormError(ex instanceof Error ? ex.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t: Title) => {
    if (!confirm(`Delete “${t.title}”? This also removes it from every list and progress row.`)) return;
    const tid = t.id || t._id || "";
    try {
      await api(`/api/admin/titles/${tid}`, { method: "DELETE" });
      setTitles((prev) => prev?.filter((x) => (x.id || x._id) !== tid) ?? null);
    } catch (ex) {
      alert(ex instanceof Error ? ex.message : "Delete failed");
    }
  };

  const field = "w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-brand";
  const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500";

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-brand" />
        <p className="text-lg font-semibold text-white">{error}</p>
        <p className="text-sm text-zinc-500">Sign in with admin@streamflix.dev / admin123 to manage the catalogue.</p>
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1400px] px-4 pb-20 pt-24 sm:px-8">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-white">
            <ShieldCheck className="h-8 w-8 text-brand" /> Admin Panel
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Catalogue CRUD — changes hit MongoDB and bust the row cache instantly.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-deep"
        >
          <Plus className="h-4 w-4" /> Add Title
        </button>
      </div>

      {/* stats */}
      {stats && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: Film, k: "Titles", v: String(stats.total) },
            { icon: Star, k: "Avg rating", v: stats.avg },
            { icon: Layers, k: "Genres", v: String(stats.genres) },
          ].map(({ icon: Icon, k, v }) => (
            <div key={k} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-4">
              <Icon className="h-5 w-5 text-brand" />
              <div>
                <p className="text-xl font-black text-white">{v}</p>
                <p className="text-xs text-zinc-500">{k}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* table */}
      {!titles ? (
        <div className="mt-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Genre</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Trending</th>
                <th className="px-4 py-3">Stream</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-panel/40">
              {titles.map((t) => {
                const tid = t.id || t._id || "";
                return (
                  <tr key={tid} className="transition hover:bg-panel/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-[72px] shrink-0 overflow-hidden rounded-md">
                          <Image src={t.backdropUrl} alt="" fill className="object-cover" sizes="72px" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {t.title}
                            {t.featured && (
                              <span className="ml-2 rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">Hero</span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-500">/{t.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{t.genre}</td>
                    <td className="px-4 py-3 text-zinc-300">{t.year}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">{t.rating.toFixed(1)}</td>
                    <td className="px-4 py-3 text-zinc-300">{t.trendingScore}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-black/50 px-1.5 py-0.5 text-xs text-zinc-400">{t.streamSlug}</code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(t)}
                          aria-label={`Edit ${t.title}`}
                          className="rounded-lg border border-line p-2 text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(t)}
                          aria-label={`Delete ${t.title}`}
                          className="rounded-lg border border-brand/40 p-2 text-brand transition hover:bg-brand/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* slide-over form (create + edit) */}
      {formOpen && (
        <div className="fade-in fixed inset-0 z-[70] flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setFormOpen(false)}>
          <form
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-lg overflow-y-auto border-l border-line bg-ink p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white">{editing ? `Edit — ${editing.title}` : "Add Title"}</h2>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Close" className="rounded-full p-2 text-zinc-400 hover:bg-panel hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className={label}>Title</label>
                <input className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={2} />
              </div>
              <div>
                <label className={label}>Synopsis</label>
                <textarea className={`${field} min-h-24`} value={form.synopsis} onChange={(e) => setForm({ ...form, synopsis: e.target.value })} required minLength={10} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Genre</label>
                  <input className={field} value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} required />
                </div>
                <div>
                  <label className={label}>Maturity</label>
                  <select className={field} value={form.maturity} onChange={(e) => setForm({ ...form, maturity: e.target.value })}>
                    {MATURITY_RATINGS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Year</label>
                  <input type="number" className={field} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} min={1920} max={2035} />
                </div>
                <div>
                  <label className={label}>Rating (0–10)</label>
                  <input type="number" step="0.1" className={field} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} min={0} max={10} />
                </div>
                <div>
                  <label className={label}>Duration (sec)</label>
                  <input type="number" className={field} value={form.durationSec} onChange={(e) => setForm({ ...form, durationSec: e.target.value })} min={0} />
                </div>
                <div>
                  <label className={label}>Trending score (0–100)</label>
                  <input type="number" className={field} value={form.trendingScore} onChange={(e) => setForm({ ...form, trendingScore: e.target.value })} min={0} max={100} />
                </div>
              </div>

              <div>
                <label className={label}>HLS stream</label>
                <select className={field} value={form.streamSlug} onChange={(e) => setForm({ ...form, streamSlug: e.target.value })}>
                  {AVAILABLE_STREAMS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={label}>Key art</label>
                <div className="grid grid-cols-2 gap-2">
                  {BACKDROPS.map((b) => (
                    <button
                      type="button"
                      key={b.url}
                      onClick={() => setForm({ ...form, backdropUrl: b.url })}
                      className={`relative aspect-video overflow-hidden rounded-lg ring-2 transition ${
                        form.backdropUrl === b.url ? "ring-brand" : "ring-transparent hover:ring-zinc-600"
                      }`}
                    >
                      <Image src={b.url} alt={b.label} fill className="object-cover" sizes="220px" />
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className="h-4 w-4 accent-brand"
                />
                Feature this title in the hero banner
              </label>

              {formError && (
                <p className="rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm text-red-300">{formError}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-bold text-white transition hover:bg-brand-deep disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save changes" : "Create title"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
