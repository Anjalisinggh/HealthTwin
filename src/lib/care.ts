import type { HealthContext } from "./context/engine";
import type { HealthProfile, Medication, MetricKey, Reading } from "./types";
import { METRIC_META, fmtMetric } from "./types";
import { computeTrend, type Trend } from "./trends";

/**
 * Care plan engine.
 *
 * Everything here is derived from the health context — nothing is invented.
 * It answers the three dashboard questions: how am I doing, what changed,
 * and what should I do next. Wording stays observational, never diagnostic.
 */

/** Local calendar date as YYYY-MM-DD (not UTC, so the day turns over at local midnight). */
export function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const todayIso = () => localIso(new Date());

function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return localIso(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86_400_000);
}

function latestReading(readings: Reading[], metric: MetricKey): Reading | undefined {
  return readings.filter((r) => r.metric === metric).sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
}

const has = (p: HealthProfile, ...keys: string[]) => p.conditions.some((c) => keys.includes(c.key) && c.status === "active");

/* ------------------------------------------------------------------------ */
/* How am I doing                                                            */
/* ------------------------------------------------------------------------ */

export type MarkerStatus = "in_range" | "watch" | "out";

export interface Marker {
  metric: MetricKey;
  label: string;
  value: string;
  unit: string;
  date: string;
  status: MarkerStatus;
  trend: Trend;
}

const SNAPSHOT_METRICS: MetricKey[] = [
  "systolic",
  "diastolic",
  "heart_rate",
  "hba1c",
  "fasting_glucose",
  "ldl",
  "hdl",
  "triglycerides",
  "total_cholesterol",
  "vitamin_d",
  "hemoglobin",
  "tsh",
  "creatinine",
  "wbc",
  "platelets",
];

export function markerStatus(metric: MetricKey, value: number): MarkerStatus {
  const m = METRIC_META[metric];
  const lo = m.refLow;
  const hi = m.refHigh;
  if ((hi !== undefined && value > hi) || (lo !== undefined && value < lo)) {
    // within 5% of the boundary reads as "watch" rather than out of range
    const edge = hi !== undefined && value > hi ? (value - hi) / hi : lo !== undefined ? (lo - value) / lo : 1;
    return edge <= 0.05 ? "watch" : "out";
  }
  return "in_range";
}

export function markers(readings: Reading[]): Marker[] {
  const out: Marker[] = [];
  for (const metric of SNAPSHOT_METRICS) {
    const r = latestReading(readings, metric);
    if (!r) continue;
    out.push({
      metric,
      label: METRIC_META[metric].label,
      value: fmtMetric(r.value, metric),
      unit: METRIC_META[metric].unit,
      date: r.takenAt,
      status: markerStatus(metric, r.value),
      trend: computeTrend(readings, metric),
    });
  }
  return out;
}

export interface Snapshot {
  total: number;
  inRange: number;
  watch: Marker[];
  out: Marker[];
  headline: string;
  sub: string;
}

