import type { Option, Question } from "./schema";

/* ------------------------------------------------------------------------ */
/* Shared option sets                                                        */
/* ------------------------------------------------------------------------ */

export const CONDITION_OPTIONS: Option[] = [
  { value: "hypertension", label: "High blood pressure" },
  { value: "diabetes", label: "Diabetes (type 2)" },
  { value: "prediabetes", label: "Prediabetes" },
  { value: "high_cholesterol", label: "High cholesterol" },
  { value: "heart_disease", label: "Heart disease" },
  { value: "asthma", label: "Asthma" },
  { value: "thyroid", label: "Thyroid disorder" },
  { value: "pcos", label: "PCOS" },
  { value: "anxiety_depression", label: "Anxiety or depression" },
  { value: "migraine", label: "Migraine" },
  { value: "acid_reflux", label: "Acid reflux / GERD" },
  { value: "kidney", label: "Kidney disease" },
  { value: "other_condition", label: "Something else" },
  { value: "none", label: "None of these", exclusive: true },
];

export const FAMILY_CONDITION_OPTIONS: Option[] = [
  { value: "heart_disease", label: "Heart disease" },
  { value: "diabetes", label: "Diabetes" },
  { value: "hypertension", label: "High blood pressure" },
  { value: "cancer", label: "Cancer" },
  { value: "stroke", label: "Stroke" },
  { value: "respiratory", label: "Asthma / respiratory disease" },
  { value: "thyroid", label: "Thyroid disorder" },
  { value: "kidney", label: "Kidney disease" },
  { value: "none", label: "None that I know of", exclusive: true },
  { value: "unknown", label: "I don't know", exclusive: true },
];

export const RELATION_OPTIONS: Option[] = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "sibling", label: "Sibling" },
  { value: "grandparent", label: "Grandparent" },
];

export const SYMPTOM_OPTIONS: Option[] = [
  { value: "tiredness", label: "Tired more than usual" },
  { value: "chest_discomfort", label: "Chest discomfort" },
  { value: "breathlessness", label: "Breathlessness" },
  { value: "headaches", label: "Frequent headaches" },
  { value: "sleep_trouble", label: "Trouble sleeping" },
  { value: "digestive", label: "Digestive issues" },
  { value: "joint_pain", label: "Joint or back pain" },
  { value: "dizziness", label: "Dizziness" },
  { value: "weight_change", label: "Unexplained weight change" },
  { value: "low_mood", label: "Low mood or anxiety" },
  { value: "none", label: "Nothing in particular", exclusive: true },
];

