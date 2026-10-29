"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Lock, Sparkles, Activity } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { PhoneFrame } from "@/components/shell/AppShell";
import { useHealth } from "@/lib/store/HealthStore";

const POINTS = [
  { icon: Activity, title: "See how you’re doing", body: "Every vital and lab value, with what’s changed." },
  { icon: FileText, title: "Records that read themselves", body: "Upload a report; get it in plain language." },
  { icon: Sparkles, title: "Answers that know you", body: "Ask about your own history, not a generic list." },
];

export default function WelcomePage() {
  const router = useRouter();
  const { hydrated, account, onboardingComplete, loadDemo } = useHealth();

  return (
    <PhoneFrame>
      {/* Hero */}
      <section className="card-emerald relative m-3 flex min-h-[50dvh] flex-col justify-between rounded-[32px] px-6 pb-8 pt-[calc(20px+env(safe-area-inset-top))]">
        <Logo tone="ivory" />

        <div className="relative stagger">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-2" style={{ "--i": 0 } as React.CSSProperties}>
            Your personal health companion
          </div>
          <h1 className="mt-4 text-[48px] leading-[0.98] text-on-brand" style={{ "--i": 1 } as React.CSSProperties}>
            Your health,
            <br />
            <span className="italic text-gold-2">understood.</span>
          </h1>
          <p className="mt-4 max-w-[300px] text-[15px] leading-relaxed text-on-brand/75" style={{ "--i": 2 } as React.CSSProperties}>
            Records, trends and next steps in one calm place, with an AI that answers from your own history.
          </p>
        </div>
      </section>

      {/* Points */}
      <section className="stagger px-6 pt-5">
        {POINTS.map((p, i) => (
          <div key={p.title} className="flex items-start gap-3.5 border-b border-line py-3.5 last:border-0" style={{ "--i": i + 3 } as React.CSSProperties}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <p.icon className="h-[17px] w-[17px]" />
            </span>
            <span>
              <span className="block text-[15px] font-medium">{p.title}</span>
              <span className="block text-[13px] text-ink-3">{p.body}</span>
            </span>
          </div>
        ))}
      </section>

      {/* Actions */}
      <section className="mt-auto px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-6">
        {!hydrated ? (
          <div className="h-12" />
        ) : !account ? (
          <>
            <Button size="lg" href="/signup" className="w-full">
              Create an account <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="ghost" href="/login" className="mt-2 w-full">
              I already have an account
            </Button>
          </>
        ) : onboardingComplete ? (
          <Button size="lg" href="/today" className="w-full">
            Open my HealthTwin <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <>
            <Button size="lg" href="/onboarding" className="w-full">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
            {/* Only offered before onboarding, so it never overwrites someone's real data */}
            <Button
              size="lg"
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => {
                loadDemo();
                router.push("/today");
              }}
            >
              Explore a sample profile
            </Button>
          </>
        )}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-ink-3">
          <Lock className="h-3 w-3" /> Private to your account. Not a substitute for your doctor.
        </p>
      </section>
    </PhoneFrame>
  );
}
