"use client";

// ============================================================================
// AUTH FORM — shared by /login and /signup. Posts to the JWT auth API and,
// on success, forwards to ?next= (or /browse).
// ============================================================================
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn, UserPlus, Sparkles } from "lucide-react";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/browse";

  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(isLogin ? { email, password } : { name, email, password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) throw new Error(body?.error ?? "Something went wrong");
      router.push(next);
      router.refresh();
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Something went wrong");
      setBusy(false);
    }
  };

  const fillDemo = (kind: "demo" | "admin") => {
    setEmail(kind === "admin" ? "admin@streamflix.dev" : "demo@streamflix.dev");
    setPassword(kind === "admin" ? "admin123" : "demo1234");
    setError(null);
  };

  return (
    <div className="fade-up w-full max-w-md rounded-2xl border border-line bg-black/70 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">
      <h1 className="text-3xl font-black text-white">{isLogin ? "Sign In" : "Create Account"}</h1>
      <p className="mt-1.5 text-sm text-zinc-400">
        {isLogin ? "Welcome back. Your list missed you." : "Join StreamFlix in under a minute."}
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        {!isLogin && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder="Ada Lovelace"
              className="w-full rounded-lg border border-line bg-panel px-4 py-3 text-white placeholder-zinc-600 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full rounded-lg border border-line bg-panel px-4 py-3 text-white placeholder-zinc-600 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder={isLogin ? "Your password" : "6+ characters"}
              className="w-full rounded-lg border border-line bg-panel px-4 py-3 pr-11 text-white placeholder-zinc-600 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label="Toggle password visibility"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
            >
              {showPw ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm text-red-300">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-base font-bold text-white transition hover:bg-brand-deep disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isLogin ? (
            <>
              <LogIn className="h-5 w-5" /> Sign In
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5" /> Create Account
            </>
          )}
        </button>
      </form>

      {isLogin && (
        <div className="mt-6 rounded-xl border border-line bg-panel/60 p-4">
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 text-brand" /> Demo accounts (viva ready)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fillDemo("demo")}
              className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Viewer<br />
              <span className="font-normal text-zinc-500">demo@streamflix.dev</span>
            </button>
            <button
              onClick={() => fillDemo("admin")}
              className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Admin<br />
              <span className="font-normal text-zinc-500">admin@streamflix.dev</span>
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-zinc-500">
        {isLogin ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-semibold text-white hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already a member?{" "}
            <Link href="/login" className="font-semibold text-white hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
