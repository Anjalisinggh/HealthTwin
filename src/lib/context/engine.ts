import type { ExtractedValue, HealthProfile, HealthRecord, Reading } from "../types";
import { RECORD_TYPE_LABEL } from "../types";
import { allTrends, bmi, fmtDate, type Trend } from "../trends";

/**
 * Health Context Engine (README §7).
 *
 * Assembles the layered picture of a user — profile, history, lifestyle,
 * records, readings, trends — into one object the AI companion retrieves
 * from before answering. `renderContextForPrompt` is the text the model
 * will receive as system context once a real LLM is wired in.
 */

export interface FlaggedValue {
  recordId: string;
  recordTitle: string;
  recordDate: string;
  value: ExtractedValue;
}

export interface HealthContext {
  generatedAt: string;
  profile: HealthProfile;
  /** Newest first. */
  records: HealthRecord[];
  readings: Reading[];
  trends: Trend[];
  latestRecord: HealthRecord | null;
  latestReport: HealthRecord | null; // newest blood test / scan / ecg
  previousReport: HealthRecord | null;
  flagged: FlaggedValue[];
  bmi: number | null;
}

export function buildHealthContext(
  profile: HealthProfile,
  records: HealthRecord[],
  readings: Reading[],
): HealthContext {
  const sorted = [...records].filter((r) => r.status === "ready").sort((a, b) => b.date.localeCompare(a.date));
  const reports = sorted.filter((r) => r.values.length > 0 && r.type !== "consultation");
  const latestReport = reports[0] ?? null;
  const previousReport = reports.find((r) => r.type === latestReport?.type && r.id !== latestReport?.id) ?? null;

  const flagged: FlaggedValue[] = [];
  for (const rec of sorted.slice(0, 3)) {
    for (const value of rec.values) {
      if (value.flag && value.flag !== "normal") {
        flagged.push({ recordId: rec.id, recordTitle: rec.title, recordDate: rec.date, value });
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    profile,
    records: sorted,
    readings,
    trends: allTrends(readings),
    latestRecord: sorted[0] ?? null,
    latestReport,
    previousReport,
    flagged,
    bmi: bmi(profile.user.heightCm, profile.user.weightKg),
  };
}

/* ------------------------------------------------------------------------ */
/* Prompt rendering                                                          */
/* ------------------------------------------------------------------------ */

const LIFESTYLE_LABEL = {
  smoking: { never: "never smoked", former: "former smoker", occasional: "smokes occasionally", daily: "smokes daily" },
  alcohol: { never: "no alcohol", rarely: "alcohol a few times a year", weekly: "alcohol weekly", most_days: "alcohol most days" },
  activity: { sedentary: "mostly sedentary", light: "light activity", moderate: "moderately active", active: "very active" },
  diet: {
    balanced: "balanced, mostly home-cooked diet",
    vegetarian: "vegetarian diet",
    vegan: "vegan diet",
    low_carb: "low-carb diet",
    high_processed: "diet high in processed food",
    irregular: "irregular meals",
  },
} as const;

export function describeLifestyle(p: HealthProfile): string[] {
  const l = p.lifestyle;
  const out: string[] = [];
  if (l.smoking) out.push(LIFESTYLE_LABEL.smoking[l.smoking]);
  if (l.alcohol) out.push(LIFESTYLE_LABEL.alcohol[l.alcohol]);
  if (l.activity) out.push(LIFESTYLE_LABEL.activity[l.activity]);
  if (l.sleepHours !== null) out.push(`sleeps about ${l.sleepHours} h${l.sleepQuality ? ` (${l.sleepQuality} quality)` : ""}`);
  if (l.diet) out.push(LIFESTYLE_LABEL.diet[l.diet]);
  if (l.stress !== null) out.push(`stress ${l.stress}/5`);
  if (l.waterGlasses !== null) out.push(`${l.waterGlasses} glasses of water a day`);
  return out;
}

export function renderContextForPrompt(ctx: HealthContext): string {
  const p = ctx.profile;
  const lines: string[] = [];
  lines.push(`# Health context for ${p.user.name}`);
  lines.push(`Generated ${ctx.generatedAt}. Self-reported unless marked as from a record.`);
  lines.push("");
  lines.push("## Profile");
  lines.push(
    [
      p.user.age !== null ? `${p.user.age} years` : null,
      p.user.sex,
      p.user.heightCm ? `${p.user.heightCm} cm` : null,
      p.user.weightKg ? `${p.user.weightKg} kg` : null,
      ctx.bmi ? `BMI ${ctx.bmi}` : null,
      p.user.location,
      p.user.occupation,
    ]
      .filter(Boolean)
      .join(" · "),
  );
  lines.push("");
  lines.push("## Conditions");
  if (p.conditions.length === 0) lines.push("None reported.");
  for (const c of p.conditions) {
    lines.push(`- ${c.name}${c.diagnosed ? `, diagnosed ${c.diagnosed}` : ""}${c.managedWith && c.managedWith !== "unknown" ? `, managed: ${c.managedWith}` : ""}${c.notes ? ` (${c.notes})` : ""}`);
  }
  lines.push("");
  lines.push("## Medications");
  if (p.medications.length === 0) lines.push("None reported.");
  for (const m of p.medications) lines.push(`- ${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? `, ${m.frequency}` : ""}${m.adherence === "sometimes" ? " (misses doses sometimes)" : ""}`);
  if (p.allergies.length) {
    lines.push("");
    lines.push("## Allergies");
    for (const a of p.allergies) lines.push(`- ${a.substance}${a.reaction ? ` – ${a.reaction}` : ""}`);
  }
  if (p.surgeries.length || p.hospitalizations) {
    lines.push("");
    lines.push("## Surgeries and hospitalisations");
    for (const s of p.surgeries) lines.push(`- ${s.name}${s.year ? ` (${s.year})` : ""}`);
    if (p.hospitalizations) lines.push(`- Hospitalised: ${p.hospitalizations}`);
  }
  lines.push("");
  lines.push("## Family history");
  if (p.familyHistory.length === 0) lines.push("None reported.");
  for (const f of p.familyHistory) lines.push(`- ${f.condition}${f.relations.length ? ` – ${f.relations.join(", ")}` : ""}`);
  lines.push("");
  lines.push("## Lifestyle");
  lines.push(describeLifestyle(p).join("; ") || "Not reported.");
  lines.push("");
  lines.push("## Current symptoms");
  if (p.overallFeeling !== null) lines.push(`Overall feeling: ${p.overallFeeling}/5.`);
  if (p.symptoms.length === 0) lines.push("None reported.");
  for (const s of p.symptoms) {
    const d = Object.entries(s.details)
      .map(([k, v]) => `${k.replace(/^[a-z]+_/, "")}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("; ");
    lines.push(`- ${s.name}${d ? ` (${d})` : ""}`);
  }
  lines.push("");
  lines.push("## Records (newest first)");
  for (const r of ctx.records) {
    lines.push(`### ${fmtDate(r.date)} – ${r.title} [${RECORD_TYPE_LABEL[r.type]}] (id ${r.id})`);
    if (r.summary) lines.push(r.summary);
    if (r.impression) lines.push(`Impression: ${r.impression}`);
    for (const v of r.values) {
      lines.push(`- ${v.name}: ${v.value}${v.unit ? ` ${v.unit}` : ""}${v.flag && v.flag !== "normal" ? ` (${v.flag})` : ""}`);
    }
  }
  lines.push("");
  lines.push("## Trends");
  for (const t of ctx.trends) if (t.observation) lines.push(`- ${t.observation}`);
  return lines.join("\n");
}

/* ------------------------------------------------------------------------ */
/* Retrieval                                                                 */
/* ------------------------------------------------------------------------ */

export type ContextSection =
  | "profile"
  | "conditions"
  | "medications"
  | "allergies"
  | "family"
  | "lifestyle"
  | "symptoms"
  | "records"
  | "trends";

export interface Retrieval {
  sections: ContextSection[];
  recordIds: string[];
}

const KEYWORDS: Record<ContextSection, string[]> = {
  profile: ["age", "weight", "height", "bmi", "profile", "about me", "who am i"],
  conditions: ["condition", "diagnos", "pressure", "bp", "hypertension", "diabet", "sugar", "cholesterol", "thyroid", "asthma", "heart"],
  medications: ["medic", "tablet", "pill", "dose", "drug", "telmisartan", "prescri", "taking"],
  allergies: ["allerg", "reaction"],
  family: ["family", "father", "mother", "parent", "sibling", "genetic", "hereditary", "risk"],
  lifestyle: ["sleep", "diet", "food", "exercise", "activity", "stress", "smok", "alcohol", "water", "lifestyle", "habit"],
  symptoms: ["tired", "fatigue", "symptom", "feel", "headache", "chest", "breath", "dizzy", "pain", "energy"],
  records: ["report", "test", "result", "ecg", "x-ray", "scan", "lab", "blood", "latest", "recent", "compare", "previous", "changed"],
  trends: ["trend", "over time", "change", "improv", "wors", "increas", "decreas", "history"],
};

/** Choose the context sections and records most relevant to a question. */
export function retrieveContext(ctx: HealthContext, query: string): Retrieval {
  const q = query.toLowerCase();
  const sections = (Object.keys(KEYWORDS) as ContextSection[]).filter((s) => KEYWORDS[s].some((k) => q.includes(k)));
  if (sections.length === 0) sections.push("profile", "conditions", "symptoms", "records");

  const recordIds = new Set<string>();
  if (sections.includes("records") || sections.includes("trends")) {
    if (ctx.latestReport) recordIds.add(ctx.latestReport.id);
    if (/compar|previous|changed|earlier|last time/.test(q) && ctx.previousReport) recordIds.add(ctx.previousReport.id);
  }
  if (/ecg|heart rhythm|electrocard/.test(q)) ctx.records.filter((r) => r.type === "ecg").forEach((r) => recordIds.add(r.id));
  if (/doctor|appointment|visit|consult/.test(q)) ctx.records.filter((r) => r.type === "consultation").slice(0, 1).forEach((r) => recordIds.add(r.id));
  if (/medic|prescri/.test(q)) ctx.records.filter((r) => r.type === "prescription").slice(0, 1).forEach((r) => recordIds.add(r.id));
  if (/summar|history|overview/.test(q)) ctx.records.slice(0, 3).forEach((r) => recordIds.add(r.id));

  return { sections, recordIds: [...recordIds] };
}
