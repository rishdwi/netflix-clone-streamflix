# StreamFlix → Netflix: How the Same System Scales
### An architecture explainer for the viva — "what I built" vs "what the real world does"

This document explains every moving part of the project **in plain language**, and
then shows the scaled-up equivalent used by platforms like Netflix, YouTube or
Hotstar. Skim the tables; they answer most viva questions directly.

---

## 1. The 10,000-ft view

```
WHAT I BUILT (single machine)                     NETFLIX (planet scale)
─────────────────────────────                     ───────────────────────
┌──────────┐   HTTP/JSON   ┌──────────────────┐   ┌──────────┐  HTTPS  ┌─────────────┐
│ Browser  │◄─────────────►│ Next.js server   │   │ Browser/ │◄───────►│ CDN edge    │
│ (React + │               │  routes → ctrl → │   │ Smart TV │         │ (Open       │
│  HLS.js) │◄─────────────►│  models → PG     │   │ apps     │         │  Connect)   │
└──────────┘   HLS + range │  + stream files  │   └────┬─────┘  HTTPS  └──────┬──────┘
                           └────────┬─────────┘        │                      │ miss
                                    │              ┌───▼──────────────────────▼───┐
                              PostgreSQL           │  AWS: API gateway → 1000s    │
                                                   │  of microservices + S3 +     │
                                                   │  Cassandra/EVCache           │
                                                   └──────────────────────────────┘
```

One sentence version: **a request travels from the UI, through an API, into a
database — and video bytes travel a completely separate, heavily cached path.**

---

## 2. Component-by-component comparison

### 2.1 Video storage & delivery — the biggest difference

| Aspect | What I built | What Netflix does |
| --- | --- | --- |
| Master file | Royalty-free clips (Blender open movies) | Licensed/shot masters (ProRes mezzanine) |
| Transcoding | `scripts/pipeline.sh` → one ffmpeg run → 2 renditions (360p/720p) | Distributed **transcoding farm**: each film split into chunks, encoded in parallel across thousands of workers into ~10–15 renditions (144p→4K, H.264/HEVC/AV1), per-title optimized encoding ladders |
| Storage | Files on the app server's disk (`media/hls`) | Object storage (**AWS S3**) for origin; replicated to **Open Connect** appliances |
| Delivery | My Node server streams with `Accept-Ranges: bytes` + `206 Partial Content` | ISP-embedded **CDN edge servers** serve the same range semantics from a box physically inside your ISP's network |
| Distance | Same machine / same LAN | Edge cache a few kilometers from the viewer |

**Key concept — CDN (Content Delivery Network).** The catalog API must be smart;
the video bytes must be *close*. Netflix pre-positions tonight's popular titles on
~18,000 Open Connect appliances inside ISP networks, so 90%+ of video traffic never
leaves the local ISP. My `stream.controller.ts` plays the role of *one edge node*:
immutable segments, long cache headers, byte-range serving.

**Key concept — cache fill.** When a segment isn't on the edge (a *miss*), the
edge fetches from origin (S3), caches it, and serves the next user locally.
That's identical to my `cache.ts` pattern, just around files instead of rows.

### 2.2 Adaptive Bitrate (ABR) streaming

| | Mine | Netflix |
| --- | --- | --- |
| Format | HLS: `master.m3u8` + per-rendition playlists + 4s `.ts` segments | HLS **and** MPEG-DASH/ CMAF, 2–4s chunks |
| Ladder | 2 rungs: 0.9 Mbps, 2.6 Mbps | 10–15 rungs; per-shot optimized bitrates |
| Decision | **hls.js** measures each segment's download speed and picks the highest sustainable rung; falls back before the buffer empties | Same idea client-side, plus server-assisted startup ladders per device/network profile |

**Viva one-liner:** *“Segmenting video lets the player change quality every few
seconds, so a weak connection lowers resolution instead of stopping to buffer.”*
You can demo it live: open the Quality menu — `Auto (ABR)` vs manual `720p/360p`.

### 2.3 API layer

| | Mine | Netflix |
| --- | --- | --- |
| Style | REST, layered `routes → controllers → models → middleware` | ~700+ **microservices** behind an API gateway (Zuul/Spring Cloud Gateway) |
| Server/API boundary | Next.js route handlers in one Next server | Gateway routes to stateless Java/Node services |
| Scaling | One process (could run PM2/N replicas) | Each service auto-scales horizontally; thousands of pods/VMs |
| Load balancing | Not needed at classroom scale (mention: nginx/ALB round-robin + health checks like my `/api/health`) | ALB/NLB + client-side load balancing (Ribbon), health-checked pools |

**Key concept — microservices.** Instead of one big app ("monolith"), each
*capability* (users, catalog, bookmark, playback sessions, billing…) is a small
service with its own deployment and datastore. Benefits: scale the hot parts
only, deploy independently, isolate failures. Costs: network latency, distributed
tracing, eventual consistency — that's why a course project correctly stays
monolithic.

### 2.4 Databases & caching

| Data | Mine (PostgreSQL) | Netflix |
| --- | --- | --- |
| Users/sessions | `users` table + **stateless JWT** (no session table lookup!) | Distributed key-value + JWT-ish tokens; geo-replicated |
| Catalog | `titles` table, cached whole payload 60s (`x-cache: HIT/MISS`) | Cached in **EVCache** (memcached fleet); catalog service sharded |
| My List / progress | Two tables; UPSERT on `UNIQUE(user,title)` | Per-user data in **Cassandra** (multi-DC, AP); progress events piped through **Kafka** |
| Failover | Single instance | Multi-region active-active; your profile follows you |

