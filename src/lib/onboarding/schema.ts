/**
 * Onboarding question schema.
 *
 * The survey is data, not code: every question declares an optional `showIf`
 * rule evaluated against the answers so far. The engine (engine.ts) walks the
 * ordered question list and only surfaces questions whose rules pass. Adding a
 * new branch means adding questions with rules, never touching the UI.
 */

export type SectionId = "basics" | "history" | "lifestyle" | "family" | "current";

export interface SectionMeta {
  id: SectionId;
  title: string;
  short: string;
  intro: string;
}

export const SECTIONS: SectionMeta[] = [
  {
    id: "basics",
    title: "About you",
    short: "You",
    intro: "A few basics so HealthTwin can interpret everything else in context.",
  },
  {
    id: "history",
    title: "Health history",
    short: "History",
    intro: "Conditions, medications and events that shape your baseline.",
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    short: "Lifestyle",
    intro: "Daily habits explain a lot of what shows up in reports.",
  },
  {
    id: "family",
    title: "Family history",
    short: "Family",
    intro: "Conditions in close relatives help put your own numbers in perspective.",
  },
  {
    id: "current",
    title: "How you feel now",
    short: "Now",
    intro: "Anything bothering you recently. We only go deeper where it matters.",
  },
];

export type Scalar = string | number | boolean;

export interface BpAnswer {
  systolic: number | null;
  diastolic: number | null;
}

export type AnswerValue = Scalar | string[] | BpAnswer | null;
export type Answers = Record<string, AnswerValue>;

/** Serialisable rule language used by `showIf`. */
export type Rule =
  | { q: string; is: Scalar }
  | { q: string; not: Scalar }
  | { q: string; includes: string }
  | { q: string; includesAny: string[] }
  | { q: string; excludes: string }
  | { q: string; gte: number }
  | { q: string; lte: number }
  | { q: string; answered: boolean }
  | { all: Rule[] }
  | { any: Rule[] };

export type QuestionType =
  | "single" // one option
  | "multi" // many options, chips
  | "number" // numeric input with unit
  | "text" // free text (short)
  | "longtext" // free text (multi-line)
  | "scale" // 1–5
  | "bp"; // systolic / diastolic pair

export interface Option {
  value: string;
  label: string;
  hint?: string;
  /** "none" options clear the other selections in a multi question. */
  exclusive?: boolean;
}

export interface Question {
  id: string;
  section: SectionId;
  type: QuestionType;
  prompt: string;
  help?: string;
  options?: Option[];
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  /** Labels for a scale question, index 0 = min. */
  scaleLabels?: [string, string];
  showIf?: Rule;
  /** Optional questions can be skipped without an answer. */
  optional?: boolean;
  /**
   * Which earlier question this one deepens. Used for the "follow-up" visual
   * treatment so the user sees why they're being asked.
   */
  followUpOf?: string;
}
