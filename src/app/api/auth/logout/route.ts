// POST /api/auth/logout — expire the session cookie
import { logout } from "@/server/controllers/auth.controller";
import { connectDB } from "@/server/db";

export const runtime = "nodejs";

export async function POST() {
  await connectDB();
  return logout();
}
