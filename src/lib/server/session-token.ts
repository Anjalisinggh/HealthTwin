import { jwtVerify } from "jose";

/** Cookie decoding shared by the proxy and server code (no `server-only`, no cookies()). */

export const SESSION_COOKIE = "ht_session";

export interface SessionPayload {
  userId: string;
}

export async function decodeSession(token: string | undefined): Promise<SessionPayload | null> {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return typeof payload.userId === "string" ? { userId: payload.userId } : null;
  } catch {
    return null;
  }
}
