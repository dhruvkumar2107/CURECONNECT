import React, { useId } from 'react';
import { Funnel, FunnelStage } from '../../services/kpiEngine';

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

const TEAL = '#2dd4bf';
const INDIGO = '#818cf8';
const ROSE = '#f87171';
const AMBER = '#fbbf24';
const GRID = 'rgba(255,255,255,0.06)';
const AXIS = '#4a5878';

const fmt = (v: number): string => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
};

// ─── Line / Area chart ───────────────────────────────────────────────────────

export const LineChart: React.FC<{
  data: ChartDatum[];
  height?: number;
  color?: string;
  labelSuffix?: string;
}> = ({ data, height = 220, color = TEAL, labelSuffix = '' }) => {
  const uid = useId().replace(/:/g, '');
  const W = 600;
  const H = 220;
  const P = { t: 14, r: 10, b: 26, l: 40 };
  const plotW = W - P.l - P.r;
  const plotH = H - P.t - P.b;
  const n = data.length;

  if (!n) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
        No data in this range
      </div>
    );
  }

  const values = data.map((d) => d.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min = min - 1; max = max + 1; }
  const padV = (max - min) * 0.15;
  min = Math.max(0, min - padV);
  max = max + padV;

  const x = (i: number): number => P.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number): number => P.t + plotH - ((v - min) / (max - min)) * plotH;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${(P.t + plotH).toFixed(1)} L${x(0).toFixed(1)},${(P.t + plotH).toFixed(1)} Z`;
  const gridYs = [0, 0.25, 0.5, 0.75, 1];
  const showLabels = n <= 24;

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`area${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridYs.map((g) => {
          const gy = P.t + plotH - g * plotH;
          const gv = min + g * (max - min);
          return (
            <g key={g}>
              <line x1={P.l} y1={gy} x2={W - P.r} y2={gy} stroke={GRID} strokeWidth="1" />
              <text x={P.l - 6} y={gy + 3} textAnchor="end" fontSize="9" fill={AXIS}>{fmt(gv)}{labelSuffix}</text>
            </g>
          );
        })}

        <path d={area} fill={`url(#area${uid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {showLabels && data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.value)} r="3" fill={d.color || color} stroke="#080f22" strokeWidth="1.5" />
          </g>
        ))}

        {showLabels && data.map((d, i) => (
          <text key={`x${i}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill={AXIS}>{d.label}</text>
        ))}
      </svg>
    </div>
  );
};

// ─── Bar chart ───────────────────────────────────────────────────────────────

