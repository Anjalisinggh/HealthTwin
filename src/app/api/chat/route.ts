import { NextResponse } from "next/server";
import { getCompanion, type ChatMessage } from "@/lib/ai/companion";
import { buildHealthContext } from "@/lib/context/engine";
import type { HealthProfile, HealthRecord, Reading } from "@/lib/types";

/**
 * POST /api/chat
 *
 * Phase 1: the client owns the data (browser storage), so it sends the
 * profile, records and readings along with the messages. The server rebuilds
 * the health context and asks the companion provider for a reply.
 *
 * With Prisma in place this handler will load the context from the database
 * by user id instead of trusting the request body.
 */

interface Body {
  messages: ChatMessage[];
  profile: HealthProfile;
  records: HealthRecord[];
  readings: Reading[];
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.profile || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "profile and messages are required" }, { status: 400 });
  }

  const ctx = buildHealthContext(body.profile, body.records ?? [], body.readings ?? []);
  const reply = await getCompanion().reply(body.messages, ctx);

  // Small artificial latency so the typing indicator reads as real.
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));

  return NextResponse.json(reply);
}
