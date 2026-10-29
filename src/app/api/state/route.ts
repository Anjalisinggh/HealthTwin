import { NextResponse } from "next/server";
import { getUserId } from "@/lib/server/session";
import { db } from "@/lib/server/db";
import { clearState, loadState, saveState, type StatePatch } from "@/lib/server/health-data";

/**
 * The signed-in user's health twin.
 *   GET    → { user, state }
 *   PATCH  → save any subset of the state
 *   DELETE → wipe health data (the account stays)
 */

const unauthorized = () => NextResponse.json({ error: "Not signed in" }, { status: 401 });

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const [user, state] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    loadState(userId),
  ]);
  if (!user) return unauthorized();
  return NextResponse.json({ user, state });
}

export async function PATCH(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  let patch: StatePatch;
  try {
    patch = (await request.json()) as StatePatch;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return NextResponse.json({ error: "Expected an object" }, { status: 400 });
  }
  if ((patch.records && !Array.isArray(patch.records)) || (patch.readings && !Array.isArray(patch.readings))) {
    return NextResponse.json({ error: "records and readings must be arrays" }, { status: 400 });
  }
  await saveState(userId, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  await clearState(userId);
  return NextResponse.json({ ok: true });
}
