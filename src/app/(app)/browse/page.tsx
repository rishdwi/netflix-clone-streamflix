"use client";

// ============================================================================
// BROWSE PAGE — the Netflix-style home. One round trip for the cached catalog
// (/api/movies), plus per-user rows (/api/progress, /api/mylist).
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import Hero from "@/components/Hero";
import DetailsModal from "@/components/DetailsModal";
import { TitleRow, RowSkeleton } from "@/components/Rows";
import { api } from "@/lib/constants";
import type { Title, TitleWithState } from "@/lib/types";

type Catalog = {
  hero: Title | null;
  trending: Title[];
  topRated: Title[];
  genres: { genre: string; items: Title[] }[];
};

export default function BrowsePage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [continueItems, setContinueItems] = useState<TitleWithState[]>([]);
  const [myListIds, setMyListIds] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<TitleWithState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<Catalog>("/api/movies"),
      api<{ items: TitleWithState[] }>("/api/progress").catch(() => ({ items: [] })),
      api<{ titles: Title[] }>("/api/mylist").catch(() => ({ titles: [] })),
    ])
      .then(([cat, prog, list]) => {
        setCatalog(cat);
        setContinueItems(prog.items);
        setMyListIds(new Set(list.titles.map((t) => t.id || t._id || "")));
      })
      .catch((e) => setError(e.message));
  }, []);

  // Optimistic My List toggle — update UI instantly, reconcile on failure.
  const toggleList = useCallback(async (titleId: string, currentlyInList: boolean) => {
    setMyListIds((prev) => {
      const next = new Set(prev);
      if (currentlyInList) next.delete(titleId);
      else next.add(titleId);
      return next;
    });
    try {
      if (currentlyInList) await api(`/api/mylist?id=${titleId}`, { method: "DELETE" });
      else await api(`/api/mylist`, { method: "POST", body: JSON.stringify({ titleId }) });
    } catch {
      setMyListIds((prev) => {
        const next = new Set(prev);
        if (currentlyInList) next.add(titleId);
        else next.delete(titleId);
        return next;
      });
    }
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-zinc-400">
        <p>{error}</p>
      </div>
    );
  }

  const heroId = catalog?.hero?.id || catalog?.hero?._id || "";
  const detailsId = details?.id || details?._id || "";

  return (
    <main className="pb-20">
      {catalog?.hero ? (
        <Hero
          title={catalog.hero}
          inMyList={myListIds.has(heroId)}
          onToggleList={toggleList}
          onInfo={setDetails}
        />
      ) : (
        <div className="h-[78vh] min-h-[520px] animate-pulse bg-panel" />
      )}

      {/* rows overlap the hero's bottom edge for that floating-shelf look */}
      <div className="relative z-10 -mt-16 space-y-10">
        {!catalog ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : (
          <>
            {continueItems.length > 0 && (
              <TitleRow
                heading="Continue Watching"
                items={continueItems}
                showProgress
                myListIds={myListIds}
                onToggleList={toggleList}
                onOpenDetails={setDetails}
              />
            )}
            <TitleRow
              heading="Trending Now"
              items={catalog.trending}
              ranked
              myListIds={myListIds}
              onToggleList={toggleList}
              onOpenDetails={setDetails}
            />
            <TitleRow
              heading="Top Rated"
              items={catalog.topRated}
              myListIds={myListIds}
              onToggleList={toggleList}
              onOpenDetails={setDetails}
            />
            {catalog.genres.map((g) => (
              <TitleRow
                key={g.genre}
                heading={g.genre}
                items={g.items}
                myListIds={myListIds}
                onToggleList={toggleList}
                onOpenDetails={setDetails}
              />
            ))}
          </>
        )}
      </div>

      <footer className="mt-16 border-t border-line/60 px-4 py-6 text-center text-xs text-zinc-600 sm:px-8">
        StreamFlix — a Netflix-style streaming demo · HLS · JWT · MongoDB
      </footer>

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
