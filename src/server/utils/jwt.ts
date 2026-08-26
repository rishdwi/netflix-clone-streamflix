// ============================================================================
// JWT UTILITY  (stateless session tokens — same idea as jsonwebtoken in Express)
// ----------------------------------------------------------------------------
// A JWT is a signed, self-contained token: header.payload.signature.
// The server signs it with JWT_SECRET at login; on every later request the
// client sends it back (in an httpOnly cookie) and we verify the signature —
// no DB lookup needed to know WHO the user is (that's why JWT scales well).
// We use `jose` because it works in both Node and the Next.js edge middleware.
// ============================================================================
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "streamflix-dev-secret-change-me-in-production"
);

export type SessionPayload = {
  sub: string; // MongoDB ObjectId as string
  email: string;
  name: string;
  role: "user" | "admin";
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
};

/** Sign a new session token valid for 7 days (called on login/signup). */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/** Verify a token coming back from the client. Returns null if invalid/expired. */
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const id = payload.sub;
    if (!id) return null;
    return {
      id: String(id),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: payload.role === "admin" ? "admin" : "user",
    };
  } catch {
    return null;
  }
}
