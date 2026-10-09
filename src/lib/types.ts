/**
 * HealthTwin domain model.
 *
 * These types mirror the planned Prisma schema (see /prisma/schema.prisma).
 * Everything the UI, the onboarding engine and the context engine touch flows
 * through these shapes, so swapping the mock repository for Prisma later is a
 * data-layer change only.
 */

export type Sex = "female" | "male" | "intersex" | "prefer_not";

export interface UserProfile {
  id: string;
  name: string;
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  location: string | null;
  occupation: string | null;
}

export type ConditionStatus = "active" | "resolved";
export type ManagedWith = "medication" | "lifestyle" | "monitoring" | "none" | "unknown";

export interface Condition {
  id: string;
  name: string;
  /** Loose slug used by the engine for branching, e.g. "hypertension". */
  key: string;
  status: ConditionStatus;
  diagnosed?: string; // free-form period ("2023", "about 2 years ago")
  managedWith?: ManagedWith;
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dose?: string;
  frequency?: string;
  forConditionKey?: string;
  adherence?: "regular" | "sometimes" | "stopped";
}

export interface Allergy {
  id: string;
  substance: string;
  reaction?: string;
}

export interface Surgery {
  id: string;
  name: string;
  year?: string;
}

export type Relation = "mother" | "father" | "sibling" | "grandparent" | "other";

export interface FamilyHistoryEntry {
  id: string;
  conditionKey: string;
  condition: string;
  relations: Relation[];
}

export interface Lifestyle {
  smoking: "never" | "former" | "occasional" | "daily" | null;
  smokingAmount?: string;
  alcohol: "never" | "rarely" | "weekly" | "most_days" | null;
  activity: "sedentary" | "light" | "moderate" | "active" | null;
  sleepHours: number | null;
  sleepQuality: "good" | "fair" | "poor" | null;
  diet: "balanced" | "high_processed" | "vegetarian" | "vegan" | "low_carb" | "irregular" | null;
  stress: 1 | 2 | 3 | 4 | 5 | null;
  waterGlasses: number | null;
}

export interface Symptom {
  id: string;
  key: string;
  name: string;
  /** Structured follow-up answers, keyed by onboarding question id. */
  details: Record<string, string | number | string[]>;
  reportedAt: string;
}

export type RecordType =
  | "blood_test"
  | "ecg"
  | "xray"
  | "scan"
  | "prescription"
  | "discharge_summary"
  | "consultation"
  | "other";

export type RecordStatus = "uploaded" | "extracting" | "ready" | "failed";

export type MetricKey =
  | "systolic"
  | "diastolic"
  | "heart_rate"
  | "weight"
  | "hba1c"
  | "fasting_glucose"
  | "total_cholesterol"
  | "ldl"
  | "hdl"
  | "triglycerides"
  | "hemoglobin"
  | "wbc"
  | "platelets"
  | "vitamin_d"
  | "tsh"
  | "creatinine"
  | "spo2"
  | "temperature";

export type ValueFlag = "low" | "normal" | "high" | "borderline";

export interface ExtractedValue {
  id: string;
  name: string;
  metric?: MetricKey;
  value: number | string;
  unit?: string;
  refLow?: number;
  refHigh?: number;
  flag?: ValueFlag;
}

export interface HealthRecord {
  id: string;
  type: RecordType;
  title: string;
  date: string; // ISO date
  provider?: string;
  fileName?: string;
  status: RecordStatus;
  /** Plain-language summary produced by AI extraction. */
  summary?: string;
  /** Doctor notes or impression when present. */
  impression?: string;
  values: ExtractedValue[];
}

export type ReadingSource = "self" | "kit" | "record";

export interface Reading {
  id: string;
  metric: MetricKey;
  value: number;
  unit: string;
  takenAt: string; // ISO date
  source: ReadingSource;
  recordId?: string;
}

export interface HealthProfile {
  user: UserProfile;
  conditions: Condition[];
  medications: Medication[];
  allergies: Allergy[];
  surgeries: Surgery[];
  hospitalizations: string | null;
  familyHistory: FamilyHistoryEntry[];
  lifestyle: Lifestyle;
  symptoms: Symptom[];
  overallFeeling: number | null; // 1–5
  updatedAt: string;
}

/** Safety tiers used across the product (see README §8). */
export type SafetyTier = "info" | "guidance" | "urgent";

export interface SafetyAlert {
  tier: SafetyTier;
  title: string;
  body: string;
}

export const METRIC_META: Record<
  MetricKey,
  { label: string; unit: string; refLow?: number; refHigh?: number; higherIsWorse?: boolean; decimals?: number }
> = {
  systolic: { label: "Systolic BP", unit: "mmHg", refLow: 90, refHigh: 129, higherIsWorse: true },
  diastolic: { label: "Diastolic BP", unit: "mmHg", refLow: 60, refHigh: 84, higherIsWorse: true },
  heart_rate: { label: "Resting heart rate", unit: "bpm", refLow: 60, refHigh: 100 },
  weight: { label: "Weight", unit: "kg", decimals: 1 },
  hba1c: { label: "HbA1c", unit: "%", refHigh: 5.7, higherIsWorse: true, decimals: 1 },
  fasting_glucose: { label: "Fasting glucose", unit: "mg/dL", refLow: 70, refHigh: 99, higherIsWorse: true },
  total_cholesterol: { label: "Total cholesterol", unit: "mg/dL", refHigh: 200, higherIsWorse: true },
  ldl: { label: "LDL cholesterol", unit: "mg/dL", refHigh: 100, higherIsWorse: true },
  hdl: { label: "HDL cholesterol", unit: "mg/dL", refLow: 40 },
  triglycerides: { label: "Triglycerides", unit: "mg/dL", refHigh: 150, higherIsWorse: true },
  hemoglobin: { label: "Hemoglobin", unit: "g/dL", refLow: 13, refHigh: 17, decimals: 1 },
  wbc: { label: "WBC count", unit: "×10³/µL", refLow: 4, refHigh: 11, decimals: 1 },
  platelets: { label: "Platelets", unit: "×10³/µL", refLow: 150, refHigh: 400 },
  vitamin_d: { label: "Vitamin D", unit: "ng/mL", refLow: 30, refHigh: 100 },
  tsh: { label: "TSH", unit: "mIU/L", refLow: 0.4, refHigh: 4.0, decimals: 1 },
  creatinine: { label: "Creatinine", unit: "mg/dL", refLow: 0.7, refHigh: 1.3, decimals: 2 },
  spo2: { label: "SpO₂", unit: "%", refLow: 95 },
  temperature: { label: "Temperature", unit: "°C", refLow: 36.1, refHigh: 37.2, decimals: 1 },
};

/** Format a metric value with the precision it's normally reported at (6 → "6.0" for HbA1c). */
export function fmtMetric(value: number | string, metric?: MetricKey): string {
  if (typeof value !== "number") return value;
  const d = metric ? METRIC_META[metric].decimals : undefined;
  return d !== undefined ? value.toFixed(d) : String(value);
}

export const RECORD_TYPE_LABEL: Record<RecordType, string> = {
  blood_test: "Blood test",
  ecg: "ECG",
  xray: "X-ray",
  scan: "Scan",
  prescription: "Prescription",
  discharge_summary: "Discharge summary",
  consultation: "Consultation",
  other: "Document",
};
