import { AlertTriangle, Info, Stethoscope } from "lucide-react";
import type { SafetyTier } from "@/lib/types";
import { cn } from "@/lib/cn";

const META: Record<SafetyTier, { label: string; icon: typeof Info; cls: string; iconCls: string }> = {
  info: { label: "Information", icon: Info, cls: "bg-info-bg border-info/15", iconCls: "text-info" },
  guidance: { label: "Worth discussing with your doctor", icon: Stethoscope, cls: "bg-guidance-bg border-guidance/15", iconCls: "text-guidance" },
  urgent: { label: "Seek urgent care", icon: AlertTriangle, cls: "bg-urgent-bg border-urgent/20", iconCls: "text-urgent" },
};

export function SafetyNote({ tier, title, children, className }: { tier: SafetyTier; title?: string; children: React.ReactNode; className?: string }) {
  const m = META[tier];
  const Icon = m.icon;
  return (
    <div role={tier === "urgent" ? "alert" : "note"} className={cn("rounded-2xl border px-4 py-3.5 animate-rise", m.cls, className)}>
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface/70", m.iconCls)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className={cn("text-[11px] font-semibold uppercase tracking-[0.12em]", m.iconCls)}>{m.label}</div>
          {title && <div className="mt-0.5 font-medium text-ink">{title}</div>}
          <div className="mt-1 text-sm leading-relaxed text-ink-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function TierPill({ tier }: { tier: SafetyTier }) {
  const m = META[tier];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", m.iconCls)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {m.label}
    </span>
  );
}

/** Standard footer disclaimer used across clinical screens. */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-[12px] leading-relaxed text-ink-3", className)}>
      HealthTwin doesn’t diagnose or replace your doctor. In an emergency, call your local emergency number.
    </p>
  );
}
