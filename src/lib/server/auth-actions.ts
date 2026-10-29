"use server";

import bcrypt from "bcryptjs";
import { db } from "./db";
import { createSession, deleteSession } from "./session";

/**
 * On success the client does a full page load to `redirectTo`, so the health
 * store starts clean for the account that just signed in.
 */
export type AuthState = { error?: string; fields?: { name?: string; email?: string }; redirectTo?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only allow same-site relative paths as the post-login destination. */
function safeNext(value: FormDataEntryValue | null, fallback: string) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const fields = { name, email };

  if (name.length < 2) return { error: "Please enter your name.", fields };
  if (!EMAIL.test(email)) return { error: "Please enter a valid email.", fields };
  if (password.length < 8) return { error: "Use at least 8 characters for your password.", fields };

  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { error: "An account with this email already exists. Try logging in.", fields };
  }

  const user = await db.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10), state: { create: {} } },
    select: { id: true },
  });
  await createSession(user.id);
  return { redirectTo: safeNext(form.get("next"), "/onboarding") };
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "That email and password don’t match.", fields: { email } };
  }
  await createSession(user.id);
  return { redirectTo: safeNext(form.get("next"), "/today") };
}

export async function logout() {
  await deleteSession();
}
