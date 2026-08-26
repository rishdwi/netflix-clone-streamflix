// GET /api/search?q=... — case-insensitive title/synopsis/genre search
import { search } from "@/server/controllers/titles.controller";
import { connectDB } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await connectDB();
  return search(req);
}
