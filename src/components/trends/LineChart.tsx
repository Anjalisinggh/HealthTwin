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
const PAD = { top: 12, right: 10, bottom: 24, left: 30 };

export function LineChart({ series, unit, refLow, refHigh, height = 170 }: Props) {
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
  const padV = (maxV - minV || 1) * 0.18;
  const y0 = minV - padV;
  const y1 = maxV + padV;
  const tickDp = y1 - y0 > 5 ? 0 : 1;

  const t0 = new Date(dates[0]).getTime();
  const t1 = new Date(dates.at(-1)!).getTime() || t0 + 1;
  const x = (d: string) => PAD.left + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0)) * (H - PAD.top - PAD.bottom);

  const ticks = useMemo(() => {
    const n = 3;
    const step = (y1 - y0) / n;
    return Array.from({ length: n + 1 }, (_, i) => +(y0 + step * i).toFixed(tickDp));
  }, [y0, y1, tickDp]);

  const path = (pts: Series["points"]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");

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
  const tooltipLeft = hoverX > W * 0.6;

  return (
    <div className="relative">
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-4 text-xs text-ink-2" aria-label="Legend">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y select-none"
        role="img"
        aria-label={`${series.map((s) => s.label).join(" and ")} over time`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={`${id}-clip`}>
            <rect x={PAD.left} y={0} width={W - PAD.left - PAD.right} height={H} />
          </clipPath>
        </defs>

        {/* reference band */}
        {(refLow !== undefined || refHigh !== undefined) && (
          <rect
            x={PAD.left}
            width={W - PAD.left - PAD.right}
            y={y(refHigh ?? y1)}
            height={Math.max(0, y(refLow ?? y0) - y(refHigh ?? y1))}
            fill="var(--brand-50)"
            opacity={0.9}
          />
        )}

        {/* grid + y labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="2 4" />
            <text x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-3)" className="tabular">
              {t}
            </text>
          </g>
        ))}

        {/* x labels: first, middle, last */}
        {[0, Math.floor((dates.length - 1) / 2), dates.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
          <text key={i} x={x(dates[i])} y={H - 8} textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"} fontSize="10" fill="var(--ink-3)">
            {fmtMonth(dates[i])}
          </text>
        ))}

        {/* series */}
        <g clipPath={`url(#${id}-clip)`}>
          {series.map((s) => (
            <g key={s.key}>
              <path d={path(s.points)} fill="none" stroke={s.color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
              {s.points.map((p) => (
                <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={hoverDate === p.date ? 4.5 : 3} fill={s.color} stroke="var(--surface)" strokeWidth="2" />
              ))}
            </g>
          ))}
        </g>

        {/* crosshair */}
        {hoverDate && <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--ink-4)" strokeWidth="1" />}

        {/* hit area */}
        <rect x={PAD.left} y={0} width={W - PAD.left - PAD.right} height={H} fill="transparent" />
      </svg>

      {hoverDate && (
        <div
          className="pointer-events-none absolute top-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg"
          style={tooltipLeft ? { right: `${100 - (hoverX / W) * 100 + 1.5}%` } : { left: `${(hoverX / W) * 100 + 1.5}%` }}
        >
          <div className="font-medium text-ink">{fmtDate(hoverDate)}</div>
          {series.map((s) => {
            const p = s.points.find((q) => q.date === hoverDate);
            if (!p) return null;
            return (
              <div key={s.key} className="mt-0.5 flex items-center gap-1.5 text-ink-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {series.length > 1 ? `${s.label}: ` : ""}
                <span className="tabular font-medium text-ink">
                  {p.value}
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
