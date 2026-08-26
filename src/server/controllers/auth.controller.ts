// ============================================================================
// AUTH CONTROLLER — signup / login / logout / me
// ----------------------------------------------------------------------------
// Flow (identical to an Express+Mongoose version):
//   signup: validate -> hash password with bcrypt -> INSERT user -> sign JWT -> cookie
//   login:  find user  -> bcrypt.compare          -> sign JWT -> cookie
// bcrypt is a SLOW, salted hash => even if the DB leaks, passwords stay safe.
// ============================================================================
import bcrypt from "bcryptjs";
import { ok, err } from "@/server/utils/respond";
import { signSession } from "@/server/utils/jwt";
import { setSessionCookie, clearSessionCookie, getSessionUser } from "@/server/middleware/auth";
import { createUser, findUserByEmail, toPublicUser } from "@/server/models/user.model";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signup(req: Request) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return err(400, "Invalid JSON body");
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  // --- server-side validation (never trust the client) ----------------------
  if (name.length < 2 || name.length > 60) return err(400, "Name must be 2-60 characters");
  if (!EMAIL_RE.test(email)) return err(400, "Please enter a valid email address");
  if (password.length < 6 || password.length > 72)
    return err(400, "Password must be at least 6 characters");

  // --- uniqueness check ------------------------------------------------------
  const existing = await findUserByEmail(email);
  if (existing) return err(409, "An account with this email already exists");

  // --- bcrypt: 10 salt rounds (2^10 = 1024 iterations of setup) --------------
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({ name, email, passwordHash });

  // --- issue JWT session ------------------------------------------------------
  const token = await signSession({ sub: user._id.toString(), email: user.email, name: user.name, role: user.role });
  const res = ok({ user: toPublicUser(user) }, { status: 201 });
  setSessionCookie(res, token);
  return res;
}

export async function login(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return err(400, "Invalid JSON body");
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  const user = await findUserByEmail(email);
  // Uniform error message — don't leak WHICH part failed (account enumeration).
  if (!user) return err(401, "Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return err(401, "Invalid email or password");

  const token = await signSession({ sub: user._id.toString(), email: user.email, name: user.name, role: user.role });
  const res = ok({ user: toPublicUser(user) });
  setSessionCookie(res, token);
  return res;
}

export async function logout() {
  const res = ok({ message: "Signed out" });
  clearSessionCookie(res); // JWT is stateless: "logout" = delete the client's copy
  return res;
}

export async function me() {
  const user = await getSessionUser();
  if (!user) return err(401, "Not signed in");
  return ok({ user });
}
