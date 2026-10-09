"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Sheet, fieldCls } from "@/components/ui/Sheet";
import { useHealth } from "@/lib/store/HealthStore";
import type { ExtractedValue, HealthRecord, MetricKey, Reading, RecordType } from "@/lib/types";
import { METRIC_META, RECORD_TYPE_LABEL } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Upload flow with simulated AI extraction. The record moves through
 * uploaded → extracting → ready, exactly the states the real pipeline will
 * emit, so the UI needs no changes when extraction is wired to a model.
 */

const TYPES: RecordType[] = ["blood_test", "ecg", "prescription", "xray", "scan", "discharge_summary", "consultation", "other"];

/** Mounted only while open, so form state resets naturally between uploads. */
export function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <UploadDialogInner onClose={onClose} />;
}

function UploadDialogInner({ onClose }: { onClose: () => void }) {
  const { addRecord, updateRecord, addReadings, readings } = useHealth();
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<RecordType>("blood_test");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [phase, setPhase] = useState<"form" | "uploading" | "extracting" | "done">("form");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const id = `rec-${Date.now()}`;
    const fileName = file?.name ?? `sample-${type}.pdf`;
    const record: HealthRecord = {
      id,
      type,
      title: defaultTitle(type),
      date,
      fileName,
      status: "uploaded",
      values: [],
    };
    addRecord(record);
    setPhase("uploading");
    await wait(900);
    updateRecord(id, { status: "extracting" });
    setPhase("extracting");
    await wait(1800);
    const extracted = fakeExtraction(type, readings);
    updateRecord(id, { status: "ready", values: extracted.values, summary: extracted.summary, impression: extracted.impression, title: extracted.title ?? record.title });
    addReadings(
      extracted.values
        .filter((v): v is ExtractedValue & { metric: MetricKey; value: number } => Boolean(v.metric) && typeof v.value === "number")
        .map((v, i) => ({ id: `${id}-rd-${i}`, metric: v.metric, value: v.value, unit: v.unit ?? "", takenAt: date, source: "record", recordId: id }) satisfies Reading),
    );
    setPhase("done");
  };

  return (
    <Sheet title="Add a record" subtitle="PDF or photo. HealthTwin reads it, summarises it and updates your trends." onClose={onClose}>
      {phase === "form" && (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) setFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-3xl border-[1.5px] border-dashed px-4 py-9 text-center transition-colors",
              dragging ? "border-brand-500 bg-brand-50" : "border-line-strong bg-surface-2 hover:border-brand-300",
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-700 shadow-sm">
              <FileUp className="h-5 w-5" />
            </span>
            {file ? (
              <div className="mt-3 text-[14px] font-medium">{file.name}</div>
            ) : (
              <>
                <div className="mt-3 text-[14.5px] font-medium">Choose a file or take a photo</div>
                <div className="mt-0.5 max-w-[240px] text-[12px] text-ink-3">No file handy? Continue to see a sample extraction.</div>
              </>
            )}
            <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Field label="Type">
              <select value={type} onChange={(e) => setType(e.target.value as RecordType)} className={fieldCls}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RECORD_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className={fieldCls} />
            </Field>
          </div>

          <Button className="mt-6 w-full" size="lg" onClick={submit}>
            Upload and read
          </Button>
        </>
      )}

      {(phase === "uploading" || phase === "extracting") && (
        <div className="space-y-4 py-2">
          <Step done={phase !== "uploading"} active={phase === "uploading"} label="Uploading securely" />
          <Step done={false} active={phase === "extracting"} label="Reading the document and extracting values" icon={ScanSearch} />
          <Step done={false} active={false} label="Adding to your timeline and trends" />
        </div>
      )}

      {phase === "done" && (
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-brand-600" />
          <div className="mt-3 font-display text-[24px]">Added to your vault</div>
          <p className="mt-1 text-[14px] text-ink-2">Values are extracted and your trends are updated.</p>
          <Button className="mt-6 w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function Step({ done, active, label, icon: Icon }: { done: boolean; active: boolean; label: string; icon?: typeof ScanSearch }) {
  return (
    <div className={cn("flex items-center gap-3 text-sm", done ? "text-ink" : active ? "text-ink" : "text-ink-4")}>
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-brand-600" />
      ) : active ? (
        <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
      ) : Icon ? (
        <Icon className="h-5 w-5" />
      ) : (
        <span className="h-5 w-5 rounded-full border border-line-strong" />
      )}
      {label}
    </div>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function defaultTitle(t: RecordType): string {
  const map: Record<RecordType, string> = {
    blood_test: "Blood test",
    ecg: "ECG",
    xray: "X-ray",
    scan: "Scan report",
    prescription: "Prescription",
    discharge_summary: "Discharge summary",
    consultation: "Consultation notes",
    other: "Document",
  };
  return map[t];
}

/** Produces plausible values near the user's latest readings so trends continue sensibly. */
function fakeExtraction(type: RecordType, readings: Reading[]): { values: ExtractedValue[]; summary?: string; impression?: string; title?: string } {
  const latest = (m: MetricKey, fallback: number) => {
    const r = readings.filter((x) => x.metric === m).sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
    return r?.value ?? fallback;
  };
  const jitter = (v: number, pct: number, dp = 0) => +(v * (1 + (Math.random() * 2 - 1) * pct)).toFixed(dp);
  const mk = (metric: MetricKey, value: number, i: number): ExtractedValue => {
    const meta = METRIC_META[metric];
    let flag: ExtractedValue["flag"] = "normal";
    if (meta.refHigh !== undefined && value > meta.refHigh) flag = "high";
    if (meta.refLow !== undefined && value < meta.refLow) flag = "low";
    return { id: `x-${metric}-${i}`, name: meta.label, metric, value, unit: meta.unit, refLow: meta.refLow, refHigh: meta.refHigh, flag };
  };

  switch (type) {
    case "blood_test": {
      const vals = [
        mk("hemoglobin", jitter(latest("hemoglobin", 14.2), 0.03, 1), 1),
        mk("fasting_glucose", jitter(latest("fasting_glucose", 100), 0.04), 2),
        mk("hba1c", jitter(latest("hba1c", 5.7), 0.03, 1), 3),
        mk("total_cholesterol", jitter(latest("total_cholesterol", 190), 0.05), 4),
        mk("ldl", jitter(latest("ldl", 110), 0.06), 5),
        mk("hdl", jitter(latest("hdl", 44), 0.05), 6),
        mk("triglycerides", jitter(latest("triglycerides", 150), 0.08), 7),
        mk("vitamin_d", jitter(latest("vitamin_d", 30), 0.1), 8),
      ];
      const flagged = vals.filter((v) => v.flag !== "normal").map((v) => v.name.toLowerCase());
      return {
        title: "Blood test panel",
        values: vals,
        summary: flagged.length ? `Routine panel. ${cap(flagged.join(", "))} outside the reference range; other values normal.` : "Routine panel. All extracted values within reference ranges.",
      };
    }
    case "ecg":
      return {
        title: "Resting ECG",
        values: [mk("heart_rate", jitter(latest("heart_rate", 74), 0.06), 1)],
        summary: "Normal sinus rhythm. Intervals within normal limits. No acute changes reported.",
        impression: "Sinus rhythm. Normal ECG.",
      };
    case "consultation":
      return {
        title: "Consultation notes",
        values: [mk("systolic", jitter(latest("systolic", 128), 0.04), 1), mk("diastolic", jitter(latest("diastolic", 82), 0.04), 2), mk("weight", jitter(latest("weight", 80), 0.01, 1), 3)],
        summary: "Follow-up visit. Vitals recorded. Continue current plan and review at the next scheduled appointment.",
      };
    case "prescription":
      return { values: [], summary: "Prescription on file. Medication names and doses are listed in the document." };
    case "xray":
      return { title: "Chest X-ray", values: [], summary: "Chest X-ray. No acute cardiopulmonary abnormality reported.", impression: "Normal study." };
    case "scan":
      return { values: [], summary: "Imaging report added. Findings are described in the document." };
    case "discharge_summary":
      return { values: [], summary: "Discharge summary added. Diagnosis, treatment given and follow-up plan are in the document." };
    default:
      return { values: [], summary: "Document added to your records." };
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
