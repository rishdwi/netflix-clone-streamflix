"use client";

// ============================================================================
// NAVBAR — fixed top bar: transparent over the hero, solid black on scroll.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Clapperboard, Search, ShieldCheck, LogOut, ChevronDown } from "lucide-react";

type Props = { user: { name: string; role: "user" | "admin" } };

export default function Navbar({ user }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const isWatch = pathname.startsWith("/watch");
  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm transition-colors hover:text-white ${
        pathname === href ? "text-white font-semibold" : "text-zinc-400"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled || isWatch
          ? "bg-ink/90 backdrop-blur-md border-b border-line/60"
          : "bg-gradient-to-b from-black/80 via-black/30 to-transparent"
      } ${isWatch ? "opacity-0 hover:opacity-100 -translate-y-2 hover:translate-y-0" : ""}`}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-8 px-4 sm:px-8">
        <Link href="/browse" className="wordmark flex items-center gap-2 text-lg sm:text-xl">
          <Clapperboard className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.4} />
          STREAMFLIX
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {link("/browse", "Home")}
          {link("/my-list", "My List")}
          <Link
            href="/search"
            className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <Search className="h-4 w-4" />
            Search
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/search"
            className="rounded-full p-2 text-zinc-300 transition hover:bg-panel hover:text-white md:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-line/70 bg-panel px-3 py-1.5 text-sm transition hover:border-zinc-500"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-xs font-black text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[120px] truncate text-zinc-200 sm:block">{user.name}</span>
              <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>
            {menuOpen && (
              <div className="fade-in absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-black/60">
                <Link
                  href="/my-list"
                  className="block px-4 py-3 text-sm text-zinc-300 transition hover:bg-panel-2 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  My List
                </Link>
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    className="block px-4 py-3 text-sm text-zinc-300 transition hover:bg-panel-2 hover:text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 border-t border-line px-4 py-3 text-left text-sm text-brand transition hover:bg-panel-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
