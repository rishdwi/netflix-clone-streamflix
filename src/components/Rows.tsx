"use client";

// ============================================================================
// ROWS — the horizontally scrolling shelves of the browse page.
//   TitleRow  -> heading + arrow buttons + snap scrolling track
//   TitleCard -> 16:9 key-art card with hover lift, meta and quick actions
//   `ranked` renders the Netflix-style giant position numbers (Top-10 look)
// ============================================================================
import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Check, Plus, ChevronLeft, ChevronRight, ChevronDown, Star } from "lucide-react";
import type { TitleWithState } from "@/lib/types";

type CardProps = {
  title: TitleWithState;
  inMyList: boolean;
  showProgress?: boolean;
  wide?: boolean; // grid variant: fill the grid cell instead of fixed row width
  onToggleList: (id: string, currentlyInList: boolean) => void;
  onOpenDetails: (t: TitleWithState) => void;
};

export function TitleCard({ title, inMyList, showProgress, wide, onToggleList, onOpenDetails }: CardProps) {
  const tid = title.id || title._id || "";

  return (
    <div
      className={`card-lift group relative aspect-video cursor-pointer overflow-hidden rounded-lg bg-panel ${
        wide ? "w-full" : "w-44 shrink-0 sm:w-56 md:w-64"
      }`}
    >
      <Image
        src={title.backdropUrl}
        alt={title.title}
        fill
        sizes="(max-width: 640px) 176px, (max-width: 768px) 224px, 256px"
        className="object-cover transition duration-500 group-hover:scale-105"
      />

      {/* bottom info reveal */}
      <div
        className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/30 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        onClick={() => onOpenDetails(title)}
      >
        <p className="truncate text-sm font-bold text-white">{title.title}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-300">
          <span className="flex items-center gap-0.5 font-semibold text-emerald-400">
            <Star className="h-3 w-3 fill-emerald-400" />
            {title.rating.toFixed(1)}
          </span>
          <span>{title.year}</span>
          <span className="rounded border border-zinc-500 px-1 text-[9px]">{title.maturity}</span>
        </div>
      </div>

      {/* quick actions */}
      <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <Link
          href={`/watch/${tid}`}
          aria-label={`Play ${title.title}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg transition hover:scale-110"
        >
          <Play className="h-3.5 w-3.5 fill-black" />
        </Link>
        <button
          onClick={() => onToggleList(tid, inMyList)}
          aria-label="Toggle My List"
          className={`flex h-8 w-8 items-center justify-center rounded-full shadow-lg ring-1 transition hover:scale-110 ${
            inMyList ? "bg-brand text-white ring-brand" : "bg-black/70 text-white ring-zinc-600"
          }`}
        >
          {inMyList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
        <button
          onClick={() => onOpenDetails(title)}
          aria-label="Details"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-zinc-600 transition hover:scale-110"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Continue Watching progress bar */}
      {showProgress && typeof title.progressRatio === "number" && (
        <div className="absolute inset-x-3 bottom-3">
          <div className="h-1 overflow-hidden rounded-full bg-zinc-700/80">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.min(100, Math.max(3, title.progressRatio * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

type RowProps = {
  heading: string;
  items: TitleWithState[];
  ranked?: boolean;
  showProgress?: boolean;
  myListIds: Set<string>;
  onToggleList: (id: string, currentlyInList: boolean) => void;
  onOpenDetails: (t: TitleWithState) => void;
};

export function TitleRow({ heading, items, ranked, showProgress, myListIds, onToggleList, onOpenDetails }: RowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  if (items.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="group/row relative">
      <h2 className="mb-3 px-4 text-lg font-bold text-zinc-100 sm:px-8 lg:px-14">{heading}</h2>
      <div className="relative">
        <button
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className="absolute left-0 top-0 z-10 hidden h-full w-12 items-center justify-center bg-gradient-to-r from-ink to-transparent opacity-0 transition-opacity group-hover/row:opacity-100 md:flex"
        >
          <ChevronLeft className="h-8 w-8 text-white" />
        </button>

        <div
          ref={trackRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth px-4 sm:px-8 lg:px-14"
        >
          {items.map((t, i) => {
            const tid = t.id || t._id || "";
            return ranked ? (
              <div key={tid} className="flex shrink-0 snap-start items-end">
                <span
                  className="text-stroke -mr-4 select-none text-7xl font-black leading-[0.8] sm:text-8xl md:text-9xl"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <TitleCard
                  title={t}
                  inMyList={myListIds.has(tid)}
                  onToggleList={onToggleList}
                  onOpenDetails={onOpenDetails}
                />
              </div>
            ) : (
              <div key={tid} className="snap-start">
                <TitleCard
                  title={t}
                  inMyList={myListIds.has(tid)}
                  showProgress={showProgress}
                  onToggleList={onToggleList}
                  onOpenDetails={onOpenDetails}
                />
              </div>
            );
          })}
        </div>

        <button
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className="absolute right-0 top-0 z-10 hidden h-full w-12 items-center justify-center bg-gradient-to-l from-ink to-transparent opacity-0 transition-opacity group-hover/row:opacity-100 md:flex"
        >
          <ChevronRight className="h-8 w-8 text-white" />
        </button>
      </div>
    </section>
  );
}

/** Shimmer placeholder while catalog/progress requests are in flight. */
export function RowSkeleton() {
  return (
    <div className="animate-pulse px-4 sm:px-8 lg:px-14">
      <div className="mb-3 h-5 w-40 rounded bg-panel-2" />
      <div className="flex gap-2.5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-video w-44 shrink-0 rounded-lg bg-panel sm:w-56 md:w-64" />
        ))}
      </div>
    </div>
  );
}
