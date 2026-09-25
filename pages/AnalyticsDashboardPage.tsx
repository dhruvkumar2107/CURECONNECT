import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Gauge, Activity, Filter, Users2, GitBranch, Sparkles,
  Database, BookOpen, GraduationCap, Download, Lock, KeyRound, ShieldCheck,
  BarChart3, Loader2, RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AnalyticsEvent } from '../types';
import {
  loadAnalyticsEvents, seedDemoData, clearDemoData, getDemoStatus, DemoStatus,
} from '../services/analyticsData';
import {
  buildContext, buildFunnels, buildPatterns, buildSegments, Filters,
} from '../services/kpiEngine';
import { buildInsights } from '../services/insightEngine';
import { TabDef, TabBar, Card, FilterSelect } from '../components/analytics/ui';
import { OverviewTab } from '../components/analytics/tabs/OverviewTab';
import { KpisTab } from '../components/analytics/tabs/KpisTab';
import { BehaviourTab } from '../components/analytics/tabs/BehaviourTab';
import { FunnelsTab } from '../components/analytics/tabs/FunnelsTab';
import { SegmentsTab } from '../components/analytics/tabs/SegmentsTab';
import { JourneysTab } from '../components/analytics/tabs/JourneysTab';
import { InsightsTab } from '../components/analytics/tabs/InsightsTab';
import { DataCollectionTab, KpiMethodologyTab, MseTab } from '../components/analytics/tabs/DocsTabs';
import { ExportTab, ExportTabProps } from '../components/analytics/tabs/ExportTab';

type Ev = AnalyticsEvent & { ts: number };

const DAY = 86400000;
const DEFAULT_FILTERS: Filters = {
  mode: 'combined',
  periodStart: 0,
  periodEnd: 0,
  prevStart: 0,
  prevEnd: 0,
  device: 'all',
  userType: 'all',
  city: 'all',
  feature: 'all',
  source: 'all',
};

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { id: 'kpis', label: 'KPI Perspective', icon: <Gauge className="h-3.5 w-3.5" /> },
  { id: 'behaviour', label: 'Behaviour', icon: <Activity className="h-3.5 w-3.5" /> },
  { id: 'funnels', label: 'Funnels', icon: <Filter className="h-3.5 w-3.5" /> },
  { id: 'segments', label: 'Segments', icon: <Users2 className="h-3.5 w-3.5" /> },
  { id: 'journeys', label: 'Journeys', icon: <GitBranch className="h-3.5 w-3.5" /> },
  { id: 'insights', label: 'Insights', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: 'collection', label: 'Data Collection', icon: <Database className="h-3.5 w-3.5" /> },
  { id: 'method', label: 'KPI Methodology', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'mse', label: 'MSE-1 Mapping', icon: <GraduationCap className="h-3.5 w-3.5" /> },
  { id: 'export', label: 'Export / Demo', icon: <Download className="h-3.5 w-3.5" /> },
];

const adminCode = import.meta.env.VITE_ADMIN_CODE || 'cureconnect-analytics';

