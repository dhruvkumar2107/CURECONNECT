import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { DashboardProps } from '../types';
import { Card, Tag, EmptyState, InsightCard } from '../ui';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'warning', label: 'Warnings' },
  { id: 'opportunity', label: 'Opportunities' },
  { id: 'positive', label: 'Positive' },
  { id: 'info', label: 'Observations' },
] as const;

export const InsightsTab: React.FC<DashboardProps> = ({ insights }) => {
  const [filter, setFilter] = useState<string>('all');

  if (!insights.length) {
    return <EmptyState title="No automated insights detected" message="Rules fire only when the data supports them. Load the demo dataset for a full run." />;
  }

  const counts = {
    warning: insights.filter((i) => i.type === 'warning').length,
    opportunity: insights.filter((i) => i.type === 'opportunity').length,
    positive: insights.filter((i) => i.type === 'positive').length,
    info: insights.filter((i) => i.type === 'info').length,
  };

  const shown = insights.filter((i) => filter === 'all' || i.type === filter);

  return (
    <div className="space-y-5 page-enter">
      <Card
        title="Automated Insight Engine"
        subtitle="Rule-based findings computed live from the current period — thresholds, evidence and recommended product actions"
        actions={<Tag tone="teal"><Sparkles className="h-3 w-3" /> {insights.length} insights</Tag>}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setFilter('all')} className={chip('all' === filter)}>
            All <span className="ml-1 text-slate-500">{insights.length}</span>
          </button>
          {FILTERS.slice(1).map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={chip(filter === f.id)}>
              {f.label} <span className="ml-1 text-slate-500">{counts[f.id as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map((ins) => (
          <InsightCard
            key={ins.id}
            type={ins.type}
            title={ins.title}
            observation={ins.observation}
            evidence={ins.evidence}
            interpretation={ins.interpretation}
            action={ins.productAction}
            metric={ins.metricAffected}
            confidence={ins.confidence}
          />
        ))}
      </div>
    </div>
  );
};

const chip = (on: boolean) =>
  `rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 border ${
    on
      ? 'bg-teal-600/20 border-teal-500/40 text-teal-200'
      : 'bg-white/[0.03] border-white/5 text-slate-400 hover:text-slate-200'
  }`;