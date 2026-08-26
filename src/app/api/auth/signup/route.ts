// POST /api/auth/signup — create account (rate-limited against brute force)
import { signup } from "@/server/controllers/auth.controller";
import { rateLimit, clientIp } from "@/server/middleware/rateLimit";
import { err } from "@/server/utils/respond";
import { connectDB } from "@/server/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await connectDB();
  const rl = rateLimit({ key: "signup", ip: clientIp(req), limit: 8, windowMs: 5 * 60_000 });
  if (!rl.allowed) return err(429, `Too many attempts. Retry in ${rl.retryAfterSec}s`);
  return signup(req);
}
