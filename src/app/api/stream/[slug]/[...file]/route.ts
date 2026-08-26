// GET /api/stream/:slug/<path...> — HLS playlist + segment delivery
// with HTTP Range support (seeking) and directory-traversal protection.
// Example: /api/stream/bunny/master.m3u8, /api/stream/bunny/720p/seg_004.ts
import { serveStreamFile } from "@/server/controllers/stream.controller";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string; file: string[] }> }) {
  const { slug, file } = await ctx.params;
  return serveStreamFile(slug, file, req);
}
