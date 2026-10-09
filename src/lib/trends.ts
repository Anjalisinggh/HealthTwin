import type { MetricKey, Reading } from "./types";
import { METRIC_META } from "./types";

export interface TrendPoint {
  date: string;
  value: number;
  source: Reading["source"];
  recordId?: string;
}

export interface Trend {
  metric: MetricKey;
  label: string;
  unit: string;
  points: TrendPoint[];
  latest: TrendPoint | null;
  earliest: TrendPoint | null;
  /** latest - earliest */
  delta: number | null;
  direction: "up" | "down" | "flat" | null;
  /** Compared with the reference range for the metric. */
  status: "in_range" | "above" | "below" | "no_range";
  /** Plain-language, observational. Never a diagnosis. */
  observation: string | null;
}

export function seriesFor(readings: Reading[], metric: MetricKey): TrendPoint[] {
  return readings
    .filter((r) => r.metric === metric)
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
    .map((r) => ({ date: r.takenAt, value: r.value, source: r.source, recordId: r.recordId }));
}

export function fmtMonth(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function computeTrend(readings: Reading[], metric: MetricKey): Trend {
  const meta = METRIC_META[metric];
  const points = seriesFor(readings, metric);
  const latest = points.at(-1) ?? null;
  const earliest = points[0] ?? null;
  const delta = latest && earliest && points.length > 1 ? +(latest.value - earliest.value).toFixed(1) : null;

  // "flat" if the change is under ~3% of the latest value
  let direction: Trend["direction"] = null;
  if (delta !== null && latest) {
    const threshold = Math.abs(latest.value) * 0.03;
    direction = Math.abs(delta) <= threshold ? "flat" : delta > 0 ? "up" : "down";
  }

  let status: Trend["status"] = "no_range";
  if (latest && (meta.refLow !== undefined || meta.refHigh !== undefined)) {
    status = "in_range";
    if (meta.refHigh !== undefined && latest.value > meta.refHigh) status = "above";
    if (meta.refLow !== undefined && latest.value < meta.refLow) status = "below";
  }

  // Lower-case plain words mid-sentence, keep acronyms (BP, HbA1c, LDL) as written.
  const label = /^[A-Z][a-z]+(?: [a-z]+)*$/.test(meta.label) ? meta.label.toLowerCase() : meta.label;

  let observation: string | null = null;
  if (latest && earliest && delta !== null && direction) {
    const span = `${fmtMonth(earliest.date)} to ${fmtMonth(latest.date)}`;
    const abs = Math.abs(delta);
    if (direction === "flat") {
      observation = `Your recorded ${label} has stayed roughly steady from ${span}.`;
    } else {
      const verb = direction === "up" ? "increased" : "decreased";
      observation = `Your recorded ${label} has ${verb} by ${abs} ${meta.unit} from ${span}.`;
    }
    if (status === "above") observation += ` The latest value is above the usual reference range.`;
    if (status === "below") observation += ` The latest value is below the usual reference range.`;
  } else if (latest) {
    observation = `One ${label} reading on record. Trends appear once there are two or more.`;
  }

  return { metric, label: meta.label, unit: meta.unit, points, latest, earliest, delta, direction, status, observation };
}

/** Metrics shown on the Trends page, in order. Only those with data render. */
export const TREND_METRICS: MetricKey[] = [
  "systolic",
  "weight",
  "hba1c",
  "ldl",
  "fasting_glucose",
  "triglycerides",
  "hdl",
  "vitamin_d",
  "heart_rate",
];

export function allTrends(readings: Reading[]): Trend[] {
  return TREND_METRICS.map((m) => computeTrend(readings, m)).filter((t) => t.points.length > 0);
}

export function bmi(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg) return null;
  const m = heightCm / 100;
  return +(weightKg / (m * m)).toFixed(1);
}
