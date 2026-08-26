// GET    /api/mylist        -> the user's saved titles
// POST   /api/mylist        -> { titleId } add (idempotent)
// DELETE /api/mylist?id=xxx -> remove
import { getMyList, addToMyList, removeFromMyList } from "@/server/controllers/list.controller";
import { err } from "@/server/utils/respond";
import { connectDB } from "@/server/db";

export const runtime = "nodejs";

export async function GET() {
  await connectDB();
  return getMyList();
}

export async function POST(req: Request) {
  await connectDB();
  return addToMyList(req);
}

export async function DELETE(req: Request) {
  await connectDB();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return err(400, "id param required");
  return removeFromMyList(id);
}
