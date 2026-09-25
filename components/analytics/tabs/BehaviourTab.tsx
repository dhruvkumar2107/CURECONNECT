import React from 'react';
import { Clock, CalendarDays, Search, MonitorSmartphone, DoorOpen, MapPin } from 'lucide-react';
import { DashboardProps } from '../types';
import { Card, Tag, EmptyState, ProgressBar } from '../ui';
import { BarChart, ChartDatum, DonutChart, CHART } from '../charts';

export const BehaviourTab: React.FC<DashboardProps> = ({ ctx, patterns }) => {
  const hasData = ctx.visible.length > 0;

  const peakHourData: ChartDatum[] = patterns.peakHours.map((h) => ({ label: `${h.hour}`, value: h.count }));
  const peakDayData: ChartDatum[] = patterns.peakDays.map((d) => ({ label: d.label.slice(0, 3), value: d.count, color: CHART.INDIGO }));
  const deviceData = patterns.mobileVsDesktop.map((d) => ({ label: cap(d.device), value: d.sessions, color: d.device === 'mobile' ? CHART.TEAL : CHART.INDIGO }));
  const searchPattern = patterns.searchPatterns.map((s) => ({ label: s.label, value: s.count }));

  if (!hasData) {
    return <EmptyState title="No behavioural data" message="Load the demo dataset to see user behaviour patterns." />;
  }

  return (
    <div className="space-y-5 page-enter">
      {/* Peak hours + days */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Peak Activity Hours" subtitle="Event volume across the 24-hour clock" actions={<Tag tone="amber"><Clock className="h-3 w-3" /> Peak hours</Tag>}>
          <BarChart data={peakHourData} color={CHART.AMBER} />
        </Card>
        <Card title="Activity by Day of Week" subtitle="Distribution of events across the week">
          <BarChart data={peakDayData} color={CHART.INDIGO} />
        </Card>
      </div>

      {/* Devices & search behaviour */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Device Mix" subtitle="Sessions by device type">
          {deviceData.length ? <BarChart data={deviceData} color={CHART.TEAL} /> : <EmptyState title="No data" message="No device-dimensioned sessions." />}
          <div className="mt-3 space-y-2">
            {patterns.mobileVsDesktop.map((md) => (
              <ProgressBar
                key={md.device}
                label={`${cap(md.device)} conversion`}
                pct={md.conversionRate}
                color={md.device === 'mobile' ? CHART.TEAL : CHART.INDIGO}
              />
            ))}
          </div>
        </Card>
        <Card title="Search Query Length" subtitle="Pattern of how users type searches">
          <div className="flex flex-col items-center gap-4">
            <DonutChart data={searchPattern} centerValue={fmt(patterns.searchPatterns.reduce((a, b) => a + b.count, 0))} centerLabel="searches" />
            {patterns.searchPatterns.map((s) => (
              <div key={s.label} className="flex w-full items-center justify-between text-xs">
                <span className="text-slate-400 truncate pr-2">{s.label}</span>
                <span className="text-slate-500 font-semibold shrink-0">{fmt(s.count)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Returning vs New" subtitle="Engagement & conversion by user freshness">
          {patterns.returningVsNew.map((g) => (
            <div key={g.group} className="rounded-xl border border-white/5 bg-white/[0.03] p-3 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{g.group}</span>
                <Tag tone={g.group === 'Returning Users' ? 'indigo' : 'teal'}>{g.conversionRate.toFixed(1)}% conv</Tag>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-500">Avg actions <b className="text-slate-300 float-right">{g.avgActions}</b></div>
                <div className="text-slate-500">Sessions <b className="text-slate-300 float-right">{g.sessions}</b></div>
              </div>
            </div>
          ))}
          {!ctx.visible.length && <div className="text-sm text-slate-500">No data</div>}
        </Card>
      </div>

      {/* Exits + top conversion pages */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Top Exit Pages" subtitle="Where non-converting sessions end" actions={<Tag tone="rose"><DoorOpen className="h-3 w-3" /> Drop-off</Tag>}>
          <div className="space-y-2.5">
            {patterns.highDropoffPages.map((p) => (
              <div key={p.page} className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-300 flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-rose-400" />{p.page}</span>
                <span className="text-xs font-bold text-slate-500">{p.count} sessions</span>
              </div>
            ))}
            {!patterns.highDropoffPages.length && <div className="text-sm text-slate-500">No exit patterns.</div>}
          </div>
        </Card>
        <Card title="Highest-Converting Pages" subtitle="Pages most likely to precede a completed goal" actions={<Tag tone="teal"><Search className="h-3 w-3" /> Champs</Tag>}>
          <div className="space-y-2.5">
            {patterns.highConversionPages.map((p) => (
              <div key={p.page} className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-300 flex items-center gap-2"><Search className="h-3.5 w-3.5 text-teal-400" />{p.page}</span>
                <span className="text-xs font-bold text-emerald-400">{p.entrance ? ((p.conversions / p.entrance) * 100).toFixed(0) : 0}% · {p.conversions}/{p.entrance}</span>
              </div>
            ))}
            {!patterns.highConversionPages.length && <div className="text-sm text-slate-500">Not enough data to rank pages.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
};

const fmt = (v: number) => Math.round(v).toLocaleString();
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown');