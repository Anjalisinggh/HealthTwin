"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CalendarDays, Check, CircleDashed, Clock, FileText, Pill, Sparkles, Stethoscope } from "lucide-react";
import { ScreenHeader, Screen, Section } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Data";
import { Disclaimer } from "@/components/ui/SafetyNote";
import { useHealth } from "@/lib/store/HealthStore";
import { daysBetween, followUp, goals, lastDays, preventive, scheduleOf, timeOfDay, todayIso, type PreventiveStatus } from "@/lib/care";
import { fmtDate } from "@/lib/trends";
import { fmtMetric } from "@/lib/types";
import { cn } from "@/lib/cn";

const PREVENTIVE_META: Record<PreventiveStatus, { label: string; tone: "normal" | "gold" | "guidance" | "neutral" }> = {
  up_to_date: { label: "Up to date", tone: "normal" },
  due_soon: { label: "Due soon", tone: "gold" },
  overdue: { label: "Due now", tone: "guidance" },
  not_on_file: { label: "Not on file", tone: "neutral" },
  later: { label: "Later", tone: "neutral" },
};

export default function CarePage() {
  const { profile, context, doseLog, toggleDose } = useHealth();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }, []);

  if (!profile || !context) return null;

  const today = todayIso();
  const week = lastDays(7);
  const fu = followUp(context);
  const prev = preventive(context);
  const gs = goals(context);
  const doctors = [...new Map(context.records.filter((r) => r.type === "consultation" && r.provider).map((r) => [r.provider!.split(",")[0], r])).entries()];
  const advice = (() => {
    const rec = context.records.find((r) => r.type === "consultation" && /advised/i.test(r.summary ?? ""));
    const text = rec?.summary?.split(/(?<=\.)\s+/).find((s) => /advised/i.test(s));
    return rec && text ? { id: rec.id, date: rec.date, text: text.replace(/^.*?advised:?\s*/i, "").replace(/^./, (c) => c.toUpperCase()) } : null;
  })();
  const actionable =prev.filter((p) => p.status === "overdue" || p.status === "due_soon" || p.status === "not_on_file").length;

  return (
    <Screen>
      <ScreenHeader eyebrow="Care plan" title="What to do next" subtitle="Medication, visits and screenings." />

      {/* Medications */}
      <Section id="medications" title="Medication">
        {profile.medications.length === 0 ? (
          <div className="card p-5 text-[14px] text-ink-3">No regular medication on file.</div>
        ) : (
          <div className="grid gap-3">
            {profile.medications.map((m) => {
              const sched = scheduleOf(m);
              const takenToday = doseLog?.[today]?.includes(m.id) ?? false;
              const weekTaken = week.filter((d) => doseLog?.[d]?.includes(m.id)).length;
              return (
                <div key={m.id} className="card p-4">
                  <div className="flex items-start gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Pill className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15.5px] font-medium">
                        {m.name} {m.dose && <span className="font-normal text-ink-3">{m.dose}</span>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-3">
                        <Clock className="h-3 w-3" /> {sched === "weekly" ? "Once a week" : sched === "as_needed" ? "As needed" : timeOfDay(m)}
                        {m.forConditionKey && <span>· for {m.forConditionKey.replace(/_/g, " ")}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleDose(today, m.id)}
                      aria-pressed={takenToday}
                      className={cn(
                        "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium transition-all duration-300",
                        takenToday ? "bg-brand-700 text-on-brand" : "border border-line-strong text-ink-2 hover:border-brand-400",
                      )}
                    >
                      {takenToday ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
                      {takenToday ? "Taken" : "Mark taken"}
                    </button>
                  </div>
                  {sched === "daily" && (
                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5">
                      <div className="flex gap-1.5">
                        {week.map((d) => {
                          const on = doseLog?.[d]?.includes(m.id);
                          return (
                            <div key={d} className="flex flex-col items-center gap-1">
                              <span className={cn("h-6 w-6 rounded-full border transition-colors", on ? "border-brand-600 bg-brand-600" : d === today ? "border-dashed border-brand-400" : "border-line bg-surface-2")} />
                              <span className="text-[9.5px] text-ink-4">{new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "narrow" })}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-right">
                        <div className="tabular text-[17px] font-medium">{weekTaken}/7</div>
                        <div className="text-[11px] text-ink-3">this week</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {profile.medications.some((m) => m.adherence === "sometimes") && (
              <p className="px-1 text-[12.5px] leading-relaxed text-ink-3">
                Tip: tie your dose to something you already do every morning, like brushing your teeth. Never stop or change a dose without speaking to
                your doctor.
              </p>
            )}
          </div>
        )}
      </Section>

      {/* Appointments */}
      <Section id="appointments" title="Appointments">
        {fu ? (
          <div className="card-emerald p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-2">Follow-up due</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11.5px]">Not booked</span>
            </div>
            <div className="mt-4 flex items-end gap-4">
              <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-on-brand text-brand-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider">{new Date(fu.due + "T00:00:00").toLocaleDateString("en-GB", { month: "short" })}</span>
                <span className="font-display text-[26px] leading-none">{new Date(fu.due + "T00:00:00").getFullYear().toString().slice(2)}</span>
              </div>
              <div className="min-w-0">
                <div className="font-display text-[24px] leading-tight">{fu.provider}</div>
                <div className="text-[13.5px] text-on-brand/75">{fu.reason}</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="ivory" size="sm" href={`/chat?q=${encodeURIComponent("Prepare for my doctor visit")}`}>
                <Sparkles className="h-4 w-4" /> Prepare visit summary
              </Button>
              <Button variant="ghost" size="sm" className="text-on-brand/85 hover:bg-white/10 hover:text-on-brand" href={`/records/${fu.fromRecordId}`}>
                Last visit notes
              </Button>
            </div>
            <p className="mt-4 text-[12px] text-on-brand/60">
              Due around {fmtDate(fu.due)} ({daysBetween(today, fu.due) >= 0 ? `in ${Math.round(daysBetween(today, fu.due) / 7)} weeks` : "overdue"}). Book with your clinic directly.
            </p>
          </div>
        ) : (
          <div className="card flex items-center gap-3 p-5 text-[14px] text-ink-3">
            <CalendarDays className="h-5 w-5" /> No follow-ups found in your records.
          </div>
        )}

        {doctors.length > 0 && (
          <>
            <div className="eyebrow mb-2 mt-6">Your care team</div>
            <div className="card divide-y divide-line overflow-hidden">
              {doctors.map(([name, rec]) => (
                <Link key={name} href={`/records/${rec.id}`} className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-surface-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-soft font-display text-[18px] text-gold-3">
                    {name.replace(/^Dr\.?\s*/, "").slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium">{name}</span>
                    <span className="block text-[12.5px] text-ink-3">{rec.provider!.split(",")[1]?.trim() ?? "Doctor"} · last seen {fmtDate(rec.date)}</span>
                  </span>
                  <Stethoscope className="h-4 w-4 text-ink-4" />
                </Link>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* Preventive */}
      <Section id="preventive" title="Preventive care" action={actionable > 0 ? <Badge tone="gold">{actionable} to review</Badge> : undefined}>
        <div className="card divide-y divide-line overflow-hidden">
          {prev.filter((p) => p.status !== "later").map((p) => {
            const meta = PREVENTIVE_META[p.status];
            return (
              <div key={p.id} className={cn("flex items-start gap-3.5 px-4 py-3.5", p.status === "later" && "opacity-60")}>
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    p.status === "up_to_date" ? "bg-brand-600 text-on-brand" : "border border-line-strong text-ink-4",
                  )}
                >
                  {p.status === "up_to_date" ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <CircleDashed className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium">{p.title}</div>
                  <div className="mt-0.5 text-[12.5px] leading-snug text-ink-3">
                    {p.why} {p.interval}.{p.last && ` Last ${fmtDate(p.last)}.`}
                  </div>
                </div>
                <Badge tone={meta.tone} className="mt-0.5 shrink-0">
                  {meta.label}
                </Badge>
              </div>
            );
          })}
        </div>
        <p className="mt-2.5 px-1 text-[12px] leading-relaxed text-ink-3">
          Based on common adult screening guidelines and your conditions. Your doctor may recommend a different schedule.
        </p>
      </Section>

      {/* Goals */}
      {gs.length > 0 && (
        <Section id="goals" title="Goals">
          <div className="grid gap-3">
            {gs.map((g) => (
              <div key={g.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-medium">{g.title}</div>
                    <div className="mt-0.5 text-[12.5px] text-ink-3">{g.note}</div>
                  </div>
                  {g.progress >= 1 ? <Badge tone="normal">Reached</Badge> : <span className="tabular text-[13px] font-medium text-ink-2">{Math.round(g.progress * 100)}%</span>}
                </div>
                <Progress value={g.progress} className="mt-4" />
                <div className="mt-2 flex justify-between text-[11.5px] text-ink-3 tabular">
                  <span>
                    Start {fmtMetric(g.start, g.metric)} {g.unit}
                  </span>
                  <span className="font-medium text-ink-2">
                    Now {fmtMetric(g.current, g.metric)} {g.unit}
                  </span>
                </div>
              </div>
            ))}
            {advice && (
              <Link href={`/records/${advice.id}`} className="card flex items-center gap-3.5 p-4 card-hover">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-3">
                  <FileText className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink-2">
                  <span className="font-medium text-ink">From your doctor, {fmtDate(advice.date)}:</span> {advice.text}
                </div>
              </Link>
            )}
          </div>
        </Section>
      )}

      <Disclaimer className="px-5 pb-6 pt-8" />
    </Screen>
  );
}