export const AnalyticsDashboardPage: React.FC = () => {
  const { user } = useApp();
  const [access, setAccess] = useState(() => sessionStorage.getItem('cc_admin_access') === '1');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [tab, setTab] = useState('overview');
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoStatus, setDemoStatus] = useState<DemoStatus | null>(null);
  const [seedMsg, setSeedMsg] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [mode, setMode] = useState<'real' | 'demo' | 'combined'>('combined');
  const [periodDays, setPeriodDays] = useState('30');
  const [device, setDevice] = useState('all');
  const [userType, setUserType] = useState('all');
  const [feature, setFeature] = useState('all');
  const [city, setCity] = useState('all');
  const [source, setSource] = useState('all');

  // Auto-grant admin access when the signed-in account is an admin.
  useEffect(() => {
    if (user?.role === 'admin') setAccess(true);
  }, [user]);

  const refreshEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const evts = await loadAnalyticsEvents();
      setEvents(evts);
      const status = await getDemoStatus();
      setDemoStatus(status);
    } catch (err: any) {
      console.error('[Analytics] Load failed:', err);
      setError(err?.message || 'Failed to load analytics events. Check the analytics_events collection.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([refreshEvents(), getDemoStatus().then(setDemoStatus)]);
  }, [refreshEvents]);

  useEffect(() => {
    if (access) loadData();
  }, [access, loadData]);

  const grantAccess = () => {
    const isValid =
      codeInput.trim().toLowerCase() === adminCode.toLowerCase() ||
      (user?.email || '').toLowerCase() === codeInput.trim().toLowerCase();
    if (isValid) {
      sessionStorage.setItem('cc_admin_access', '1');
      setAccess(true);
      setCodeError('');
    } else {
      setCodeError('Incorrect admin passcode.');
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    setSeedMsg('');
    try {
      await seedDemoData((msg) => setSeedMsg(msg));
      await loadData();
    } catch (e: any) {
      setSeedMsg(`Seed failed: ${e?.message || e}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleClearDemo = async () => {
    setClearing(true);
    setSeedMsg('');
    try {
      await clearDemoData();
      await loadData();
      setSeedMsg('Demo dataset cleared. Real events untouched.');
    } catch (e: any) {
      setSeedMsg(`Clear failed: ${e?.message || e}`);
    } finally {
      setClearing(false);
    }
  };

  const range = useMemo(() => {
    if (!events.length) return { min: Date.now() - 30 * DAY, max: Date.now() };
    let min = Infinity;
    let max = 0;
    events.forEach((e) => { if (e.ts < min) min = e.ts; if (e.ts > max) max = e.ts; });
    return { min, max };
  }, [events]);

  const filters: Filters = useMemo(() => {
    const maxTs = range.max;
    const span = periodDays === 'all' ? maxTs - range.min : Math.min(Number(periodDays), 365) * DAY;
    const periodStart = periodDays === 'all' ? range.min : Math.max(range.min, maxTs - span);
    const periodEnd = periodDays === 'all' ? maxTs : maxTs;
    const prevEnd = periodStart;
    const prevStart = Math.max(range.min, periodStart - span);
    return { ...DEFAULT_FILTERS, mode, periodStart, periodEnd, prevStart, prevEnd, device, userType, feature, city, source };
  }, [range, periodDays, mode, device, userType, feature, city, source]);

  const ctx = useMemo(() => buildContext(events.length ? events : [], filters), [events, filters]);
  const patterns = useMemo(() => buildPatterns(ctx.visible, ctx), [ctx]);
  const funnels = useMemo(() => buildFunnels(ctx.visible), [ctx.visible]);
  const segments = useMemo(() => buildSegments(ctx.visible, filters.periodStart, filters.periodEnd), [ctx.visible, filters]);
  const insights = useMemo(() => buildInsights({ ctx, patterns, funnels, segments }), [ctx, patterns, funnels, segments]);

  const realCount = useMemo(() => events.filter((e) => !e.is_demo).length, [events]);
  const demoCount = useMemo(() => events.filter((e) => e.is_demo).length, [events]);

  if (!access) return <AccessGate user={user} code={codeInput} setCode={setCodeInput} error={codeError} onSubmit={grantAccess} />;

  const exportProps: ExportTabProps = { ctx, patterns, funnels, segments, insights, realCount, demoCount, demoStatus, seeding, clearing, onSeedDemo: handleSeedDemo, onClearDemo: handleClearDemo };

  const filterOptions = useMemo(() => {
    const citySet = new Set<string>(['Bangalore']);
    events.forEach((e) => { if (e.city) citySet.add(e.city); });
    return { cities: Array.from(citySet) };
  }, [events]);

  return (
    <div className="relative min-h-screen animated-gradient overflow-hidden p-4 sm:p-6 lg:p-8">
      <div className="orb orb-animate-1 h-72 w-72 -left-24 top-10 bg-teal-500/20" />
      <div className="orb orb-animate-2 h-96 w-96 -right-32 top-64 bg-indigo-600/20" />

      <div className="relative z-10 mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="section-label"><BarChart3 className="h-3 w-3" /> Product Analytics · Admin</div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              <span className="text-gradient-brand">CureConnect</span>{' '}
              <span className="text-gradient-teal">Analytics Dashboard</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Behavioural analytics, 28-KPI system and automated insights — {ctx.periodLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refreshEvents()} className="btn-ghost px-3 py-2 text-xs" title="Reload events">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload
            </button>
            <span className="badge badge-teal"><ShieldCheck className="h-3 w-3" /> Authenticated</span>
          </div>
        </div>

        {/* Demo banner */}
        {(demoStatus?.loaded || mode === 'demo') && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-teal-500/25 bg-teal-500/5 px-4 py-3 text-xs text-teal-200">
            <Database className="h-4 w-4 shrink-0" />
            <span>
              <b>{demoStatus?.label || 'DEMO DATA — Synthetic academic demonstration data'}</b>
              {demoStatus?.loaded && <> — {demoStatus.count.toLocaleString()} events loaded{demoStatus.loadedAt ? ` at ${new Date(demoStatus.loadedAt).toLocaleString()}` : ''}. Explore the Export tab to seed more or wipe these events.</>}
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="mb-5 grid gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect label="Dataset" value={mode} onChange={(v) => setMode(v as any)} options={[
            { value: 'combined', label: 'Combined (real + demo)' },
            { value: 'real', label: 'Real events only' },
            { value: 'demo', label: 'Demo events only' },
          ]} />
          <FilterSelect label="Period" value={periodDays} onChange={setPeriodDays} options={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' },
            { value: 'all', label: 'Entire loaded stream' },
          ]} />
          <FilterSelect label="Device" value={device} onChange={setDevice} options={[
            { value: 'all', label: 'All devices' },
            { value: 'mobile', label: 'Mobile' },
            { value: 'desktop', label: 'Desktop' },
            { value: 'tablet', label: 'Tablet' },
          ]} />
          <FilterSelect label="User type" value={userType} onChange={setUserType} options={[
            { value: 'all', label: 'All users' },
            { value: 'auth', label: 'Signed-in users' },
            { value: 'guest', label: 'Guests / anonymous' },
          ]} />
          <FilterSelect label="City" value={city} onChange={setCity} options={[
            { value: 'all', label: 'All cities' },
            ...filterOptions.cities.map((c) => ({ value: c, label: c })),
          ]} />
          <FilterSelect label="Feature" value={feature} onChange={setFeature} options={[
            { value: 'all', label: 'All features' },
            { value: 'appointment', label: 'Appointments' },
            { value: 'medicine', label: 'Medicines / Orders' },
            { value: 'doctor', label: 'Doctor discovery' },
            { value: 'auth', label: 'Auth / Profile' },
            { value: 'engagement', label: 'Engagement' },
          ]} />
          <FilterSelect label="Traffic source" value={source} onChange={setSource} options={[
            { value: 'all', label: 'All sources' },
            { value: 'direct', label: 'Direct' },
            { value: 'google', label: 'Google' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'facebook', label: 'Facebook' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'other_referral', label: 'Other referral' },
          ]} />
          <div className="flex flex-col justify-end">
            <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2.5 text-xs text-slate-500">
              <span className="text-slate-300 font-bold">{ctx.visible.length.toLocaleString()}</span> events in view ·{' '}
              <span className="text-slate-300 font-bold">{ctx.agg.activeUsers}</span> users
            </div>
          </div>
        </div>

        {seedMsg && (
          <div className="mb-5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-4 py-2.5 text-xs text-indigo-200">{seedMsg}</div>
        )}

        {/* Tabs */}
        <div className="mb-5">
          <TabBar tabs={TABS} active={tab} onChange={setTab} />
        </div>

        {/* Content */}
        <div>
          {loading ? (
            <Card title="Loading analytics events…" subtitle="Reading the analytics_events collection from Firestore">
              <div className="space-y-2.5">
                <div className="h-10 rounded-xl skeleton" />
                <div className="h-10 rounded-xl skeleton" />
                <div className="h-10 rounded-xl skeleton" />
              </div>
            </Card>
          ) : error ? (
            <Card title="Could not load analytics" subtitle="Error while reading Firestore">
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
                <p className="max-w-lg text-xs text-slate-500">
                  Verify the <code className="text-teal-300">analytics_events</code> collection exists in Firestore and that the rules allow reads
                  (currently open for this academic project). Then reload.
                </p>
                <button onClick={() => refreshEvents()} className="btn-primary px-4 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Retry</button>
              </div>
            </Card>
          ) : tab === 'overview' ? <OverviewTab ctx={ctx} patterns={patterns} funnels={funnels} segments={segments} insights={insights} />
            : tab === 'kpis' ? <KpisTab ctx={ctx} patterns={patterns} funnels={funnels} segments={segments} insights={insights} />
            : tab === 'behaviour' ? <BehaviourTab ctx={ctx} patterns={patterns} funnels={funnels} segments={segments} insights={insights} />
            : tab === 'funnels' ? <FunnelsTab ctx={ctx} patterns={patterns} funnels={funnels} segments={segments} insights={insights} />
            : tab === 'segments' ? <SegmentsTab ctx={ctx} patterns={patterns} funnels={funnels} segments={segments} insights={insights} />
            : tab === 'journeys' ? <JourneysTab ctx={ctx} patterns={patterns} funnels={funnels} segments={segments} insights={insights} />
            : tab === 'insights' ? <InsightsTab ctx={ctx} patterns={patterns} funnels={funnels} segments={segments} insights={insights} />
            : tab === 'collection' ? <DataCollectionTab />
            : tab === 'method' ? <KpiMethodologyTab ctx={ctx} patterns={patterns} funnels={funnels} segments={segments} insights={insights} />
            : tab === 'mse' ? <MseTab />
            : <ExportTab {...exportProps} />}
        </div>

        <footer className="mt-10 border-t border-white/5 pt-4 text-center text-[11px] text-slate-600">
          CureConnect Analytics · MSE-1 Project · All metrics computed live from Cloud Firestore analytics_events · demo events flagged is_demo
        </footer>
      </div>
    </div>
  );
};

// ─── Access gate ─────────────────────────────────────────────────────────────

const AccessGate: React.FC<{
  user: any;
  code: string;
  setCode: (v: string) => void;
  error: string;
  onSubmit: () => void;
}> = ({ user, code, setCode, error, onSubmit }) => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden animated-gradient p-4">
    <div className="orb orb-animate-1 h-72 w-72 -left-20 top-10 bg-teal-500/20" />
    <div className="orb orb-animate-3 h-80 w-80 -right-20 bottom-10 bg-rose-500/10" />
    <div className="relative z-10 w-full max-w-md page-enter-scale">
      <div className="glass-strong rounded-3xl p-8">
        <div className="section-label"><Lock className="h-3 w-3" /> Restricted · Admin analytics</div>
        <h1 className="mt-3 text-xl font-extrabold text-white">Analytics dashboard access</h1>
        <p className="mt-2 text-sm text-slate-400">
          The product analytics suite is protected. Enter the admin passcode to continue.
          {user && (
            <span className="mt-1 block text-xs text-slate-500">
              Signed in as <b className="text-slate-300">{user.email || user.name || 'user'}</b> · role <span className="badge badge-indigo">{user.role || 'user'}</span>
            </span>
          )}
        </p>

        <div className="mt-5 space-y-3">
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
              placeholder="Admin passcode"
              className="input-dark !pl-10"
              autoFocus
            />
          </div>
          {error && <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}
          <button onClick={onSubmit} className="btn-primary w-full py-3 text-sm">Unlock dashboard</button>
        </div>

        <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-slate-500">
          <b className="text-slate-400">Academic demo passcode:</b> <code className="text-teal-300">cureconnect-analytics</code>
          <br />Configurable at build time via <code className="text-teal-300">VITE_ADMIN_CODE</code> / <code className="text-teal-300">VITE_ADMIN_EMAILS</code>. Accounts with role = admin bypass the gate.
        </div>
      </div>
    </div>
  </div>
);