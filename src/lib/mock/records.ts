import type { ExtractedValue, HealthRecord, MetricKey, Reading } from "../types";
import { METRIC_META } from "../types";

/**
 * Realistic sample records for the demo persona (Arjun, 42, Bengaluru).
 * Dates span 2024–2026 so the timeline and trends have real shape.
 */

let valueSeq = 0;
function v(
  metric: MetricKey,
  value: number,
  overrides: Partial<ExtractedValue> = {},
): ExtractedValue {
  const meta = METRIC_META[metric];
  const refLow = overrides.refLow ?? meta.refLow;
  const refHigh = overrides.refHigh ?? meta.refHigh;
  let flag: ExtractedValue["flag"] = "normal";
  if (refHigh !== undefined && value > refHigh) flag = "high";
  if (refLow !== undefined && value < refLow) flag = "low";
  return {
    id: `val-${++valueSeq}`,
    name: meta.label,
    metric,
    value,
    unit: meta.unit,
    refLow,
    refHigh,
    flag,
    ...overrides,
  };
}

export const MOCK_RECORDS: HealthRecord[] = [
  {
    id: "rec-2024-03-cbc",
    type: "blood_test",
    title: "Annual health check panel",
    date: "2024-03-14",
    provider: "Apollo Diagnostics, Koramangala",
    fileName: "health-check-mar-2024.pdf",
    status: "ready",
    summary:
      "Routine panel. Cholesterol and LDL above target, vitamin D low. Blood counts, thyroid and kidney function normal.",
    values: [
      v("hemoglobin", 14.6),
      v("wbc", 7.1),
      v("platelets", 232),
      v("fasting_glucose", 98),
      v("hba1c", 5.6),
      v("total_cholesterol", 218),
      v("ldl", 142),
      v("hdl", 39),
      v("triglycerides", 182),
      v("vitamin_d", 18),
      v("tsh", 2.1),
      v("creatinine", 0.9),
    ],
  },
  {
    id: "rec-2024-08-consult",
    type: "consultation",
    title: "Physician consultation",
    date: "2024-08-02",
    provider: "Dr. Meera Rao, General Physician",
    fileName: "consult-aug-2024.pdf",
    status: "ready",
    summary:
      "Visit for recurring headaches. Blood pressure elevated on two readings. Diagnosed with stage 1 hypertension and started on Telmisartan 40 mg once daily. Advised salt reduction and a follow-up in 3 months.",
    impression: "Essential hypertension, newly diagnosed. Start Telmisartan 40 mg OD. Home BP monitoring.",
    values: [v("systolic", 146), v("diastolic", 94), v("heart_rate", 82), v("weight", 87)],
  },
  {
    id: "rec-2024-08-rx",
    type: "prescription",
    title: "Prescription – Telmisartan",
    date: "2024-08-02",
    provider: "Dr. Meera Rao",
    fileName: "rx-aug-2024.jpg",
    status: "ready",
    summary: "Telmisartan 40 mg, one tablet every morning for 90 days. Review with home BP log.",
    values: [],
  },
  {
    id: "rec-2025-02-lipid",
    type: "blood_test",
    title: "Lipid profile and sugar follow-up",
    date: "2025-02-20",
    provider: "Apollo Diagnostics, Koramangala",
    fileName: "lipid-feb-2025.pdf",
    status: "ready",
    summary:
      "LDL has come down from 142 to 128 but is still above target. HbA1c has moved into the prediabetes range at 5.8%. Vitamin D now normal after supplementation.",
    values: [
      v("fasting_glucose", 104),
      v("hba1c", 5.8),
      v("total_cholesterol", 204),
      v("ldl", 128),
      v("hdl", 41),
      v("triglycerides", 171),
      v("vitamin_d", 31),
    ],
  },
  {
    id: "rec-2025-09-ecg",
    type: "ecg",
    title: "Resting 12-lead ECG",
    date: "2025-09-11",
    provider: "Manipal Hospital, Old Airport Road",
    fileName: "ecg-sep-2025.pdf",
    status: "ready",
    summary:
      "Normal sinus rhythm at 74 beats per minute. Normal axis and intervals. No signs of previous heart damage or strain from blood pressure.",
    impression: "Normal ECG. Sinus rhythm, rate 74. PR 160 ms, QRS 88 ms, QTc 412 ms. No ST-T changes.",
    values: [v("heart_rate", 74)],
  },
  {
    id: "rec-2026-03-panel",
    type: "blood_test",
    title: "Comprehensive metabolic panel",
    date: "2026-03-05",
    provider: "Neuberg Diagnostics, Indiranagar",
    fileName: "panel-mar-2026.pdf",
    status: "ready",
    summary:
      "LDL continues to improve (118). HbA1c has risen slightly to 6.0%, still in the prediabetes range. Triglycerides remain high. Blood counts, thyroid and kidney function are normal.",
    values: [
      v("hemoglobin", 14.2),
      v("wbc", 6.8),
      v("platelets", 240),
      v("fasting_glucose", 108),
      v("hba1c", 6.0),
      v("total_cholesterol", 196),
      v("ldl", 118),
      v("hdl", 42),
      v("triglycerides", 168),
      v("vitamin_d", 29),
      v("tsh", 2.4),
      v("creatinine", 0.95),
    ],
  },
  {
    id: "rec-2026-07-consult",
    type: "consultation",
    title: "Hypertension review",
    date: "2026-07-18",
    provider: "Dr. Meera Rao, General Physician",
    fileName: "review-jul-2026.pdf",
    status: "ready",
    summary:
      "Blood pressure improved on treatment. Prediabetes discussed: advised 150 minutes of brisk walking a week, reduced refined carbohydrates, and an HbA1c recheck in 6 months. Continue Telmisartan 40 mg.",
    impression:
      "Hypertension, controlled on Telmisartan 40 mg. Prediabetes (HbA1c 6.0). Overweight (BMI 27.1). Lifestyle modification. Review 6 months with HbA1c, lipids.",
    values: [v("systolic", 132), v("diastolic", 86), v("heart_rate", 76), v("weight", 84)],
  },
];