const YES_NO: Option[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const YES_NO_UNSURE: Option[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure" },
];

const WHEN_OPTIONS: Option[] = [
  { value: "lt_1y", label: "Within the last year" },
  { value: "1_3y", label: "1–3 years ago" },
  { value: "3_10y", label: "3–10 years ago" },
  { value: "gt_10y", label: "More than 10 years ago" },
];

const MANAGED_OPTIONS: Option[] = [
  { value: "medication", label: "With medication" },
  { value: "lifestyle", label: "Diet and lifestyle only" },
  { value: "monitoring", label: "Just monitoring it" },
  { value: "none", label: "Not actively managing" },
];

const FREQUENCY_OPTIONS: Option[] = [
  { value: "daily", label: "Most days" },
  { value: "weekly", label: "A few times a week" },
  { value: "monthly", label: "A few times a month" },
  { value: "rare", label: "Rarely" },
];

/* ------------------------------------------------------------------------ */
/* Question tree                                                             */
/* ------------------------------------------------------------------------ */

/**
 * Ordered question list. Rules reference earlier question ids. Follow-ups sit
 * immediately after the question they deepen so the flow reads naturally.
 */
export const QUESTIONS: Question[] = [
  /* ---------------------------------------------------------- basics --- */
  {
    id: "name",
    section: "basics",
    type: "text",
    prompt: "What should we call you?",
    placeholder: "Your first name",
  },
  {
    id: "age",
    section: "basics",
    type: "number",
    prompt: "How old are you?",
    unit: "years",
    min: 13,
    max: 110,
  },
  {
    id: "sex",
    section: "basics",
    type: "single",
    prompt: "What is your biological sex?",
    help: "Used only to interpret reference ranges in reports. Many lab normals differ by sex.",
    options: [
      { value: "female", label: "Female" },
      { value: "male", label: "Male" },
      { value: "intersex", label: "Intersex" },
      { value: "prefer_not", label: "Prefer not to say" },
    ],
  },
  {
    id: "height",
    section: "basics",
    type: "number",
    prompt: "How tall are you?",
    unit: "cm",
    min: 100,
    max: 250,
  },
  {
    id: "weight",
    section: "basics",
    type: "number",
    prompt: "What is your current weight?",
    help: "An estimate is fine. You can log precise readings later.",
    unit: "kg",
    min: 25,
    max: 300,
    step: 0.5,
  },
  {
    id: "location",
    section: "basics",
    type: "text",
    prompt: "Where do you live?",
    help: "City is enough. Helps with seasonal and regional context.",
    placeholder: "City, country",
    optional: true,
  },
  {
    id: "occupation",
    section: "basics",
    type: "single",
    prompt: "What does a typical workday look like?",
    options: [
      { value: "desk", label: "Mostly at a desk" },
      { value: "mixed", label: "Mix of sitting and moving" },
      { value: "physical", label: "Physically demanding" },
      { value: "shifts", label: "Shift work or irregular hours" },
      { value: "not_working", label: "Not working right now" },
    ],
  },

  /* --------------------------------------------------------- history --- */
  {
    id: "conditions",
    section: "history",
    type: "multi",
    prompt: "Have you been diagnosed with any of these?",
    help: "Select everything that applies. We'll ask a little more about each.",
    options: CONDITION_OPTIONS,
  },
  {
    id: "conditions_other",
    section: "history",
    type: "text",
    prompt: "What other condition have you been diagnosed with?",
    placeholder: "e.g. Psoriasis",
    showIf: { q: "conditions", includes: "other_condition" },
    followUpOf: "conditions",
  },

  // Hypertension branch
  {
    id: "htn_when",
    section: "history",
    type: "single",
    prompt: "When were you diagnosed with high blood pressure?",
    options: WHEN_OPTIONS,
    showIf: { q: "conditions", includes: "hypertension" },
    followUpOf: "conditions",
  },
  {
    id: "htn_managed",
    section: "history",
    type: "single",
    prompt: "How is your blood pressure being managed?",
    options: MANAGED_OPTIONS,
    showIf: { q: "conditions", includes: "hypertension" },
    followUpOf: "conditions",
  },
  {
    id: "htn_knows_reading",
    section: "history",
    type: "single",
    prompt: "Do you know your most recent blood pressure reading?",
    options: YES_NO,
    showIf: { q: "conditions", includes: "hypertension" },
    followUpOf: "conditions",
  },
  {
    id: "htn_reading",
    section: "history",
    type: "bp",
    prompt: "What was your latest reading?",
    help: "Top number over bottom number, e.g. 128 / 82.",
    showIf: { q: "htn_knows_reading", is: "yes" },
    followUpOf: "conditions",
  },

  // Diabetes / prediabetes branch
  {
    id: "dm_when",
    section: "history",
    type: "single",
    prompt: "When were you diagnosed with diabetes?",
    options: WHEN_OPTIONS,
    showIf: { q: "conditions", includes: "diabetes" },
    followUpOf: "conditions",
  },
  {
    id: "dm_managed",
    section: "history",
    type: "single",
    prompt: "How is your blood sugar being managed?",
    options: MANAGED_OPTIONS,
    showIf: { q: "conditions", includesAny: ["diabetes", "prediabetes"] },
    followUpOf: "conditions",
  },
  {
    id: "dm_hba1c",
    section: "history",
    type: "number",
    prompt: "Do you know your latest HbA1c?",
    help: "It's on most diabetes blood reports. Skip if you don't know.",
    unit: "%",
    min: 3,
    max: 15,
    step: 0.1,
    optional: true,
    showIf: { q: "conditions", includesAny: ["diabetes", "prediabetes"] },
    followUpOf: "conditions",
  },

  // Cholesterol branch
  {
    id: "chol_managed",
    section: "history",
    type: "single",
    prompt: "How is your cholesterol being managed?",
    options: MANAGED_OPTIONS,
    showIf: { q: "conditions", includes: "high_cholesterol" },
    followUpOf: "conditions",
  },

  // Heart disease branch
  {
    id: "heart_type",
    section: "history",
    type: "single",
    prompt: "What kind of heart condition is it?",
    options: [
      { value: "cad", label: "Blocked arteries / angina" },
      { value: "mi", label: "Previous heart attack" },
      { value: "arrhythmia", label: "Irregular heartbeat" },
      { value: "valve", label: "Valve problem" },
      { value: "heart_failure", label: "Heart failure" },
      { value: "unsure", label: "Not sure" },
    ],
    showIf: { q: "conditions", includes: "heart_disease" },
    followUpOf: "conditions",
  },
  {
    id: "heart_procedure",
    section: "history",
    type: "single",
    prompt: "Have you had a stent, bypass or other heart procedure?",
    options: YES_NO,
    showIf: { q: "conditions", includes: "heart_disease" },
    followUpOf: "conditions",
  },

  // Asthma branch
  {
    id: "asthma_control",
    section: "history",
    type: "single",
    prompt: "How often do you need a reliever inhaler?",
    options: [
      { value: "rare", label: "Rarely, if ever" },
      { value: "weekly", label: "About once a week" },
      { value: "most_days", label: "Most days" },
    ],
    showIf: { q: "conditions", includes: "asthma" },
    followUpOf: "conditions",
  },

  // Thyroid branch
  {
    id: "thyroid_type",
    section: "history",
    type: "single",
    prompt: "Is your thyroid under-active or over-active?",
    options: [
      { value: "hypo", label: "Under-active (hypothyroid)" },
      { value: "hyper", label: "Over-active (hyperthyroid)" },
      { value: "unsure", label: "Not sure" },
    ],
    showIf: { q: "conditions", includes: "thyroid" },
    followUpOf: "conditions",
  },

  // Medications
  {
    id: "takes_meds",
    section: "history",
    type: "single",
    prompt: "Are you currently taking any medication regularly?",
    help: "Including supplements you take every day.",
    options: YES_NO,
  },
  {
    id: "meds_list",
    section: "history",
    type: "longtext",
    prompt: "Which medications do you take?",
    help: "One per line. Dose and timing if you know them, e.g. “Telmisartan 40 mg, morning”.",
    placeholder: "Telmisartan 40 mg, morning\nVitamin D3 60k, weekly",
    showIf: { q: "takes_meds", is: "yes" },
    followUpOf: "takes_meds",
  },
  {
    id: "meds_adherence",
    section: "history",
    type: "single",
    prompt: "How regularly do you take them?",
    options: [
      { value: "regular", label: "Every day as prescribed" },
      { value: "sometimes", label: "I miss doses sometimes" },
      { value: "often_miss", label: "I miss doses often" },
    ],
    showIf: { q: "takes_meds", is: "yes" },
    followUpOf: "takes_meds",
  },

  // Allergies
  {
    id: "has_allergies",
    section: "history",
    type: "single",
    prompt: "Any allergies to medicines, foods or anything else?",
    options: YES_NO_UNSURE,
  },
  {
    id: "allergies_list",
    section: "history",
    type: "longtext",
    prompt: "What are you allergic to, and what happens?",
    placeholder: "Penicillin – rash\nPeanuts – swelling",
    showIf: { q: "has_allergies", is: "yes" },
    followUpOf: "has_allergies",
  },

  // Surgeries & hospitalizations
  {
    id: "had_surgery",
    section: "history",
    type: "single",
    prompt: "Have you ever had surgery?",
    options: YES_NO,
  },
  {
    id: "surgeries_list",
    section: "history",
    type: "longtext",
    prompt: "What surgeries, and roughly when?",
    placeholder: "Appendix removal – 2015",
    showIf: { q: "had_surgery", is: "yes" },
    followUpOf: "had_surgery",
  },
  {
    id: "hospitalized",
    section: "history",
    type: "single",
    prompt: "Been hospitalised overnight in the last 5 years, other than for surgery?",
    options: YES_NO,
  },
  {
    id: "hospitalized_why",
    section: "history",
    type: "text",
    prompt: "What was the reason?",
    placeholder: "e.g. Dengue fever, 2024",
    showIf: { q: "hospitalized", is: "yes" },
    followUpOf: "hospitalized",
  },

  /* ------------------------------------------------------- lifestyle --- */
  {
    id: "smoking",
    section: "lifestyle",
    type: "single",
    prompt: "Do you smoke or vape?",
    options: [
      { value: "never", label: "Never" },
      { value: "former", label: "I used to, but quit" },
      { value: "occasional", label: "Occasionally" },
      { value: "daily", label: "Daily" },
    ],
  },
  {
    id: "smoking_amount",
    section: "lifestyle",
    type: "single",
    prompt: "Roughly how much per day?",
    options: [
      { value: "lt5", label: "Fewer than 5" },
      { value: "5_10", label: "5–10" },
      { value: "10_20", label: "10–20" },
      { value: "gt20", label: "More than 20" },
    ],
    showIf: { q: "smoking", is: "daily" },
    followUpOf: "smoking",
  },
  {
    id: "smoking_quit",
    section: "lifestyle",
    type: "single",
    prompt: "How long ago did you quit?",
    options: [
      { value: "lt_1y", label: "Less than a year ago" },
      { value: "1_5y", label: "1–5 years ago" },
      { value: "gt_5y", label: "More than 5 years ago" },
    ],
    showIf: { q: "smoking", is: "former" },
    followUpOf: "smoking",
  },
  {
    id: "alcohol",
    section: "lifestyle",
    type: "single",
    prompt: "How often do you drink alcohol?",
    options: [
      { value: "never", label: "Never" },
      { value: "rarely", label: "A few times a year" },
      { value: "weekly", label: "Weekly" },
      { value: "most_days", label: "Most days" },
    ],
  },
  {
    id: "activity",
    section: "lifestyle",
    type: "single",
    prompt: "How active are you in a typical week?",
    options: [
      { value: "sedentary", label: "Mostly sitting", hint: "Little planned exercise" },
      { value: "light", label: "Light", hint: "Walks, light chores" },
      { value: "moderate", label: "Moderate", hint: "2–4 workouts a week" },
      { value: "active", label: "Very active", hint: "Most days, or physical job" },
    ],
  },
  {
    id: "sleep_hours",
    section: "lifestyle",
    type: "number",
    prompt: "How many hours do you usually sleep?",
    unit: "hours",
    min: 2,
    max: 14,
    step: 0.5,
  },
  {
    id: "sleep_quality",
    section: "lifestyle",
    type: "single",
    prompt: "How would you rate your sleep quality?",
    options: [
      { value: "good", label: "Good", hint: "Wake up rested" },
      { value: "fair", label: "Fair", hint: "Some bad nights" },
      { value: "poor", label: "Poor", hint: "Often tired on waking" },
    ],
  },
  {
    id: "sleep_issue",
    section: "lifestyle",
    type: "multi",
    prompt: "What gets in the way of good sleep?",
    options: [
      { value: "falling_asleep", label: "Falling asleep" },
      { value: "waking", label: "Waking during the night" },
      { value: "early", label: "Waking too early" },
      { value: "snoring", label: "Snoring or gasping" },
      { value: "screens", label: "Late screens or work" },
      { value: "unsure", label: "Not sure", exclusive: true },
    ],
    showIf: {
      any: [
        { q: "sleep_quality", is: "poor" },
        { q: "sleep_hours", lte: 5.5 },
      ],
    },
    followUpOf: "sleep_quality",
  },
  {
    id: "diet",
    section: "lifestyle",
    type: "single",
    prompt: "Which best describes how you eat?",
    options: [
      { value: "balanced", label: "Balanced, mostly home-cooked" },
      { value: "vegetarian", label: "Vegetarian" },
      { value: "vegan", label: "Vegan" },
      { value: "low_carb", label: "Low-carb or keto" },
      { value: "high_processed", label: "A lot of takeaway or processed food" },
      { value: "irregular", label: "Irregular, skip meals often" },
    ],
  },
  {
    id: "stress",
    section: "lifestyle",
    type: "scale",
    prompt: "How stressed have you felt over the past month?",
    min: 1,
    max: 5,
    scaleLabels: ["Not at all", "Extremely"],
  },
  {
    id: "water",
    section: "lifestyle",
    type: "number",
    prompt: "About how many glasses of water a day?",
    unit: "glasses",
    min: 0,
    max: 20,
  },

  /* ---------------------------------------------------------- family --- */
  {
    id: "family_conditions",
    section: "family",
    type: "multi",
    prompt: "Has a close relative had any of these?",
    help: "Parents, siblings or grandparents.",
    options: FAMILY_CONDITION_OPTIONS,
  },
  {
    id: "family_heart_who",
    section: "family",
    type: "multi",
    prompt: "Who has had heart disease?",
    options: RELATION_OPTIONS,
    showIf: { q: "family_conditions", includes: "heart_disease" },
    followUpOf: "family_conditions",
  },
  {
    id: "family_heart_early",
    section: "family",
    type: "single",
    prompt: "Was any of it before age 55?",
    help: "Early heart disease in a parent or sibling changes how doctors read cholesterol.",
    options: YES_NO_UNSURE,
    showIf: { q: "family_conditions", includes: "heart_disease" },
    followUpOf: "family_conditions",
  },
  {
    id: "family_diabetes_who",
    section: "family",
    type: "multi",
    prompt: "Who has had diabetes?",
    options: RELATION_OPTIONS,
    showIf: { q: "family_conditions", includes: "diabetes" },
    followUpOf: "family_conditions",
  },
  {
    id: "family_htn_who",
    section: "family",
    type: "multi",
    prompt: "Who has had high blood pressure?",
    options: RELATION_OPTIONS,
    showIf: { q: "family_conditions", includes: "hypertension" },
    followUpOf: "family_conditions",
  },
  {
    id: "family_cancer_who",
    section: "family",
    type: "multi",
    prompt: "Who has had cancer?",
    options: RELATION_OPTIONS,
    showIf: { q: "family_conditions", includes: "cancer" },
    followUpOf: "family_conditions",
  },
  {
    id: "family_cancer_type",
    section: "family",
    type: "text",
    prompt: "What type of cancer, if you know?",
    placeholder: "e.g. Breast, colon",
    optional: true,
    showIf: { q: "family_conditions", includes: "cancer" },
    followUpOf: "family_conditions",
  },
  {
    id: "family_stroke_who",
    section: "family",
    type: "multi",
    prompt: "Who has had a stroke?",
    options: RELATION_OPTIONS,
    showIf: { q: "family_conditions", includes: "stroke" },
    followUpOf: "family_conditions",
  },

  /* --------------------------------------------------------- current --- */
  {
    id: "feeling",
    section: "current",
    type: "scale",
    prompt: "Overall, how have you been feeling recently?",
    min: 1,
    max: 5,
    scaleLabels: ["Not great", "Very well"],
  },
  {
    id: "symptoms",
    section: "current",
    type: "multi",
    prompt: "Anything bothering you in the last few weeks?",
    options: SYMPTOM_OPTIONS,
  },

  // Chest discomfort chain (safety-relevant)
  {
    id: "chest_when",
    section: "current",
    type: "single",
    prompt: "When does the chest discomfort happen?",
    options: [
      { value: "exertion", label: "During exercise or exertion" },
      { value: "rest", label: "At rest" },
      { value: "both", label: "Both" },
      { value: "stress", label: "When stressed or anxious" },
    ],
    showIf: { q: "symptoms", includes: "chest_discomfort" },
    followUpOf: "symptoms",
  },
  {
    id: "chest_duration",
    section: "current",
    type: "single",
    prompt: "How long does it usually last?",
    options: [
      { value: "seconds", label: "A few seconds" },
      { value: "minutes", label: "A few minutes" },
      { value: "long", label: "More than 20 minutes" },
    ],
    showIf: { q: "symptoms", includes: "chest_discomfort" },
    followUpOf: "symptoms",
  },
  {
    id: "chest_associated",
    section: "current",
    type: "multi",
    prompt: "Does anything come with it?",
    options: [
      { value: "breathless", label: "Breathlessness" },
      { value: "sweating", label: "Sweating" },
      { value: "arm_jaw", label: "Pain spreading to arm or jaw" },
      { value: "dizzy", label: "Dizziness" },
      { value: "nausea", label: "Nausea" },
      { value: "none", label: "None of these", exclusive: true },
    ],
    showIf: { q: "symptoms", includes: "chest_discomfort" },
    followUpOf: "symptoms",
  },
  {
    id: "chest_before",
    section: "current",
    type: "single",
    prompt: "Has this happened before?",
    options: [
      { value: "first", label: "This is new" },
      { value: "recurring", label: "It's happened a few times" },
      { value: "known", label: "Yes, and a doctor knows about it" },
    ],
    showIf: { q: "symptoms", includes: "chest_discomfort" },
    followUpOf: "symptoms",
  },

  // Tiredness chain
  {
    id: "tired_since",
    section: "current",
    type: "single",
    prompt: "How long have you felt more tired than usual?",
    options: [
      { value: "days", label: "A few days" },
      { value: "weeks", label: "A few weeks" },
      { value: "months", label: "Months" },
    ],
    showIf: { q: "symptoms", includes: "tiredness" },
    followUpOf: "symptoms",
  },
  {
    id: "tired_pattern",
    section: "current",
    type: "single",
    prompt: "When is the tiredness worst?",
    options: [
      { value: "morning", label: "On waking" },
      { value: "afternoon", label: "Afternoons" },
      { value: "all_day", label: "All day" },
      { value: "after_meals", label: "After meals" },
    ],
    showIf: { q: "symptoms", includes: "tiredness" },
    followUpOf: "symptoms",
  },

  // Breathlessness chain
  {
    id: "breath_when",
    section: "current",
    type: "single",
    prompt: "When do you get breathless?",
    options: [
      { value: "heavy", label: "Only with heavy exertion" },
      { value: "stairs", label: "Climbing stairs or walking fast" },
      { value: "rest", label: "Even at rest or lying down" },
    ],
    showIf: { q: "symptoms", includes: "breathlessness" },
    followUpOf: "symptoms",
  },

  // Headache chain
  {
    id: "headache_freq",
    section: "current",
    type: "single",
    prompt: "How often do you get headaches?",
    options: FREQUENCY_OPTIONS,
    showIf: { q: "symptoms", includes: "headaches" },
    followUpOf: "symptoms",
  },
  {
    id: "headache_features",
    section: "current",
    type: "multi",
    prompt: "Any of these with the headaches?",
    options: [
      { value: "vision", label: "Vision changes" },
      { value: "nausea", label: "Nausea" },
      { value: "worst_ever", label: "Sudden, worst ever" },
      { value: "morning", label: "Worse in the morning" },
      { value: "none", label: "None of these", exclusive: true },
    ],
    showIf: { q: "symptoms", includes: "headaches" },
    followUpOf: "symptoms",
  },

  // Digestive chain
  {
    id: "digestive_type",
    section: "current",
    type: "multi",
    prompt: "What kind of digestive issues?",
    options: [
      { value: "acidity", label: "Acidity or heartburn" },
      { value: "bloating", label: "Bloating" },
      { value: "constipation", label: "Constipation" },
      { value: "loose", label: "Loose stools" },
      { value: "pain", label: "Abdominal pain" },
    ],
    showIf: { q: "symptoms", includes: "digestive" },
    followUpOf: "symptoms",
  },

  // Weight change chain
  {
    id: "weight_direction",
    section: "current",
    type: "single",
    prompt: "Have you gained or lost weight?",
    options: [
      { value: "lost", label: "Lost weight without trying" },
      { value: "gained", label: "Gained weight" },
    ],
    showIf: { q: "symptoms", includes: "weight_change" },
    followUpOf: "symptoms",
  },

  // Dizziness chain
  {
    id: "dizzy_when",
    section: "current",
    type: "single",
    prompt: "When does the dizziness happen?",
    options: [
      { value: "standing", label: "When standing up" },
      { value: "random", label: "Out of nowhere" },
      { value: "exertion", label: "With exertion" },
    ],
    showIf: { q: "symptoms", includes: "dizziness" },
    followUpOf: "symptoms",
  },

  {
    id: "anything_else",
    section: "current",
    type: "longtext",
    prompt: "Anything else you'd like HealthTwin to know?",
    help: "Recent changes, worries, a question for your next doctor visit.",
    placeholder: "Optional",
    optional: true,
  },
];

export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
);
