"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Plus } from "lucide-react";
import { ScreenHeader, Screen, Section } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { RangeBar, STATUS_LABEL, StatusDot } from "@/components/ui/Data";
import { Disclaimer } from "@/components/ui/SafetyNote";
import { LineChart, type Series } from "@/components/trends/LineChart";
import { LogReadingSheet, type LogKind } from "@/components/health/LogReadingSheet";
import { useHealth } from "@/lib/store/HealthStore";
import { allReadings, markers, type Marker } from "@/lib/care";
import { computeTrend, fmtDate, fmtMonth, seriesFor, type Trend } from "@/lib/trends";
import { METRIC_META, fmtMetric, type MetricKey } from "@/lib/types";
import { cn } from "@/lib/cn";

type Tab = "vitals" | "labs" | "trends";
type Range = "all" | "2y" | "1y";

const LAB_GROUPS: { title: string; metrics: MetricKey[] }[] = [
  { title: "Blood sugar", metrics: ["hba1c", "fasting_glucose"] },
  { title: "Cholesterol", metrics: ["ldl", "hdl", "triglycerides", "total_cholesterol"] },
  { title: "Blood count", metrics: ["hemoglobin", "wbc", "platelets"] },
  { title: "Vitamins & thyroid", metrics: ["vitamin_d", "tsh"] },
  { title: "Kidney", metrics: ["creatinine"] },
];

const VITALS: { metric: MetricKey; label: string; log: LogKind }[] = [
  { metric: "systolic", label: "Blood pressure", log: "bp" },
  { metric: "heart_rate", label: "Resting heart rate", log: "heart_rate" },
  { metric: "weight", label: "Weight", log: "weight" },
  { metric: "fasting_glucose", label: "Fasting glucose", log: "fasting_glucose" },
];

const TREND_METRICS: MetricKey[] = ["hba1c", "weight", "ldl", "fasting_glucose", "triglycerides", "hdl", "vitamin_d", "heart_rate"];

export default function HealthPage() {
  return (
    <Suspense>
      <HealthInner />
    </Suspense>
  );
}

