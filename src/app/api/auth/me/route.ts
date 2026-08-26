// GET /api/auth/me — who am I? (used by client components to hydrate session)
import { me } from "@/server/controllers/auth.controller";
import { connectDB } from "@/server/db";

export const runtime = "nodejs";

export async function GET() {
  await connectDB();
  return me();
}
