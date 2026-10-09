"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Sheet, fieldCls } from "@/components/ui/Sheet";
import { useHealth } from "@/lib/store/HealthStore";
import { markerStatus, todayIso } from "@/lib/care";
import { METRIC_META, type MetricKey, type Reading } from "@/lib/types";
import { cn } from "@/lib/cn";

export type LogKind = "bp" | "heart_rate" | "weight" | "fasting_glucose" | "spo2" | "temperature";

const KINDS: { kind: LogKind; label: string }[] = [
  { kind: "bp", label: "Blood pressure" },
  { kind: "weight", label: "Weight" },
  { kind: "heart_rate", label: "Heart rate" },
  { kind: "fasting_glucose", label: "Glucose" },
  { kind: "spo2", label: "SpO₂" },
  { kind: "temperature", label: "Temperature" },
];

/** Manual home reading. Mount only while open. */
export function LogReadingSheet({ kind: initial, onClose }: { kind: LogKind; onClose: () => void }) {
  const { addReadings } = useHealth();
  const [kind, setKind] = useState<LogKind>(KINDS.some((k) => k.kind === initial) ? initial : "bp");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [date, setDate] = useState(todayIso());
  const [saved, setSaved] = useState<string | null>(null);

  const metric: MetricKey = kind === "bp" ? "systolic" : kind;
  const meta = METRIC_META[metric];
  const valid = kind === "bp" ? Number(a) > 50 && Number(b) > 30 : Number(a) > 0;

  const save = () => {
    const stamp = Date.now();
    const list: Reading[] =
      kind === "bp"
        ? [
            { id: `self-${stamp}-s`, metric: "systolic", value: Number(a), unit: "mmHg", takenAt: date, source: "self" },
            { id: `self-${stamp}-d`, metric: "diastolic", value: Number(b), unit: "mmHg", takenAt: date, source: "self" },
          ]
        : [{ id: `self-${stamp}`, metric, value: Number(a), unit: meta.unit, takenAt: date, source: "self" }];
    addReadings(list);
    const st = markerStatus(metric, Number(a));
    const dst = kind === "bp" ? markerStatus("diastolic", Number(b)) : "in_range";
    setSaved(st === "in_range" && dst === "in_range" ? "Within the usual range." : "Outside the usual range. If this is unusual for you, recheck after resting for 5 minutes.");
  };

  return (
    <Sheet title="Log a reading" subtitle="Home readings are added to your trends." onClose={onClose}>
      {saved ? (
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-brand-600" />
          <div className="mt-3 font-display text-[24px]">Saved</div>
          <p className="mx-auto mt-1 max-w-xs text-[14px] text-ink-2">{saved}</p>
          <Button className="mt-6 w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <>
          <div className="scrollbar-thin -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {KINDS.map((k) => (
              <button
                key={k.kind}
                onClick={() => {
                  setKind(k.kind);
                  setA("");
                  setB("");
                }}
                className={cn(
                  "h-9 shrink-0 rounded-full border px-4 text-[13px] font-medium transition-colors",
                  kind === k.kind ? "border-brand-700 bg-brand-700 text-on-brand" : "border-line bg-surface text-ink-2",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-end justify-center gap-3">
            <input
              autoFocus
              inputMode="decimal"
              type="number"
              value={a}
              onChange={(e) => setA(e.target.value)}
              placeholder={kind === "bp" ? "120" : "—"}
              aria-label={kind === "bp" ? "Systolic" : meta.label}
              className="w-28 border-b-2 border-line-strong bg-transparent pb-1 text-center font-display text-[52px] leading-none text-ink placeholder:text-ink-4 focus:border-brand-600 focus:outline-none"
            />
            {kind === "bp" && (
              <>
                <span className="pb-3 font-display text-[40px] text-ink-4">/</span>
                <input
                  inputMode="numeric"
                  type="number"
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                  placeholder="80"
                  aria-label="Diastolic"
                  className="w-28 border-b-2 border-line-strong bg-transparent pb-1 text-center font-display text-[52px] leading-none text-ink placeholder:text-ink-4 focus:border-brand-600 focus:outline-none"
                />
              </>
            )}
          </div>
          <div className="mt-2 text-center text-[13px] text-ink-3">{meta.unit}</div>

          <div className="mt-6">
            <Field label="Date">
              <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} className={fieldCls} />
            </Field>
          </div>

          <Button className="mt-6 w-full" size="lg" disabled={!valid} onClick={save}>
            Save reading
          </Button>
        </>
      )}
    </Sheet>
  );
}