function HealthInner() {
  const { context, readings } = useHealth();
  const params = useSearchParams();
  const router = useRouter();
  // The shell only renders screens after the store hydrates on the client, so reading the hash here is safe
  const [tab, setTab] = useState<Tab>(() => (typeof window !== "undefined" && window.location.hash.slice(1) in METRIC_META ? "trends" : "vitals"));
  const [range, setRange] = useState<Range>("all");
  const [showAllTrends, setShowAllTrends] = useState(false);
  const [logging, setLogging] = useState<LogKind | null>(() => (params.get("log") as LogKind | null) ?? null);

  useEffect(() => {
    if (params.get("log")) router.replace("/health");
  }, [params, router]);

  // Deep links like /health#ldl land on that trend chart
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && hash in METRIC_META) {
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }, []);

  const all = useMemo(() => (context ? allReadings(context) : readings), [context, readings]);
  const filtered = useMemo(() => {
    if (range === "all") return all;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - (range === "1y" ? 1 : 2));
    const iso = cutoff.toISOString().slice(0, 10);
    return all.filter((r) => r.takenAt >= iso);
  }, [all, range]);

  if (!context) return null;
  const ms = markers(all);
  const byMetric = new Map(ms.map((m) => [m.metric, m]));

  return (
    <Screen>
      <ScreenHeader eyebrow="Health" title="Your numbers" subtitle="Your vitals and lab results." />

      {/* Segmented control */}
      <div className="sticky top-0 z-20 mt-5 bg-bg/90 px-5 py-2 backdrop-blur-xl">
        <div role="tablist" className="grid grid-cols-3 rounded-full border border-line bg-surface-3/70 p-1">
          {(["vitals", "labs", "trends"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "h-9 rounded-full text-[13.5px] font-medium capitalize transition-all duration-300",
                tab === t ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "vitals" && (
        <div className="animate-rise">
          <Section className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              {VITALS.map((v) => {
                const t = computeTrend(all, v.metric);
                const dia = v.metric === "systolic" ? computeTrend(all, "diastolic") : null;
                const m = byMetric.get(v.metric);
                return (
                  <div key={v.metric} className="card flex flex-col p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] text-ink-3">{v.label}</span>
                      {m && <StatusDot status={m.status} />}
                    </div>
                    {t.latest ? (
                      <>
                        <div className="mt-2 tabular text-[24px] font-medium leading-none tracking-tight">
                          {fmtMetric(t.latest.value, v.metric)}
                          {dia?.latest && <span>/{dia.latest.value}</span>}
                        </div>
                        <div className="mt-1 text-[11.5px] text-ink-3">
                          {t.unit} · {fmtMonth(t.latest.date)}
                        </div>
                      </>
                    ) : (
                      <div className="mt-2 flex-1 text-[13px] text-ink-3">No readings yet</div>
                    )}
                    <button
                      onClick={() => setLogging(v.log)}
                      className="mt-3 inline-flex h-8 items-center justify-center gap-1 rounded-full bg-surface-2 text-[12.5px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Log
                    </button>
                  </div>
                );
              })}
            </div>
          </Section>

          {context.bmi && (
            <Section title="Body">
              <div className="card p-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[14px] text-ink-2">Body mass index</span>
                  <span className="tabular text-[22px] font-medium">{context.bmi}</span>
                </div>
                <RangeBar value={context.bmi} low={18.5} high={24.9} className="mt-4" />
                <div className="mt-2 flex justify-between text-[11px] text-ink-3">
                  <span>18.5</span>
                  <span>Healthy range</span>
                  <span>24.9</span>
                </div>
              </div>
            </Section>
          )}
        </div>
      )}

      {tab === "labs" && (
        <div className="animate-rise">
          {LAB_GROUPS.map((g) => {
            const list = g.metrics.map((m) => byMetric.get(m)).filter(Boolean) as Marker[];
            if (!list.length) return null;
            return (
              <Section key={g.title} title={g.title} className="mt-6">
                <div className="card divide-y divide-line overflow-hidden">
                  {list.map((m) => (
                    <LabRow key={m.metric} m={m} onOpen={() => {
                      setTab("trends");
                      setTimeout(() => document.getElementById(m.metric)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                    }} />
                  ))}
                </div>
              </Section>
            );
          })}
          <p className="px-5 pt-4 text-[12px] leading-relaxed text-ink-3">
            Ranges are general adult reference ranges. Your lab’s ranges, and your doctor’s targets for you, may differ.
          </p>
        </div>
      )}

      {tab === "trends" && (
        <div className="animate-rise">
          <div className="flex gap-2 px-5 pt-4">
            {(["all", "2y", "1y"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "h-8 rounded-full border px-3.5 text-[12.5px] font-medium transition-colors",
                  range === r ? "border-brand-700 bg-brand-700 text-on-brand" : "border-line bg-surface text-ink-2",
                )}
              >
                {r === "all" ? "All time" : r === "2y" ? "2 years" : "1 year"}
              </button>
            ))}
          </div>

          <TrendCard
            id="systolic"
            title="Blood pressure"
            trend={computeTrend(filtered, "systolic")}
            value={(() => {
              const s = computeTrend(filtered, "systolic").latest;
              const d = computeTrend(filtered, "diastolic").latest;
              return s ? `${s.value}/${d?.value ?? "–"}` : "—";
            })()}
            series={[
              { key: "sys", label: "Systolic", color: "var(--series-1)", points: seriesFor(filtered, "systolic") },
              { key: "dia", label: "Diastolic", color: "var(--series-2)", points: seriesFor(filtered, "diastolic") },
            ].filter((s) => s.points.length > 0)}
            note="A common target on treatment is below 130/80; your doctor may set a different one."
          />
          {TREND_METRICS.filter((metric) => computeTrend(filtered, metric).points.length > 0)
            .slice(0, showAllTrends ? undefined : 3)
            .map((metric) => {
            const t = computeTrend(filtered, metric);
            return (
              <TrendCard
                key={metric}
                id={metric}
                title={t.label}
                trend={t}
                value={t.latest ? fmtMetric(t.latest.value, metric) : "—"}
                refLow={METRIC_META[metric].refLow}
                refHigh={METRIC_META[metric].refHigh}
                series={[{ key: metric, label: t.label, color: "var(--series-1)", points: t.points }]}
              />
            );
          })}

          {!showAllTrends && TREND_METRICS.filter((metric) => computeTrend(filtered, metric).points.length > 0).length > 3 && (
            <div className="px-5 pt-4">
              <button onClick={() => setShowAllTrends(true)} className="h-11 w-full rounded-full border border-line bg-surface text-[14px] font-medium text-brand-700">
                Show all trends
              </button>
            </div>
          )}
        </div>
      )}

      <Disclaimer className="px-5 pb-6 pt-8" />

      {logging && <LogReadingSheet kind={logging} onClose={() => setLogging(null)} />}
    </Screen>
  );
}

