import type { AnswerValue, Answers, BpAnswer, Question, Rule, SectionId } from "./schema";
import { SECTIONS } from "./schema";
import { QUESTIONS } from "./questions";
import type { SafetyAlert } from "../types";

/* ------------------------------------------------------------------------ */
/* Rule evaluation                                                           */
/* ------------------------------------------------------------------------ */

export function isAnswered(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    const bp = value as BpAnswer;
    return bp.systolic !== null && bp.diastolic !== null;
  }
  return true;
}

export function evaluate(rule: Rule, answers: Answers): boolean {
  if ("all" in rule) return rule.all.every((r) => evaluate(r, answers));
  if ("any" in rule) return rule.any.some((r) => evaluate(r, answers));

  const v = answers[rule.q];
  if ("answered" in rule) return isAnswered(v) === rule.answered;
  if ("is" in rule) return v === rule.is;
  if ("not" in rule) return isAnswered(v) && v !== rule.not;
  if ("includes" in rule) return Array.isArray(v) && v.includes(rule.includes);
  if ("includesAny" in rule)
    return Array.isArray(v) && rule.includesAny.some((x) => v.includes(x));
  if ("excludes" in rule) return Array.isArray(v) && !v.includes(rule.excludes);
  if ("gte" in rule) return typeof v === "number" && v >= rule.gte;
  if ("lte" in rule) return typeof v === "number" && v <= rule.lte;
  return false;
}

export function isVisible(q: Question, answers: Answers): boolean {
  return q.showIf ? evaluate(q.showIf, answers) : true;
}

/* ------------------------------------------------------------------------ */
/* Flow                                                                      */
/* ------------------------------------------------------------------------ */

/** Ordered list of questions that should be shown given the answers so far. */
export function visibleQuestions(answers: Answers): Question[] {
  return QUESTIONS.filter((q) => isVisible(q, answers));
}

export interface SectionProgress {
  id: SectionId;
  title: string;
  short: string;
  total: number;
  answered: number;
  state: "done" | "active" | "upcoming";
}

export function sectionProgress(
  answers: Answers,
  currentQuestionId: string | null,
): SectionProgress[] {
  const visible = visibleQuestions(answers);
  const current = visible.find((q) => q.id === currentQuestionId);
  const currentIdx = current ? SECTIONS.findIndex((s) => s.id === current.section) : -1;

  return SECTIONS.map((s, i) => {
    const qs = visible.filter((q) => q.section === s.id);
    const answered = qs.filter((q) => isAnswered(answers[q.id])).length;
    let state: SectionProgress["state"] = "upcoming";
    if (i < currentIdx) state = "done";
    else if (i === currentIdx) state = "active";
    return { id: s.id, title: s.title, short: s.short, total: qs.length, answered, state };
  });
}

/** 0–1 across the currently visible tree. The denominator grows as branches open. */
export function overallProgress(answers: Answers, currentQuestionId: string | null): number {
  const visible = visibleQuestions(answers);
  if (visible.length === 0) return 0;
  const idx = visible.findIndex((q) => q.id === currentQuestionId);
  return Math.max(0, idx) / visible.length;
}

/** The answer is valid enough to move on. */
export function canAdvance(q: Question, value: AnswerValue | undefined): boolean {
  if (q.optional) return true;
  if (!isAnswered(value)) return false;
  if (q.type === "number" && typeof value === "number") {
    if (q.min !== undefined && value < q.min) return false;
    if (q.max !== undefined && value > q.max) return false;
  }
  return true;
}

/**
 * Remove answers to questions that are no longer visible, so a user who goes
 * back and un-selects "hypertension" doesn't carry stale follow-ups into the
 * profile. Runs to a fixed point since hiding one question can hide another.
 */
