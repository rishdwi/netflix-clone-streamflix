"use client";

// ============================================================================
// SEARCH PAGE — debounced live search against /api/search (regex match over
// title / synopsis / genre). Empty query shows trending as discovery filler.
// ============================================================================
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import DetailsModal from "@/components/DetailsModal";
import { TitleCard } from "@/components/Rows";
import { api } from "@/lib/constants";
import type { Title, TitleWithState } from "@/lib/types";

const QUICK_GENRES = ["Fantasy", "Sci-Fi", "Animation", "Action", "Mystery", "Drama"];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Title[]>([]);
  const [myListIds, setMyListIds] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<TitleWithState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ titles: Title[] }>("/api/mylist")
      .then((d) => setMyListIds(new Set(d.titles.map((t) => t.id || t._id || ""))))
      .catch(() => {});
  }, []);

  // debounce: wait 350ms after the last keystroke before hitting the API
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api<{ results: Title[] }>(`/api/search?q=${encodeURIComponent(q)}`)
        .then((d) => setResults(d.results))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const toggleList = async (titleId: string, inList: boolean) => {
    setMyListIds((prev) => {
      const n = new Set(prev);
      if (inList) n.delete(titleId);
      else n.add(titleId);
      return n;
    });
    try {
      if (inList) await api(`/api/mylist?id=${titleId}`, { method: "DELETE" });
      else await api(`/api/mylist`, { method: "POST", body: JSON.stringify({ titleId }) });
    } catch {
      setMyListIds((prev) => {
        const n = new Set(prev);
        if (inList) n.add(titleId);
        else n.delete(titleId);
        return n;
      });
    }
  };

  const detailsId = details?.id || details?._id || "";

  return (
    <main className="mx-auto min-h-screen max-w-[1600px] px-4 pb-20 pt-24 sm:px-8">
      <div className="relative mx-auto max-w-2xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Titles, genres, moods…"
          className="w-full rounded-xl border border-line bg-panel py-4 pl-12 pr-12 text-lg text-white placeholder-zinc-600 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            aria-label="Clear"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {QUICK_GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setQ(g)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              q === g
                ? "border-brand bg-brand/15 text-white"
                : "border-line bg-panel text-zinc-400 hover:border-zinc-500 hover:text-white"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <p className="mt-8 text-sm text-zinc-500">
        {loading ? "Searching…" : q ? `${results.length} result${results.length === 1 ? "" : "s"} for “${q}”` : "Explore titles"}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {results.map((t) => {
          const tid = t.id || t._id || "";
          return (
            <TitleCard
              key={tid}
              wide
              title={t}
              inMyList={myListIds.has(tid)}
              onToggleList={toggleList}
              onOpenDetails={setDetails}
            />
          );
        })}
      </div>

      {!loading && results.length === 0 && (
        <div className="mt-16 text-center text-zinc-500">
          <p className="text-lg font-semibold text-zinc-300">No matches for “{q}”</p>
          <p className="mt-1 text-sm">Try a genre like “Sci-Fi” or part of a title.</p>
        </div>
      )}

      {details && (
        <DetailsModal
          title={details}
          inMyList={myListIds.has(detailsId)}
          onClose={() => setDetails(null)}
          onToggleList={toggleList}
        />
      )}
    </main>
  );
}
