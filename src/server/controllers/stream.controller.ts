// ============================================================================
// STREAMING CONTROLLER — serves the HLS assets with HTTP Range support.
// ----------------------------------------------------------------------------
// Two file types are served:
//   *.m3u8  playlists  (tiny text manifests; cached briefly, never immutable)
//   *.ts    MPEG-TS segments (~4s of video each)
//
// HTTP RANGE REQUESTS (RFC 7233) — why seeking works:
//   The player can ask for "bytes=524288-1048575" instead of the whole file.
//   We reply 206 Partial Content + Content-Range. Only the needed bytes travel
//   over the wire. In production these exact same semantics are implemented by
//   CDN edge nodes (Netflix Open Connect) sitting close to the viewer.
//
// SECURITY: paths are whitelist-validated to stop directory traversal attacks
// (e.g. GET /api/stream/bunny/../../.env) — a classic viva question!
// ============================================================================
import path from "path";
import { getDeployStore } from "@netlify/blobs";
import { err } from "@/server/utils/respond";
import { requireUser } from "@/server/middleware/auth";
import { AVAILABLE_STREAMS } from "@/lib/constants";

// Segments live in Netlify Blobs (staged from media/hls/ at build time by
// scripts/stage-media-blobs.js) rather than on local disk — the HLS ladder is
// ~236 MB, far too large to bundle into the server function alongside it.
const SEGMENT_RE = /^[a-z0-9._-]+$/i; // whitelist: "720p", "index.m3u8", "seg_004.ts"

const CONTENT_TYPES: Record<string, string> = {
  ".m3u8": "application/vnd.apple.mpegurl", // HLS playlist
  ".ts": "video/mp2t", // MPEG Transport Stream segment
};

export async function serveStreamFile(slug: string, parts: string[], req: Request) {
  // --- Auth gate --------------------------------------------------------------
  // Requires a valid session. VIVA NOTE: Netflix can't attach cookies at CDN
  // scale — it uses time-limited SIGNED URLs ("this URL is valid for 5 min").
  const user = await requireUser();
  if (!user) return err(401, "Sign in to stream");

  // --- Path safety (directory traversal prevention) ----------------------------
  if (!AVAILABLE_STREAMS.includes(slug)) return err(404, "Unknown stream");
  if (parts.length === 0 || parts.length > 2 || parts.some((p) => !SEGMENT_RE.test(p) || p.includes(".."))) {
    return err(400, "Invalid path");
  }

  // Key mirrors the staged layout: .netlify/blobs/deploy/hls/<slug>/<parts...>
  const key = ["hls", slug, ...parts].join("/");

  // --- Fetch the segment from Blobs ---------------------------------------------
  const store = getDeployStore();
  let data: ArrayBuffer | null;
  try {
    data = await store.get(key, { type: "arrayBuffer" });
  } catch {
    return err(404, "Segment not found");
  }
  if (!data) return err(404, "Segment not found");
  const buffer = Buffer.from(data);

  const ext = path.extname(key).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  // Playlists can change between versions => short cache.
  // Segments are immutable content chunks => cache "forever" like a CDN object.
  const cacheControl =
    ext === ".m3u8" ? "no-cache" : "public, max-age=31536000, immutable";

  // --- Range parsing ------------------------------------------------------------
  const size = buffer.length;
  const range = req.headers.get("range");

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match || (!match[1] && !match[2])) {
      return new Response("Malformed Range header", {
        status: 416,
        headers: { "content-range": `bytes */${size}` },
      });
    }
    let start: number, end: number;
    if (match[1] === "") {
      // suffix range: "bytes=-500" => last 500 bytes
      const n = Number(match[2]);
      start = Math.max(0, size - n);
      end = size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    }
    if (start >= size || start > end) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "content-range": `bytes */${size}` },
      });
    }

    // Slice the requested byte window out of the already-fetched buffer.
    const chunk = buffer.subarray(start, end + 1);

    return new Response(new Uint8Array(chunk), {
      status: 206, // Partial Content
      headers: {
        "content-type": contentType,
        "content-length": String(chunk.length),
        "content-range": `bytes ${start}-${end}/${size}`,
        "accept-ranges": "bytes",
        "cache-control": cacheControl,
      },
    });
  }

  // --- Full-file response (normal HLS segment fetch) ---------------------------
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-length": String(size),
      "accept-ranges": "bytes",
      "cache-control": cacheControl,
    },
  });
}
