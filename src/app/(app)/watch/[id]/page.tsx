"use client";

// ============================================================================
// WATCH PAGE — loads title details (incl. the last playhead position), then
// mounts the adaptive HLS player. Deep links like /watch/:id are resumable.
// ============================================================================
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import HlsPlayer from "@/components/HlsPlayer";
import { api } from "@/lib/constants";
import type { Title } from "@/lib/types";

type Details = {
  title: Title;
  inMyList: boolean;
  progress: { positionSec: number; durationSec: number } | null;
};

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Details>(`/api/movies/${id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <p className="text-zinc-400">{error}</p>
        <Link href="/browse" className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-black">
          Back to Browse
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-brand" />
        <p className="text-sm text-zinc-500">Preparing your stream…</p>
      </div>
    );
  }

  const { title, progress } = data;
  const resumeAt =
    progress && progress.durationSec > 0 && progress.positionSec < progress.durationSec * 0.95
      ? progress.positionSec
      : 0;

  const titleId = title.id || title._id || id;

  return (
    <HlsPlayer
      titleId={titleId}
      streamSlug={title.streamSlug}
      title={title.title}
      resumeAtSec={resumeAt}
    />
  );
}
