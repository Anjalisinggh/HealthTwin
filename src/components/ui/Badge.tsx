import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "brand" | "info" | "guidance" | "urgent" | "high" | "low" | "normal" | "gold";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-3 text-ink-2",
  brand: "bg-brand-50 text-brand-700",
  info: "bg-info-bg text-info",
  guidance: "bg-guidance-bg text-guidance",
  urgent: "bg-urgent-bg text-urgent",
  high: "bg-guidance-bg text-guidance",
  low: "bg-teal-soft text-teal",
  normal: "bg-good-bg text-good",
  gold: "bg-gold-soft text-gold-3",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-4", tones[tone], className)}>
      {children}
    </span>
  );
}
