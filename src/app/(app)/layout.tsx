// ============================================================================
// (app) LAYOUT — the authenticated shell. Server-side session check (defense
// in depth on top of middleware) + the shared Navbar.
// ============================================================================
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getSessionUser } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-ink">
      <Navbar user={{ name: user.name, role: user.role }} />
      {children}
    </div>
  );
}
