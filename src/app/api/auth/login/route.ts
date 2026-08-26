// POST /api/auth/login — verify credentials, set httpOnly JWT cookie
import { login } from "@/server/controllers/auth.controller";
import { rateLimit, clientIp } from "@/server/middleware/rateLimit";
import { err } from "@/server/utils/respond";
import { connectDB } from "@/server/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await connectDB();
  const rl = rateLimit({ key: "login", ip: clientIp(req), limit: 10, windowMs: 5 * 60_000 });
  if (!rl.allowed) return err(429, `Too many attempts. Retry in ${rl.retryAfterSec}s`);
  return login(req);
}
