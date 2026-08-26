// GET /api/movies/:id — title details + inMyList + saved progress
import { titleDetails } from "@/server/controllers/titles.controller";
import { err } from "@/server/utils/respond";
import { connectDB } from "@/server/db";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await ctx.params;
  if (!id) return err(400, "Invalid id");
  return titleDetails(id);
}
