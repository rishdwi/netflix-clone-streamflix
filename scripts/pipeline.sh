#!/usr/bin/env bash
# ============================================================================
# VIDEO TRANSCODING PIPELINE (reproduces everything under media/hls/)
# ----------------------------------------------------------------------------
# This is the small-scale version of what Netflix's ingestion pipeline does:
#   master file  ->  transcode into a BITRATE LADDER (360p, 720p, ...)
#                ->  split into fixed-length segments (4s MPEG-TS chunks)
#                ->  emit a master.m3u8 that lists every rendition
# The player then picks a rendition per segment based on measured bandwidth
# (Adaptive Bitrate Streaming / ABR).
#
# Requires: ffmpeg (npm i ffmpeg-static gives you a static binary; `FF=` below)
# Usage:    bash scripts/pipeline.sh
# ============================================================================
set -e
FF=$(node -p "require('ffmpeg-static')" 2>/dev/null || echo ffmpeg)
mkdir -p media/src media/hls

# 1. FETCH royalty-free sources (Blender Foundation open movies / W3C test media)
dl() { curl -fL --retry 2 --max-time 90 -s -o "media/src/$1" "$2" && echo "OK $1"; }
dl bunny.mp4     "https://media.w3.org/2010/05/bunny/trailer.mp4"
dl meadow.mp4    "https://media.w3.org/2010/05/bunny/movie.mp4"
dl sintel_lo.mp4 "https://media.w3.org/2010/05/sintel/trailer.mp4"
dl movie300.mp4  "https://media.w3.org/2010/05/video/movie_300.mp4"
dl peach.mov     "https://download.blender.org/peach/trailer/trailer_480p.mov"
dl dragon.mp4    "https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4"

# 2. TRANSCODE -> HLS ladder (360p @ 800k, 720p @ 2400k; 4s segments)
encode() { # slug, source, extra-input-args...
  local slug=$1 src=$2; shift 2
  mkdir -p "media/hls/$slug/360p" "media/hls/$slug/720p"
  "$FF" -y -loglevel error "$@" -i "media/src/$src" -map 0:v:0 -map 0:a? \
    -vf "scale=640:360:force_original_aspect_ratio=decrease:force_divisible_by=2" \
    -c:v libx264 -preset ultrafast -pix_fmt yuv420p -b:v 800k -maxrate 856k -bufsize 1200k \
    -g 48 -keyint_min 48 -sc_threshold 0 -c:a aac -b:a 96k -ac 2 \
    -f hls -hls_time 4 -hls_playlist_type vod \
    -hls_segment_filename "media/hls/$slug/360p/seg_%03d.ts" "media/hls/$slug/360p/index.m3u8"
  "$FF" -y -loglevel error "$@" -i "media/src/$src" -map 0:v:0 -map 0:a? \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2" \
    -c:v libx264 -preset ultrafast -pix_fmt yuv420p -b:v 2400k -maxrate 2568k -bufsize 3600k \
    -g 48 -keyint_min 48 -sc_threshold 0 -c:a aac -b:a 128k -ac 2 \
    -f hls -hls_time 4 -hls_playlist_type vod \
    -hls_segment_filename "media/hls/$slug/720p/seg_%03d.ts" "media/hls/$slug/720p/index.m3u8"
  printf '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=900000,RESOLUTION=640x360,CODECS="avc1.4d001f,mp4a.40.2"\n360p/index.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2700000,RESOLUTION=1280x720,CODECS="avc1.4d001f,mp4a.40.2"\n720p/index.m3u8\n' \
    > "media/hls/$slug/master.m3u8"
  echo "encoded $slug"
}

encode bunny bunny.mp4
encode meadow meadow.mp4 -t 120        # cap the full feature at 2 min for the demo
encode sintel_lo sintel_lo.mp4
encode movie300 movie300.mp4 -t 90
encode peach peach.mov
encode dragon dragon.mp4

rm -rf media/src
echo "Pipeline complete -> media/hls/"
