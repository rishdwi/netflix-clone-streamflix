// ============================================================================
// ROUTE-GUARD MIDDLEWARE (runs at the edge, before any page renders)
// ----------------------------------------------------------------------------
// * Unauthenticated visitors hitting /browse, /watch, /my-list, /admin, /search
//   are bounced to /login (with a ?next= return path).
// * Logged-in users hitting /login or /signup are bounced to /browse.
// * /admin additionally requires role === "admin" (the role rides in the JWT).
// API routes do their own checks inside controllers (defense in depth).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/server/utils/jwt";
import { COOKIE_NAME } from "@/server/middleware/auth";

const PROTECTED = ["/browse", "/watch", "/my-list", "/admin", "/search"];
const AUTH_PAGES = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifySession(token) : null;

  // bounce logged-out users away from app pages
  if (PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!user) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/admin") && user.role !== "admin") {
      return NextResponse.redirect(new URL("/browse", req.url));
    }
  }

  // bounce logged-in users away from auth pages
  if (AUTH_PAGES.some((p) => pathname.startsWith(p)) && user) {
    return NextResponse.redirect(new URL("/browse", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/browse/:path*", "/watch/:path*", "/my-list", "/admin/:path*", "/search", "/login", "/signup"],
};
