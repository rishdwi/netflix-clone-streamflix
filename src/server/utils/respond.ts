// ============================================================================
// RESPONSE HELPERS — tiny wrappers so every controller returns a consistent
// JSON envelope:  { ok: true, data }  or  { ok: false, error }.
// Consistent error shapes make the frontend and the viva demo much cleaner.
// ============================================================================
import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function err(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
