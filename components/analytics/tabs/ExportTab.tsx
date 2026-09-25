import React, { useState } from 'react';
import { Download, FileText, FlaskConical, Trash2, Database, Loader2 } from 'lucide-react';
import { DashboardProps } from '../types';
import { Card, Tag, EmptyState } from '../ui';
import { Insight } from '../../../services/insightEngine';
import { Segment, Funnel } from '../../../services/kpiEngine';

export interface ExportTabProps extends DashboardProps {
  realCount: number;
  demoCount: number;
  demoStatus: { loaded: boolean; count: number; loadedAt?: string; label?: string } | null;
  seeding: boolean;
  clearing: boolean;
  onSeedDemo: () => void;
  onClearDemo: () => void;
}

const csvDownload = (filename: string, rows: (string | number)[][]) => {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

export const ExportTab: React.FC<ExportTabProps> = (props) => {
  const { ctx, patterns, funnels, segments, insights, realCount, demoCount, demoStatus, seeding, clearing, onSeedDemo, onClearDemo } = props;
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const exportCsv = () => {
    setExporting('csv');
    csvDownload('cureconnect_kpis.csv', [
      ['#', 'KPI', 'Category', 'Value', 'Display', 'Previous', 'Change %', 'Formula', 'Definition'],
      ...ctx.kpis.map((k, i) => [i + 1, k.name, k.category, k.value, k.display, k.previousValue ?? '—', k.changePct ?? '—', k.formula, k.definition]),
    ]);
    csvDownload('cureconnect_segments.csv', [
      ['Segment', 'Rule', 'Users', '% of Active', 'Avg Sessions', 'Avg Actions', 'Conversion %', 'Description'],
      ...segments.map((s) => [s.segmentName, s.rule, s.totalActive, s.pctOfActive.toFixed(1), s.avgSessions, s.avgActions, s.conversionRate.toFixed(1), s.segmentDescription]),
    ]);
    csvDownload('cureconnect_funnels.csv', [
      ['Funnel', 'Stage', 'Users', 'Events', '% of Previous', '% of First Stage', 'Drop-off %'],
      ...funnels.flatMap((f) => f.stages.map((s) => [f.name, s.label, s.users, s.events, s.conversionToPrev ?? '—', s.cumulativeConversion.toFixed(1), s.dropoffPct ?? '—'])),
    ]);
    csvDownload('cureconnect_insights.csv', [
      ['Type', 'Title', 'Observation', 'Evidence', 'Interpretation', 'Product Action', 'Metric Affected', 'Confidence'],
      ...insights.map((ins) => [ins.type, ins.title, ins.observation, ins.evidence.join('; '), ins.interpretation, ins.productAction, ins.metricAffected, `${(ins.confidence * 100).toFixed(0)}%`]),
    ]);
    csvDownload('cureconnect_patterns.csv', [
      ['Area', 'Label', 'Value'],
      ...patterns.topMedicines.map((m) => ['Top medicine', m.label, m.count]),
      ...patterns.topDoctors.map((d) => ['Top doctor', d.label, d.count]),
      ...patterns.topSpecialties.map((s) => ['Top speciality', s.label, s.count]),
      ...patterns.peakHours.map((h) => ['Peak hour', `${h.hour}:00`, h.count]),
      ...patterns.highDropoffPages.map((p) => ['Exit page', p.page, p.count]),
    ]);
    setTimeout(() => setExporting(null), 600);
  };

  const exportPdf = () => {
    setExporting('pdf');
    const html = buildReportHtml(props);
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 400);
    }
    setTimeout(() => setExporting(null), 600);
  };

  return (
    <div className="space-y-5 page-enter">
      {/* Demo dataset */}
      <Card
        title="Demo Dataset"
        subtitle="Synthetic, seeded and reproducible events for demonstrating the analytics system"
        actions={demoStatus?.loaded ? <Tag tone="teal"><Database className="h-3 w-3" /> {demoCount.toLocaleString()} demo events</Tag> : <Tag tone="amber">Not loaded</Tag>}
      >
        {demoStatus?.loaded && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3 text-xs text-teal-200">
            <Database className="h-4 w-4 shrink-0" />
            <span>{demoStatus.label || 'DEMO DATA — Synthetic academic demonstration data'}. Loaded {demoStatus.count.toLocaleString()} events{demoStatus.loadedAt ? ` at ${demoStatus.loadedAt}` : ''}. These are clearly flagged <code className="mx-1 rounded bg-black/30 px-1 py-0.5">is_demo: true</code> and can be wiped at any time without touching real events.</span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Real events</div>
            <div className="mt-1 text-2xl font-extrabold text-white">{realCount.toLocaleString()}</div>
            <div className="text-[11px] text-slate-600">captured from the live app</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Demo events</div>
            <div className="mt-1 text-2xl font-extrabold text-teal-300">{demoCount.toLocaleString()}</div>
            <div className="text-[11px] text-slate-600">seeded synthetic dataset</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Visible in period</div>
            <div className="mt-1 text-2xl font-extrabold text-indigo-300">{ctx.visible.length.toLocaleString()}</div>
            <div className="text-[11px] text-slate-600">after current filters</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={onSeedDemo} disabled={seeding || demoStatus?.loaded} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
            {demoStatus?.loaded ? 'Demo dataset loaded' : 'Load Demo Dataset'}
          </button>
          <button onClick={onClearDemo} disabled={clearing || !demoStatus?.loaded} className="btn-danger px-4 py-2 text-sm disabled:opacity-50">
            {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Clear demo events
          </button>
        </div>
      </Card>

      {/* Exports */}
      <Card title="Export the Analytics Report" subtitle="CSV downloads for raw analysis, or a printable HTML report for PDF">
        {ctx.visible.length === 0 ? (
          <EmptyState title="Nothing to export yet" message="Load the demo dataset or generate real activity first." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={exportCsv} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 text-left hover:bg-white/[0.06] transition-colors card-hover">
              {exporting === 'csv' ? <Loader2 className="h-6 w-6 animate-spin text-teal-400" /> : <Download className="h-6 w-6 text-teal-400" />}
              <div className="mt-2 font-bold text-white">Download as CSV</div>
              <div className="mt-1 text-xs text-slate-500">5 files: KPIs, Segments, Funnels, Insights and Behavioural Patterns.</div>
            </button>
            <button onClick={exportPdf} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 text-left hover:bg-white/[0.06] transition-colors card-hover">
              {exporting === 'pdf' ? <Loader2 className="h-6 w-6 animate-spin text-indigo-400" /> : <FileText className="h-6 w-6 text-indigo-400" />}
              <div className="mt-2 font-bold text-white">Print report as PDF</div>
              <div className="mt-1 text-xs text-slate-500">Opens a formatted report in a new window — use the browser's Save as PDF.</div>
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── HTML report builder for PDF export ──────────────────────────────────────

const esc = (s: string) => String(s ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&(?!lt;|gt;|amp;)/g, '&amp;');

const buildReportHtml = (p: ExportTabProps): string => {
  const { ctx, patterns, funnels, segments, insights } = p;
  const now = new Date().toLocaleString();

  const kpiRows = ctx.kpis.map(
    (k, i) => `<tr><td class="num">${i + 1}</td><td><b>${esc(k.name)}</b></td><td>${esc(k.category)}</td><td class="num">${esc(k.display)}</td><td class="num">${k.changePct !== null ? (k.changePct >= 0 ? '+' : '') + k.changePct.toFixed(1) + '%' : '—'}</td><td class="small">${esc(k.formula)}</td></tr>`,
  ).join('');

  const funnelHtml = (f: Funnel | undefined): string => {
    if (!f) return '';
    const rows = f.stages.map((s, i) => `${i === 0 ? '100%' : (s.conversionToPrev ?? 0).toFixed(0) + '% of prev'} → <b>${esc(s.label)}</b> (${s.users} users, ${s.cumulativeConversion.toFixed(0)}% of start)`).join('<br>');
    return `<div class="funbox"><h3>${esc(f.name)}</h3><p class="small">${esc(f.description)}</p><p>${rows}</p>${f.biggestDropoff ? `<p class="warn">Biggest leak: ${esc(f.biggestDropoff.from)} → ${esc(f.biggestDropoff.to)} (−${f.biggestDropoff.pct.toFixed(0)}%)</p>` : ''}</div>`;
  };

  const segHtml = segments.length
    ? `<table><thead><tr><th>Segment</th><th class="num">Users</th><th class="num">% Active</th><th class="num">Conv %</th></tr></thead><tbody>${segments.map((s) => `<tr><td>${esc(s.segmentName)}</td><td class="num">${s.totalActive}</td><td class="num">${s.pctOfActive.toFixed(1)}%</td><td class="num">${s.conversionRate.toFixed(1)}%</td></tr>`).join('')}</tbody></table>`
    : '<p class="muted">No segments computed.</p>';

  const insHtml = insights.map((ins: Insight) => `<div class="ins"><p><b>[${ins.type.toUpperCase()}]</b> ${esc(ins.title)}</p><p class="small">${esc(ins.observation)}</p><p class="small">${esc(ins.interpretation)}<br><b>Action:</b> ${esc(ins.productAction)}</p></div>`).join('') || '<p class="muted">No insights in this period.</p>';

  const patternsHtml = `
    <div class="row">
      <div class="col"><h3>Top medicines searched</h3><p class="small">${patterns.topMedicines.slice(0, 6).map((m) => `${esc(m.label)} (${m.count})`).join(' · ')}</p></div>
      <div class="col"><h3>Top doctors</h3><p class="small">${patterns.topDoctors.slice(0, 6).map((d) => `${esc(d.label)} (${d.count})`).join(' · ')}</p></div>
      <div class="col"><h3>Peak hours</h3><p class="small">${patterns.peakHours.slice().sort((a, b) => b.count - a.count).slice(0, 4).map((h) => `${h.hour}:00 (${h.count})`).join(' · ')}</p></div>
    </div>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>CureConnect Analytics Report</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a2438; margin: 28px; font-size: 12px; }
  h1 { font-size: 22px; margin: 0; } h2 { font-size: 15px; margin: 22px 0 8px; border-bottom: 2px solid #0d9488; padding-bottom: 4px; color:#0f766e; }
  h3 { font-size: 12px; margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #d7dee8; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f0f5f5; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .num { text-align: right; white-space: nowrap; } .small { font-size: 10px; color: #52606d; }
  .muted { color: #8a97a8; } .warn { color: #b91c1c; font-weight: 600; }
  .row { display: flex; gap: 16px; } .col { flex: 1; background: #f8faf9; border: 1px solid #e2e8ea; border-radius: 6px; padding: 8px; }
  .funbox { background: #f8faf9; border: 1px solid #e2e8ea; border-radius: 6px; padding: 8px; margin-bottom: 8px; }
  .ins { background: #f8faf9; border: 1px solid #e2e8ea; border-radius: 6px; padding: 6px 8px; margin-bottom: 6px; }
  .meta { font-size: 10px; color: #8a97a8; margin-top: 2px; }
  .note { font-size: 10px; color: #8a97a8; margin-top: 20px; border-top: 1px solid #d7dee8; padding-top: 8px; }
</style></head><body>
<h1>CureConnect — Product Analytics Report</h1>
<p class="meta">Generated ${esc(now)} · Period ${esc(ctx.periodLabel)} · Mode ${esc(ctx.filters.mode)} · ${ctx.visible.length.toLocaleString()} events analysed · Previous ${esc(ctx.previousLabel)}</p>
<h2>KPI Summary (${ctx.kpis.length} KPIs)</h2>
<table><thead><tr><th>#</th><th>KPI</th><th>Category</th><th class="num">Value</th><th class="num">Change</th><th>Formula</th></tr></thead><tbody>${kpiRows}</tbody></table>
<h2>Conversion Funnels</h2>
<div class="row">${funnelHtml(funnels.find((f) => f.id === 'appointment_funnel'))}${funnelHtml(funnels.find((f) => f.id === 'medicine_funnel'))}</div>
<h2>Behavioural Segments</h2>${segHtml}
<h2>Behavioural Patterns</h2>${patternsHtml}
<p class="small">Appointment abandonment: ${patterns.apptAbandonment.rate.toFixed(1)}% (${patterns.apptAbandonment.confirmed}/${patterns.apptAbandonment.started} confirmed) · Medicine-search abandonment: ${patterns.medAbandonment.rate.toFixed(1)}% (${patterns.medAbandonment.ordersStarted}/${patterns.medAbandonment.searches} orders).</p>
<h2>Automated Insights (${insights.length})</h2>${insHtml}
<p class="note">Academic demonstration dataset for MSE-1. Footer: produced live from Cloud Firestore analytics_events; demo events flagged is_demo.</p>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body></html>`;
};