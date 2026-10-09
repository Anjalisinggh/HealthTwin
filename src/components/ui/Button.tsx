import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ivory";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] select-none disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-brand-700 text-on-brand shadow-[0_1px_2px_rgba(11,42,35,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-brand-800 hover:shadow-[0_8px_24px_-8px_rgba(11,42,35,0.45)]",
  secondary: "bg-surface text-ink border border-line-strong hover:border-brand-400 hover:text-brand-700 shadow-sm",
  ghost: "text-ink-2 hover:bg-surface-3 hover:text-ink",
  danger: "bg-urgent text-white hover:brightness-110",
  /** For use on the emerald surface */
  ivory: "bg-on-brand text-brand-800 hover:bg-white shadow-[0_8px_24px_-10px_rgba(0,0,0,0.4)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-[14px]",
  lg: "h-12 px-7 text-[15px]",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", href, className, children, ...rest }: Props) {
  const cls = cn(base, variants[variant], sizes[size], className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
