"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import type { AnswerValue, BpAnswer, Question } from "@/lib/onboarding/schema";
import { cn } from "@/lib/cn";

interface Props {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  /** Called when the input itself completes the answer (single choice, enter key). */
  onSubmit: () => void;
}

export function QuestionInput({ question: q, value, onChange, onSubmit }: Props) {
  switch (q.type) {
    case "single":
      return <SingleChoice q={q} value={value as string | undefined} onChange={onChange} onSubmit={onSubmit} />;
    case "multi":
      return <MultiChoice q={q} value={(value as string[] | undefined) ?? []} onChange={onChange} />;
    case "number":
      return <NumberInput q={q} value={value as number | undefined} onChange={onChange} onSubmit={onSubmit} />;
    case "text":
      return <TextInput q={q} value={(value as string | undefined) ?? ""} onChange={onChange} onSubmit={onSubmit} />;
    case "longtext":
      return <LongTextInput q={q} value={(value as string | undefined) ?? ""} onChange={onChange} />;
    case "scale":
      return <ScaleInput q={q} value={value as number | undefined} onChange={onChange} onSubmit={onSubmit} />;
    case "bp":
      return <BpInput value={(value as BpAnswer | undefined) ?? { systolic: null, diastolic: null }} onChange={onChange} onSubmit={onSubmit} />;
  }
}

/* ----------------------------------------------------------------- choice */

const optionBase =
  "group flex w-full items-center gap-3 rounded-2xl border bg-surface px-4 py-3.5 text-left text-[15px] transition-all duration-200 hover:border-brand-300 active:scale-[0.99]";

function SingleChoice({ q, value, onChange, onSubmit }: { q: Question; value?: string; onChange: (v: AnswerValue) => void; onSubmit: () => void }) {
  return (
    <div role="radiogroup" className="grid gap-2">
      {q.options!.map((o, i) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={selected}
            className={cn(optionBase, selected ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-line", "animate-rise")}
            style={{ animationDelay: `${i * 30}ms` }}
            onClick={() => {
              onChange(o.value);
              // auto-advance after a beat so the selection is visible
              setTimeout(onSubmit, 180);
            }}
          >
            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-brand-600 bg-brand-600" : "border-line-strong")}>
              {selected && <Check className="h-3 w-3 text-on-brand" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-ink">{o.label}</span>
              {o.hint && <span className="block text-sm text-ink-3">{o.hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MultiChoice({ q, value, onChange }: { q: Question; value: string[]; onChange: (v: AnswerValue) => void }) {
  const toggle = (opt: NonNullable<Question["options"]>[number]) => {
    if (opt.exclusive) {
      onChange(value.includes(opt.value) ? [] : [opt.value]);
      return;
    }
    const exclusives = q.options!.filter((o) => o.exclusive).map((o) => o.value);
    const without = value.filter((v) => !exclusives.includes(v));
    onChange(without.includes(opt.value) ? without.filter((v) => v !== opt.value) : [...without, opt.value]);
  };
  return (
    <div className="grid gap-2">
      {q.options!.map((o, i) => {
        const selected = value.includes(o.value);
        return (
          <button
            key={o.value}
            role="checkbox"
            aria-checked={selected}
            className={cn(optionBase, selected ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-line", "animate-rise")}
            style={{ animationDelay: `${i * 25}ms` }}
            onClick={() => toggle(o)}
          >
            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", selected ? "border-brand-600 bg-brand-600" : "border-line-strong")}>
              {selected && <Check className="h-3 w-3 text-on-brand" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-ink">{o.label}</span>
              {o.hint && <span className="block text-sm text-ink-3">{o.hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ inputs */

const fieldCls =
  "w-full rounded-2xl border border-line bg-surface px-4 text-ink placeholder:text-ink-4 transition-colors focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10";

function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);
  return ref;
}

function NumberInput({ q, value, onChange, onSubmit }: { q: Question; value?: number; onChange: (v: AnswerValue) => void; onSubmit: () => void }) {
  const ref = useAutoFocus<HTMLInputElement>();
  return (
    <div className="flex max-w-xs items-center gap-3">
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        min={q.min}
        max={q.max}
        step={q.step ?? 1}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        className={cn(fieldCls, "h-14 text-2xl font-semibold tabular")}
        aria-label={q.prompt}
      />
      {q.unit && <span className="text-lg text-ink-3">{q.unit}</span>}
    </div>
  );
}

function TextInput({ q, value, onChange, onSubmit }: { q: Question; value: string; onChange: (v: AnswerValue) => void; onSubmit: () => void }) {
  const ref = useAutoFocus<HTMLInputElement>();
  return (
    <input
      ref={ref}
      type="text"
      value={value}
      placeholder={q.placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onSubmit()}
      className={cn(fieldCls, "h-14 max-w-md text-lg")}
      aria-label={q.prompt}
      autoComplete="off"
    />
  );
}

function LongTextInput({ q, value, onChange }: { q: Question; value: string; onChange: (v: AnswerValue) => void }) {
  const ref = useAutoFocus<HTMLTextAreaElement>();
  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={q.placeholder}
      rows={4}
      onChange={(e) => onChange(e.target.value)}
      className={cn(fieldCls, "max-w-lg resize-none py-3 text-[15px] leading-relaxed")}
      aria-label={q.prompt}
    />
  );
}

function ScaleInput({ q, value, onChange, onSubmit }: { q: Question; value?: number; onChange: (v: AnswerValue) => void; onSubmit: () => void }) {
  const min = q.min ?? 1;
  const max = q.max ?? 5;
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="max-w-md">
      <div role="radiogroup" className="flex gap-2">
        {steps.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              role="radio"
              aria-checked={selected}
              aria-label={`${n} of ${max}`}
              onClick={() => {
                onChange(n);
                setTimeout(onSubmit, 180);
              }}
              className={cn(
                "flex h-14 flex-1 items-center justify-center rounded-2xl border text-lg font-semibold transition-all",
                selected ? "border-brand-700 bg-brand-700 text-on-brand" : "border-line bg-surface text-ink hover:border-brand-300 hover:bg-brand-50/40",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      {q.scaleLabels && (
        <div className="mt-2 flex justify-between text-xs text-ink-3">
          <span>{q.scaleLabels[0]}</span>
          <span>{q.scaleLabels[1]}</span>
        </div>
      )}
    </div>
  );
}

function BpInput({ value, onChange, onSubmit }: { value: BpAnswer; onChange: (v: AnswerValue) => void; onSubmit: () => void }) {
  const ref = useAutoFocus<HTMLInputElement>();
  const diaRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex max-w-sm items-center gap-3">
      <input
        ref={ref}
        type="number"
        inputMode="numeric"
        placeholder="120"
        aria-label="Systolic"
        value={value.systolic ?? ""}
        onChange={(e) => {
          const n = e.target.value === "" ? null : Number(e.target.value);
          onChange({ ...value, systolic: n });
          if (n !== null && n >= 100) diaRef.current?.focus();
        }}
        className={cn(fieldCls, "h-14 w-28 text-center text-2xl font-semibold tabular")}
      />
      <span className="text-2xl text-ink-3">/</span>
      <input
        ref={diaRef}
        type="number"
        inputMode="numeric"
        placeholder="80"
        aria-label="Diastolic"
        value={value.diastolic ?? ""}
        onChange={(e) => onChange({ ...value, diastolic: e.target.value === "" ? null : Number(e.target.value) })}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        className={cn(fieldCls, "h-14 w-28 text-center text-2xl font-semibold tabular")}
      />
      <span className="text-ink-3">mmHg</span>
    </div>
  );
}
