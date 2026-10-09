import type { Answers } from "../onboarding/schema";

/**
 * A completed onboarding for the demo persona. Loading this skips the survey
 * and lands the user on a populated profile that matches the sample records.
 */
export const DEMO_ANSWERS: Answers = {
  name: "Arjun",
  age: 42,
  sex: "male",
  height: 176,
  weight: 84,
  location: "Bengaluru, India",
  occupation: "desk",

  conditions: ["hypertension", "prediabetes", "high_cholesterol"],
  htn_when: "1_3y",
  htn_managed: "medication",
  htn_knows_reading: "yes",
  htn_reading: { systolic: 128, diastolic: 82 },
  dm_managed: "lifestyle",
  dm_hba1c: 6.0,
  chol_managed: "lifestyle",
  takes_meds: "yes",
  meds_list: "Telmisartan 40 mg, every morning\nVitamin D3 60000 IU, once a week",
  meds_adherence: "sometimes",
  has_allergies: "yes",
  allergies_list: "Sulfa drugs – rash",
  had_surgery: "yes",
  surgeries_list: "Appendix removal – 2009",
  hospitalized: "no",

  smoking: "former",
  smoking_quit: "gt_5y",
  alcohol: "rarely",
  activity: "light",
  sleep_hours: 6,
  sleep_quality: "fair",
  diet: "balanced",
  stress: 4,
  water: 6,

  family_conditions: ["heart_disease", "diabetes", "hypertension"],
  family_heart_who: ["father"],
  family_heart_early: "yes",
  family_diabetes_who: ["mother"],
  family_htn_who: ["mother", "father"],

  feeling: 3,
  symptoms: ["tiredness", "sleep_trouble"],
  tired_since: "weeks",
  tired_pattern: "afternoon",
  anything_else: "Want to understand whether the tiredness is related to blood sugar before my next review in January.",
};
