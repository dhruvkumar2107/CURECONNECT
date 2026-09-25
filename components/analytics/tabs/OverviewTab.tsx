import React from 'react';
import { Users, CalendarClock, Star, ShoppingBag, Timer, Repeat } from 'lucide-react';
import { DashboardProps } from '../types';
import { Card, StatCard, Tag, EmptyState } from '../ui';
import { LineChart, ChartDatum, DonutChart, FunnelChart, CHART } from '../charts';

const kpiOf = (ctx: DashboardProps['ctx'], id: string) => ctx.kpis.find((k) => k.id === id);
const deltas = (k: { previousValue: number | null; changePct: number | null } | undefined) => {
  if (!k || k.previousValue === null || k.changePct === null) return { delta: undefined, up: true };
  return { delta: `${k.changePct >= 0 ? '+' : ''}${k.changePct.toFixed(1)}%`, up: k.changePct >= 0 };
};

export const OverviewTab: React.FC<DashboardProps> = ({ ctx, patterns, funnels, insights }) => {
  const { agg } = ctx;

  const headline = [
    { label: 'Active Users', value: fmt(agg.activeUsers), kpi: kpiOf(ctx, 'active_users'), icon: <Users className="h-3.5 w-3.5 text-teal-300" />, accent: CHART.TEAL },
    { label: 'New Users', value: fmt(agg.newUsers), kpi: kpiOf(ctx, 'new_users'), icon: <Users className="h-3.5 w-3.5 text-emerald-300" />, accent: '#34d399' },
    { label: 'Sessions', value: fmt(agg.sessions), kpi: kpiOf(ctx, 'sessions'), icon: <Repeat className="h-3.5 w-3.5 text-indigo-300" />, accent: CHART.INDIGO },
    { label: 'Avg Session Duration', value: formatDur(agg.sessionDurationAvg), kpi: kpiOf(ctx, 'avg_session_duration'), icon: <Timer className="h-3.5 w-3.5 text-amber-300" />, accent: CHART.AMBER },
    { label: 'Appt Conversion', value: pct(agg.apptConfirmed, agg.apptStarted), kpi: kpiOf(ctx, 'appt_conversion'), icon: <CalendarClock className="h-3.5 w-3.5 text-rose-300" />, accent: CHART.ROSE },
    { label: 'Order Conversion', value: pct(agg.orderCompleted, agg.orderStarted), kpi: kpiOf(ctx, 'order_conversion'), icon: <ShoppingBag className="h-3.5 w-3.5 text-teal-300" />, accent: CHART.TEAL },
    { label: 'Retention', value: `${ctx.retentionPct.toFixed(1)}%`, kpi: kpiOf(ctx, 'user_retention'), icon: <Star className="h-3.5 w-3.5 text-amber-300" />, accent: CHART.AMBER },
  ];

  const dailyUsers: ChartDatum[] = ctx.trends.map((t) => ({ label: t.label, value: t.users }));
  const dailySearches: ChartDatum[] = ctx.trends.map((t) => ({ label: t.label, value: t.searches }));

  const featureData = patterns.features.slice(0, 6).map((f) => ({ label: shortLabel(f.label), value: f.count }));

  return (
    <div className="space-y-6 page-enter">
      {/* Headline stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {headline.map((h, i) => {
          const d = deltas(h.kpi);
          return (
            <StatCard
              key={h.label}
              label={h.label}
              value={h.value}
              index={h.kpi ? String(kpiIndexOf(ctx, h.kpi.id) + 1) : undefined}
              accent={h.accent}
              icon={h.icon}
              delta={d.delta}
              deltaUp={d.up}
            />
          );
        })}
      </div>

      {/* Trend charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Daily Active Users" subtitle={`Unique users per day · ${ctx.periodLabel}`}>
          <LineChart data={dailyUsers} color={CHART.TEAL} />
        </Card>
        <Card title="Daily Searches" subtitle="Medicine + doctor searches per day">
          <LineChart data={dailySearches} color={CHART.INDIGO} />
        </Card>
      </div>

      {/* Funnel preview + features */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Appointment Funnel" subtitle="Booking journey head, leak & conversion" className="lg:col-span-2">
          {funnels.find((f) => f.id === 'appointment_funnel')
            ? <FunnelChart funnel={funnels.find((f) => f.id === 'appointment_funnel')!} />
            : <EmptyState title="No funnel data" message="No appointment events in this range." />}
        </Card>
        <Card title="Feature Usage" subtitle="Event share by product area">
          <div className="flex flex-col items-center gap-4">
            <DonutChart
              data={featureData}
              centerValue={fmt(patterns.features.reduce((a, b) => a + b.count, 0))}
              centerLabel="events"
            />
            <div className="w-full space-y-1.5">
              {patterns.features.slice(0, 5).map((f) => (
                <div key={f.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 truncate">{shortLabel(f.label)}</span>
                  <span className="text-slate-500 font-semibold">{f.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Insights preview + top searches */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Automated Insights" subtitle={`${insights.length} rule-based findings from the current period`} actions={<Tag tone="teal">Live</Tag>}>
          <div className="space-y-2">
            {insights.slice(0, 3).map((ins) => (
              <div key={ins.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${ins.type === 'warning' ? 'bg-rose-400' : ins.type === 'positive' ? 'bg-emerald-400' : ins.type === 'opportunity' ? 'bg-amber-400' : 'bg-indigo-400'}`} />
                <div>
                  <div className="text-sm font-semibold text-white">{ins.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{ins.observation}</div>
                </div>
              </div>
            ))}
            {!insights.length && <div className="text-sm text-slate-500">No data-driven insights yet.</div>}
          </div>
        </Card>
        <Card title="Top Searched Medicines" subtitle="Most searched medicine names in the period">
          <div className="space-y-2">
            {patterns.topMedicines.slice(0, 8).map((m, i) => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="w-5 text-right text-xs font-bold text-slate-600">{i + 1}</span>
                <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: 'rgba(13,148,136,0.08)' }}>
                  <div className="h-full rounded-md flex items-center px-2 text-xs font-medium text-teal-200"
                    style={{ width: `${Math.max(8, (m.count / (patterns.topMedicines[0]?.count || 1)) * 100)}%`, background: 'linear-gradient(90deg, rgba(13,148,136,0.45), rgba(13,148,136,0.15))' }}>
                    {shortLabel(m.label)}
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-400">{fmt(m.count)}</span>
              </div>
            ))}
            {!patterns.topMedicines.length && <div className="text-sm text-slate-500">No medicine searches in this range.</div>}
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs text-slate-500">
        <span>Dataset: <Tag tone="teal">{ctx.filters.mode.toUpperCase()}</Tag></span>
        <span>Events in period: <b className="text-slate-300">{fmt(ctx.visible.length)}</b> of {fmt(ctx.all.length)} loaded</span>
      </div>
    </div>
  );
};

const fmt = (v: number) => Math.round(v).toLocaleString();
const pct = (num: number, den: number) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : '0%');
const formatDur = (s: number) => {
  if (!s) return '0s';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m ? `${m}m ${sec}s` : `${sec}s`;
};
const shortLabel = (s: string) => (s.length > 24 ? `${s.slice(0, 23)}…` : s);
const kpiIndexOf = (ctx: DashboardProps['ctx'], id: string) => ctx.kpis.findIndex((k) => k.id === id);