"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Loader2, Lock, Plus, Search } from "lucide-react";
import { ScreenHeader, Screen } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { UploadDialog } from "@/components/records/UploadDialog";
import { RECORD_ICON } from "@/components/records/icons";
import { useHealth } from "@/lib/store/HealthStore";
import { fmtDate } from "@/lib/trends";
import type { HealthRecord, RecordType } from "@/lib/types";
import { RECORD_TYPE_LABEL } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function RecordsPage() {
  return (
    <Suspense>
      <RecordsInner />
    </Suspense>
  );
}

function RecordsInner() {
  const { records } = useHealth();
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(() => params.get("upload") === "1");
  const [filter, setFilter] = useState<RecordType | "all">("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (params.get("upload") === "1") router.replace("/records");
  }, [params, router]);

  const byYear = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = [...records]
      .filter((r) => filter === "all" || r.type === filter)
      .filter((r) => !needle || `${r.title} ${r.provider ?? ""} ${r.summary ?? ""} ${r.values.map((v) => v.name).join(" ")}`.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date));
    const map = new Map<string, HealthRecord[]>();
    for (const r of list) map.set(r.date.slice(0, 4), [...(map.get(r.date.slice(0, 4)) ?? []), r]);
    return [...map.entries()];
  }, [records, filter, q]);

  const types = useMemo(() => [...new Set(records.map((r) => r.type))], [records]);

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Records"
        title="Your vault"
        subtitle={`${records.length} documents`}
      />

      <div className="px-5 pt-5">
        <div className="flex gap-2">
          <label className="flex h-11 flex-1 items-center gap-2 rounded-full border border-line bg-surface px-4 shadow-sm focus-within:border-brand-400">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reports, tests, doctors"
              className="h-full flex-1 bg-transparent text-[14.5px] placeholder:text-ink-4 focus:outline-none"
              aria-label="Search records"
            />
          </label>
          <button onClick={() => setOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-700 text-on-brand shadow-sm hover:bg-brand-800" aria-label="Upload a report">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="scrollbar-thin -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </Chip>
          {types.map((t) => (
            <Chip key={t} active={filter === t} onClick={() => setFilter(t)}>
              {RECORD_TYPE_LABEL[t]}
            </Chip>
          ))}
        </div>
      </div>

      {byYear.length === 0 && (
        <div className="mx-5 mt-6 card flex flex-col items-center px-6 py-12 text-center">
          <div className="font-display text-[24px]">{q ? "No matches" : "No records yet"}</div>
          <p className="mt-1 max-w-xs text-[14px] text-ink-2">
            {q ? "Try a different word, or clear the filter." : "Upload a blood report, prescription or scan. HealthTwin reads it and starts your timeline."}
          </p>
          {!q && (
            <Button className="mt-5" onClick={() => setOpen(true)}>
              Upload your first report
            </Button>
          )}
        </div>
      )}

      <div className="mt-2">
        {byYear.map(([year, list]) => (
          <section key={year} className="mt-6 px-5">
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 className="text-[26px] leading-none tabular">{year}</h2>
              <span className="text-[12px] text-ink-3">
                {list.length} record{list.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="card divide-y divide-line overflow-hidden">
              {list.map((r) => (
                <RecordRow key={r.id} record={r} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="flex items-center gap-2 px-5 pb-6 pt-8 text-[12px] text-ink-3">
        <Lock className="h-3.5 w-3.5" /> Stored privately on this device.
      </p>

      <UploadDialog open={open} onClose={() => setOpen(false)} />
    </Screen>
  );
}

function RecordRow({ record: r }: { record: HealthRecord }) {
  const Icon = RECORD_ICON[r.type];
  const flagged = r.values.filter((v) => v.flag && v.flag !== "normal");
  const processing = r.status === "uploaded" || r.status === "extracting";
  const inner = (
    <div className={cn("flex items-start gap-3.5 px-4 py-4 transition-colors", !processing && "hover:bg-surface-2")}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-brand-700">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium leading-snug">{r.title}</div>
        <div className="mt-0.5 truncate text-[12.5px] text-ink-3">
          {fmtDate(r.date)}
          {r.provider ? ` · ${r.provider.split(",")[0]}` : ""}
        </div>
        {processing ? (
          <div className="mt-2">
            <Badge tone="gold">
              <Loader2 className="h-3 w-3 animate-spin" /> {r.status === "uploaded" ? "Uploading" : "Reading document"}
            </Badge>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {flagged.length > 0 && <Badge tone="high">{flagged.length} flagged</Badge>}
            {r.values.length > 0 && flagged.length === 0 && <Badge tone="normal">All in range</Badge>}
          </div>
        )}
      </div>
    </div>
  );
  return processing ? inner : <Link href={`/records/${r.id}`}>{inner}</Link>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 rounded-full border px-3.5 text-[12.5px] font-medium transition-colors",
        active ? "border-brand-700 bg-brand-700 text-on-brand" : "border-line bg-surface text-ink-2 hover:border-line-strong",
      )}
    >
      {children}
    </button>
  );
}
