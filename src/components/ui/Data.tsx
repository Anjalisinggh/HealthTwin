import type { MarkerStatus } from "@/lib/care";
import { cn } from "@/lib/cn";

/** Where a value sits against its reference range. */
export function RangeBar({ value, low, high, className }: { value: number; low?: number; high?: number; className?: string }) {
  if (low === undefined && high === undefined) return null;
  // Build a domain that shows the range with breathing room either side
  const lo = low ?? (high! * 0.5);
  const hi = high ?? low! * 2;
  const pad = (hi - lo) * 0.45;
  const min = Math.min(lo - pad, value);
  const max = Math.max(hi + pad, value);
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const inRange = (low === undefined || value >= low) && (high === undefined || value <= high);
  return (
    <div className={cn("relative h-1.5 w-full rounded-full bg-surface-3", className)} aria-hidden>
      <div className="absolute inset-y-0 rounded-full bg-brand-100" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
      <div
        className={cn("absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface shadow-sm", inRange ? "bg-brand-600" : "bg-gold")}
        style={{ left: `${pct(value)}%` }}
      />
    </div>
  );
}

export function Sparkline({ values, className, stroke = "var(--brand-600)" }: { values: number[]; className?: string; stroke?: string }) {
  if (values.length < 2) return <div className={className} />;
  const W = 100;
  const H = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 3 - ((v - min) / span) * (H - 6)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts.at(-1)!;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={cn("overflow-visible", className)} aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={stroke} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Progress({ value, className, tone = "brand" }: { value: number; className?: string; tone?: "brand" | "ivory" }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full", tone === "ivory" ? "bg-white/15" : "bg-surface-3", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]", tone === "ivory" ? "bg-gold-2" : "bg-brand-600")}
        style={{ width: `${Math.round(Math.max(0.03, value) * 100)}%` }}
      />
    </div>
  );
}

export function StatusDot({ status, className }: { status: MarkerStatus; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", status === "in_range" ? "bg-brand-500" : status === "watch" ? "bg-gold" : "bg-urgent", className)}
      aria-hidden
    />
  );
}

export const STATUS_LABEL: Record<MarkerStatus, string> = { in_range: "In range", watch: "Near limit", out: "Out of range" };
