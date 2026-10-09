"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

/** Bottom sheet, constrained to the phone column. Mount only while open. */
export function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-center" onClick={onClose}>
      <div className="absolute inset-0 animate-fade bg-[rgba(24,33,29,0.32)] backdrop-blur-[2px]" />
      <div className="relative flex w-full max-w-[440px] items-end">
        <div
          role="dialog"
          aria-modal
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          className="scrollbar-thin max-h-[88dvh] w-full animate-[sheet_0.45s_cubic-bezier(0.22,1,0.36,1)_both] overflow-y-auto rounded-t-[28px] bg-surface px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3 shadow-lg"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[26px] leading-tight">{title}</h2>
              {subtitle && <p className="mt-1 text-[14px] text-ink-2">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="-mr-1 rounded-full bg-surface-3 p-1.5 text-ink-2 hover:text-ink" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </div>
      <style>{`@keyframes sheet{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}

export const fieldCls =
  "h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 text-[15px] text-ink placeholder:text-ink-4 transition-colors focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand-500/10";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-ink-3">{label}</span>
      {children}
    </label>
  );
}
