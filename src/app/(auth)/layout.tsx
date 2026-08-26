// ============================================================================
// (auth) LAYOUT — cinematic backdrop + centered card for /login and /signup.
// ============================================================================
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Clapperboard } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-ink px-4 py-16">
      <div className="absolute inset-0">
        <Image
          src="/images/backdrops/ember-and-claw.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-45"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/55 to-ink" />
      </div>

      <Link href="/" className="wordmark absolute left-5 top-5 z-10 flex items-center gap-2 text-xl sm:left-10 sm:top-7 sm:text-2xl">
        <Clapperboard className="h-6 w-6" strokeWidth={2.4} />
        STREAMFLIX
      </Link>

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </main>
  );
}