export function pruneHiddenAnswers(answers: Answers): Answers {
  let current = answers;
  for (let i = 0; i < 5; i++) {
    const visibleIds = new Set(visibleQuestions(current).map((q) => q.id));
    const next: Answers = {};
    let changed = false;
    for (const [k, v] of Object.entries(current)) {
      if (visibleIds.has(k)) next[k] = v;
      else changed = true;
    }
    current = next;
    if (!changed) break;
  }
  return current;
}

/** Estimated minutes remaining, used for the "about N min left" hint. */
export function minutesRemaining(answers: Answers, currentQuestionId: string | null): number {
  const visible = visibleQuestions(answers);
  const idx = Math.max(0, visible.findIndex((q) => q.id === currentQuestionId));
  const remaining = visible.length - idx;
  return Math.max(1, Math.round(remaining * 0.18));
}

/* ------------------------------------------------------------------------ */
/* Safety                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Inline safety checks that run as answers arrive. These never diagnose; they
 * point the user to appropriate care when a pattern warrants it (README §8).
 */
export function safetyAlerts(answers: Answers): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  const symptoms = (answers.symptoms as string[] | undefined) ?? [];
  const chestAssoc = (answers.chest_associated as string[] | undefined) ?? [];
  const headacheFeat = (answers.headache_features as string[] | undefined) ?? [];

  const chestRed =
    symptoms.includes("chest_discomfort") &&
    (answers.chest_duration === "long" ||
      chestAssoc.includes("arm_jaw") ||
      chestAssoc.includes("sweating") ||
      (answers.chest_when === "rest" && chestAssoc.includes("breathless")));

  if (chestRed) {
    alerts.push({
      tier: "urgent",
      title: "Please don't wait on this one",
      body:
        "Chest discomfort that lasts more than 20 minutes, spreads to the arm or jaw, or comes with sweating or breathlessness at rest needs urgent medical assessment. If you have these symptoms right now, call your local emergency number or go to the nearest emergency department.",
    });
  } else if (symptoms.includes("chest_discomfort") && answers.chest_before === "first") {
    alerts.push({
      tier: "guidance",
      title: "New chest discomfort is worth a doctor visit",
      body:
        "Even when it's brief, new chest discomfort should be checked by a doctor soon, especially with a family history of heart disease or high blood pressure.",
    });
  }

  if (headacheFeat.includes("worst_ever")) {
    alerts.push({
      tier: "urgent",
      title: "A sudden, worst-ever headache needs urgent care",
      body:
        "A headache that peaks within seconds to minutes and feels unlike any before should be assessed in an emergency department the same day.",
    });
  }

  if (answers.breath_when === "rest") {
    alerts.push({
      tier: "guidance",
      title: "Breathlessness at rest should be checked soon",
      body:
        "Please arrange to see a doctor promptly. If it gets worse suddenly or comes with chest pain, treat it as an emergency.",
    });
  }

  const bp = answers.htn_reading as BpAnswer | undefined;
  if (bp && bp.systolic !== null && bp.diastolic !== null) {
    if (bp.systolic >= 180 || bp.diastolic >= 120) {
      alerts.push({
        tier: "urgent",
        title: "That reading is very high",
        body:
          "A blood pressure of 180/120 or above needs same-day medical attention, especially with headache, chest pain, vision changes or confusion.",
      });
    } else if (bp.systolic >= 140 || bp.diastolic >= 90) {
      alerts.push({
        tier: "guidance",
        title: "Your reading is above the usual target",
        body:
          "Readings consistently at or above 140/90 are worth discussing with your doctor, particularly if you're already on treatment.",
      });
    }
  }

  return alerts;
}

/** Alerts triggered by the answer to a specific question, for inline display. */
export function alertsForQuestion(questionId: string, answers: Answers): SafetyAlert[] {
  const relevant: Record<string, true> = {
    chest_duration: true,
    chest_associated: true,
    chest_when: true,
    chest_before: true,
    headache_features: true,
    breath_when: true,
    htn_reading: true,
  };
  if (!relevant[questionId]) return [];
  return safetyAlerts(answers);
}