/** Readings plus numeric values from reports that never became readings (TSH, blood counts …). */
export function allReadings(ctx: HealthContext): Reading[] {
  const seen = new Set(ctx.readings.map((r) => `${r.metric}|${r.takenAt}`));
  const extra: Reading[] = [];
  for (const rec of ctx.records) {
    for (const v of rec.values) {
      if (!v.metric || typeof v.value !== "number") continue;
      const key = `${v.metric}|${rec.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      extra.push({ id: `rv-${v.id}`, metric: v.metric, value: v.value, unit: v.unit ?? "", takenAt: rec.date, source: "record", recordId: rec.id });
    }
  }
  return [...ctx.readings, ...extra];
}

export function snapshot(ctx: HealthContext): Snapshot {
  const all = markers(allReadings(ctx));
  const inRange = all.filter((m) => m.status === "in_range").length;
  const watch = all.filter((m) => m.status === "watch");
  const out = all.filter((m) => m.status === "out");
  const attention = out.length + watch.length;
  let headline = "Steady and on track";
  if (attention >= 3) headline = "A few things need attention";
  else if (attention > 0) headline = "Mostly on track";
  const sub =
    all.length === 0
      ? "Add a report to see your markers."
      : `${inRange} of ${all.length} tracked markers are within the usual range.`;
  return { total: all.length, inRange, watch, out, headline, sub };
}

/* ------------------------------------------------------------------------ */
/* What changed                                                              */
/* ------------------------------------------------------------------------ */

export interface Change {
  metric: MetricKey;
  label: string;
  from: string;
  to: string;
  unit: string;
  direction: "up" | "down";
  better: boolean;
  since: string;
}

export function changes(ctx: HealthContext): Change[] {
  return ctx.trends
    .filter((t) => t.direction === "up" || t.direction === "down")
    .map((t) => {
      const meta = METRIC_META[t.metric];
      const from = t.earliest!.value;
      const to = t.latest!.value;
      let better: boolean;
      if (t.metric === "weight") better = to < from;
      else if (meta.higherIsWorse) better = to < from;
      else if (meta.refLow !== undefined && meta.refHigh !== undefined) {
        // two-sided range: better when moving toward the middle of it
        const mid = (meta.refLow + meta.refHigh) / 2;
        const inRange = to >= meta.refLow && to <= meta.refHigh;
        better = inRange || Math.abs(to - mid) <= Math.abs(from - mid);
      } else better = to > from; // only a lower bound (HDL, vitamin D)
      return {
        metric: t.metric,
        label: t.label,
        from: fmtMetric(t.earliest!.value, t.metric),
        to: fmtMetric(t.latest!.value, t.metric),
        unit: t.unit,
        direction: t.direction as "up" | "down",
        better,
        since: t.earliest!.date,
      };
    })
    .filter((c) => c.metric !== "diastolic");
}

/* ------------------------------------------------------------------------ */
/* What should I do next                                                     */
/* ------------------------------------------------------------------------ */

export type ActionKind = "test" | "log" | "medication" | "ask" | "habit" | "visit";

export interface NextStep {
  id: string;
  kind: ActionKind;
  title: string;
  why: string;
  due?: string;
  href: string;
  cta: string;
}

/** Follow-up from the most recent consultation ("Review 6 months …"). */
export function followUp(ctx: HealthContext): { provider: string; due: string; reason: string; fromRecordId: string } | null {
  const consult = ctx.records.find((r) => r.type === "consultation");
  if (!consult) return null;
  const text = `${consult.impression ?? ""} ${consult.summary ?? ""}`;
  const m = text.match(/(\d+)\s*months?/i);
  const months = m ? Number(m[1]) : 6;
  const reason = /hba1c/i.test(text) ? "Review with HbA1c and lipids" : "Routine review";
  return {
    provider: (consult.provider ?? "Your doctor").split(",")[0],
    due: addMonths(consult.date, months),
    reason,
    fromRecordId: consult.id,
  };
}

export function nextSteps(ctx: HealthContext): NextStep[] {
  const p = ctx.profile;
  const today = todayIso();
  const steps: NextStep[] = [];

  const fu = followUp(ctx);
  if (fu) {
    steps.push({
      id: "follow-up",
      kind: "visit",
      title: `Book your review with ${fu.provider}`,
      why: `${fu.reason}, advised at your last visit.`,
      due: fu.due,
      href: "/care#appointments",
      cta: "View",
    });
  }

  if (has(p, "prediabetes", "diabetes")) {
    const last = latestReading(ctx.readings, "hba1c");
    if (last && daysBetween(last.takenAt, today) > 150) {
      steps.push({
        id: "hba1c",
        kind: "test",
        title: "HbA1c recheck is due",
        why: `Last result ${fmtMetric(last.value, "hba1c")}% was ${Math.round(daysBetween(last.takenAt, today) / 30)} months ago.`,
        due: fu?.due ?? addMonths(last.takenAt, 6),
        href: "/care#preventive",
        cta: "Details",
      });
    }
  }

  if (has(p, "hypertension")) {
    const last = ctx.readings
      .filter((r) => r.metric === "systolic" && r.source === "self")
      .sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
    const age = last ? daysBetween(last.takenAt, today) : Infinity;
    if (age > 7) {
      steps.push({
        id: "log-bp",
        kind: "log",
        title: "Log a home blood pressure reading",
        why: last ? `Your last home reading was ${age} days ago.` : "Home readings help your doctor adjust treatment.",
        href: "/health?log=bp",
        cta: "Log",
      });
    }
  }

  if (p.medications.some((m) => m.adherence === "sometimes")) {
    steps.push({
      id: "adherence",
      kind: "medication",
      title: "Keep your medication streak",
      why: "You mentioned sometimes missing doses. Check them off each day.",
      href: "/care#medications",
      cta: "Open",
    });
  }

  if (p.symptoms.length > 0) {
    const s = p.symptoms[0];
    steps.push({
      id: "symptom",
      kind: "ask",
      title: "Talk through how you’ve been feeling",
      why: `You mentioned: ${s.name.toLowerCase()}. HealthTwin can look at it alongside your labs and sleep.`,
      href: `/chat?q=${encodeURIComponent(`Why might I be experiencing ${s.name.toLowerCase()}?`)}`,
      cta: "Ask",
    });
  }

  if (p.lifestyle.activity === "sedentary" || p.lifestyle.activity === "light") {
    steps.push({
      id: "walk",
      kind: "habit",
      title: "Build toward 150 minutes of walking a week",
      why: "Regular brisk walking supports blood pressure and blood sugar.",
      href: "/care#goals",
      cta: "Goals",
    });
  }

  return steps;
}

/* ------------------------------------------------------------------------ */
/* Medications                                                               */
/* ------------------------------------------------------------------------ */

export type Schedule = "daily" | "weekly" | "as_needed";

export function scheduleOf(m: Medication): Schedule {
  const f = (m.frequency ?? "").toLowerCase();
  if (/week/.test(f)) return "weekly";
  if (/need|sos|prn/.test(f)) return "as_needed";
  return "daily";
}

export function timeOfDay(m: Medication): string {
  const f = (m.frequency ?? "").toLowerCase();
  if (/morning|am\b/.test(f)) return "Morning";
  if (/night|bed|pm\b|evening/.test(f)) return "Evening";
  if (/twice|bd\b/.test(f)) return "Morning & evening";
  return "Daily";
}

/** Last n ISO dates ending today, oldest first. */
export function lastDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(localIso(x));
  }
  return out;
}

/* ------------------------------------------------------------------------ */
/* Preventive care                                                           */
/* ------------------------------------------------------------------------ */

export type PreventiveStatus = "up_to_date" | "due_soon" | "overdue" | "not_on_file" | "later";

export interface PreventiveItem {
  id: string;
  title: string;
  why: string;
  interval: string;
  last?: string;
  status: PreventiveStatus;
}

export function preventive(ctx: HealthContext): PreventiveItem[] {
  const p = ctx.profile;
  const age = p.user.age ?? 0;
  const today = todayIso();
  const status = (last: string | undefined, months: number): PreventiveStatus => {
    if (!last) return "not_on_file";
    const due = addMonths(last, months);
    const d = daysBetween(today, due);
    if (d < 0) return "overdue";
    if (d < 60) return "due_soon";
    return "up_to_date";
  };
  const lastOf = (...metrics: MetricKey[]) =>
    metrics
      .map((m) => latestReading(ctx.readings, m)?.takenAt)
      .filter(Boolean)
      .sort()
      .at(-1);

  const cardio = has(p, "hypertension", "heart_disease");
  const metabolic = has(p, "prediabetes", "diabetes");
  const lipids = has(p, "high_cholesterol");

  const items: PreventiveItem[] = [
    {
      id: "bp",
      title: "Blood pressure check",
      why: cardio ? "Monitoring your hypertension." : "Recommended for all adults.",
      interval: cardio ? "Monthly at home" : "Every year",
      last: lastOf("systolic"),
      status: status(lastOf("systolic"), cardio ? 1 : 12),
    },
    {
      id: "hba1c",
      title: "HbA1c (blood sugar)",
      why: metabolic ? "Tracking prediabetes." : "Diabetes screening from age 35.",
      interval: metabolic ? "Every 6 months" : "Every 3 years",
      last: lastOf("hba1c"),
      status: age < 35 && !metabolic ? "later" : status(lastOf("hba1c"), metabolic ? 6 : 36),
    },
    {
      id: "lipids",
      title: "Lipid profile",
      why: lipids ? "Tracking your cholesterol." : "Heart health screening.",
      interval: lipids ? "Every year" : "Every 5 years",
      last: lastOf("ldl"),
      status: status(lastOf("ldl"), lipids ? 12 : 60),
    },
    {
      id: "kidney",
      title: "Kidney function",
      why: cardio ? "Recommended yearly with blood pressure medication." : "Part of a routine panel.",
      interval: "Every year",
      last: lastOf("creatinine"),
      status: status(lastOf("creatinine"), 12),
    },
    {
      id: "eye",
      title: "Eye examination",
      why: metabolic || cardio ? "Blood pressure and sugar can affect the eyes." : "Routine vision health.",
      interval: "Every 1–2 years",
      status: "not_on_file",
    },
    {
      id: "flu",
      title: "Flu vaccine",
      why: "Recommended every season for adults.",
      interval: "Every year",
      status: "not_on_file",
    },
    {
      id: "colorectal",
      title: "Colorectal screening",
      why: "Recommended from age 45.",
      interval: "Every 10 years (colonoscopy)",
      status: age >= 45 ? "not_on_file" : "later",
    },
  ];
  return items;
}

/* ------------------------------------------------------------------------ */
/* Goals                                                                     */
/* ------------------------------------------------------------------------ */

export interface Goal {
  id: string;
  title: string;
  metric: MetricKey;
  start: number;
  current: number;
  target: number;
  unit: string;
  /** 0–1 progress from start to target */
  progress: number;
  note: string;
}

export function goals(ctx: HealthContext): Goal[] {
  const p = ctx.profile;
  const out: Goal[] = [];
  const mk = (id: string, title: string, metric: MetricKey, target: number, note: string) => {
    const t = computeTrend(ctx.readings, metric);
    if (!t.latest || !t.earliest) return;
    const start = t.earliest.value;
    const current = t.latest.value;
    const span = start - target;
    // If it started at or under target and has drifted above, there is no progress to show yet
    const progress = current <= target ? 1 : span <= 0 ? 0 : Math.max(0, Math.min(1, (start - current) / span));
    out.push({ id, title, metric, start, current, target, unit: t.unit, progress, note });
  };
  if (has(p, "hypertension")) mk("bp", "Systolic below 130", "systolic", 129, "A common target on treatment.");
  if (has(p, "prediabetes", "diabetes")) mk("hba1c", "HbA1c below 5.7%", "hba1c", 5.6, "Back into the normal range.");
  if (has(p, "high_cholesterol")) mk("ldl", "LDL below 100", "ldl", 99, "Lower LDL reduces heart risk.");
  if (ctx.bmi && ctx.bmi >= 25 && p.user.heightCm) {
    const targetKg = Math.round(24.9 * (p.user.heightCm / 100) ** 2);
    mk("weight", `Reach ${targetKg} kg`, "weight", targetKg, "A BMI under 25 for your height.");
  }
  return out;
}
