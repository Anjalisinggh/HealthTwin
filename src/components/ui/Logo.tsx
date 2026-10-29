import Image from "next/image";
import { cn } from "@/lib/cn";

/** Brand mark: two figures wrapped in leaves (public/logo.png). */
export function LogoMark({ className, tone = "emerald" }: { className?: string; tone?: "emerald" | "ivory" }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={421}
      height={421}
      aria-hidden
      className={cn("h-8 w-8 object-contain", tone === "ivory" && "rounded-full bg-white", className)}
    />
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
