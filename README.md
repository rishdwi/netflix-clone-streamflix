# StreamFlix — a Netflix Clone 

A **full-stack video streaming platform** with Netflix-style UI: JWT authentication,
adaptive-bitrate **HLS streaming with HTTP range requests**, per-user watchlist,
**continue-watching** resume, full-text search, and an **admin CMS** — all backed by
a relational database and a layered REST API.

> Read **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the viva-ready story of how
> real platforms scale this exact system to millions of viewers.

---

## 1. Stack

| Layer           | This project uses                              | The classic spec equivalent       |
| --------------- | ---------------------------------------------- | --------------------------------- |
| Frontend        | **React 19** (Next.js App Router) + Tailwind 4 | React.js + CSS                    |
| UI player       | **HLS.js** (Media Source Extensions)           | HLS.js                            |
| Backend         | **Node.js** REST route handlers (`app/api/*`)  | Node.js + Express.js              |
| API structure   | `routes → controllers → models → middleware`   | (same)                            |
| Database        | **PostgreSQL** via Drizzle ORM                 | MongoDB via Mongoose              |
| Auth            | **JWT** in httpOnly cookie + **bcrypt**        | JWT + bcrypt                      |
| Streaming       | HLS (m3u8 + MPEG-TS segments), **Range req's** | HLS + range endpoint              |
| Cache           | TTL in-memory cache (`src/server/cache.ts`)    | Redis (network swappable)         |
| Security        | security headers, rate limiting, CORS-sameSite | helmet, express-rate-limit, CORS  |

**Why Next.js + Postgres instead of plain Express + Mongo?** The course's *concepts*
are identical — routes, controllers, models, middleware, JWT sessions, REST. Next.js
route handlers play Express's role; Drizzle models play Mongoose's role; PostgreSQL
replaces the document store with rows. Every file maps 1:1 (see §6) so it can be
explained — or ported — easily.

---

## 2. Features

- **Auth** — signup/login/logout, bcrypt-hashed passwords, 7-day JWT in httpOnly
  cookie, protected pages (edge middleware) **and** protected APIs (controller guards),
  rate-limited auth endpoints (429 on brute force).
- **Browse** — hero billboard, *Trending Now* (ranked, Top-10 style numbers),
  *Top Rated*, per-genre shelves, hover quick-actions, details modal.
- **Streaming** — HLS adaptive bitrate (360p/720p ladder), instant seek via
  **HTTP Range** support (206 Partial Content), manual quality override + Auto (ABR),
  keyboard shortcuts, PiP, fullscreen.
- **Continue Watching** — playhead saved every 5s + on pause/tab-close; resumes
  across reloads and devices; finished items auto-drop (>95%).
- **My List** — add/remove from any card, optimistic UI, stored per user in DB.
- **Search** — 350ms-debounced live search over title/synopsis/genre (SQL `ILIKE`).
- **Admin panel** (`/admin`) — role-gated CRUD: create/edit/delete titles, pick
  key art + HLS stream, set trending score & hero flag. Writes bust the row cache.
- **Caching demo** — `GET /api/movies` answers with `x-cache: HIT|MISS` headers.

---

## 3. Run it locally

```bash
# 0. prerequisites: Node 20+, a PostgreSQL database
npm install

# 1. configure secrets
cp .env.example .env          # then edit values
# DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
# JWT_SECRET=<long random string>

# 2. create the tables + seed the demo catalog (10 titles, 2 users)
npm run db:push               # drizzle-kit push (creates schema)
npm run seed                  # inserts users + titles

# 3. (already generated) — rebuild the HLS media from open-source videos:
npm run pipeline              # downloads Blender/W3C clips -> media/hls/*

# 4. start
npm run build && npm start    # production
# or
npm run dev                   # development
```

Open **http://localhost:3000**.

### Demo accounts (seeded)

| Role    | Email                 | Password   | Can access      |
| ------- | --------------------- | ---------- | --------------- |
| Viewer  | `demo@streamflix.dev` | `demo1234` | browse/watch    |
| Admin   | `admin@streamflix.dev`| `admin123` | **+ /admin**    |

---

## 4. Smoke-test the streaming API (great live demo)

```bash
# log in, keep the cookie
curl -c jar.txt -X POST localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"demo@streamflix.dev","password":"demo1234"}'

# adaptive master playlist (two renditions)
curl -b jar.txt localhost:3000/api/stream/bunny/master.m3u8

# RANGE REQUEST — only bytes 0-1023 of a segment -> HTTP 206
curl -b jar.txt -H 'Range: bytes=0-1023' -D - -o /dev/null \
  localhost:3000/api/stream/bunny/720p/seg_000.ts
```

---

## 5. REST API reference

All responses are `{ ok: true, data }` or `{ ok: false, error }`.

