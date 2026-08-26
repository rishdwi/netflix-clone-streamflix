// ============================================================================
// LANDING PAGE (public) — Netflix-style marketing splash over a key-art
// collage. Logged-in users are forwarded straight to /browse.
// ============================================================================
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clapperboard, Play, MonitorSmartphone, Gauge, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/server/middleware/auth";
import { BACKDROPS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect("/browse");

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink">
      {/* ---- key-art collage backdrop ---- */}
      <div className="absolute inset-0 grid grid-cols-2 gap-2 p-2 opacity-40 sm:grid-cols-4 lg:grid-cols-5">
        {BACKDROPS.map((b) => (
          <div key={b.url} className="relative aspect-video overflow-hidden rounded-xl">
            <Image src={b.url} alt="" fill className="object-cover" sizes="20vw" />
          </div>
        ))}
        {BACKDROPS.map((b) => (
          <div key={b.url + "-2"} className="relative hidden aspect-video overflow-hidden rounded-xl lg:block">
            <Image src={b.url} alt="" fill className="object-cover" sizes="20vw" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/60 to-ink" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,12,0.9)_100%)]" />

      {/* ---- top bar ---- */}
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
        <span className="wordmark flex items-center gap-2 text-xl sm:text-2xl">
          <Clapperboard className="h-6 w-6" strokeWidth={2.4} />
          STREAMFLIX
        </span>
        <Link
          href="/login"
          className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-deep"
        >
          Sign In
        </Link>
      </header>

      {/* ---- hero copy ---- */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-160px)] max-w-3xl flex-col items-center justify-center px-5 text-center">
        <p className="fade-up mb-5 rounded-full border border-line bg-panel/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-300 backdrop-blur">
          A full-stack streaming platform
        </p>
        <h1 className="fade-up fade-up-1 text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-6xl md:text-7xl">
          Unlimited films.
          <br />
          <span className="bg-gradient-to-r from-brand via-red-400 to-brand bg-clip-text text-transparent">
            Zero buffering.
          </span>
        </h1>
        <p className="fade-up fade-up-2 mt-5 max-w-xl text-base text-zinc-300 sm:text-lg">
          Adaptive-bitrate HLS streaming, per-user watchlists, continue-watching
          sync and an admin CMS — engineered like the real thing, at classroom scale.
        </p>

        <form action="/signup" method="GET" className="fade-up fade-up-3 mt-8 flex w-full max-w-lg flex-col gap-3 sm:flex-row">
          <input
            type="email"
            name="email"
            required
            placeholder="Email address"
            className="h-14 flex-1 rounded-lg border border-line bg-black/60 px-4 text-white placeholder-zinc-500 outline-none backdrop-blur transition focus:border-brand"
          />
          <button className="flex h-14 items-center justify-center gap-2 rounded-lg bg-brand px-7 text-base font-bold text-white transition hover:bg-brand-deep">
            Get Started <Play className="h-4 w-4 fill-white" />
          </button>
        </form>

        <div className="fade-up fade-up-4 mt-10 grid w-full max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
          {[
            { icon: Gauge, t: "Adaptive HLS", d: "Bitrate ladder + range requests" },
            { icon: ShieldCheck, t: "JWT + bcrypt", d: "Salted hashes, httpOnly sessions" },
            { icon: MonitorSmartphone, t: "Resume anywhere", d: "Playhead synced per user" },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-line bg-panel/50 p-4 backdrop-blur">
              <Icon className="mb-2 h-5 w-5 text-brand" />
              <p className="text-sm font-bold text-white">{t}</p>
              <p className="mt-0.5 text-xs text-zinc-400">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-line/60 bg-black/40 py-4 text-center text-xs text-zinc-500">
        Next.js · PostgreSQL · Drizzle ORM · HLS.js · JWT — BCA Final Year Project
      </footer>
    </main>
  );
}
