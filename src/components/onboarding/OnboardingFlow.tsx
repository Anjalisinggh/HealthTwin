"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CornerDownRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo, LogoMark } from "@/components/ui/Logo";
import { SafetyNote } from "@/components/ui/SafetyNote";
import { QuestionInput } from "./QuestionInput";
import { PhoneFrame } from "@/components/shell/AppShell";
import { useHealth } from "@/lib/store/HealthStore";
import { SECTIONS, type Question } from "@/lib/onboarding/schema";
import { QUESTION_BY_ID } from "@/lib/onboarding/questions";
import { alertsForQuestion, canAdvance, isAnswered, minutesRemaining, overallProgress, sectionProgress, visibleQuestions } from "@/lib/onboarding/engine";
import { cn } from "@/lib/cn";

type Stage = "intro" | "questions" | "building";

export function OnboardingFlow() {
  const router = useRouter();
  const { hydrated, answers, setAnswer, completeOnboarding, onboardingComplete } = useHealth();
  const [stage, setStage] = useState<Stage>("intro");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [showAlerts, setShowAlerts] = useState(false);

  const visible = useMemo(() => visibleQuestions(answers), [answers]);
  const index = Math.max(0, visible.findIndex((q) => q.id === currentId));
  const question: Question | undefined = visible[index];
  const value = question ? answers[question.id] : undefined;

  // Start, or resume at the first unanswered question when answers already exist.
  const start = useCallback(() => {
    const resumeAt = onboardingComplete ? null : visible.find((q) => !isAnswered(answers[q.id]) && !q.optional);
    setCurrentId((prev) => prev ?? resumeAt?.id ?? visible[0].id);
    setStage("questions");
  }, [visible, answers, onboardingComplete]);

  const alerts = useMemo(() => (question && showAlerts ? alertsForQuestion(question.id, answers) : []), [question, answers, showAlerts]);

  const goNext = useCallback(() => {
    if (!question) return;
    if (!canAdvance(question, value)) return;
    // Surface safety notes once before moving on from a safety-relevant answer.
    const pending = alertsForQuestion(question.id, answers);
    if (pending.length && !showAlerts) {
      setShowAlerts(true);
      return;
    }
    setShowAlerts(false);
    const nextVisible = visibleQuestions(answers);
    const i = nextVisible.findIndex((q) => q.id === question.id);
    const next = nextVisible[i + 1];
    setDir(1);
    if (next) setCurrentId(next.id);
    else setStage("building");
  }, [question, value, answers, showAlerts]);

  const goBack = useCallback(() => {
    setShowAlerts(false);
    if (index === 0) {
      setStage("intro");
      return;
    }
    setDir(-1);
    setCurrentId(visible[index - 1].id);
  }, [index, visible]);

  useEffect(() => {
    if (stage !== "building") return;
    const t = setTimeout(() => {
      completeOnboarding();
      router.replace("/today?welcome=1");
    }, 2600);
    return () => clearTimeout(t);
  }, [stage, completeOnboarding, router]);

  if (!hydrated) {
    return (
      <PhoneFrame className="items-center justify-center">
        <LogoMark className="h-11 w-11 animate-pulse-soft" />
      </PhoneFrame>
    );
  }

  if (stage === "intro") return <Intro onStart={start} resuming={Object.keys(answers).length > 0} />;
  if (stage === "building") return <Building name={String(answers.name ?? "")} />;
  if (!question) return null;

  const sections = sectionProgress(answers, question.id);
  const section = SECTIONS.find((s) => s.id === question.section)!;
  const pct = overallProgress(answers, question.id);
  const isFirstInSection = visible.find((q) => q.section === question.section)?.id === question.id;
  const parent = question.followUpOf ? QUESTION_BY_ID[question.followUpOf] : null;
  const advanceOk = canAdvance(question, value);

  return (
    <PhoneFrame>
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-bg/85 backdrop-blur">
        <div className="flex w-full items-center justify-between px-5 pb-3 pt-[calc(14px+env(safe-area-inset-top))]">
          <button onClick={goBack} aria-label="Back" className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-surface-3">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <ol className="flex items-center gap-2" aria-label="Sections">
            {sections.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5" title={s.title}>
                <span
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    s.state === "active" ? "w-6 bg-brand-700" : s.state === "done" ? "w-2 bg-brand-300" : "w-2 bg-line-strong",
                  )}
                />
                              </li>
            ))}
          </ol>
          <span className="text-xs text-ink-3 tabular">~{minutesRemaining(answers, question.id)} min left</span>
        </div>
        <div className="h-[2px] w-full bg-line">
          <div className="h-full rounded-r-full bg-brand-600 transition-all duration-700" style={{ width: `${Math.round(pct * 100)}%` }} />
        </div>
      </header>

      {/* Question */}
      <main className="flex w-full flex-1 flex-col px-5 pb-32 pt-8">
        <div key={question.id} className={cn("animate-rise", dir === -1 && "[animation-name:fade]")}>
          {isFirstInSection && !parent && (
            <div className="mb-6">
              <div className="eyebrow !text-gold-3">{section.title}</div>
              <p className="mt-0.5 text-sm text-ink-2">{section.intro}</p>
            </div>
          )}
          {parent && (
            <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-brand-700">
              <CornerDownRight className="h-3.5 w-3.5" />
              Follow-up · because of your answer to “{shorten(parent.prompt)}”
            </div>
          )}
          <h1 className="text-[34px] leading-[1.08] text-ink">{question.prompt}</h1>
          {question.help && <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">{question.help}</p>}

          <div className="mt-7">
            <QuestionInput question={question} value={value} onChange={(v) => setAnswer(question.id, v)} onSubmit={goNext} />
          </div>

          {alerts.length > 0 && (
            <div className="mt-6 space-y-3">
              {alerts.map((a) => (
                <SafetyNote key={a.title} tier={a.tier} title={a.title}>
                  {a.body}
                </SafetyNote>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer controls */}
      <footer className="fixed bottom-0 left-1/2 z-10 w-full max-w-[440px] -translate-x-1/2 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="flex w-full items-center justify-end gap-3 px-5 py-3.5">
          <div className="flex w-full items-center gap-2">
            {question.optional && !isAnswered(value) && (
              <Button variant="ghost" onClick={goNext}>
                Skip
              </Button>
            )}
            <Button onClick={goNext} disabled={!advanceOk} size="lg" className="flex-1">
              {showAlerts ? "Understood, continue" : index === visible.length - 1 ? "Finish" : "Continue"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </footer>
    </PhoneFrame>
  );
}

function shorten(s: string): string {
  return s.length > 44 ? s.slice(0, 42).trimEnd() + "…" : s;
}

/* ------------------------------------------------------------------- intro */

function Intro({ onStart, resuming }: { onStart: () => void; resuming: boolean }) {
  return (
    <PhoneFrame>
      <header className="flex items-center justify-between px-5 pb-2 pt-[calc(16px+env(safe-area-inset-top))]">
        <Link href="/" aria-label="HealthTwin home">
          <Logo />
        </Link>
        <span className="text-[12px] text-ink-3">5–8 min</span>
      </header>
      <main className="flex flex-1 flex-col px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-6">
        <div className="animate-rise">
          <div className="eyebrow !text-gold-3">Your health profile</div>
          <h1 className="mt-3 text-[42px] leading-[1.02]">
            Who are you,
            <br />
            <span className="italic text-brand-700">health-wise?</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
            A short conversation that only goes deeper where your answers call for it. Everything can be edited later.
          </p>
        </div>

        <ol className="mt-7 card divide-y divide-line overflow-hidden">
          {SECTIONS.map((s, i) => (
            <li key={s.id} className="flex animate-rise gap-3.5 px-4 py-3" style={{ animationDelay: `${100 + i * 50}ms` }}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[12px] font-semibold text-brand-700 tabular">{i + 1}</span>
              <span className="self-center text-[15px] font-medium">{s.title}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-surface-3/70 p-4 animate-rise [animation-delay:400ms]">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          <p className="text-[12.5px] leading-relaxed text-ink-2">
            <span className="font-medium text-ink">Private by design.</span> Saved to your private account, used only to build your profile and answer your
            questions. Export or delete anytime.
          </p>
        </div>

        <div className="mt-auto pt-8 animate-rise [animation-delay:480ms]">
          <Button size="lg" className="w-full" onClick={onStart}>
            {resuming ? "Continue where I left off" : "Let’s begin"} <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="mt-3 text-center text-[12px] text-ink-3">You can pause and come back anytime.</p>
        </div>
      </main>
    </PhoneFrame>
  );
}

/* ---------------------------------------------------------------- building */

const BUILD_STEPS = ["Reading your answers", "Building your health profile", "Linking records and readings", "Preparing your care plan"];

function Building({ name }: { name: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, BUILD_STEPS.length)), 600);
    return () => clearInterval(t);
  }, []);
  return (
    <PhoneFrame className="items-center justify-center px-6">
      <div className="relative flex h-28 w-28 items-center justify-center">
        {[0, 1, 2].map((i) => (
          <span key={i} className="absolute inset-0 animate-breathe rounded-full border border-brand-300" style={{ transform: `scale(${1 - i * 0.2})`, animationDelay: `${i * 0.6}s` }} />
        ))}
        <LogoMark className="h-12 w-12" />
      </div>
      <h1 className="mt-6 text-center text-[32px] leading-tight">
        Building {name ? `${name}’s` : "your"}
        <br />
        <span className="italic text-brand-700">HealthTwin</span>
      </h1>
      <ul className="mt-7 w-full max-w-[260px] space-y-2.5">
        {BUILD_STEPS.map((s, i) => (
          <li key={s} className={cn("flex items-center gap-3 text-[14.5px] transition-colors duration-500", i < step ? "text-ink" : i === step ? "text-ink-2" : "text-ink-4")}>
            <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border transition-colors", i < step ? "border-brand-600 bg-brand-600" : "border-line-strong")}>
              {i < step ? <Check className="h-3 w-3 text-on-brand" strokeWidth={3} /> : i === step ? <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-500" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ul>
    </PhoneFrame>
  );
}