export const BarChart: React.FC<{
  data: ChartDatum[];
  height?: number;
  color?: string;
  horizontal?: boolean;
}> = ({ data, height = 220, color = TEAL, horizontal = false }) => {
  const W = 600;
  const H = horizontal ? 360 : 220;

  if (!data.length) {
    return <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>No data in this range</div>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  if (horizontal) {
    const rowH = H / data.length;
    const pad = 8;
    const barH = Math.max(6, rowH - pad * 2);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        {data.map((d, i) => {
          const bw = (d.value / max) * (W - 190);
          return (
            <g key={i}>
              <text x={184} y={i * rowH + rowH / 2 + 3} textAnchor="end" fontSize="10" fill="#8b9ab8">
                {d.label.length > 22 ? `${d.label.slice(0, 21)}…` : d.label}
              </text>
              <rect
                x={190} y={i * rowH + pad} width={Math.max(2, bw)} height={barH} rx="4"
                fill={d.color || color} opacity="0.85"
              />
              <text x={192 + bw + 6} y={i * rowH + rowH / 2 + 3} fontSize="10" fill="#f0f4ff" fontWeight="600">
                {fmt(d.value)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  const P = { t: 16, r: 8, b: 26, l: 8 };
  const plotW = W - P.l - P.r;
  const plotH = H - P.t - P.b;
  const slot = plotW / data.length;
  const barW = Math.max(6, slot * 0.55);
  const showLabels = data.length <= 24;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = (d.value / max) * plotH;
        const bx = P.l + slot * i + (slot - barW) / 2;
        const by = P.t + plotH - bh;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={barW} height={Math.max(2, bh)} rx="3" fill={d.color || color} opacity="0.85" />
            {bh > 14 && (
              <text x={bx + barW / 2} y={by - 4} textAnchor="middle" fontSize="9" fill="#f0f4ff" fontWeight="600">{fmt(d.value)}</text>
            )}
            {showLabels && (
              <text x={bx + barW / 2} y={H - 10} textAnchor="middle" fontSize="8.5" fill={AXIS}>
                {d.label.length > 14 ? `${d.label.slice(0, 13)}…` : d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─── Donut chart ─────────────────────────────────────────────────────────────

export const DonutChart: React.FC<{
  data: ChartDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}> = ({ data, size = 200, thickness = 26, centerLabel, centerValue }) => {
  const total = data.reduce((a, b) => a + b.value, 0);
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const palette = [TEAL, INDIGO, ROSE, AMBER, '#a78bfa', '#34d399', '#fda4af', '#93c5fd'];

  if (!total) {
    return <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height: size }}>No data</div>;
  }

  let offset = 0;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const len = frac * C;
          const el = (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={d.color || palette[i % palette.length]}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-white">{centerValue}</span>
        {centerLabel && <span className="text-[11px] uppercase tracking-wider text-slate-500">{centerLabel}</span>}
      </div>
    </div>
  );
};

// ─── Sparkline ───────────────────────────────────────────────────────────────

export const Sparkline: React.FC<{ data: number[]; color?: string; height?: number }> = ({ data, color = TEAL, height = 34 }) => {
  const W = 100;
  const H = 34;
  if (!data.length) return <div className="text-slate-600 text-xs">—</div>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - 3 - ((v - min) / range) * (H - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
};

// ─── Funnel ──────────────────────────────────────────────────────────────────

export const FunnelChart: React.FC<{ funnel: Funnel }> = ({ funnel }) => {
  const stages = funnel.stages;
  if (!stages.length) return <div className="text-slate-500 text-sm">No data for this funnel</div>;
  const firstUsers = Math.max(1, stages[0].users);

  return (
    <div className="space-y-2.5">
      {stages.map((s: FunnelStage, i) => {
        const widthPct = Math.max(12, (s.users / firstUsers) * 100);
        const cum = s.cumulativeConversion.toFixed(0);
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div className="w-full">
              <div
                className="h-9 rounded-lg flex items-center justify-center transition-all duration-500"
                style={{
                  width: `${widthPct}%`,
                  background: i === 0
                    ? 'linear-gradient(135deg, rgba(13,148,136,0.35), rgba(13,148,136,0.15))'
                    : `rgba(13,148,136,${0.08 + 0.2 * (1 - i / Math.max(1, stages.length - 1))})`,
                  border: '1px solid rgba(13,148,136,0.25)',
                }}
              >
                <div className="flex items-center justify-center gap-2 truncate px-2 text-[13px]">
                  <span className="text-slate-200 font-semibold truncate">{s.label}</span>
                </div>
              </div>
            </div>
            <div className="w-24 shrink-0 text-right">
              <div className="text-sm font-bold text-white">{s.users}<span className="text-slate-500 font-medium"> users</span></div>
              <div className="text-[11px] text-slate-500">
                {i === 0 ? '100% start' : `${s.conversionToPrev?.toFixed(0)}% of prev`} · {cum}% of L1
              </div>
            </div>
          </div>
        );
      })}
      {funnel.biggestDropoff && (
        <div className="pt-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-bold text-rose-300">
            Biggest leak: {funnel.biggestDropoff.from} → {funnel.biggestDropoff.to} (−{funnel.biggestDropoff.pct.toFixed(0)}%)
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Palette export for reuse ────────────────────────────────────────────────

export const CHART = { TEAL, INDIGO, ROSE, AMBER };