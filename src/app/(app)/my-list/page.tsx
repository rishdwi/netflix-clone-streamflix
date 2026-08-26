"use client";

// ============================================================================
// MY LIST PAGE — the user's saved watchlist, with one-click removal.
// ============================================================================
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Loader2 } from "lucide-react";
import DetailsModal from "@/components/DetailsModal";
import { TitleCard } from "@/components/Rows";
import { api } from "@/lib/constants";
import type { Title, TitleWithState } from "@/lib/types";

export default function MyListPage() {
  const [titles, setTitles] = useState<Title[] | null>(null);
  const [details, setDetails] = useState<TitleWithState | null>(null);

  useEffect(() => {
    api<{ titles: Title[] }>("/api/mylist")
      .then((d) => setTitles(d.titles))
      .catch(() => setTitles([]));
  }, []);

  const toggleList = async (titleId: string) => {
    // every item here IS in the list -> toggle always means "remove"
    setTitles((prev) => prev?.filter((t) => (t.id || t._id) !== titleId) ?? null);
    setDetails((d) => ((d?.id || d?._id) === titleId ? null : d));
    try {
      await api(`/api/mylist?id=${titleId}`, { method: "DELETE" });
    } catch {
      const d = await api<{ titles: Title[] }>("/api/mylist"); // re-sync on failure
      setTitles(d.titles);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-[1600px] px-4 pb-20 pt-24 sm:px-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-white">
            <Bookmark className="h-7 w-7 text-brand" /> My List
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {titles ? `${titles.length} saved title${titles.length === 1 ? "" : "s"}` : "Loading…"}
          </p>
        </div>
      </div>

      {!titles ? (
        <div className="mt-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : titles.length === 0 ? (
        <div className="mt-24 flex flex-col items-center gap-4 text-center">
          <Bookmark className="h-12 w-12 text-zinc-700" />
          <p className="text-lg font-semibold text-zinc-300">Your list is empty</p>
          <p className="text-sm text-zinc-500">Hover any title and hit the + button to keep it here.</p>
          <Link href="/browse" className="mt-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200">
            Browse titles
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {titles.map((t) => {
            const tid = t.id || t._id || "";
            return (
              <TitleCard
                key={tid}
                wide
                title={t}
                inMyList
                onToggleList={toggleList}
                onOpenDetails={setDetails}
              />
            );
          })}
        </div>
      )}

      {details && (
        <DetailsModal
          title={details}
          inMyList
          onClose={() => setDetails(null)}
          onToggleList={toggleList}
        />
      )}
    </main>
  );
}