/* ------------------------------------------------------------------------ */
/* Readings                                                                  */
/* ------------------------------------------------------------------------ */

let readingSeq = 0;
function r(metric: MetricKey, value: number, takenAt: string, source: Reading["source"], recordId?: string): Reading {
  return { id: `rd-${++readingSeq}`, metric, value, unit: METRIC_META[metric].unit, takenAt, source, recordId };
}

/** Readings pulled out of records plus a few home readings. */
export const MOCK_READINGS: Reading[] = [
  // Blood pressure
  r("systolic", 146, "2024-08-02", "record", "rec-2024-08-consult"),
  r("diastolic", 94, "2024-08-02", "record", "rec-2024-08-consult"),
  r("systolic", 138, "2024-11-10", "self"),
  r("diastolic", 90, "2024-11-10", "self"),
  r("systolic", 134, "2025-02-20", "self"),
  r("diastolic", 88, "2025-02-20", "self"),
  r("systolic", 129, "2025-06-04", "self"),
  r("diastolic", 84, "2025-06-04", "self"),
  r("systolic", 131, "2025-09-11", "self"),
  r("diastolic", 85, "2025-09-11", "self"),
  r("systolic", 127, "2026-01-15", "self"),
  r("diastolic", 83, "2026-01-15", "self"),
  r("systolic", 130, "2026-03-05", "self"),
  r("diastolic", 84, "2026-03-05", "self"),
  r("systolic", 132, "2026-07-18", "record", "rec-2026-07-consult"),
  r("diastolic", 86, "2026-07-18", "record", "rec-2026-07-consult"),
  r("systolic", 128, "2026-09-20", "self"),
  r("diastolic", 82, "2026-09-20", "self"),
  // Heart rate
  r("heart_rate", 82, "2024-08-02", "record", "rec-2024-08-consult"),
  r("heart_rate", 74, "2025-09-11", "record", "rec-2025-09-ecg"),
  r("heart_rate", 76, "2026-07-18", "record", "rec-2026-07-consult"),
  // Weight
  r("weight", 88, "2024-03-14", "self"),
  r("weight", 87, "2024-08-02", "record", "rec-2024-08-consult"),
  r("weight", 86, "2025-02-20", "self"),
  r("weight", 85, "2025-09-11", "self"),
  r("weight", 84.5, "2026-03-05", "self"),
  r("weight", 84, "2026-07-18", "record", "rec-2026-07-consult"),
  // HbA1c
  r("hba1c", 5.6, "2024-03-14", "record", "rec-2024-03-cbc"),
  r("hba1c", 5.8, "2025-02-20", "record", "rec-2025-02-lipid"),
  r("hba1c", 6.0, "2026-03-05", "record", "rec-2026-03-panel"),
  // Fasting glucose
  r("fasting_glucose", 98, "2024-03-14", "record", "rec-2024-03-cbc"),
  r("fasting_glucose", 104, "2025-02-20", "record", "rec-2025-02-lipid"),
  r("fasting_glucose", 108, "2026-03-05", "record", "rec-2026-03-panel"),
  // Lipids
  r("ldl", 142, "2024-03-14", "record", "rec-2024-03-cbc"),
  r("ldl", 128, "2025-02-20", "record", "rec-2025-02-lipid"),
  r("ldl", 118, "2026-03-05", "record", "rec-2026-03-panel"),
  r("hdl", 39, "2024-03-14", "record", "rec-2024-03-cbc"),
  r("hdl", 41, "2025-02-20", "record", "rec-2025-02-lipid"),
  r("hdl", 42, "2026-03-05", "record", "rec-2026-03-panel"),
  r("triglycerides", 182, "2024-03-14", "record", "rec-2024-03-cbc"),
  r("triglycerides", 171, "2025-02-20", "record", "rec-2025-02-lipid"),
  r("triglycerides", 168, "2026-03-05", "record", "rec-2026-03-panel"),
  // Vitamin D
  r("vitamin_d", 18, "2024-03-14", "record", "rec-2024-03-cbc"),
  r("vitamin_d", 31, "2025-02-20", "record", "rec-2025-02-lipid"),
  r("vitamin_d", 29, "2026-03-05", "record", "rec-2026-03-panel"),
];
