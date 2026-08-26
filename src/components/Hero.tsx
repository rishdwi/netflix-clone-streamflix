"use client";

// ============================================================================
// HERO — the billboard banner at the top of /browse.
// Ken-burns backdrop, stacked vignettes, meta chips, primary CTAs.
// ============================================================================
import Image from "next/image";
import Link from "next/link";
import { Play, Info, Star, Check, Plus, Flame } from "lucide-react";
import type { TitleWithState } from "@/lib/types";

export function fmtDuration(sec: number): string {
  if (sec < 600) return `${sec}s short`;
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

type Props = {
  title: TitleWithState;
  inMyList: boolean;
  onToggleList: (id: string, currentlyInList: boolean) => void;
  onInfo: (t: TitleWithState) => void;
};

export default function Hero({ title, inMyList, onToggleList, onInfo }: Props) {
  const tid = title.id || title._id || "";

  return (
    <section className="relative h-[78vh] min-h-[520px] w-full overflow-hidden grain">
      {/* Backdrop with slow cinematic drift */}
      <div className="absolute inset-0 kenburns">
        <Image
          src={title.backdropUrl}
          alt={title.title}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </div>

      {/* Vignettes: bottom fade into page + left readability gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/40 to-transparent" />

      <div className="relative flex h-full flex-col justify-end px-4 pb-24 sm:px-8 lg:px-14">
        <div className="max-w-2xl">
          <div className="fade-up mb-4 flex items-center gap-2 text-brand">
            <Flame className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-[0.3em]">
              StreamFlix Original
            </span>
          </div>

          <h1 className="fade-up fade-up-1 text-5xl font-black uppercase leading-[0.95] tracking-tight text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.8)] sm:text-7xl">
            {title.title}
          </h1>

          <div className="fade-up fade-up-2 mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <Star className="h-4 w-4 fill-emerald-400" /> {title.rating.toFixed(1)}
            </span>
            <span className="text-zinc-300">{title.year}</span>
            <span className="rounded border border-zinc-500 px-1.5 py-0.5 text-[11px] text-zinc-300">
              {title.maturity}
            </span>
            <span className="text-zinc-300">{fmtDuration(title.durationSec)}</span>
            <span className="rounded-full bg-panel/80 px-3 py-0.5 text-xs font-semibold text-zinc-200 ring-1 ring-line">
              {title.genre}
            </span>
          </div>

          <p className="fade-up fade-up-3 clamp-3 mt-4 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            {title.synopsis}
          </p>

          <div className="fade-up fade-up-4 mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={`/watch/${tid}`}
              className="group flex items-center gap-2.5 rounded-lg bg-white px-7 py-3 text-base font-bold text-black transition hover:bg-zinc-200"
            >
              <Play className="h-5 w-5 fill-black transition-transform group-hover:scale-110" />
              Play
            </Link>
            <button
              onClick={() => onInfo(title)}
              className="flex items-center gap-2.5 rounded-lg bg-panel/70 px-6 py-3 text-base font-semibold text-white ring-1 ring-line backdrop-blur transition hover:bg-panel-2"
            >
              <Info className="h-5 w-5" />
              More Info
            </button>
            <button
              onClick={() => onToggleList(tid, inMyList)}
              aria-label="Toggle My List"
              className={`flex h-12 w-12 items-center justify-center rounded-full ring-1 backdrop-blur transition ${
                inMyList
                  ? "bg-brand text-white ring-brand"
                  : "bg-panel/70 text-white ring-line hover:bg-panel-2"
              }`}
            >
              {inMyList ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
