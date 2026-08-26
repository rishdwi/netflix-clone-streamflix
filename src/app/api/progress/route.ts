// GET  /api/progress -> Continue Watching row for the user
// POST /api/progress -> upsert playhead { titleId, positionSec, durationSec }
import { getMyProgressRow, saveProgress } from "@/server/controllers/progress.controller";
import { connectDB } from "@/server/db";

export const runtime = "nodejs";

export async function GET() {
  await connectDB();
  return getMyProgressRow();
}

export async function POST(req: Request) {
  await connectDB();
  return saveProgress(req);
}