| Method | Endpoint                     | Auth    | Purpose                                  |
| ------ | ---------------------------- | ------- | ---------------------------------------- |
| POST   | `/api/auth/signup`           | —       | create account (rate-limited)            |
| POST   | `/api/auth/login`            | —       | verify + set JWT cookie (rate-limited)   |
| POST   | `/api/auth/logout`           | —       | clear cookie                             |
| GET    | `/api/auth/me`               | user    | current session                          |
| GET    | `/api/movies`                | user    | hero + trending + top rated + genre rows |
| GET    | `/api/movies/:id`            | user    | details + inMyList + progress            |
| GET    | `/api/search?q=`             | user    | ILIKE search                             |
| GET    | `/api/mylist`                | user    | my saved titles                          |
| POST   | `/api/mylist` `{titleId}`    | user    | add (idempotent upsert)                  |
| DELETE | `/api/mylist?id=`            | user    | remove                                   |
| GET    | `/api/progress`              | user    | continue-watching row                    |
| POST   | `/api/progress`              | user    | save playhead (upsert)                   |
| GET    | `/api/stream/:slug/...`      | user    | HLS playlists + segments, **Range**      |
| GET    | `/api/admin/titles`          | admin   | list all                                 |
| POST   | `/api/admin/titles`          | admin   | create (validated)                       |
| PATCH  | `/api/admin/titles/:id`      | admin   | update                                   |
| DELETE | `/api/admin/titles/:id`      | admin   | delete (cascades)                        |
| GET    | `/api/health`                | —       | liveness probe (DB ping)                 |

---

## 6. Project structure

```
├── media/hls/<stream>/        # transcoded HLS ladders (master.m3u8, 360p/, 720p/)
├── public/images/backdrops/   # key art (generated, local, no hotlinking)
├── scripts/
│   ├── pipeline.sh            # download + ffmpeg -> HLS ladder (the "transcoding pipeline")
│   └── seed.ts                # idempotent DB seeder (users + catalog)
├── src/
│   ├── db/                    # Drizzle: schema.ts (tables) + index.ts (pool)
│   ├── middleware.ts          # EDGE route guard (JWT check before page render)
│   ├── lib/constants.ts       # shared constants + typed `api()` fetch helper
│   ├── server/                # ---- THE BACKEND (Express-style layers) ----
│   │   ├── controllers/       # auth, titles, list, progress, stream
│   │   ├── models/            # user, title, list, progress  (all SQL lives here)
│   │   ├── middleware/        # auth guards (requireUser/Admin), rateLimit
│   │   ├── utils/             # jwt sign/verify, response envelope
│   │   └── cache.ts           # TTL cache (Redis stand-in)
│   ├── components/            # Navbar, Hero, Rows(+cards), DetailsModal,
│   │                          # HlsPlayer, AuthForm
│   └── app/
│       ├── api/               # thin REST route handlers -> controllers
│       │   ├── auth/ movies/ search/ mylist/ progress/ admin/
│       │   └── stream/[slug]/[...file]/   # range-capable media endpoint
│       ├── page.tsx           # public landing
│       ├── (auth)/            # login, signup (+ cinematic layout)
│       └── (app)/             # guarded shell: browse, search, my-list,
│                                watch/[id], admin
└── ARCHITECTURE.md            # “what I built” vs “what Netflix does at scale”
```

**Data model (4 tables):** `users` (bcrypt hash, role) · `titles` (catalog ≥
`streamSlug` → media folder) · `watchlist` (join, UNIQUE(user,title)) ·
`watch_progress` (UPSERT target, UNIQUE(user,title)).

---

## 7. Security notes (viva talking points)

1. **Passwords** — bcrypt with 10 salt rounds; never logged, never returned
   (`toPublicUser` strips the hash).
2. **JWT** — HS256-signed, 7-day expiry, `httpOnly` (XSS can't read it),
   `sameSite=lax` (CSRF hardening), `secure` in production.
3. **Rate limiting** — sliding window per IP on login/signup; HTTP 429.
4. **Security headers** — `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy,
   a CSP, Permissions-Policy (helmet equivalents).
5. **SQL injection** — impossible via Drizzle's parameterized queries.
6. **Path traversal** — stream file paths are whitelist-validated and confirmed
   to stay under `media/hls/` (`/../../.env` returns 400).
7. **RBAC** — admin checks happen in middleware *and* in every admin controller.

---

## 8. Rebuilding the video assets

`npm run pipeline` re-downloads 6 royalty-free clips (Blender Foundation open
movies + W3C test media) and runs **ffmpeg** twice per clip:

```
master.m3u8          # lists renditions with BANDWIDTH + RESOLUTION
360p/index.m3u8 + seg_*.ts   # ~0.9 Mbps
720p/index.m3u8 + seg_*.ts   # ~2.6 Mbps
```

Key ffmpeg choices: `-g 48 -keyint_min 48 -sc_threshold 0` forces a keyframe
every 4s so segments split cleanly; `-hls_time 4` sets segment length; the
bitrate ladder is what enables **adaptive bitrate** playback in the player.
