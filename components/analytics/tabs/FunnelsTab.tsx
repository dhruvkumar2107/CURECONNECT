import React from 'react';
import { Filter, CalendarClock, ShoppingBag } from 'lucide-react';
import { Funnel } from '../../../services/kpiEngine';
import { DashboardProps } from '../types';
import { Card, Tag, EmptyState } from '../ui';
import { FunnelChart } from '../charts';

export const FunnelsTab: React.FC<DashboardProps> = ({ funnels }) => {
  const medFunnel = funnels.find((f) => f.id === 'medicine_funnel');
  const apptFunnel = funnels.find((f) => f.id === 'appointment_funnel');

  if (!medFunnel && !apptFunnel) {
    return <EmptyState title="No funnels" message="No events captured to build conversion funnels." />;
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="grid gap-4 lg:grid-cols-2">
        <FunnelCard
          title="Appointment Booking Funnel"
          subtitle="From landing to completed consultation"
          icon={<CalendarClock className="h-4 w-4 text-rose-300" />}
          funnel={apptFunnel}
        />
        <FunnelCard
          title="Medicine Discovery Funnel"
          subtitle="From landing to completed medicine reservation"
          icon={<ShoppingBag className="h-4 w-4 text-teal-300" />}
          funnel={medFunnel}
        />
      </div>
    </div>
  );
};

const FunnelCard: React.FC<{ title: string; subtitle: string; icon: React.ReactNode; funnel: Funnel | undefined }> = ({ title, subtitle, icon, funnel }) => {
  if (!funnel || !funnel.stages.length) {
    return <Card title={title} subtitle={subtitle}>{icon}<div className="mt-2 text-sm text-slate-500">No data.</div></Card>;
  }
  return (
    <Card title={title} subtitle={subtitle} actions={<Tag tone="indigo"><Filter className="h-3 w-3" /> {funnel.stages.length} stages</Tag>}>
      <FunnelChart funnel={funnel} />
      <table className="mt-5 w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-600">
            <th className="pb-2">Stage</th>
            <th className="pb-2 text-right">Users</th>
            <th className="pb-2 text-right">% prev</th>
            <th className="pb-2 text-right">% of L1</th>
            <th className="pb-2 text-right">Drop-off</th>
          </tr>
        </thead>
        <tbody>
          {funnel.stages.map((s) => (
            <tr key={s.key} className="border-t border-white/5">
              <td className="py-2 font-semibold text-slate-300">{s.label}</td>
              <td className="py-2 text-right font-bold text-white">{Math.round(s.users).toLocaleString()}</td>
              <td className="py-2 text-right text-slate-400">
                {s.conversionToPrev === null ? '—' : `${s.conversionToPrev.toFixed(1)}%`}
              </td>
              <td className="py-2 text-right text-slate-400">{s.cumulativeConversion.toFixed(1)}%</td>
              <td className="py-2 text-right">
                {s.dropoffPct === null
                  ? '—'
                  : <span className="font-bold text-rose-400">−{s.dropoffPct.toFixed(1)}%</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};