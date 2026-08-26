// PATCH  /api/admin/titles/:id -> update title (admin only)
// DELETE /api/admin/titles/:id -> delete title (admin only; cascades list/progress)
import { adminUpdateTitle, adminDeleteTitle } from "@/server/controllers/titles.controller";
import { connectDB } from "@/server/db";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await ctx.params;
  return adminUpdateTitle(req, id);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await ctx.params;
  return adminDeleteTitle(id);
}
