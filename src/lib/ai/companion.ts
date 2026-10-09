import type { HealthContext } from "../context/engine";
import { describeLifestyle, retrieveContext } from "../context/engine";
import { fmtDate, fmtMonth } from "../trends";
import type { MetricKey, SafetyTier } from "../types";
import { RECORD_TYPE_LABEL, fmtMetric } from "../types";

/**
 * HealthTwin AI companion.
 *
 * `CompanionProvider` is the seam for a real model. `MockCompanion` answers
 * from the health context with deterministic templates so the product is
 * usable end-to-end before the Claude API is connected. A `ClaudeCompanion`
 * would call the Messages API with `renderContextForPrompt(ctx)` as system
 * context and return the same `CompanionReply` shape.
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CompanionReply {
  tier: SafetyTier;
  /** Lightweight markdown: paragraphs, **bold**, "- " bullets. */
  content: string;
  /** Record ids the answer drew on, shown as source chips. */
  sources: { id: string; title: string; date: string }[];
  followUps: string[];
}

export interface CompanionProvider {
  reply(messages: ChatMessage[], ctx: HealthContext): Promise<CompanionReply>;
}

const DISCLAIMER = "HealthTwin supports your conversations with your doctor; it doesn't replace them.";

function sourcesFrom(ctx: HealthContext, ids: string[]): CompanionReply["sources"] {
  return ids
    .map((id) => ctx.records.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({ id: r.id, title: r.title, date: r.date }));
}

const fmtVal = (v: number | string, unit?: string, metric?: MetricKey) => `${fmtMetric(v, metric)}${unit ? ` ${unit}` : ""}`;

/* ------------------------------------------------------------------------ */
/* Intent detection                                                          */
/* ------------------------------------------------------------------------ */

type Intent =
  | "urgent"
  | "summary"
  | "latest_report"
  | "compare"
  | "doctor_prep"
  | "medications"
  | "explain_ecg"
  | "tired"
  | "blood_pressure"
  | "sugar"
  | "cholesterol"
  | "sleep"
  | "family_risk"
  | "trends"
  | "fallback";

