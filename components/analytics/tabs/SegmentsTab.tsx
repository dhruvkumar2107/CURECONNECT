import React, { useMemo, useState } from 'react';
import { Users2, Target, MousePointerClick, Repeat } from 'lucide-react';
import { DashboardProps } from '../types';
import { Card, Tag, EmptyState, ProgressBar } from '../ui';
import { CHART } from '../charts';

export const SegmentsTab: React.FC<DashboardProps> = ({ segments, ctx }) => {
  const [sel, setSel] = useState<string>('new_users');

  const selected = useMemo(() => {
    if (!segments.length) return null;
    return segments.filter((s) => s.segmentId === sel);
  }, [segments, sel]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof segments>();
    segments.forEach((s) => {
      if (!m.has(s.segmentId)) m.set(s.segmentId, []);
      m.get(s.segmentId)!.push(s);
    });
    return Array.from(m.entries());
  }, [segments]);

  if (!groups.length) {
    return <EmptyState title="No segments" message="Load the demo dataset to see behavioural user segments." />;
  }

  return (
    <div className="space-y-5 page-enter">
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Definition list */}
        <Card title="Segments" subtitle={`${ctx.agg.activeUsers} active users segmented`} className="lg:col-span-2" pad={false}>
          <div className="max-h-[560px] overflow-y-auto p-2">
            {groups.map(([id, rows]) => {
              const total = rows.length;
              const convAvg = rows.length ? rows.reduce((a, b) => a + b.conversionRate, 0) / rows.length : 0;
              return (
                <button
                  key={id}
                  onClick={() => setSel(id)}
                  className={`mb-1.5 w-full rounded-xl border p-3 text-left transition-all duration-200 ${
                    sel === id
                      ? 'border-teal-500/40 bg-teal-500/10'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{rows[0]?.segmentName || id}</span>
                    <Tag tone="teal">{total}</Tag>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">{rows[0]?.segmentDescription}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                    <code className="rounded bg-black/30 px-1.5 py-0.5 text-teal-300 font-semibold">{rows[0]?.rule}</code>
                    <span className="ml-auto font-bold text-slate-300">{convAvg.toFixed(1)}% conv</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Members */}
        <Card title="Segment Members" subtitle="Individual users matching the selected rule" className="lg:col-span-3" pad={false}>
          <div className="p-4">
            {selected && selected.length > 0 ? (
              <>
                {/* Segment-level stats */}
                <div className="mb-4 grid gap-2 sm:grid-cols-4">
                  {[
                    { label: 'Users', value: fmt(selected.length), icon: <Users2 className="h-3.5 w-3.5 text-teal-300" />, color: CHART.TEAL },
                    { label: '% of active', value: `${((selected.length / ctx.agg.activeUsers) * 100).toFixed(1)}%`, icon: <Target className="h-3.5 w-3.5 text-indigo-300" />, color: CHART.INDIGO },
                    { label: 'Avg sessions', value: (selected[0]?.avgSessions ?? 0).toFixed(2), icon: <Repeat className="h-3.5 w-3.5 text-amber-300" />, color: CHART.AMBER },
                    { label: 'Conversion', value: `${(selected[0]?.conversionRate ?? 0).toFixed(1)}%`, icon: <MousePointerClick className="h-3.5 w-3.5 text-rose-300" />, color: CHART.ROSE },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.icon}{s.label}</div>
                      <div className="mt-1 text-xl font-extrabold text-white">{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-600">
                        <th className="pb-2">User</th>
                        <th className="pb-2 text-right">Actions</th>
                        <th className="pb-2 text-right">Sessions</th>
                        <th className="pb-2 text-right">Searches</th>
                        <th className="pb-2 text-right">Appts</th>
                        <th className="pb-2 text-right">Orders</th>
                        <th className="pb-2 text-right">Goal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.slice(0, 30).map((s) => (
                        <tr key={s.id} className="border-t border-white/5">
                          <td className="py-2 pr-2">
                            <div className="flex items-center gap-2">
                              <span className={`h-1.5 w-1.5 rounded-full ${s.isGuest ? 'bg-slate-500' : 'bg-teal-400'}`} />
                              <span className="font-semibold text-slate-300 truncate max-w-[120px]">{shortId(s.id)}</span>
                            </div>
                          </td>
                          <td className="py-2 text-right text-slate-400">{s.actions}</td>
                          <td className="py-2 text-right text-slate-400">{s.sessions}</td>
                          <td className="py-2 text-right text-slate-400">{s.searches}</td>
                          <td className="py-2 text-right text-slate-400">{s.apptStarted > 0 ? `${s.apptConfirmed}/${s.apptStarted}` : '—'}</td>
                          <td className="py-2 text-right text-slate-400">{s.orderStarted > 0 ? `${s.orderCompleted}/${s.orderStarted}` : '—'}</td>
                          <td className="py-2 text-right">
                            {s.hasGoal ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-slate-600">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selected.length > 30 && <div className="mt-2 text-[11px] text-slate-500">Showing 30 of {selected.length} members.</div>}
                </div>

                <div className="mt-4">
                  <ProgressBar label={`Segment conversion rate (${selected[0]?.conversionRate.toFixed(1)}%)`} pct={selected[0]?.conversionRate ?? 0} color={CHART.TEAL} />
                </div>
              </>
            ) : (
              <EmptyState title="Empty segment" message="No users match this rule in the current period." />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const fmt = (v: number) => Math.round(v).toLocaleString();
const shortId = (id: string) => (id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id);