"use client";

import { useId, useMemo, useRef, useState } from "react";
import { fmtDate, fmtMonth } from "@/lib/trends";

export interface Series {
  key: string;
  label: string;
  color: string; // CSS color (var(--series-1))
  points: { date: string; value: number; source?: string }[];
}

interface Props {
  series: Series[];
  unit?: string;
  refLow?: number;
  refHigh?: number;
  height?: number;
}

const W = 340;
const PAD = { top: 14, right: 36, bottom: 26, left: 30 };

/** Monotone cubic path: smooth, but never overshoots a reading. */
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  const n = pts.length;
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0]);
  const m = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / (dx[i] || 1));
  const t = pts.map((_, i) => {
    if (i === 0) return m[0];
    if (i === n - 1) return m[n - 2];
    return m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  });
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C ${(pts[i][0] + h).toFixed(1)} ${(pts[i][1] + t[i] * h).toFixed(1)}, ${(pts[i + 1][0] - h).toFixed(1)} ${(pts[i + 1][1] - t[i + 1] * h).toFixed(1)}, ${pts[i + 1][0].toFixed(1)} ${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

export function LineChart({ series, unit, refLow, refHigh, height = 180 }: Props) {
  const H = height;
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  // Shared x domain: union of dates in order.
  const dates = useMemo(() => [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort(), [series]);
  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const minData = Math.min(...allValues);
  const maxData = Math.max(...allValues);
  const spanData = maxData - minData || Math.abs(maxData) * 0.1 || 1;
  // Include reference bounds in the domain only when they sit near the data,
  // so a wide range (e.g. vitamin D 30–100) doesn't flatten the line.
  const bandValues = [refLow, refHigh].filter((x): x is number => x !== undefined && x >= minData - 2 * spanData && x <= maxData + 2 * spanData);
  const minV = Math.min(minData, ...bandValues);
  const maxV = Math.max(maxData, ...bandValues);
  const padV = (maxV - minV || 1) * 0.2;
  const y0 = minV - padV;
  const y1 = maxV + padV;
  // Readings keep the precision they were recorded with (HbA1c 6.0, not 6)
  const dp = Math.min(2, Math.max(0, ...allValues.map((v) => (String(v).split(".")[1] ?? "").length)));

  const plotW = W - PAD.left - PAD.right;
  const t0 = new Date(dates[0]).getTime();
  const t1 = new Date(dates.at(-1)!).getTime();
  const x = (d: string) => (t1 === t0 ? PAD.left + plotW / 2 : PAD.left + ((new Date(d).getTime() - t0) / (t1 - t0)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0)) * (H - PAD.top - PAD.bottom);

  // A few quiet gridlines on round numbers (1, 2, 2.5, 5 × 10ⁿ)
  const { ticks, tickDp } = useMemo(() => {
    const rough = (y1 - y0) / 3;
    const mag = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= rough)!;
    const out: number[] = [];
    for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) out.push(+v.toFixed(6));
    return { ticks: out, tickDp: step < 1 ? (String(step).split(".")[1] ?? "").length : 0 };
  }, [y0, y1]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestD = Infinity;
    dates.forEach((d, i) => {
      const dx = Math.abs(x(d) - px);
      if (dx < bestD) {
        bestD = dx;
        best = i;
      }
    });
    setHover(best);
  };

  const hoverDate = hover !== null ? dates[hover] : null;
  const hoverX = hoverDate ? x(hoverDate) : 0;
  const tooltipLeft = hoverX > W * 0.55;
  const single = series.length === 1;
  const showDots = dates.length <= 14;
  const hasBand = refLow !== undefined || refHigh !== undefined;
  const bandTop = Math.max(PAD.top, y(Math.min(refHigh ?? y1, y1)));
  const bandBottom = Math.min(H - PAD.bottom, y(Math.max(refLow ?? y0, y0)));

  // End-of-line labels; nudge apart when two series end close together
  const endLabels = series
    .map((s) => {
      const p = s.points.at(-1)!;
      return { key: s.key, value: p.value, cy: y(p.value), ly: y(p.value) };
    })
    .sort((a, b) => a.ly - b.ly);
  for (let i = 1; i < endLabels.length; i++) {
    if (endLabels[i].ly - endLabels[i - 1].ly < 13) endLabels[i].ly = endLabels[i - 1].ly + 13;
  }

  return (
    <div className="relative">
      {!single && (
        <div className="mb-3 flex flex-wrap gap-4 text-[12px] text-ink-2" aria-label="Legend">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="h-[3px] w-3.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y select-none overflow-visible"
        role="img"
        aria-label={`${series.map((s) => s.label).join(" and ")} over time`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${id}-fill-${s.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* healthy range */}
        {hasBand && bandBottom > bandTop && (
          <g>
            <rect x={PAD.left} width={plotW} y={bandTop} height={bandBottom - bandTop} rx="6" fill="var(--brand-50)" />
            <text x={PAD.left + 8} y={bandTop + 12} fontSize="9.5" fill="var(--brand-500)" fontWeight="500">
              Healthy range
            </text>
          </g>
        )}

        {/* quiet gridlines, values in the left gutter */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-4)" className="tabular">
              {t.toFixed(tickDp)}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={PAD.left + plotW} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--line-strong)" strokeWidth="1" />

        {/* x labels: first and last only */}
        {[...new Set([0, dates.length - 1])].map((i) => (
          <text
            key={i}
            x={x(dates[i])}
            y={H - 8}
            textAnchor={dates.length === 1 ? "middle" : i === 0 ? "start" : "end"}
            fontSize="10"
            fill="var(--ink-3)"
          >
            {fmtMonth(dates[i])}
          </text>
        ))}

        {/* series */}
        {series.map((s) => {
          const pts = s.points.map((p) => [x(p.date), y(p.value)] as [number, number]);
          const line = smoothPath(pts);
          return (
            <g key={s.key}>
              {single && line && (
                <path
                  d={`${line} L ${pts.at(-1)![0].toFixed(1)} ${H - PAD.bottom} L ${pts[0][0].toFixed(1)} ${H - PAD.bottom} Z`}
                  fill={`url(#${id}-fill-${s.key})`}
                />
              )}
              {line && <path d={line} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
              {showDots &&
                s.points.slice(0, -1).map((p) => (
                  <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r="2.5" fill="var(--surface)" stroke={s.color} strokeWidth="1.5" />
                ))}
              {/* latest reading, emphasised */}
              <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r="4.5" fill={s.color} stroke="var(--surface)" strokeWidth="2" />
            </g>
          );
        })}

        {/* direct labels for the latest values */}
        {endLabels.map((l) => (
          <text key={l.key} x={x(dates.at(-1)!) + 9} y={l.ly + 3.5} fontSize="11" fontWeight="600" fill="var(--ink)" className="tabular">
            {l.value.toFixed(dp)}
          </text>
        ))}

        {/* crosshair */}
        {hoverDate && (
          <g>
            <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--ink-4)" strokeWidth="1" />
            {series.map((s) => {
              const p = s.points.find((q) => q.date === hoverDate);
              return p ? <circle key={s.key} cx={hoverX} cy={y(p.value)} r="5" fill={s.color} stroke="var(--surface)" strokeWidth="2" /> : null;
            })}
          </g>
        )}

        {/* hit area */}
        <rect x={0} y={0} width={W} height={H} fill="transparent" />
      </svg>

      {hoverDate && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg"
          style={tooltipLeft ? { right: `${100 - (hoverX / W) * 100 + 3}%` } : { left: `${(hoverX / W) * 100 + 3}%` }}
        >
          <div className="font-medium text-ink">{fmtDate(hoverDate)}</div>
          {series.map((s) => {
            const p = s.points.find((q) => q.date === hoverDate);
            if (!p) return null;
            return (
              <div key={s.key} className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-ink-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {series.length > 1 ? `${s.label}: ` : ""}
                <span className="tabular font-medium text-ink">
                  {p.value.toFixed(dp)}
                  {unit ? ` ${unit}` : ""}
                </span>
                {p.source && <span className="text-ink-4">· {p.source === "record" ? "from report" : p.source === "kit" ? "kit" : "home"}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
