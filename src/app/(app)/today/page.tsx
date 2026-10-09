"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, FlaskConical, MessageCircle, NotebookPen, Pill, Footprints, Sparkles, Stethoscope } from "lucide-react";
import { Avatar, Screen, Section, SectionLink } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Disclaimer, SafetyNote } from "@/components/ui/SafetyNote";
import { useHealth } from "@/lib/store/HealthStore";
import { allReadings, changes, daysBetween, markers, nextSteps, scheduleOf, snapshot, timeOfDay, todayIso, type ActionKind } from "@/lib/care";
import { cn } from "@/lib/cn";

export default function TodayPage() {
  return (
    <Suspense>
      <TodayInner />
    </Suspense>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const KIND_ICON: Record<ActionKind, typeof Pill> = {
  test: FlaskConical,
  log: NotebookPen,
  medication: Pill,
  ask: MessageCircle,
  habit: Footprints,
  visit: Stethoscope,
};

function dueLabel(due?: string): string | null {
  if (!due) return null;
  const d = daysBetween(todayIso(), due);
  if (d < 0) return "Overdue";
  if (d === 0) return "Today";
  if (d < 31) return `In ${d} days`;
  return `By ${new Date(due + "T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
}

function TodayInner() {
  const { profile, context, isDemo, doseLog, toggleDose } = useHealth();
  const params = useSearchParams();
  if (!profile || !context) return null;

  const justBuilt = params.get("welcome") === "1";
  const snap = snapshot(context);
  const all = markers(allReadings(context));
  const steps = nextSteps(context);
  const changed = changes(context);
  const today = todayIso();
  const takenToday = doseLog?.[today] ?? [];
  const dailyMeds = profile.medications.filter((m) => scheduleOf(m) === "daily");
  const urgentSymptom = profile.symptoms.find((s) => s.key === "chest_discomfort");

  const bp = all.find((m) => m.metric === "systolic");
  const dia = all.find((m) => m.metric === "diastolic");
  const keyStats = [
    bp && { label: "Blood pressure", value: `${bp.value}/${dia?.value ?? "–"}`, unit: "mmHg" },
    all.find((m) => m.metric === "hba1c") && { label: "HbA1c", value: all.find((m) => m.metric === "hba1c")!.value, unit: "%" },
    profile.user.weightKg && { label: "Weight", value: String(context.readings.filter((r) => r.metric === "weight").sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0]?.value ?? profile.user.weightKg), unit: "kg" },
  ].filter(Boolean) as { label: string; value: string; unit: string }[];

  return (
    <Screen>
      {/* Header */}
      <header className="flex items-start justify-between px-5 pt-[calc(18px+env(safe-area-inset-top))]">
        <div>
          <div className="eyebrow">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="mt-1.5 text-[30px] leading-[1.05]">
            {greeting()},
            <br />
            <span className="italic text-brand-700">{profile.user.name}</span>
          </h1>
        </div>
        <Avatar size={40} />
      </header>

      {justBuilt && (
        <div className="mx-5 mt-5 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-[14px] text-brand-800">
          <strong className="font-semibold">Your HealthTwin is ready.</strong> Add reports to deepen it, or ask anything about what you’ve shared.
        </div>
      )}
      {isDemo && (
        <div className="mx-5 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-2.5 text-[13px] text-ink-2">
          <span>You’re viewing a sample profile.</span>
          <Link href="/profile/settings" className="shrink-0 font-medium text-brand-700">
            Start fresh
          </Link>
        </div>
      )}

      {/* How am I doing */}
      <section className="px-5 pt-5">
        <Link href="/health" className="card-emerald block p-5 transition-transform duration-300 active:scale-[0.99]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-2">Your health snapshot</span>
            <ArrowUpRight className="h-4 w-4 text-on-brand/60" />
          </div>
          <div className="mt-3 font-display text-[26px] leading-[1.1]">{snap.headline}</div>
          <p className="mt-1 text-[13.5px] text-on-brand/75">{snap.sub}</p>

          {keyStats.length > 0 && (
            <div className="mt-5 grid grid-cols-[1.35fr_1fr_1fr] gap-3 border-t border-white/10 pt-4">
              {keyStats.map((s) => (
                <div key={s.label}>
                  <div className="text-[11px] text-on-brand/60">{s.label}</div>
                  <div className="mt-1 tabular text-[20px] font-medium leading-none tracking-tight">{s.value}</div>
                  <div className="mt-1 text-[10.5px] text-on-brand/50">{s.unit}</div>
                </div>
              ))}
            </div>
          )}
        </Link>
      </section>

      {urgentSymptom && (
        <div className="px-5 pt-4">
          <SafetyNote tier="guidance" title="You mentioned chest discomfort">
            New or recurring chest discomfort is worth a doctor visit soon. If it is severe, lasts more than 20 minutes, or comes with breathlessness
            or sweating, treat it as an emergency.
          </SafetyNote>
        </div>
      )}

      {/* What should I do next */}
      {steps.length > 0 && (
        <Section title="Up next" action={<SectionLink href="/care">Care plan</SectionLink>}>
          <div className="card divide-y divide-line overflow-hidden">
            {steps.slice(0, 3).map((s) => {
              const Icon = KIND_ICON[s.kind];
              const due = dueLabel(s.due);
              return (
                <Link key={s.id} href={s.href} className="flex items-start gap-3.5 px-4 py-4 transition-colors hover:bg-surface-2">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <Icon className="h-[17px] w-[17px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium leading-snug">{s.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">{s.why}</span>
                  </span>
                  {due && (
                    <Badge tone={due === "Overdue" ? "guidance" : "neutral"} className="mt-0.5 shrink-0">
                      {due}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* Medications today */}
      {dailyMeds.length > 0 && (
        <Section title="Today’s medication" action={<SectionLink href="/care#medications">All</SectionLink>}>
          <div className="grid gap-2">
            {dailyMeds.map((m) => {
              const done = takenToday.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleDose(today, m.id)}
                  aria-pressed={done}
                  className={cn("card flex items-center gap-3.5 px-4 py-3.5 text-left", done && "border-brand-200 bg-brand-50/60")}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-300",
                      done ? "border-brand-600 bg-brand-600 text-on-brand" : "border-line-strong",
                    )}
                  >
                    {done && <Check className="h-4 w-4" strokeWidth={2.5} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[15px] font-medium", done && "text-ink-2")}>
                      {m.name} {m.dose && <span className="font-normal text-ink-3">{m.dose}</span>}
                    </span>
                    <span className="block text-[12.5px] text-ink-3">{done ? "Taken today" : timeOfDay(m)}</span>
                  </span>
                  <Pill className="h-4 w-4 text-ink-4" />
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* What changed: one line, details live under Health */}
      {changed.length > 0 && (
        <Section title="What’s changed" action={<SectionLink href="/health">Trends</SectionLink>}>
          <div className="card divide-y divide-line overflow-hidden">
            {changed.slice(0, 2).map((c) => (
              <Link key={c.metric} href={`/health#${c.metric}`} className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-2">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", c.better ? "bg-good-bg text-good" : "bg-guidance-bg text-guidance")}>
                  {c.direction === "up" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{c.label}</span>
                  <span className="block text-[12.5px] text-ink-3">
                    {c.from} → {c.to} {c.unit}
                  </span>
                </span>
                <span className={cn("text-[12px] font-medium", c.better ? "text-good" : "text-guidance")}>{c.better ? "Improving" : "Worth watching"}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Ask */}
      <Section>
        <Link href="/chat" className="card flex items-center gap-3.5 p-4 card-hover">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-on-brand">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">Ask HealthTwin</span>
            <span className="block text-[13px] text-ink-3">About your reports, medication or how you feel</span>
          </span>
          <ArrowRight className="h-4 w-4 text-ink-3" />
        </Link>
      </Section>

      <Disclaimer className="px-5 pb-6 pt-6" />
    </Screen>
  );
}