export function detectIntent(text: string): Intent {
  const q = text.toLowerCase();
  if (/(chest pain|crushing|can'?t breathe|cannot breathe|collaps|unconscious|stroke|face droop|slurred|severe bleeding|suicid|right now.*(chest|breath))/.test(q))
    return "urgent";
  if (/compare|previous|last time|earlier report|changed? (in|since)|difference/.test(q)) return "compare";
  if (/ecg|ekg|electrocardiogram|heart rhythm/.test(q)) return "explain_ecg";
  if (/doctor|appointment|visit|consult|ask my|bring|prepare/.test(q)) return "doctor_prep";
  if (/medic|tablet|pill|telmisartan|prescri|taking/.test(q)) return "medications";
  if (/tired|fatigue|exhaust|energy|sleepy/.test(q)) return "tired";
  if (/sleep|insomnia|waking/.test(q)) return "sleep";
  if (/blood pressure|\bbp\b|hypertension|systolic/.test(q)) return "blood_pressure";
  if (/sugar|glucose|hba1c|a1c|diabet/.test(q)) return "sugar";
  if (/cholesterol|ldl|lipid|triglycer/.test(q)) return "cholesterol";
  if (/family|father|mother|parent|hereditary|genetic|risk/.test(q)) return "family_risk";
  if (/trend|over time|improv|getting (better|worse)/.test(q)) return "trends";
  if (/latest|recent|last report|new report|explain my (report|blood)/.test(q)) return "latest_report";
  if (/summar|overview|history|about me|what do you know/.test(q)) return "summary";
  return "fallback";
}

/* ------------------------------------------------------------------------ */
/* Answer builders                                                           */
/* ------------------------------------------------------------------------ */

type Builder = (ctx: HealthContext, q: string) => Omit<CompanionReply, "sources"> & { sourceIds?: string[] };

const builders: Record<Intent, Builder> = {
  urgent: () => ({
    tier: "urgent",
    content:
      "**If this is happening right now, please stop and get help.**\n\nCall your local emergency number or get to the nearest emergency department. Symptoms like chest pain, severe breathlessness, sudden weakness, trouble speaking or a sudden worst-ever headache need to be assessed in person, immediately.\n\nI can't evaluate an emergency, and it's safer not to wait to see if it passes. Once you're safe, I'm here to help you make sense of what happened and prepare for follow-up.",
    followUps: ["What should I tell the emergency team?", "What information is in my profile?"],
  }),

  summary: (ctx) => {
    const p = ctx.profile;
    const parts: string[] = [];
    parts.push(
      `Here's what I understand about you, ${p.user.name}.\n\n**Profile.** ${[p.user.age !== null ? `${p.user.age} years old` : null, p.user.heightCm && p.user.weightKg ? `${p.user.heightCm} cm, ${p.user.weightKg} kg${ctx.bmi ? ` (BMI ${ctx.bmi})` : ""}` : null, p.user.occupation?.toLowerCase()].filter(Boolean).join(", ")}.`,
    );
    if (p.conditions.length) {
      parts.push(`**Conditions.**\n${p.conditions.map((c) => `- ${c.name}${c.diagnosed ? `, diagnosed ${c.diagnosed}` : ""}${c.managedWith === "medication" ? ", on medication" : c.managedWith === "lifestyle" ? ", managed with lifestyle" : ""}`).join("\n")}`);
    } else parts.push("**Conditions.** None reported.");
    if (p.medications.length) parts.push(`**Medications.**\n${p.medications.map((m) => `- ${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? `, ${m.frequency}` : ""}`).join("\n")}`);
    if (p.familyHistory.length) parts.push(`**Family history.** ${p.familyHistory.map((f) => `${f.condition.toLowerCase()}${f.relations.length ? ` (${f.relations.join(", ")})` : ""}`).join("; ")}.`);
    const life = describeLifestyle(p);
    if (life.length) parts.push(`**Lifestyle.** ${life.join(", ")}.`);
    if (p.symptoms.length) parts.push(`**Recently.** You mentioned ${p.symptoms.map((s) => s.name.toLowerCase()).join(" and ")}.`);
    if (ctx.records.length) {
      parts.push(`**Records.** ${ctx.records.length} on file, from ${fmtMonth(ctx.records.at(-1)!.date)} to ${fmtMonth(ctx.records[0].date)}. The most recent is a ${RECORD_TYPE_LABEL[ctx.records[0].type].toLowerCase()} from ${fmtDate(ctx.records[0].date)}.`);
    }
    const obs = ctx.trends.filter((t) => t.direction && t.direction !== "flat").slice(0, 2);
    if (obs.length) parts.push(`**Observed trends.**\n${obs.map((t) => `- ${t.observation}`).join("\n")}`);
    return {
      tier: "info",
      content: parts.join("\n\n"),
      sourceIds: ctx.records.slice(0, 3).map((r) => r.id),
      followUps: ["What changed in my latest report?", "What should I ask my doctor about?", "Explain my trends"],
    };
  },

  latest_report: (ctx) => {
    const r = ctx.latestReport;
    if (!r) return { tier: "info", content: "You haven't uploaded any reports yet. Once you do, I'll explain what's in them in plain language.", followUps: ["Summarize my health"] };
    const flagged = r.values.filter((v) => v.flag && v.flag !== "normal");
    const normal = r.values.filter((v) => v.flag === "normal");
    const lines = [`Your most recent report is the **${r.title}** from ${fmtDate(r.date)}${r.provider ? ` (${r.provider})` : ""}.`];
    if (r.summary) lines.push(r.summary);
    if (flagged.length) lines.push(`**Outside the reference range:**\n${flagged.map((v) => `- ${v.name}: ${fmtVal(v.value, v.unit, v.metric)} (${v.flag}; ${rangeText(v.refLow, v.refHigh)})`).join("\n")}`);
    if (normal.length) lines.push(`**Within range:** ${normal.map((v) => v.name.toLowerCase()).join(", ")}.`);
    lines.push(`These are observations from the report, not a diagnosis. ${DISCLAIMER}`);
    return {
      tier: flagged.length ? "guidance" : "info",
      content: lines.join("\n\n"),
      sourceIds: [r.id],
      followUps: ["Compare it with my previous report", "What should I ask my doctor about?"],
    };
  },

  compare: (ctx) => {
    const a = ctx.latestReport;
    const b = ctx.previousReport;
    if (!a || !b) return { tier: "info", content: "I need at least two reports of the same kind to compare. Upload an earlier report and I'll show what moved.", followUps: ["Explain my latest report"] };
    const rows: string[] = [];
    for (const v of a.values) {
      const prev = b.values.find((p) => p.metric && p.metric === v.metric);
      if (!prev || typeof v.value !== "number" || typeof prev.value !== "number") continue;
      const d = +(v.value - prev.value).toFixed(1);
      const arrow = d > 0 ? "up" : d < 0 ? "down" : "unchanged";
      rows.push(`- ${v.name}: ${fmtMetric(prev.value, v.metric)} → **${fmtMetric(v.value, v.metric)}** ${v.unit ?? ""} (${arrow}${d !== 0 ? ` ${Math.abs(d)}` : ""})${v.flag && v.flag !== "normal" ? `, still ${v.flag}` : ""}`);
    }
    return {
      tier: "info",
      content: `Comparing **${a.title}** (${fmtDate(a.date)}) with **${b.title}** (${fmtDate(b.date)}):\n\n${rows.join("\n")}\n\nThese are recorded changes, not conclusions. Lab-to-lab variation of a few points is common, so it's the direction over several reports that matters most. ${DISCLAIMER}`,
      sourceIds: [a.id, b.id],
      followUps: ["Which of these should I discuss with my doctor?", "Show me the trend for HbA1c"],
    };
  },

  doctor_prep: (ctx) => {
    const p = ctx.profile;
    const items: string[] = [];
    for (const f of ctx.flagged.slice(0, 4)) items.push(`${f.value.name} was ${f.value.flag} (${fmtVal(f.value.value, f.value.unit, f.value.metric)}) on ${fmtDate(f.recordDate)}. Is that a concern, and what's the target?`);
    for (const t of ctx.trends.filter((t) => t.direction === "up" && t.status === "above")) items.push(`${t.label} has been rising since ${fmtMonth(t.earliest!.date)}. Should anything change?`);
    for (const s of p.symptoms) items.push(`I've had ${s.name.toLowerCase()}${s.details.tired_since ? ` for ${s.details.tired_since}` : ""}. Could it relate to anything in my history?`);
    if (p.medications.some((m) => m.adherence === "sometimes")) items.push("I sometimes miss doses. Does timing matter, and what should I do when I miss one?");
    if (p.familyHistory.some((f) => f.conditionKey === "heart_disease")) items.push("Given my family history of heart disease, is any extra screening worth doing?");
    const bring = [
      ctx.latestReport ? `Your latest report (${ctx.latestReport.title}, ${fmtDate(ctx.latestReport.date)})` : null,
      p.medications.length ? "Your current medication list with doses" : null,
      ctx.trends.find((t) => t.metric === "systolic") ? "Your home blood pressure log" : null,
    ].filter(Boolean);
    const consult = ctx.records.find((r) => r.type === "consultation");
    return {
      tier: "guidance",
      content: `Here's a visit prep based on your profile.\n\n**Questions worth asking**\n${items.map((i) => `- ${i}`).join("\n")}\n\n**Bring along**\n${bring.map((b) => `- ${b}`).join("\n")}${consult?.impression ? `\n\n**From your last visit** (${fmtDate(consult.date)}): ${consult.impression}` : ""}`,
      sourceIds: [consult?.id, ctx.latestReport?.id].filter((x): x is string => Boolean(x)),
      followUps: ["Summarize my health in one paragraph", "What medications have I told you about?"],
    };
  },

  medications: (ctx) => {
    const p = ctx.profile;
    if (!p.medications.length) return { tier: "info", content: "You haven't told me about any regular medications. You can add them from your profile.", followUps: ["Summarize my health"] };
    const rx = ctx.records.find((r) => r.type === "prescription");
    return {
      tier: "info",
      content: `You've told me about these:\n\n${p.medications.map((m) => `- **${m.name}**${m.dose ? ` ${m.dose}` : ""}${m.frequency ? `, ${m.frequency}` : ""}${m.forConditionKey ? ` (for ${m.forConditionKey})` : ""}`).join("\n")}${p.medications.some((m) => m.adherence === "sometimes") ? "\n\nYou mentioned you sometimes miss doses. For blood pressure medicines, taking them at the same time each day keeps levels steadier; it's worth asking your doctor what to do about a missed dose." : ""}${rx ? `\n\nThere's also a prescription on file from ${fmtDate(rx.date)}: ${rx.summary}` : ""}\n\nI won't suggest changing doses. ${DISCLAIMER}`,
      sourceIds: rx ? [rx.id] : [],
      followUps: ["Prepare for my doctor visit", "How has my blood pressure changed?"],
    };
  },

  explain_ecg: (ctx) => {
    const ecg = ctx.records.find((r) => r.type === "ecg");
    if (!ecg) return { tier: "info", content: "There's no ECG in your records yet. Upload one and I'll walk through it in plain language.", followUps: ["Explain my latest report"] };
    return {
      tier: "info",
      content: `Your **${ecg.title}** from ${fmtDate(ecg.date)}:\n\n${ecg.summary}\n\n**In plain terms**\n- *Sinus rhythm* means the heart's natural pacemaker is in charge, which is what you want.\n- The *intervals* (PR, QRS, QT) describe how long the electrical signal takes to travel. Yours are all within the usual range.\n- *No ST-T changes* means there was no sign of reduced blood flow or strain at the time of the recording.\n\n**What it doesn't tell you**: an ECG is a snapshot of a few seconds. It doesn't rule out problems that come and go, so symptoms still matter.${ecg.impression ? `\n\n**Report wording:** ${ecg.impression}` : ""}`,
      sourceIds: [ecg.id],
      followUps: ["What does my family history mean for my heart?", "How is my blood pressure trending?"],
    };
  },

  tired: (ctx) => {
    const p = ctx.profile;
    const factors: string[] = [];
    const a1c = ctx.trends.find((t) => t.metric === "hba1c");
    if (a1c?.latest && a1c.latest.value >= 5.7) factors.push(`Your HbA1c has been ${a1c.direction === "up" ? "rising" : "in the prediabetes range"} (latest ${fmtMetric(a1c.latest.value, "hba1c")}% on ${fmtDate(a1c.latest.date)}). Blood sugar that swings after meals can show up as afternoon tiredness.`);
    if (p.lifestyle.sleepHours !== null && p.lifestyle.sleepHours < 7) factors.push(`You sleep about ${p.lifestyle.sleepHours} hours${p.lifestyle.sleepQuality === "fair" || p.lifestyle.sleepQuality === "poor" ? ` and rated it ${p.lifestyle.sleepQuality}` : ""}. That alone explains a lot of daytime fatigue.`);
    if (p.lifestyle.stress !== null && p.lifestyle.stress >= 4) factors.push(`You rated recent stress ${p.lifestyle.stress}/5. Sustained stress affects both sleep depth and energy.`);
    const vitd = ctx.trends.find((t) => t.metric === "vitamin_d");
    if (vitd?.latest && vitd.latest.value < 30) factors.push(`Vitamin D was ${vitd.latest.value} ng/mL on ${fmtDate(vitd.latest.date)}, just under the usual range. Low vitamin D is a common contributor to tiredness.`);
    const hb = ctx.latestReport?.values.find((v) => v.metric === "hemoglobin");
    if (hb) factors.push(`Haemoglobin was ${hb.value} ${hb.unit} on your last blood test, which is ${hb.flag === "normal" ? "normal, so anaemia looks unlikely from that report" : hb.flag}.`);
    if (p.medications.some((m) => /telmisartan|amlodipine|atenolol|metoprolol/i.test(m.name))) factors.push("Some blood pressure medicines can cause tiredness, especially after a dose change. Worth mentioning if the timing lines up.");
    const sym = p.symptoms.find((s) => s.key === "tiredness");
    const intro = sym
      ? `You mentioned feeling more tired than usual${sym.details.tired_since ? ` for a few ${sym.details.tired_since}` : ""}${sym.details.tired_pattern ? `, mostly in the ${String(sym.details.tired_pattern).replace("_", " ")}` : ""}. Looking across what you've shared, a few things stand out:`
      : "Looking across what you've shared, a few things could be relevant:";
    return {
      tier: "guidance",
      content: `${intro}\n\n${factors.map((f) => `- ${f}`).join("\n")}\n\nNone of these is a diagnosis. If the tiredness has lasted more than a few weeks, is getting worse, or comes with breathlessness, weight loss or chest discomfort, it's worth a doctor visit, and the points above are good things to raise. ${DISCLAIMER}`,
      sourceIds: [ctx.latestReport?.id].filter((x): x is string => Boolean(x)),
      followUps: ["Prepare for my doctor visit", "Show me my HbA1c trend"],
    };
  },

  blood_pressure: (ctx) => {
    const sys = ctx.trends.find((t) => t.metric === "systolic");
    const dia = ctx.readings.filter((r) => r.metric === "diastolic").sort((a, b) => a.takenAt.localeCompare(b.takenAt));
    if (!sys?.latest) return { tier: "info", content: "There are no blood pressure readings on record yet. Add a reading from your profile and I'll track it over time.", followUps: ["Summarize my health"] };
    const cond = ctx.profile.conditions.find((c) => c.key === "hypertension");
    const first = sys.earliest!;
    const firstDia = dia[0]?.value;
    const lastDia = dia.at(-1)?.value;
    return {
      tier: sys.status === "above" ? "guidance" : "info",
      content: `Your latest recorded blood pressure is **${sys.latest.value}/${lastDia ?? "–"} mmHg** (${fmtDate(sys.latest.date)}, ${sys.latest.source === "record" ? "from a clinic record" : "home reading"}).\n\n${sys.observation}${firstDia && lastDia ? ` Diastolic moved from ${firstDia} to ${lastDia} over the same period.` : ""}${cond ? `\n\nYou've told me you were diagnosed with high blood pressure ${cond.diagnosed ?? ""}${cond.managedWith === "medication" ? " and manage it with medication" : ""}. Your first recorded reading was ${first.value}/${firstDia ?? "–"} in ${fmtMonth(first.date)}, so the overall direction since treatment started is downward.` : ""}\n\nA commonly used target for people on treatment is below 130/80, though your doctor may set a different one for you. ${DISCLAIMER}`,
      sourceIds: ctx.records.filter((r) => r.type === "consultation").slice(0, 1).map((r) => r.id),
      followUps: ["Prepare for my doctor visit", "What medications have I told you about?"],
    };
  },

  sugar: (ctx) => {
    const a1c = ctx.trends.find((t) => t.metric === "hba1c");
    const glu = ctx.trends.find((t) => t.metric === "fasting_glucose");
    if (!a1c?.latest && !glu?.latest) return { tier: "info", content: "No blood sugar results on record yet. Upload a blood report with HbA1c or fasting glucose and I'll track them.", followUps: ["Summarize my health"] };
    const fam = ctx.profile.familyHistory.find((f) => f.conditionKey === "diabetes");
    return {
      tier: a1c?.status === "above" ? "guidance" : "info",
      content: `${a1c?.latest ? `Your latest **HbA1c is ${fmtMetric(a1c.latest.value, "hba1c")}%** (${fmtDate(a1c.latest.date)}). ${a1c.observation}` : ""}${glu?.latest ? `\n\nFasting glucose was ${glu.latest.value} ${glu.unit} on the same report${glu.direction === "up" ? ", also edging up" : ""}.` : ""}\n\n**For context:** HbA1c reflects average blood sugar over roughly three months. 5.7–6.4% is generally called prediabetes; 6.5% and above is the usual threshold for diabetes.${fam ? ` With diabetes in your family (${fam.relations.join(", ")}), doctors tend to watch this range more closely.` : ""}\n\nThe direction over three reports is the useful signal here, and it's one your doctor already flagged${ctx.records.find((r) => r.type === "consultation")?.impression?.includes("Prediabetes") ? " at your last review" : ""}. ${DISCLAIMER}`,
      sourceIds: ctx.records.filter((r) => r.values.some((v) => v.metric === "hba1c")).slice(0, 2).map((r) => r.id),
      followUps: ["Why am I feeling tired lately?", "Compare my latest report with the previous one"],
    };
  },

  cholesterol: (ctx) => {
    const ldl = ctx.trends.find((t) => t.metric === "ldl");
    const hdl = ctx.trends.find((t) => t.metric === "hdl");
    const tg = ctx.trends.find((t) => t.metric === "triglycerides");
    if (!ldl?.latest) return { tier: "info", content: "No lipid results on record yet. Upload a lipid profile and I'll track LDL, HDL and triglycerides over time.", followUps: ["Summarize my health"] };
    const famHeart = ctx.profile.familyHistory.find((f) => f.conditionKey === "heart_disease");
    return {
      tier: ldl.status === "above" ? "guidance" : "info",
      content: `**LDL** is ${ldl.latest.value} ${ldl.unit} (${fmtDate(ldl.latest.date)}). ${ldl.observation}${hdl?.latest ? `\n\n**HDL** is ${hdl.latest.value} ${hdl.unit}${hdl.status === "below" ? ", slightly below the usual minimum of 40" : ""}.` : ""}${tg?.latest ? `\n\n**Triglycerides** are ${tg.latest.value} ${tg.unit}${tg.status === "above" ? `, above the usual limit of 150, though ${tg.direction === "down" ? "coming down" : "steady"}` : ""}.` : ""}\n\nLDL is the number most guidelines focus on. A common general target is under 100, and lower${famHeart ? " when there's early heart disease in the family, which you've reported" : " for people with other risk factors"}. Whether lifestyle alone is enough is a question for your doctor, especially alongside your blood pressure and HbA1c results. ${DISCLAIMER}`,
      sourceIds: ctx.records.filter((r) => r.values.some((v) => v.metric === "ldl")).slice(0, 2).map((r) => r.id),
      followUps: ["What does my family history mean for my heart?", "Prepare for my doctor visit"],
    };
  },

  sleep: (ctx) => {
    const l = ctx.profile.lifestyle;
    const s = ctx.profile.symptoms.find((x) => x.key === "sleep_trouble");
    const issues = (s?.details.sleep_issue as string[] | undefined) ?? [];
    return {
      tier: "info",
      content: `You've told me you sleep about ${l.sleepHours ?? "?"} hours${l.sleepQuality ? ` and rate it ${l.sleepQuality}` : ""}${issues.length ? `, with ${issues.map((i) => i.replace("_", " ")).join(" and ")} getting in the way` : ""}.${l.stress !== null && l.stress >= 4 ? ` You also rated stress ${l.stress}/5, and the two tend to feed each other.` : ""}\n\nShort sleep is worth taking seriously in your case: it nudges blood pressure and blood sugar in the wrong direction, both of which you're already tracking.${issues.includes("snoring") ? "\n\n**Snoring or gasping** at night, with daytime tiredness and high blood pressure, is a pattern doctors check for sleep apnoea. That's worth raising specifically." : ""}\n\nIf you'd like, I can add sleep to your doctor visit prep. ${DISCLAIMER}`,
      followUps: ["Why am I feeling tired lately?", "Prepare for my doctor visit"],
    };
  },

  family_risk: (ctx) => {
    const fh = ctx.profile.familyHistory;
    if (!fh.length) return { tier: "info", content: "You haven't reported any family history yet. You can add it from your profile.", followUps: ["Summarize my health"] };
    const overlaps = ctx.profile.conditions.filter((c) => fh.some((f) => f.conditionKey === c.key || (f.conditionKey === "diabetes" && c.key === "prediabetes")));
    return {
      tier: "info",
      content: `You've reported:\n\n${fh.map((f) => `- **${f.condition}**${f.relations.length ? ` – ${f.relations.join(", ")}` : ""}`).join("\n")}\n\n${overlaps.length ? `Some of this overlaps with your own history (${overlaps.map((c) => c.name.toLowerCase()).join(", ")}), which is the combination doctors pay most attention to. ` : ""}Family history doesn't decide your outcome; it changes how closely numbers like LDL, blood pressure and HbA1c are watched and where targets are set.${fh.some((f) => f.condition.includes("early")) ? "\n\nEarly heart disease in a parent is a recognised reason to review cholesterol targets more conservatively." : ""} ${DISCLAIMER}`,
      followUps: ["What's my cholesterol trend?", "What should I ask my doctor about?"],
    };
  },

  trends: (ctx) => {
    const t = ctx.trends.filter((x) => x.observation && x.points.length > 1);
    if (!t.length) return { tier: "info", content: "There aren't enough readings yet to show trends. Each metric needs at least two values.", followUps: ["Summarize my health"] };
    return {
      tier: "info",
      content: `Here's what has moved across your records:\n\n${t.map((x) => `- ${x.observation}`).join("\n")}\n\nThese are observed changes in recorded values, not conclusions. Open the Trends page to see each one plotted. ${DISCLAIMER}`,
      sourceIds: ctx.records.slice(0, 2).map((r) => r.id),
      followUps: ["Which trends should I discuss with my doctor?", "Explain my latest report"],
    };
  },

  fallback: (ctx, q) => {
    const ret = retrieveContext(ctx, q);
    return {
      tier: "info",
      content: `I can help with that using what you've shared. I've pulled your ${ret.sections.join(", ")} into view.\n\nI'm best at questions about your own records and history. Try one of these, or ask in your own words and I'll do my best to connect it to your profile.`,
      sourceIds: ret.recordIds,
      followUps: ["Summarize my health history", "What changed in my latest blood report?", "What should I ask my doctor about?"],
    };
  },
};

/* ------------------------------------------------------------------------ */
/* Provider                                                                  */
/* ------------------------------------------------------------------------ */

export class MockCompanion implements CompanionProvider {
  async reply(messages: ChatMessage[], ctx: HealthContext): Promise<CompanionReply> {
    const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const intent = detectIntent(last);
    const built = builders[intent](ctx, last);
    const sourceIds = built.sourceIds ?? retrieveContext(ctx, last).recordIds;
    return { tier: built.tier, content: built.content, followUps: built.followUps, sources: sourcesFrom(ctx, sourceIds) };
  }
}

/**
 * Where the real model plugs in. Keep the same contract so the UI doesn't
 * change: build `renderContextForPrompt(ctx)` as the system prompt, send the
 * message history, and map the response to a CompanionReply.
 */
export function getCompanion(): CompanionProvider {
  return new MockCompanion();
}

function rangeText(low?: number, high?: number): string {
  if (low !== undefined && high !== undefined) return `range ${low}–${high}`;
  if (high !== undefined) return `target below ${high}`;
  if (low !== undefined) return `target above ${low}`;
  return "no range";
}
