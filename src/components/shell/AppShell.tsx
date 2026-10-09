"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ChevronLeft, ClipboardList, FolderClosed, HeartPulse, House, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { useHealth } from "@/lib/store/HealthStore";
import { cn } from "@/lib/cn";

/**
 * Phone-first shell. The app always renders in a phone-width column; on a
 * larger screen that column sits centred on the canvas like a device.
 */

const TABS = [
  { href: "/today", label: "Today", icon: House },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/care", label: "Care", icon: ClipboardList },
  { href: "/records", label: "Records", icon: FolderClosed },
  { href: "/chat", label: "Ask", icon: Sparkles },
] as const;

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh w-full bg-bg-2 sm:py-0">
      <div className={cn("relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-bg sm:shadow-[0_0_0_1px_var(--line),0_40px_80px_-40px_rgba(24,33,29,0.25)]", className)}>
        {children}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, onboardingComplete, profile } = useHealth();

  useEffect(() => {
    if (hydrated && !onboardingComplete) router.replace("/onboarding");
  }, [hydrated, onboardingComplete, router]);

  if (!hydrated || !onboardingComplete || !profile) {
    return (
      <PhoneFrame className="items-center justify-center">
        <LogoMark className="h-11 w-11 animate-pulse-soft" />
      </PhoneFrame>
    );
  }

  const hideTabs = pathname.startsWith("/chat");

  return (
    <PhoneFrame>
      <main className={cn("flex-1", !hideTabs && "pb-[calc(84px+env(safe-area-inset-bottom))]")}>{children}</main>

      {/* Tab bar */}
      {!hideTabs && (
        <nav
          aria-label="Primary"
          className="fixed bottom-0 left-1/2 z-30 w-full max-w-[440px] -translate-x-1/2 border-t border-line bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150"
        >
          <div className="flex h-[68px] items-stretch px-2">
            {TABS.map((t) => {
              const active = pathname.startsWith(t.href);
              const Icon = t.icon;
              return (
                <Link key={t.href} href={t.href} className="group flex flex-1 flex-col items-center justify-center gap-1" aria-current={active ? "page" : undefined}>
                  <span
                    className={cn(
                      "flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300",
                      active ? "bg-brand-700 text-on-brand" : "text-ink-3 group-hover:text-ink",
                    )}
                  >
                    <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2 : 1.7} />
                  </span>
                  <span className={cn("text-[10.5px] font-medium tracking-wide", active ? "text-brand-700" : "text-ink-3")}>{t.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </PhoneFrame>
  );
}

/* ------------------------------------------------------------------------ */
/* Screen scaffolding                                                        */
/* ------------------------------------------------------------------------ */

export function Avatar({ size = 36 }: { size?: number }) {
  const { profile } = useHealth();
  const initial = profile?.user.name.slice(0, 1).toUpperCase() ?? "·";
  return (
    <Link
      href="/profile"
      aria-label="Your profile"
      className="flex items-center justify-center rounded-full border border-line-strong bg-surface font-display text-ink shadow-sm transition-colors hover:border-brand-400"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {initial}
    </Link>
  );
}

/** Large-title screen header, iOS style. */
export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  back,
  action,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <header className="px-5 pt-[calc(14px+env(safe-area-inset-top))]">
      <div className="flex h-10 items-center justify-between">
        {back ? (
          <Link href={back.href} className="-ml-2 inline-flex items-center gap-0.5 rounded-full py-1 pl-1 pr-3 text-[15px] text-brand-700 hover:bg-surface-3">
            <ChevronLeft className="h-5 w-5" /> {back.label}
          </Link>
        ) : (
          <span className="eyebrow">{eyebrow}</span>
        )}
        <div className="flex items-center gap-2">{action ?? (!back && <Avatar />)}</div>
      </div>
      <h1 className="mt-2 text-[32px] leading-[1.05] text-ink">{title}</h1>
      {subtitle && <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">{subtitle}</p>}
    </header>
  );
}

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("animate-rise", className)}>{children}</div>;
}

export function Section({
  title,
  action,
  children,
  className,
  id,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("mt-7 scroll-mt-6 px-5", className)}>
      {(title || action) && (
        <div className="mb-2.5 flex items-end justify-between gap-3">
          {title && <h2 className="text-[20px] leading-tight text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="pb-1 text-[13px] font-medium text-brand-700 hover:underline">
      {children}
    </Link>
  );
}

/** Grouped list container (inset-grouped table). */
export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card divide-y divide-line overflow-hidden", className)}>{children}</div>;
}

export function Row({
  icon,
  title,
  detail,
  trailing,
  href,
  onClick,
  chevron = Boolean(href),
}: {
  icon?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
}) {
  const inner = (
    <>
      {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-brand-700">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium leading-snug text-ink">{title}</span>
        {detail && <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">{detail}</span>}
      </span>
      {trailing && <span className="shrink-0 text-right">{trailing}</span>}
      {chevron && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
  const cls = "flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors";
  if (href) {
    return (
      <Link href={href} className={cn(cls, "hover:bg-surface-2")}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={cn(cls, "hover:bg-surface-2")}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}
