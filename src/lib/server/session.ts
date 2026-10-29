import "server-only";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE, decodeSession, type SessionPayload } from "./session-token";

/**
 * Stateless sessions: a signed JWT in an httpOnly cookie holding only the
 * user id. Follows the Next.js authentication guide.
 */

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + MAX_AGE_MS);
  const token = await new SignJWT({ userId } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user's id, or null. */
export async function getUserId(): Promise<string | null> {
  const session = await decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  return session?.userId ?? null;
}

