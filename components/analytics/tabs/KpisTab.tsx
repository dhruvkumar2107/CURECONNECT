import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DashboardProps } from '../types';
import { KPI } from '../../../services/kpiEngine';
import { Card, Tag, EmptyState } from '../ui';
import { Sparkline } from '../charts';

const CATEGORY_ORDER: KPI['category'][] = ['Audience', 'Discovery', 'Appointments', 'Medicines', 'Conversion'];
const CATEGORY_TONE: Record<KPI['category'], 'teal' | 'indigo' | 'rose' | 'amber'> = {
  Audience: 'teal',
  Discovery: 'indigo',
  Appointments: 'rose',
  Medicines: 'amber',
  Conversion: 'teal',
};

const fmtDelta = (k: KPI): { text: string; up: boolean } | null => {
  if (k.previousValue === null || k.changePct === null) return null;
  return { text: `${k.changePct >= 0 ? '+' : ''}${k.changePct.toFixed(1)}%`, up: k.changePct >= 0 };
};

export const KpisTab: React.FC<DashboardProps> = ({ ctx }) => {
  const [cat, setCat] = useState<'all' | KPI['category']>('all');
  const [open, setOpen] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const rows = cat === 'all' ? ctx.kpis : ctx.kpis.filter((k) => k.category === cat);
    const g: { cat: KPI['category']; kpis: KPI[] }[] = [];
    CATEGORY_ORDER.forEach((c) => {
      const list = rows.filter((k) => k.category === c);
      if (list.length) g.push({ cat: c, kpis: list });
    });
    return g;
  }, [ctx.kpis, cat]);

  if (!ctx.kpis.some((k) => k.hasData)) {
    return <EmptyState title="No KPI data" message="Load the demo dataset or reset the filters to compute the 28 KPIs." />;
  }

  return (
    <div className="space-y-5 page-enter">
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setCat('all')} className={chip('all' === cat)}>All 28 KPIs</button>
        {CATEGORY_ORDER.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>
        ))}
      </div>

      {grouped.map((g) => (
        <div key={g.cat}>
          <h3 className="mb-3 text-sm font-bold tracking-wide text-white">
            {g.cat} <span className="text-slate-600 font-medium">· {g.kpis.length} KPIs</span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {g.kpis.map((k) => {
              const d = fmtDelta(k);
              const isOpen = open === k.id;
              return (
                <div key={k.id} className={`surface rounded-2xl p-4 transition-all duration-200 ${isOpen ? 'border-teal-500/30' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <Tag tone={CATEGORY_TONE[k.category]}>{k.category}</Tag>
                    <span className="text-[10px] font-bold text-slate-600">#{String(ctx.kpis.findIndex((x) => x.id === k.id) + 1)}</span>
                  </div>
                  <div className="mt-2 text-sm font-bold text-white leading-tight">{k.name}</div>
                  <div className="mt-1.5 flex items-end justify-between gap-2">
                    <div>
                      <div className="text-2xl font-extrabold text-white">{k.display}</div>
                      {d ? (
                        <div className={`text-xs font-bold ${d.up ? 'text-emerald-400' : 'text-rose-400'}`}>{d.text}</div>
                      ) : (
                        <div className="text-[11px] text-slate-600">no prev sample</div>
                      )}
                    </div>
                    <div className="w-24 shrink-0">
                      <Sparkline data={k.trend} />
                    </div>
                  </div>

                  <button
                    onClick={() => setOpen(isOpen ? null : k.id)}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    {isOpen ? 'Hide' : 'Definition & formula'}
                  </button>

                  {isOpen && (
                    <div className="mt-3 space-y-3 border-t border-white/5 pt-3 text-xs cursor-default">
                      <p className="text-slate-400 leading-relaxed">{k.definition}</p>
                      <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                        <div className="font-bold text-teal-300 text-[11px] uppercase tracking-wider mb-1">Formula</div>
                        <code className="text-slate-300 break-words">{k.formula}</code>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-white/[0.03] p-2.5">
                          <div className="text-[10px] uppercase tracking-wider text-slate-600">Numerator</div>
                          <div className="mt-0.5 text-slate-300">{k.numerator}</div>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-2.5">
                          <div className="text-[10px] uppercase tracking-wider text-slate-600">Denominator</div>
                          <div className="mt-0.5 text-slate-300">{k.denominator}</div>
                        </div>
                      </div>
                      <p className="text-slate-400 leading-relaxed"><span className="text-slate-500 font-bold">Interpretation:</span> {k.interpretation}</p>
                      <p className="text-slate-400 leading-relaxed"><span className="text-slate-500 font-bold">Why it matters:</span> {k.whyMatters}</p>
                      {k.previousValue !== null && (
                        <p className="text-slate-500">Previous: <b className="text-slate-300">{fmtPrev(k)}</b></p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const chip = (on: boolean) =>
  `rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 border ${
    on
      ? 'bg-teal-600/20 border-teal-500/40 text-teal-200'
      : 'bg-white/[0.03] border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
  }`;

const fmtPrev = (k: KPI): string => {
  const v = k.previousValue ?? 0;
  if (k.unit === '%') return `${v.toFixed(1)}%`;
  if (k.unit === 'sec') return `${Math.round(v)}s`;
  if (k.unit === 'ratio') return v.toFixed(2);
  return Math.round(v).toLocaleString();
};