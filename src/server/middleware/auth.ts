// ============================================================================
// AUTH MIDDLEWARE — the equivalent of Express's `authMiddleware(req,res,next)`
// ----------------------------------------------------------------------------
// The JWT lives in an httpOnly cookie ("sf_session"), which means:
//   * JavaScript in the page cannot read it (protects against XSS token theft)
//   * the browser attaches it automatically to every same-origin request
// requireUser()/requireAdmin() are called at the top of protected controllers.
// ============================================================================
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySession, type SessionUser } from "@/server/utils/jwt";

export const COOKIE_NAME = "sf_session";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

/** Read + verify the session cookie. Returns the user or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** 401 guard for "any logged-in user". */
export async function requireUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

/** 403 guard for the admin panel API (role-based access control). */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

/** Attach the freshly signed JWT to a response as an httpOnly cookie. */
export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, // not readable from JS (XSS protection)
    sameSite: "lax", // CSRF protection for normal navigation
    secure: process.env.NODE_ENV === "production", // HTTPS-only in prod
    path: "/",
    maxAge: SEVEN_DAYS,
  });
}

/** Logout: expire the cookie immediately. */
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}