**Key concept — cache-aside.** My `/api/movies` does exactly the textbook
pattern: read cache → miss → query DB → fill cache → serve. Admin writes
*invalidate* the key. Replace the in-process map with Redis and it becomes the
production pattern.

**Key concept — sharding.** When one DB can't hold the data/traffic, split rows
by a key (e.g. `userId % 16` shards). My `UNIQUE(user_id, title_id)` indexes and
narrow tables are designed so *user-scoped* data is trivially shardable by user.

**Key concept — write heavy paths.** Progress updates are small but *very*
frequent (every 5s per viewer). Netflix funnels them through Kafka queues and
batches them; I upsert straight to Postgres, which is perfectly fine until
~thousands of concurrent writers.

### 2.5 Auth & security

| | Mine | Netflix |
| --- | --- | --- |
| Credentials | bcrypt (salted, slow) | bcrypt/argon2-class hashing + mandatory MFA options/Risk checks |
| Session | HS256 JWT, 7d, httpOnly + sameSite cookie | Short-lived access tokens + secure refresh; device-bound |
| Content protection | Login-gated stream endpoint | **DRM (Widevine/PlayReady/FairPlay)** + expiring **signed URLs** per segment/playlist |
| Abuse | In-memory sliding-window rate limiter → 429 | WAF + per-service rate limits, login risk engines |
| Headers/TLS | CSP, X-Frame-Options, nosniff, Referrer-Policy | Same, everywhere, enforced at edges |

**Viva one-liner for signed URLs:** *“A CDN can't verify cookies cheaply for
billions of segment requests, so the API mints URLs like `seg_004.ts?expires=…&sig=…`.
The edge only checks the signature — no DB lookup per segment.”*

### 2.6 The playback session end-to-end (who does what, when)

```
MINE                                              NETFLIX
1. React page fetches /api/movies/:id        1. App calls playback API (gateway)
2. JWT cookie authorizes; SQL returns        2. Manifest service picks ladder by
   streamSlug + saved playhead                  device/network; DRM license issued
3. hls.js GETs master.m3u8 from my           3. Player gets DASH/HLS manifest
   range-capable endpoint                       pointing at 2–3 nearest OCAs
4. Player measures segment speed;            4. Same ABR logic, better ladders
   climbs/drops between 360p/720p
5. Every 5s: POST /api/progress →            5. Beacon events → Kafka → Cassandra;
   UPSERT in PostgreSQL                         resume works on any device instantly
```

---

## 3. Capacity math you can quote in the viva

Rough, defensible napkin numbers:

| Metric | Classroom build | Netflix-class target |
| --- | --- | --- |
| Concurrent viewers | 5–20 | 100–300 million+ at peak |
| Avg video bitrate | 2.6 Mbps (720p rung) | 3–6 Mbps blended |
| One server video egress | ~25–50 Mbps comfortably | single OCA pushes ~100–400 Gbps |
| Why it works | everything is local | **90%+ of bytes from inside the viewer's ISP** |
| Catalog reads per second | tens | hundreds of thousands (served ~99% from cache) |

The punchline: neither system “streams from a database.” Video is pre-cut,
immutable content served by cheap, heavily cached file servers close to viewers;
databases only handle *state* (auth, lists, playhead).

---

## 4. Failure & resilience (a favorite viva topic)

| Question | My answer | Netflix-scale answer |
| --- | --- | --- |
| Server crashes mid-stream? | Player stalls; restart resumes from saved playhead | Player re-requests manifest from another edge; sessions are stateless |
| DB down? | Browse fails gracefully (error state) | Caches absorb reads; multi-DC failover; Chaos Monkey tests this *on purpose* |
| Hot new release at midnight? | Fine at this scale | Overnight cache-fill to OCAs; origin shielding; load-shedding non-critical APIs |
| User on bad Wi-Fi? | ABR drops to 360p automatically | ABR + lower rungs + AV1 efficiency |

---

## 5. If I had another month (credits & honesty section)

1. Swap the in-memory TTL cache for **Redis** (the `cache.ts` interface is already
   Redis-shaped: `GET/SETEX/invalidate`).
2. Add **signed stream URLs** (HMAC token + expiry verified in the stream endpoint).
3. Queue progress writes through a lightweight buffer + batch flush.
4. Add a **transcode job on admin upload**: S3-compatible object store (MinIO),
   ffmpeg worker, renditions > 2, thumbnails sprite sheet for seek previews.
5. Split `users/catalog/playback` into separate deployable services behind nginx,
   add request tracing.

> The architecture deck above is the answer to *“how would you scale your
> project?”* — the honest answer being: keep the same shapes, move each
> bottleneck to its specialized tool (CDN for bytes, cache for hot reads,
> queue for hot writes, sharding for growth).

---

## 6. Glossary (30-second definitions)

- **HLS** — Apple's protocol: a playlist of small video files fetched over plain HTTP.
- **ABR ladder** — multiple quality copies of the same video, from low to high bitrate.
- **Segment/chunk** — 2–6 seconds of video; the unit of streaming decisions.
- **CDN / edge** — a cache server physically close to the viewer (often inside the ISP).
- **Origin** — the authoritative storage the edge fetches from on a cache miss.
- **Range request** — `Range: bytes=a-b` → server replies `206` with just that window; enables seeking.
- **JWT** — signed token carrying the user's identity; verified without a DB query.
- **Rate limiting** — capping requests per key (IP/user) to stop abuse (HTTP 429).
- **Sharding** — splitting one logical table across many DB servers by a hash key.
- **Microservice** — a small independently-deployable service owning one capability.
- **Kafka** — a durable event log/queue for very high write rates.
- **DRM** — encryption + license server so video can't be trivially copied.
