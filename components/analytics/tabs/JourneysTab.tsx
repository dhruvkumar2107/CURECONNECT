import React from 'react';
import { GitBranch, Stethoscope, Pill, Activity, TrendingDown } from 'lucide-react';
import { DashboardProps } from '../types';
import { Card, Tag, EmptyState } from '../ui';
import { CHART } from '../charts';

export const JourneysTab: React.FC<DashboardProps> = ({ ctx, patterns }) => {
  const hasData = ctx.visible.length > 0;
  if (!hasData) {
    return <EmptyState title="No journey data" message="Load the demo dataset to visualise user flows." />;
  }

  return (
    <div className="space-y-5 page-enter">
      {/* User flow visualization */}
      <Card
        title="Most Common User Flows"
        subtitle="Ordered page sequences per session (8 steps max) with goal completion share"
        actions={<Tag tone="indigo"><GitBranch className="h-3 w-3" /> Flow visualisation</Tag>}
      >
        <div className="space-y-3">
          {patterns.navPaths.map((p, i) => {
            const convPct = p.count ? (p.goals / p.count) * 100 : 0;
            return (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center gap-0">
                  {p.path.map((step, j) => (
                    <React.Fragment key={j}>
                      {j > 0 && <span className="mx-1.5 text-teal-500/60">→</span>}
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          goalPage(step)
                            ? 'bg-teal-500/15 border border-teal-500/30 text-teal-200'
                            : 'bg-white/[0.04] border border-white/5 text-slate-300'
                        }`}
                      >
                        {step}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">{p.count} session{p.count === 1 ? '' : 's'} followed this path</span>
                  <Tag tone={convPct >= 30 ? 'teal' : convPct > 0 ? 'amber' : 'rose'}>
                    {p.goals} reached a goal · {convPct.toFixed(0)}%
                  </Tag>
                </div>
              </div>
            );
          })}
          {!patterns.navPaths.length && <div className="text-sm text-slate-500">No page-view sequences captured.</div>}
        </div>
      </Card>

      {/* Demand analysis */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Top Doctors" subtitle="Most viewed doctor profiles" actions={<Tag tone="teal"><Stethoscope className="h-3 w-3" /> Demand</Tag>}>
          <DemandList
            items={patterns.topDoctors.map((d) => ({ label: d.label, count: d.count }))}
            color={CHART.TEAL}
            empty="No doctor profile views."
          />
        </Card>
        <Card title="Top Specialties" subtitle="Most browsed specialities" actions={<Tag tone="indigo"><Activity className="h-3 w-3" /> Demand</Tag>}>
          <DemandList
            items={patterns.topSpecialties.map((s) => ({ label: s.label, count: s.count }))}
            color={CHART.INDIGO}
            empty="No speciality selections."
          />
        </Card>
        <Card title="Top Medicines Searched" subtitle="Highest search-volume medicines" actions={<Tag tone="amber"><Pill className="h-3 w-3" /> Demand</Tag>}>
          <DemandList
            items={patterns.topMedicines.map((m) => ({ label: m.label, count: m.count }))}
            color={CHART.AMBER}
            empty="No medicine searches."
          />
        </Card>
      </div>

      {/* Abandonment summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Appointment Abandonment" subtitle="Users who start a booking but never confirm" actions={<Tag tone="rose"><TrendingDown className="h-3 w-3" /> {patterns.apptAbandonment.rate.toFixed(0)}%</Tag>}>
          <AbandonmentBar
            started={patterns.apptAbandonment.started}
            completed={patterns.apptAbandonment.confirmed}
            label="Started vs confirmed appointments"
            color={CHART.ROSE}
          />
        </Card>
        <Card title="Medicine Search → Order Abandonment" subtitle="Searches that never become an order" actions={<Tag tone="rose"><TrendingDown className="h-3 w-3" /> {patterns.medAbandonment.rate.toFixed(0)}%</Tag>}>
          <AbandonmentBar
            started={patterns.medAbandonment.searches}
            completed={patterns.medAbandonment.ordersStarted}
            label="Medicine searches vs orders started"
            color={CHART.AMBER}
          />
        </Card>
      </div>
    </div>
  );
};

const DemandList: React.FC<{ items: { label: string; count: number }[]; color: string; empty: string }> = ({ items, color, empty }) => {
  if (!items.length) return <div className="text-sm text-slate-500">{empty}</div>;
  const max = items[0].count || 1;
  return (
    <div className="space-y-2.5">
      {items.slice(0, 7).map((it, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-4 text-right text-xs font-bold text-slate-600 shrink-0">{i + 1}</span>
          <div className="h-6 flex-1 overflow-hidden rounded-md" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div
              className="flex h-full items-center rounded-md px-2 text-xs font-medium text-white"
              style={{ width: `${Math.max(10, (it.count / max) * 100)}%`, background: `linear-gradient(90deg, ${color}55, ${color}22)` }}
            >
              <span className="truncate">{it.label}</span>
            </div>
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-bold text-slate-400">{fmt(it.count)}</span>
        </div>
      ))}
    </div>
  );
};

const AbandonmentBar: React.FC<{ started: number; completed: number; label: string; color: string }> = ({ started, completed, label, color }) => {
  const pctDone = started ? (completed / started) * 100 : 0;
  return (
    <div className="space-y-3">
      <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.05]">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pctDone}%`, background: color }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-bold text-slate-300">{fmt(completed)} of {fmt(started)}</span>
      </div>
    </div>
  );
};

const fmt = (v: number) => Math.round(v).toLocaleString();
const goalPage = (step: string): boolean =>
  ['Cart', 'Consult', 'Checkout', 'Confirm', 'Teleconsultation'].some((s) => step.toLowerCase().includes(s.toLowerCase()));