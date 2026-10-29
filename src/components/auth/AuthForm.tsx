"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { PhoneFrame } from "@/components/shell/AppShell";
import { login, signup, type AuthState } from "@/lib/server/auth-actions";

const fieldCls =
  "h-12 w-full rounded-2xl border border-line-strong bg-surface px-4 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink-4 focus:border-brand-500 focus:shadow-[var(--ring-brand)]";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : signup, undefined);
  const isSignup = mode === "signup";
  const done = Boolean(state?.redirectTo);

  useEffect(() => {
    if (state?.redirectTo) window.location.assign(state.redirectTo);
  }, [state]);

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))]">
        <Link href="/" aria-label="HealthTwin home">
          <Logo />
        </Link>

        <h1 className="mt-10 text-[34px] leading-[1.05]">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-[14.5px] text-ink-3">
          {isSignup ? "Your health record, saved securely and available on any device." : "Log in to see your health record."}
        </p>

        <form action={action} className="mt-8 flex flex-col gap-4">
          {next && <input type="hidden" name="next" value={next} />}
          {isSignup && (
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Name</span>
              <input name="name" required autoComplete="name" defaultValue={state?.fields?.name} className={fieldCls} />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Email</span>
            <input name="email" type="email" required autoComplete="email" inputMode="email" defaultValue={state?.fields?.email} className={fieldCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={isSignup ? 8 : undefined}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 8 characters" : undefined}
              className={fieldCls}
            />
          </label>

          {state?.error && (
            <p role="alert" className="rounded-2xl bg-urgent-bg px-4 py-3 text-[13.5px] text-urgent">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || done}
            className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-700 text-[15px] font-medium text-on-brand transition-colors hover:bg-brand-800 disabled:opacity-60"
          >
            {pending || done ? "Please wait…" : isSignup ? "Create account" : "Log in"}
            {!pending && !done && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-ink-3">
          {isSignup ? "Already have an account? " : "New to HealthTwin? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-brand-700">
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>

        <p className="mt-auto flex items-center justify-center gap-1.5 pt-8 text-center text-[11.5px] text-ink-3">
          <Lock className="h-3 w-3" /> Your data is private to your account. Not a substitute for your doctor.
        </p>
      </div>
    </PhoneFrame>
  );
}
