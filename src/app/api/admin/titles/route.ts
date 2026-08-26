// GET  /api/admin/titles -> all titles (admin only)
// POST /api/admin/titles -> create title (admin only)
import { adminListTitles, adminCreateTitle } from "@/server/controllers/titles.controller";
import { connectDB } from "@/server/db";

export const runtime = "nodejs";

export async function GET() {
  await connectDB();
  return adminListTitles();
}

export async function POST(req: Request) {
  await connectDB();
  return adminCreateTitle(req);
}
