import { Activity, FileText, HeartPulse, Pill, ScanLine, Stethoscope } from "lucide-react";
import type { RecordType } from "@/lib/types";

export const RECORD_ICON: Record<RecordType, typeof FileText> = {
  blood_test: Activity,
  ecg: HeartPulse,
  xray: ScanLine,
  scan: ScanLine,
  prescription: Pill,
  discharge_summary: FileText,
  consultation: Stethoscope,
  other: FileText,
};
