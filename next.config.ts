import type { NextConfig } from "next";

// Security headers — the equivalent of the `helmet` middleware in Express.
// CSP is kept permissive enough for Next's inline bootstrap + HLS blob workers.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" }, // no MIME sniffing
  { key: "X-Frame-Options", value: "DENY" }, // no clickjacking
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:", // Next dev/HMR + hls.js worker
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:", // MediaSource-fed <video>
      "connect-src 'self' blob: data:",
      "worker-src 'self' blob:",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
