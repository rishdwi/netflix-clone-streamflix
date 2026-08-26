// ============================================================================
// Stages media/hls/** into .netlify/blobs/deploy/ ahead of the Next.js build.
// ----------------------------------------------------------------------------
// The HLS segments (~236 MB) used to be read straight off disk by
// stream.controller.ts via fs + process.cwd(). Next's output file tracer
// picks up that fs access and bundles the *entire* media/hls directory into
// the server function, which blows past Netlify's 250 MB function size
// limit. Copying the files here instead means they ship as Netlify Blobs
// (file-based deploy upload) and never touch the function bundle; the
// controller fetches them from the deploy blob store at request time.
// ============================================================================
const fs = require("fs");
const path = require("path");

const SRC_ROOT = path.join(__dirname, "..", "media", "hls");
const DEST_ROOT = path.join(__dirname, "..", ".netlify", "blobs", "deploy", "hls");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(SRC_ROOT)) {
  console.warn(`[stage-media-blobs] no media directory at ${SRC_ROOT}, skipping`);
  process.exit(0);
}

fs.rmSync(DEST_ROOT, { recursive: true, force: true });
copyDir(SRC_ROOT, DEST_ROOT);
console.log(`[stage-media-blobs] staged ${SRC_ROOT} -> ${DEST_ROOT}`);
