// ============================================================================
// SEED SCRIPT — npm run seed  (npx tsx scripts/seed.ts)
// ----------------------------------------------------------------------------
// Idempotent: wipes titles and re-creates the demo catalog.
// Users are upserted by email so existing accounts stay safe between reseeds.
//
// Demo accounts:
//   admin@streamflix.dev / admin123   (role: admin  -> /admin panel)
//   demo@streamflix.dev  / demo1234   (role: user)
// ============================================================================
import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/server/db";
import { UserModel } from "../src/server/models/user.model";
import { TitleModel } from "../src/server/models/title.model";
import { WatchlistModel } from "../src/server/models/list.model";
import { ProgressModel } from "../src/server/models/progress.model";

const CATALOG = [
  {
    slug: "animal",
    title: "Animal",
    synopsis:
      "A fierce son undergoes a remarkable transformation when his father's life is threatened, setting off a ruthless war of blood and vengeance.",
    genre: "Action",
    year: 2023,
    rating: 8.9,
    durationSec: 204,
    maturity: "TV-MA",
    backdropUrl: "/images/backdrops/animal.jpg",
    streamSlug: "animal",
    trendingScore: 100,
    featured: true,
  },
  {
    slug: "kgf-chapter-2",
    title: "K.G.F: Chapter 2",
    synopsis:
      "In the blood-soaked Kolar Gold Fields, Rocky's name strikes fear into his foes. As his allies look up to him, the government sees him as a threat to law and order.",
    genre: "Action",
    year: 2022,
    rating: 9.1,
    durationSec: 176,
    maturity: "TV-MA",
    backdropUrl: "/images/backdrops/kgf-2.jpg",
    streamSlug: "kgf-2",
    trendingScore: 99,
  },
  {
    slug: "toxic",
    title: "Toxic: A Fairy Tale for Grown-ups",
    synopsis:
      "A high-octane dark fairy tale tracing the thrilling rise of a gangster in a treacherous world of betrayal and power.",
    genre: "Action",
    year: 2025,
    rating: 8.8,
    durationSec: 68,
    maturity: "TV-MA",
    backdropUrl: "/images/backdrops/toxic.jpg",
    streamSlug: "toxic",
    trendingScore: 97,
  },
  {
    slug: "ember-and-claw",
    title: "Ember & Claw",
    synopsis:
      "A disgraced mountain scout finds the last dragon egg — and the one creature that still trusts her. To keep it alive, she must cross the Ashen Pass before the thaw.",
    genre: "Fantasy",
    year: 2025,
    rating: 8.7,
    durationSec: 52,
    maturity: "TV-14",
    backdropUrl: "/images/backdrops/ember-and-claw.jpg",
    streamSlug: "dragon",
    trendingScore: 94,
  },
  {
    slug: "neon-requiem",
    title: "Neon Requiem",
    synopsis:
      "In a city that never sleeps because it isn't allowed to, a memory thief takes one last job: steal back a lullaby that the megacorps erased from the world.",
    genre: "Sci-Fi",
    year: 2024,
    rating: 8.5,
    durationSec: 90,
    maturity: "TV-MA",
    backdropUrl: "/images/backdrops/neon-requiem.jpg",
    streamSlug: "movie300",
    trendingScore: 92,
  },
  {
    slug: "the-big-meadow",
    title: "The Big Meadow",
    synopsis:
      "One very large rabbit. One very small axe. A sunny morning that goes wonderfully, hilariously wrong. The beloved open-movie classic, remastered.",
    genre: "Animation",
    year: 2023,
    rating: 8.1,
    durationSec: 32,
    maturity: "TV-Y7",
    backdropUrl: "/images/backdrops/big-meadow.jpg",
    streamSlug: "bunny",
    trendingScore: 88,
  },
  {
    slug: "the-dragonkeeper",
    title: "The Dragonkeeper",
    synopsis:
      "Every generation, one keeper carries the ember shard through the ice caverns. Every generation, something in the dark waits. Now it's her turn.",
    genre: "Fantasy",
    year: 2021,
    rating: 8.3,
    durationSec: 52,
    maturity: "TV-14",
    backdropUrl: "/images/backdrops/dragonkeeper.jpg",
    streamSlug: "sintel_lo",
    trendingScore: 84,
  },
  {
    slug: "crimson-protocol",
    title: "Crimson Protocol",
    synopsis:
      "A heist crew breaks into a vault that exists on no map, protected by lasers, lies, and the fact that one of them planned the whole thing twice.",
    genre: "Action",
    year: 2024,
    rating: 7.9,
    durationSec: 90,
    maturity: "TV-MA",
    backdropUrl: "/images/backdrops/crimson-protocol.jpg",
    streamSlug: "movie300",
    trendingScore: 82,
  },
  {
    slug: "thumpers-revenge",
    title: "Thumper's Revenge",
    synopsis:
      "They laughed at the big bunny. They stole his carrots. Big mistake. A forest comedy about payback, friendship, and extremely large feet.",
    genre: "Animation",
    year: 2024,
    rating: 7.4,
    durationSec: 120,
    maturity: "TV-PG",
    backdropUrl: "/images/backdrops/thumpers-revenge.jpg",
    streamSlug: "meadow",
    trendingScore: 79,
  },
  {
    slug: "orbit-decay",
    title: "Orbit Decay",
    synopsis:
      "Alone on a station that's falling out of the sky, an engineer has 90 minutes of oxygen, one working thruster, and a signal that shouldn't exist.",
    genre: "Sci-Fi",
    year: 2023,
    rating: 7.6,
    durationSec: 90,
    maturity: "TV-14",
    backdropUrl: "/images/backdrops/orbit-decay.jpg",
    streamSlug: "movie300",
    trendingScore: 76,
  },
  {
    slug: "rodent-royale",
    title: "Rodent Royale",
    synopsis:
      "When the Acorn Throne falls empty, every squirrel, mouse and rabbit in the kingdom declares themselves royalty. An animated tale of tiny crowns and big egos.",
    genre: "Animation",
    year: 2022,
    rating: 7.9,
    durationSec: 32,
    maturity: "TV-Y7",
    backdropUrl: "/images/backdrops/rodent-royale.jpg",
    streamSlug: "peach",
    trendingScore: 74,
  },
  {
    slug: "signal-lost",
    title: "Signal Lost",
    synopsis:
      "A radio operator at an arctic listening post picks up a transmission in her own voice — dated three days from now. She has to answer it.",
    genre: "Mystery",
    year: 2022,
    rating: 7.2,
    durationSec: 52,
    maturity: "TV-14",
    backdropUrl: "/images/backdrops/signal-lost.jpg",
    streamSlug: "sintel_lo",
    trendingScore: 70,
  },
  {
    slug: "the-quiet-between-stars",
    title: "The Quiet Between Stars",
    synopsis:
      "Two insomniacs meet on the rooftop of the last apartment they'll ever live in, watching the sky for a comet neither of them believes will come. It does.",
    genre: "Drama",
    year: 2020,
    rating: 8.0,
    durationSec: 52,
    maturity: "TV-PG",
    backdropUrl: "/images/backdrops/quiet-between-stars.jpg",
    streamSlug: "dragon",
    trendingScore: 68,
  },
];

async function upsertUser(name: string, email: string, password: string, role: "user" | "admin") {
  const passwordHash = await bcrypt.hash(password, 10);
  await UserModel.findOneAndUpdate(
    { email },
    { name, email, passwordHash, role },
    { upsert: true, new: true }
  );
}

async function main() {
  await connectDB();

  console.log("Ensuring demo users...");
  await upsertUser("Admin", "admin@streamflix.dev", "admin123", "admin");
  await upsertUser("Demo Viewer", "demo@streamflix.dev", "demo1234", "user");

  console.log("Updating catalog...");
  await WatchlistModel.deleteMany({});
  await ProgressModel.deleteMany({});
  await TitleModel.deleteMany({});

  console.log(`Inserting ${CATALOG.length} titles...`);
  await TitleModel.insertMany(CATALOG);

  const count = await TitleModel.countDocuments();
  const userCount = await UserModel.countDocuments();
  console.log(`✅ Done: ${count} titles, ${userCount} users active in MongoDB Atlas.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
