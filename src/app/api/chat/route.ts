import { NextResponse } from "next/server";
import { getCompanion, type ChatMessage } from "@/lib/ai/companion";
import { buildHealthContext } from "@/lib/context/engine";
import { loadState } from "@/lib/server/health-data";
import { getUserId } from "@/lib/server/session";

/**
 * POST /api/chat
 *
 * The client sends only the conversation. The health context is rebuilt on
 * the server from the signed-in user's data, so the answer can't be steered
 * by a tampered request.
 */

interface Body {
  messages: ChatMessage[];
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body?.messages)) {
    return NextResponse.json({ error: "messages are required" }, { status: 400 });
  }

  const state = await loadState(userId);
  if (!state?.profile) {
    return NextResponse.json({ error: "Finish your health profile first" }, { status: 409 });
  }

  const ctx = buildHealthContext(state.profile, state.records, state.readings);
  const reply = await getCompanion().reply(body.messages, ctx);

  // Small artificial latency so the typing indicator reads as real.
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));

  return NextResponse.json(reply);
}
