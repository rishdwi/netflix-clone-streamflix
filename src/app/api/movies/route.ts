// GET /api/movies — browse catalogue (hero + trending + top rated + genre rows)
import { catalog } from "@/server/controllers/titles.controller";
import { connectDB } from "@/server/db";

export const runtime = "nodejs";

export async function GET() {
  await connectDB();
  return catalog();
}
