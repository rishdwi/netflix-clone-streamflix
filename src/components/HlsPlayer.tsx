"use client";

// ============================================================================
// HLS VIDEO PLAYER — the heart of the streaming demo.
// ----------------------------------------------------------------------------
// ADAPTIVE BITRATE (ABR), in one paragraph for the viva:
//   master.m3u8 lists renditions (360p ~0.9Mbps, 720p ~2.6Mbps). hls.js
//   downloads 4-second segments and MEASURES the download speed of each one.
//   It climbs to the highest rendition the connection can sustain and drops
//   down before the buffer runs dry — that's why Netflix "adjusts quality"
//   instead of pausing to buffer. The Quality menu switches to manual mode.
//
// CONTINUE WATCHING: every 5s (and on pause/hide/unload) we POST the playhead
// to /api/progress. Reload this page halfway through — playback resumes.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  ChevronLeft,
  Loader2,
  PictureInPicture2,
} from "lucide-react";

type Props = {
  titleId: string;
  streamSlug: string;
  title: string;
  resumeAtSec?: number;
};

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function HlsPlayer({ titleId, streamSlug, title, resumeAtSec = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [levels, setLevels] = useState<{ height: number; bitrate: number }[]>([]);
  const [level, setLevel] = useState(-1); // -1 = Auto (ABR)
  const [controlsVisible, setControlsVisible] = useState(true);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- progress persistence ---------------------------------------------------
  const saveProgress = useCallback(
    (useBeacon = false) => {
      const v = videoRef.current;
      if (!v || !v.duration) return;
      const payload = JSON.stringify({
        titleId,
        positionSec: Math.floor(v.currentTime),
        durationSec: Math.floor(v.duration),
      });
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/progress", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    },
    [titleId]
  );

  // periodic 5s save + page-hide save
  useEffect(() => {
    const interval = setInterval(() => saveProgress(false), 5000);
    const onHide = () => saveProgress(true);
    const onVisibility = () => document.visibilityState === "hidden" && saveProgress(true);
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      saveProgress(true); // final save when leaving the page
    };
  }, [saveProgress]);

  // ---- Video / HLS bootstrap ---------------------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let destroyed = false;

    // Check if the stream is a direct MP4 video
    const isMp4 = streamSlug.endsWith(".mp4") || ["animal", "kgf-2", "toxic"].includes(streamSlug);
    const mp4Src = streamSlug.startsWith("/") ? streamSlug : `/videos/${streamSlug}.mp4`;
    const hlsSrc = `/api/stream/${streamSlug}/master.m3u8`;

    if (isMp4) {
      video.src = mp4Src;
      video.addEventListener("loadedmetadata", () => {
        if (resumeAtSec > 3) video.currentTime = resumeAtSec;
        video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      });
      return () => {
        destroyed = true;
      };
    }

    (async () => {
      const { default: HlsCtor } = await import("hls.js");
      if (destroyed) return;

      if (HlsCtor.isSupported()) {
        // MSE path (Chrome/Firefox/Edge): hls.js feeds segments into MediaSource
        const hls = new HlsCtor({
          enableWorker: true,
          startPosition: resumeAtSec > 3 ? resumeAtSec : -1, // resume support!
          capLevelToPlayerSize: false,
        });
        hlsRef.current = hls;
        hls.loadSource(hlsSrc);
        hls.attachMedia(video);
        hls.on(HlsCtor.Events.MANIFEST_PARSED, (_e, data) => {
          setLevels(
            data.levels.map((l) => ({ height: l.height, bitrate: l.bitrate })).sort((a, b) => b.height - a.height)
          );
          video
            .play()
            .then(() => setPlaying(true))
            .catch(() => setPlaying(false)); // browser blocked unmuted autoplay -> show big play
        });
        hls.on(HlsCtor.Events.ERROR, (_e, data) => {
          if (data.fatal) setError("Stream error — please go back and retry.");
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari path: native HLS support, no library needed
        video.src = hlsSrc;
        video.addEventListener("loadedmetadata", () => {
          if (resumeAtSec > 3) video.currentTime = resumeAtSec;
          video.play().catch(() => setPlaying(false));
        });
      } else {
        setError("This browser cannot play HLS streams.");
      }
    })();

    return () => {
      destroyed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamSlug]);

  // ---- video element event wiring ----------------------------------------------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const setT = () => setCurrentTime(v.currentTime);
    const setD = () => setDuration(v.duration);
    const onPlay = () => { setPlaying(true); setEnded(false); };
    const onPause = () => { setPlaying(false); saveProgress(false); };
    const onWait = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onEnded = () => { setEnded(true); saveProgress(false); };
    v.addEventListener("timeupdate", setT);
    v.addEventListener("durationchange", setD);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("waiting", onWait);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", setT);
      v.removeEventListener("durationchange", setD);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("waiting", onWait);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("ended", onEnded);
    };
  }, [saveProgress]);

  // ---- controls ---------------------------------------------------------------
  const pokeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 2800);
  }, []);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(t, v.duration || t));
    setCurrentTime(v.currentTime);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const fullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen().catch(() => {});
  };

  const pip = () => {
    const v = videoRef.current as (HTMLVideoElement & { requestPictureInPicture?: () => Promise<void> }) | null;
    v?.requestPictureInPicture?.().catch(() => {});
  };

  const pickLevel = (idx: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = idx; // -1 = auto ABR
    setLevel(idx);
  };

  const restart = () => {
    setEnded(false);
    seek(0);
    videoRef.current?.play().catch(() => {});
  };

  // keyboard shortcuts on the player surface
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === " ") { e.preventDefault(); togglePlay(); }
    else if (e.key === "ArrowRight") seek(currentTime + 10);
    else if (e.key === "ArrowLeft") seek(currentTime - 10);
    else if (e.key.toLowerCase() === "f") fullscreen();
    else if (e.key.toLowerCase() === "m") toggleMute();
  };

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-ink text-zinc-300">
        <p>{error}</p>
        <Link href="/browse" className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-black">
          Back to Browse
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKey}
      onMouseMove={pokeControls}
      onClick={togglePlay}
      className={`relative h-screen w-full select-none overflow-hidden bg-black outline-none ${
        controlsVisible ? "cursor-default" : "cursor-none"
      }`}
    >
      <video ref={videoRef} className="h-full w-full object-contain" playsInline />

      {/* buffering spinner */}
      {buffering && !ended && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-14 w-14 animate-spin text-brand" />
        </div>
      )}

      {/* center play (when autoplay blocked) */}
      {!playing && !buffering && !ended && (
        <button
          onClick={togglePlay}
          aria-label="Play"
          className="pulse-glow absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white transition hover:scale-105"
        >
          <Play className="h-9 w-9 fill-white" />
        </button>
      )}

      {/* end-of-video overlay */}
      {ended && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/80 backdrop-blur-sm">
          <p className="text-2xl font-bold text-white">{title}</p>
          <p className="text-sm text-zinc-400">Thanks for watching on StreamFlix</p>
          <div className="flex gap-3">
            <button
              onClick={restart}
              className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"
            >
              <RotateCcw className="h-4 w-4" /> Watch again
            </button>
            <Link
              href="/browse"
              className="rounded-lg bg-panel px-6 py-3 text-sm font-semibold text-white ring-1 ring-line transition hover:bg-panel-2"
            >
              Back to Browse
            </Link>
          </div>
        </div>
      )}

      {/* top gradient: back link + title */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-5 transition-opacity duration-300 ${
          controlsVisible || !playing ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-4">
          <Link
            href="/browse"
            aria-label="Back to browse"
            className="rounded-full bg-black/50 p-2 text-white ring-1 ring-white/10 transition hover:bg-black/80"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div>
            <p className="text-sm text-zinc-400">You are watching</p>
            <h1 className="text-lg font-bold text-white">{title}</h1>
          </div>
        </div>
      </div>

      {/* bottom control bar */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 pb-4 pt-16 transition-opacity duration-300 ${
          controlsVisible || !playing ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* seek bar */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          className="h-1 w-full cursor-pointer accent-brand"
        />
        <div className="mt-2 flex items-center gap-3">
          <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="rounded-full p-1.5 text-white transition hover:bg-white/10">
            {playing ? <Pause className="h-7 w-7 fill-white" /> : <Play className="h-7 w-7 fill-white" />}
          </button>
          <button onClick={toggleMute} aria-label="Mute" className="rounded-full p-1.5 text-white transition hover:bg-white/10">
            {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </button>
          <span className="ml-1 text-xs font-medium tabular-nums text-zinc-300">
            {fmt(currentTime)} <span className="text-zinc-600">/</span> {fmt(duration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {/* manual quality override (Auto = adaptive bitrate) */}
            {levels.length > 0 && (
              <select
                value={level}
                onChange={(e) => pickLevel(Number(e.target.value))}
                aria-label="Quality"
                className="cursor-pointer rounded-md border border-line bg-panel px-2 py-1.5 text-xs font-semibold text-zinc-200 outline-none transition hover:border-zinc-500"
              >
                <option value={-1}>Auto (ABR)</option>
                {levels.map((l, i) => (
                  <option key={i} value={i}>
                    {l.height}p · {(l.bitrate / 1_000_000).toFixed(1)} Mbps
                  </option>
                ))}
              </select>
            )}
            <button onClick={pip} aria-label="Picture in picture" className="rounded-full p-1.5 text-white transition hover:bg-white/10">
              <PictureInPicture2 className="h-6 w-6" />
            </button>
            <button onClick={fullscreen} aria-label="Fullscreen" className="rounded-full p-1.5 text-white transition hover:bg-white/10">
              <Maximize className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
