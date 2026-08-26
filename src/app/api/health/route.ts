import { connectDB } from "@/server/db";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();
    // Ping the MongoDB server
    await mongoose.connection.db?.admin().ping();
    return Response.json({ ok: true, db: "mongodb" });
  } catch {
    return Response.json({ ok: false, db: "mongodb" }, { status: 500 });
  }
}
