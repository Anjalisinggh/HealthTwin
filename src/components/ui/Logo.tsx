import { cn } from "@/lib/cn";

/** Two interlocking arcs — you and your twin — on an emerald seal. */
export function LogoMark({ className, tone = "emerald" }: { className?: string; tone?: "emerald" | "ivory" }) {
  const seal = tone === "emerald" ? "#164a3e" : "#f8f6f0";
  const stroke = tone === "emerald" ? "#f3ece0" : "#164a3e";
  return (
    <svg viewBox="0 0 40 40" className={cn("h-8 w-8", className)} aria-hidden>
      <rect x="0.5" y="0.5" width="39" height="39" rx="12" fill={seal} />
      <g fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
        <path d="M17 12.5a7.5 7.5 0 1 0 0 15" />
        <path d="M23 27.5a7.5 7.5 0 1 0 0-15" />
        <path d="M17 20h6" opacity="0.9" />
      </g>
      <circle cx="20" cy="20" r="1.6" fill="#c9a978" />
    </svg>
  );
}

export function Logo({ className, text = true, tone = "emerald" }: { className?: string; text?: boolean; tone?: "emerald" | "ivory" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark tone={tone} />
      {text && (
        <span className={cn("font-display text-[23px] leading-none tracking-[-0.01em]", tone === "ivory" ? "text-on-brand" : "text-ink")}>
          HealthTwin
        </span>
      )}
    </span>
  );
}
