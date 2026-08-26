"use client";

// ============================================================================
// DETAILS MODAL — Netflix-style quick-view: key art, meta, synopsis, CTAs.
// ============================================================================
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, X, Star, Check, Plus, Clock3 } from "lucide-react";
import type { TitleWithState } from "@/lib/types";
import { fmtDuration } from "./Hero";

type Props = {
  title: TitleWithState;
  inMyList: boolean;
  onClose: () => void;
  onToggleList: (id: string, currentlyInList: boolean) => void;
};

export default function DetailsModal({ title, inMyList, onClose, onToggleList }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const tid = title.id || title._id || "";

  return (
    <div
      className="fade-in fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="fade-up relative w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-video w-full">
          <Image src={title.backdropUrl} alt={title.title} fill className="object-cover" sizes="672px" />
          <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/20 to-transparent" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-zinc-300 transition hover:bg-black hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
            <h3 className="text-3xl font-black uppercase tracking-tight text-white drop-shadow-lg">
              {title.title}
            </h3>
            <div className="flex gap-2">
              <Link
                href={`/watch/${tid}`}
                className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200"
              >
                <Play className="h-4 w-4 fill-black" /> Play
              </Link>
              <button
                onClick={() => onToggleList(tid, inMyList)}
                aria-label="Toggle My List"
                className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 transition ${
                  inMyList ? "bg-brand text-white ring-brand" : "bg-panel/80 text-white ring-line hover:bg-panel-2"
                }`}
              >
                {inMyList ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <Star className="h-4 w-4 fill-emerald-400" /> {title.rating.toFixed(1)} / 10
            </span>
            <span className="text-zinc-400">{title.year}</span>
            <span className="rounded border border-zinc-600 px-1.5 py-0.5 text-[11px] text-zinc-300">
              {title.maturity}
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              <Clock3 className="h-3.5 w-3.5" /> {fmtDuration(title.durationSec)}
            </span>
            <span className="rounded-full bg-panel-2 px-3 py-0.5 text-xs font-semibold text-zinc-200 ring-1 ring-line">
              {title.genre}
            </span>
          </div>
          <p className="leading-relaxed text-zinc-300">{title.synopsis}</p>
          {typeof title.progressRatio === "number" && title.progressRatio > 0 && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-500">
                <span>Resume from {Math.round(title.progressSec ?? 0)}s</span>
                <span>{Math.round(title.progressRatio * 100)}% watched</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-panel-2">
                <div className="h-full rounded-full bg-brand" style={{ width: `${title.progressRatio * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
