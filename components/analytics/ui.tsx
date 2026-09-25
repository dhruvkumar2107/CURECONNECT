import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

// ─── Card ────────────────────────────────────────────────────────────────────

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  pad?: boolean;
}> = ({ children, className = '', title, subtitle, actions, pad = true }) => (
  <div className={`surface rounded-2xl ${pad ? 'p-5' : ''} ${className}`}>
    {(title || actions) && (
      <div className={`flex items-start justify-between gap-3 ${pad ? 'mb-4' : 'px-5 pt-4'}`}>
        <div>
          {title && <h3 className="text-sm font-bold tracking-wide text-white">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
    )}
    {children}
  </div>
);

// ─── Stat card ───────────────────────────────────────────────────────────────

export const StatCard: React.FC<{
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  deltaLabel?: string;
  index?: string;
  accent?: string;
  icon?: React.ReactNode;
}> = ({ label, value, delta, deltaUp = true, deltaLabel = 'vs prev period', index, accent = '#2dd4bf', icon }) => (
  <div className="surface rounded-2xl p-5 relative overflow-hidden card-hover">
    <div className="absolute top-0 left-0 h-full w-0.5" style={{ background: accent }} />
    {index && (
      <div className="absolute top-3 right-4 text-[10px] font-bold text-slate-600">
        KPI #{index}
      </div>
    )}
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
      {icon}
      {label}
    </div>
    <div className="mt-2 text-[26px] font-extrabold leading-none text-white" style={{ color: index ? '#f0f4ff' : undefined }}>
      {value}
    </div>
    {delta ? (
      <div className="mt-2 flex items-center gap-1 text-xs">
        {deltaUp ? (
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
        )}
        <span className={deltaUp ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>{delta}</span>
        <span className="text-slate-600">{deltaLabel}</span>
      </div>
    ) : (
      <div className="mt-2 text-xs text-slate-600">No prior-period sample</div>
    )}
  </div>
);

// ─── Tab bar ─────────────────────────────────────────────────────────────────

export interface TabDef {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export const TabBar: React.FC<{ tabs: TabDef[]; active: string; onChange: (id: string) => void }> = ({ tabs, active, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {tabs.map((t) => {
      const on = t.id === active;
      return (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 ${
            on
              ? 'bg-teal-600/20 border border-teal-500/40 text-teal-200 glow-teal-sm'
              : 'bg-white/[0.03] border border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      );
    })}
  </div>
);

// ─── Tag ─────────────────────────────────────────────────────────────────────

export const Tag: React.FC<{ children: React.ReactNode; tone?: 'teal' | 'rose' | 'amber' | 'indigo' }> = ({ children, tone = 'teal' }) => {
  const map = {
    teal: 'badge-teal',
    rose: 'badge-rose',
    amber: 'badge-amber',
    indigo: 'badge-indigo',
  };
  return <span className={`badge ${map[tone]}`}>{children}</span>;
};

// ─── Empty / loading states ──────────────────────────────────────────────────

export const EmptyState: React.FC<{ title: string; message: string; cta?: React.ReactNode }> = ({ title, message, cta }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
    <div className="text-3xl">📊</div>
    <h4 className="font-bold text-white">{title}</h4>
    <p className="max-w-sm text-sm text-slate-500">{message}</p>
    {cta}
  </div>
);

export const SkeletonRows: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-2.5">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-10 rounded-xl skeleton" />
    ))}
  </div>
);

// ─── Insight card ────────────────────────────────────────────────────────────

export const InsightCard: React.FC<{
  type: 'warning' | 'opportunity' | 'positive' | 'info';
  title: string;
  observation: string;
  evidence: string[];
  interpretation: string;
  action: string;
  metric: string;
  confidence: number;
}> = ({ type, title, observation, evidence, interpretation, action, metric, confidence }) => {
  const conf = Math.round(confidence * 100);
  const tone = {
    warning: { icon: <AlertTriangle className="h-4 w-4" />, cls: 'border-rose-500/30', chip: 'text-rose-300 bg-rose-500/10', label: 'Warning' },
    opportunity: { icon: <TrendingUp className="h-4 w-4" />, cls: 'border-amber-500/30', chip: 'text-amber-300 bg-amber-500/10', label: 'Opportunity' },
    positive: { icon: <CheckCircle2 className="h-4 w-4" />, cls: 'border-emerald-500/30', chip: 'text-emerald-300 bg-emerald-500/10', label: 'Positive signal' },
    info: { icon: <Info className="h-4 w-4" />, cls: 'border-indigo-500/30', chip: 'text-indigo-300 bg-indigo-500/10', label: 'Observation' },
  }[type];

  return (
    <div className={`surface border-l-2 rounded-2xl p-5 ${tone.cls}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white">
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg ${tone.chip}`}>{tone.icon}</span>
          <h4 className="text-sm font-bold">{title}</h4>
        </div>
        <span className="badge-indigo badge">{conf}% conf</span>
      </div>
      <p className="mt-3 text-sm text-slate-300">{observation}</p>
      <ul className="mt-2 space-y-1">
        {evidence.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal-400" />
            {e}
          </li>
        ))}
      </ul>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Interpretation</div>
          <div className="mt-1 text-xs text-slate-300">{interpretation}</div>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Product action</div>
          <div className="mt-1 text-xs text-slate-300">{action}</div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-slate-600">Affects metric: <span className="text-slate-400 font-semibold">{metric}</span></div>
    </div>
  );
};

// ─── Progress bar ────────────────────────────────────────────────────────────

export const ProgressBar: React.FC<{ pct: number; color?: string; label?: string }> = ({ pct, color = '#2dd4bf', label }) => (
  <div>
    {label && (
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-500 font-semibold">{pct.toFixed(1)}%</span>
      </div>
    )}
    <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  </div>
);

// ─── Select wrapper (filter controls) ────────────────────────────────────────

export const FilterSelect: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
  <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
    {label}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input-dark !py-2 !text-[13px] font-semibold normal-case tracking-normal cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#080f22]">{o.label}</option>
      ))}
    </select>
  </label>
);