function LabRow({ m, onOpen }: { m: Marker; onOpen: () => void }) {
  const meta = METRIC_META[m.metric];
  const t = m.trend;
  const Arrow = t.direction === "up" ? ArrowUpRight : t.direction === "down" ? ArrowDownRight : Minus;
  return (
    <button onClick={onOpen} className="block w-full px-4 py-4 text-left transition-colors hover:bg-surface-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-medium">{m.label}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
            <StatusDot status={m.status} /> {STATUS_LABEL[m.status]} · {fmtMonth(m.date)}
          </div>
        </div>
        <div className="text-right">
          <div className="tabular text-[18px] font-medium tracking-tight">
            {m.value}
            <span className="ml-1 text-[11px] font-normal text-ink-3">{m.unit}</span>
          </div>
          {t.delta !== null && (
            <div className="mt-0.5 inline-flex items-center gap-0.5 text-[11.5px] text-ink-3">
              <Arrow className="h-3 w-3" /> {t.delta > 0 ? "+" : ""}
              {t.delta}
            </div>
          )}
        </div>
      </div>
      <RangeBar value={Number(m.value)} low={meta.refLow} high={meta.refHigh} className="mt-3" />
    </button>
  );
}

function TrendCard({
  id,
  title,
  trend,
  value,
  series,
  refLow,
  refHigh,
  note,
}: {
  id: string;
  title: string;
  trend: Trend;
  value: string;
  series: Series[];
  refLow?: number;
  refHigh?: number;
  note?: string;
}) {
  if (!series.length) return null;
  const higherIsWorse = METRIC_META[trend.metric].higherIsWorse;
  const better = trend.direction && trend.direction !== "flat" ? (trend.direction === "down") === Boolean(higherIsWorse) : null;
  return (
    <section id={id} className="mt-4 scroll-mt-20 px-5">
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[13px] text-ink-3">{title}</div>
            <div className="mt-1 tabular text-[26px] font-medium leading-none tracking-tight">
              {value}
              <span className="ml-1 text-[12px] font-normal text-ink-3">{trend.unit}</span>
            </div>
            {trend.latest && <div className="mt-1.5 text-[11.5px] text-ink-3">Latest · {fmtDate(trend.latest.date)}</div>}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {trend.delta !== null && (
              <Badge tone={better === null ? "neutral" : better ? "normal" : "guidance"}>
                {trend.delta > 0 ? "+" : ""}
                {trend.delta} {trend.unit}
              </Badge>
            )}
            {trend.status === "above" && <Badge tone="gold">Above range</Badge>}
            {trend.status === "below" && <Badge tone="low">Below range</Badge>}
            {trend.status === "in_range" && <Badge tone="brand">In range</Badge>}
          </div>
        </div>
        <div className="mt-4">
          <LineChart unit={trend.unit} refLow={refLow} refHigh={refHigh} series={series} />
        </div>
        {trend.observation && <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{trend.observation}</p>}
        {note && <p className="mt-1.5 text-[12px] text-ink-3">{note}</p>}
      </div>
    </section>
  );
}
