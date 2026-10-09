"use client";

import { useParams } from "next/navigation";
import { Paperclip, Sparkles } from "lucide-react";
import { ScreenHeader, Screen, Section } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RangeBar } from "@/components/ui/Data";
import { Disclaimer } from "@/components/ui/SafetyNote";
import { RECORD_ICON } from "@/components/records/icons";
import { useHealth } from "@/lib/store/HealthStore";
import { fmtDate } from "@/lib/trends";
import { RECORD_TYPE_LABEL, fmtMetric } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { records } = useHealth();
  const record = records.find((r) => r.id === id);

  if (!record) {
    return (
      <Screen>
        <ScreenHeader title="Not found" back={{ href: "/records", label: "Records" }} />
        <p className="px-5 pt-4 text-[14px] text-ink-2">That record doesn’t exist.</p>
      </Screen>
    );
  }

  const Icon = RECORD_ICON[record.type];
  const previous = records
    .filter((r) => r.id !== record.id && r.type === record.type && r.date < record.date && r.values.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const flagged = record.values.filter((v) => v.flag && v.flag !== "normal");

  return (
    <Screen>
      <ScreenHeader title={record.title} back={{ href: "/records", label: "Records" }} />

      <div className="flex flex-wrap items-center gap-2 px-5 pt-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-3 text-brand-700">
          <Icon className="h-4 w-4" />
        </span>
        <Badge>{RECORD_TYPE_LABEL[record.type]}</Badge>
        <span className="text-[13px] text-ink-3">{fmtDate(record.date)}</span>
      </div>
      {record.provider && <p className="px-5 pt-2 text-[13.5px] text-ink-2">{record.provider}</p>}
      {record.fileName && (
        <div className="mx-5 mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-ink-2">
          <Paperclip className="h-3 w-3" /> {record.fileName}
        </div>
      )}

      {record.summary && (
        <Section className="mt-6">
          <div className="card-emerald p-5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-2">
              <Sparkles className="h-3.5 w-3.5" /> In plain language
            </div>
            <p className="mt-3 font-display text-[21px] leading-[1.3]">{record.summary}</p>
            {flagged.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {flagged.map((v) => (
                  <span key={v.id} className="rounded-full bg-white/10 px-2.5 py-1 text-[11.5px]">
                    {v.name} {v.flag}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-4 text-[11.5px] text-on-brand/55">AI-generated from the document. Check anything important with your doctor.</p>
          </div>
        </Section>
      )}

      {record.impression && (
        <Section title="Doctor’s words">
          <blockquote className="card border-l-[3px] border-l-gold p-4 text-[14px] leading-relaxed text-ink-2">{record.impression}</blockquote>
        </Section>
      )}

      {record.values.length > 0 && (
        <Section title="Results" action={previous ? <span className="pb-1 text-[12px] text-ink-3">vs {fmtDate(previous.date)}</span> : undefined}>
          <div className="card divide-y divide-line overflow-hidden">
            {record.values.map((v) => {
              const prev = previous?.values.find((p) => p.metric && p.metric === v.metric);
              const delta = prev && typeof v.value === "number" && typeof prev.value === "number" ? +(v.value - prev.value).toFixed(1) : null;
              const off = v.flag && v.flag !== "normal";
              return (
                <div key={v.id} className="px-4 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14.5px] font-medium">{v.name}</span>
                    <span className={cn("tabular text-[16px] font-medium", off && "text-gold-3")}>
                      {fmtMetric(v.value, v.metric)}
                      {v.unit && <span className="ml-1 text-[11px] font-normal text-ink-3">{v.unit}</span>}
                    </span>
                  </div>
                  {typeof v.value === "number" && <RangeBar value={v.value} low={v.refLow} high={v.refHigh} className="mt-2.5" />}
                  <div className="mt-1.5 flex justify-between text-[11.5px] text-ink-3 tabular">
                    <span>
                      {v.refLow !== undefined || v.refHigh !== undefined
                        ? `Range ${v.refLow ?? "<"}${v.refLow !== undefined && v.refHigh !== undefined ? "–" : " "}${v.refHigh ?? "+"}`
                        : "No range"}
                    </span>
                    {delta !== null && <span>{delta > 0 ? `+${delta}` : delta === 0 ? "No change" : delta} since last</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section>
        <div className="grid gap-2">
          <Button size="lg" href={`/chat?q=${encodeURIComponent(`Explain my ${record.title.toLowerCase()} from ${fmtDate(record.date)}`)}`}>
            <Sparkles className="h-4 w-4" /> Explain this report
          </Button>
          {previous && (
            <Button variant="secondary" size="lg" href={`/chat?q=${encodeURIComponent("Compare my latest report with the previous one")}`}>
              Compare with previous
            </Button>
          )}
        </div>
      </Section>

      <Disclaimer className="px-5 pb-6 pt-8" />
    </Screen>
  );
}
