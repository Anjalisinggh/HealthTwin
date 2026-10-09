import type { Answers, BpAnswer } from "./schema";
import { CONDITION_OPTIONS, FAMILY_CONDITION_OPTIONS, SYMPTOM_OPTIONS } from "./questions";
import type {
  Condition,
  FamilyHistoryEntry,
  HealthProfile,
  Lifestyle,
  ManagedWith,
  Medication,
  Reading,
  Relation,
  Symptom,
} from "../types";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && !Number.isNaN(v) ? v : null);
const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

const WHEN_LABEL: Record<string, string> = {
  lt_1y: "within the last year",
  "1_3y": "1–3 years ago",
  "3_10y": "3–10 years ago",
  gt_10y: "over 10 years ago",
};

function label(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function managed(v: unknown): ManagedWith {
  if (v === "medication" || v === "lifestyle" || v === "monitoring" || v === "none") return v;
  return "unknown";
}

function parseLines(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseMedication(line: string, i: number, answers: Answers): Medication {
  // "Telmisartan 40 mg, morning" → name/dose/frequency
  const [head, ...rest] = line.split(",");
  const doseMatch = head.match(/(\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu|k|units?))/i);
  const name = doseMatch ? head.slice(0, doseMatch.index).trim() : head.trim();
  const adherenceRaw = answers.meds_adherence;
  const adherence: Medication["adherence"] =
    adherenceRaw === "regular" ? "regular" : adherenceRaw ? "sometimes" : undefined;
  return {
    id: `med-${i}`,
    name: name || head.trim(),
    dose: doseMatch?.[1]?.trim(),
    frequency: rest.join(",").trim() || undefined,
    adherence,
  };
}

export function answersToProfile(answers: Answers, previous?: HealthProfile): HealthProfile {
  const conditionKeys = arr(answers.conditions).filter((k) => k !== "none");
  const conditions: Condition[] = conditionKeys.map((key) => {
    const base: Condition = {
      id: `cond-${key}`,
      key,
      name: key === "other_condition" ? str(answers.conditions_other) ?? "Other condition" : label(CONDITION_OPTIONS, key),
      status: "active",
    };
    if (key === "hypertension") {
      base.diagnosed = WHEN_LABEL[String(answers.htn_when)] ?? undefined;
      base.managedWith = managed(answers.htn_managed);
    }
    if (key === "diabetes") {
      base.diagnosed = WHEN_LABEL[String(answers.dm_when)] ?? undefined;
      base.managedWith = managed(answers.dm_managed);
    }
    if (key === "prediabetes") base.managedWith = managed(answers.dm_managed);
    if (key === "high_cholesterol") base.managedWith = managed(answers.chol_managed);
    if (key === "heart_disease") {
      const t = String(answers.heart_type ?? "");
      const typeLabel: Record<string, string> = {
        cad: "Coronary artery disease / angina",
        mi: "Previous heart attack",
        arrhythmia: "Irregular heartbeat",
        valve: "Valve disease",
        heart_failure: "Heart failure",
      };
      base.notes = [typeLabel[t], answers.heart_procedure === "yes" ? "has had a cardiac procedure" : null]
        .filter(Boolean)
        .join("; ");
    }
    if (key === "asthma") {
      const c = String(answers.asthma_control ?? "");
      base.notes = c === "most_days" ? "needs reliever most days" : c === "weekly" ? "reliever about weekly" : "well controlled";
    }
    if (key === "thyroid") {
      const t = String(answers.thyroid_type ?? "");
      base.notes = t === "hypo" ? "under-active" : t === "hyper" ? "over-active" : undefined;
    }
    return base;
  });

  const medications: Medication[] =
    answers.takes_meds === "yes"
      ? parseLines(str(answers.meds_list)).map((l, i) => parseMedication(l, i, answers))
      : [];

  const allergies =
    answers.has_allergies === "yes"
      ? parseLines(str(answers.allergies_list)).map((l, i) => {
          const [substance, reaction] = l.split(/[–-]/).map((s) => s.trim());
          return { id: `alg-${i}`, substance: substance ?? l, reaction: reaction || undefined };
        })
      : [];

  const surgeries =
    answers.had_surgery === "yes"
      ? parseLines(str(answers.surgeries_list)).map((l, i) => {
          const year = l.match(/(19|20)\d{2}/)?.[0];
          const name = l.replace(/[–-]?\s*(19|20)\d{2}/, "").trim();
          return { id: `surg-${i}`, name: name || l, year };
        })
      : [];

  const familyKeys = arr(answers.family_conditions).filter((k) => k !== "none" && k !== "unknown");
  const whoKey: Record<string, string> = {
    heart_disease: "family_heart_who",
    diabetes: "family_diabetes_who",
    hypertension: "family_htn_who",
    cancer: "family_cancer_who",
    stroke: "family_stroke_who",
  };
  const familyHistory: FamilyHistoryEntry[] = familyKeys.map((k) => {
    let condition = label(FAMILY_CONDITION_OPTIONS, k);
    if (k === "cancer" && str(answers.family_cancer_type)) condition = `Cancer (${str(answers.family_cancer_type)})`;
    if (k === "heart_disease" && answers.family_heart_early === "yes") condition = "Heart disease (early onset)";
    return {
      id: `fam-${k}`,
      conditionKey: k,
      condition,
      relations: arr(answers[whoKey[k]]) as Relation[],
    };
  });

  const lifestyle: Lifestyle = {
    smoking: (answers.smoking as Lifestyle["smoking"]) ?? null,
    smokingAmount: str(answers.smoking_amount) ?? undefined,
    alcohol: (answers.alcohol as Lifestyle["alcohol"]) ?? null,
    activity: (answers.activity as Lifestyle["activity"]) ?? null,
    sleepHours: num(answers.sleep_hours),
    sleepQuality: (answers.sleep_quality as Lifestyle["sleepQuality"]) ?? null,
    diet: (answers.diet as Lifestyle["diet"]) ?? null,
    stress: (num(answers.stress) as Lifestyle["stress"]) ?? null,
    waterGlasses: num(answers.water),
  };

  const symptomKeys = arr(answers.symptoms).filter((k) => k !== "none");
  const detailPrefix: Record<string, string[]> = {
    chest_discomfort: ["chest_when", "chest_duration", "chest_associated", "chest_before"],
    tiredness: ["tired_since", "tired_pattern"],
    breathlessness: ["breath_when"],
    headaches: ["headache_freq", "headache_features"],
    digestive: ["digestive_type"],
    weight_change: ["weight_direction"],
    dizziness: ["dizzy_when"],
    sleep_trouble: ["sleep_issue"],
  };
  const now = new Date().toISOString();
  const symptoms: Symptom[] = symptomKeys.map((key) => ({
    id: `sym-${key}`,
    key,
    name: label(SYMPTOM_OPTIONS, key),
    details: Object.fromEntries(
      (detailPrefix[key] ?? [])
        .filter((id) => answers[id] !== undefined && answers[id] !== null)
        .map((id) => [id, answers[id] as string | number | string[]]),
    ),
    reportedAt: now,
  }));

  const occupationLabel: Record<string, string> = {
    desk: "Desk-based work",
    mixed: "Mixed sitting and moving",
    physical: "Physically demanding work",
    shifts: "Shift work",
    not_working: "Not working currently",
  };

  return {
    user: {
      id: previous?.user.id ?? "user-local",
      name: str(answers.name) ?? "there",
      age: num(answers.age),
      sex: (answers.sex as HealthProfile["user"]["sex"]) ?? null,
      heightCm: num(answers.height),
      weightKg: num(answers.weight),
      location: str(answers.location),
      occupation: occupationLabel[String(answers.occupation)] ?? null,
    },
    conditions,
    medications,
    allergies,
    surgeries,
    hospitalizations: answers.hospitalized === "yes" ? str(answers.hospitalized_why) : null,
    familyHistory,
    lifestyle,
    symptoms,
    overallFeeling: num(answers.feeling),
    updatedAt: now,
  };
}

/** Readings the user typed during onboarding become self-reported readings. */
export function answersToReadings(answers: Answers): Reading[] {
  const out: Reading[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const bp = answers.htn_reading as BpAnswer | undefined;
  if (bp && bp.systolic !== null && bp.diastolic !== null) {
    out.push({ id: "self-sys", metric: "systolic", value: bp.systolic, unit: "mmHg", takenAt: today, source: "self" });
    out.push({ id: "self-dia", metric: "diastolic", value: bp.diastolic, unit: "mmHg", takenAt: today, source: "self" });
  }
  const w = num(answers.weight);
  if (w !== null) out.push({ id: "self-weight", metric: "weight", value: w, unit: "kg", takenAt: today, source: "self" });
  const a1c = num(answers.dm_hba1c);
  if (a1c !== null) out.push({ id: "self-hba1c", metric: "hba1c", value: a1c, unit: "%", takenAt: today, source: "self" });
  return out;
}

export function profileCompleteness(p: HealthProfile): number {
  const checks = [
    p.user.age !== null,
    p.user.sex !== null,
    p.user.heightCm !== null,
    p.user.weightKg !== null,
    p.lifestyle.sleepHours !== null,
    p.lifestyle.activity !== null,
    p.lifestyle.diet !== null,
    p.lifestyle.smoking !== null,
    p.overallFeeling !== null,
    true, // onboarding done
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
