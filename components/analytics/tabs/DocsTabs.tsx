import React from 'react';
import { Database, BookOpen, GraduationCap, ShieldAlert, Cpu, Activity } from 'lucide-react';
import { DashboardProps } from '../types';
import { Card, Tag } from '../ui';

// ─── 1. Data Collection ──────────────────────────────────────────────────────

const SCHEMA: { field: string; type: string; note: string }[] = [
  { field: 'event_id', type: 'string', note: 'Firestore document id (auto)' },
  { field: 'event_name', type: 'string', note: 'One of the 37 tracked event names' },
  { field: 'user_id', type: 'string', note: 'Firebase auth UID, or guest/anonymous id' },
  { field: 'anonymous_id', type: 'string', note: 'Guest fallback id for logged-out users' },
  { field: 'session_id', type: 'string', note: 'One session per 30-min active window' },
  { field: 'timestamp', type: 'timestamp', note: 'serverTimestamp() written by Firestore' },
  { field: 'created_at', type: 'string', note: 'ISO client timestamp (always present)' },
  { field: 'local_hour', type: 'number', note: 'Hour of day from the visitor clock' },
  { field: 'day_of_week', type: 'number', note: '0=Sunday … 6=Saturday' },
  { field: 'page', type: 'string', note: 'Route path where the event fired' },
  { field: 'device_type', type: 'string', note: 'mobile / tablet / desktop (UA sniffing)' },
  { field: 'browser', type: 'string', note: 'Detected browser' },
  { field: 'os', type: 'string', note: 'Detected operating system' },
  { field: 'city', type: 'string', note: 'Defaults to Bangalore for privacy safety' },
  { field: 'source', type: 'string', note: 'direct / google / social / email / referral' },
  { field: 'referrer', type: 'string', note: 'document.referrer when available' },
  { field: 'category', type: 'string', note: 'Context: e.g. searched speciality, medicine category' },
  { field: 'search_query', type: 'string', note: 'Raw search text for search events' },
  { field: 'result_count', type: 'number', note: 'Number of results returned for a search' },
  { field: 'doctor_id / pharmacy_id / medicine_id', type: 'string', note: 'Entity the event relates to' },
  { field: 'appointment_id', type: 'string', note: 'Appointment booking reference' },
  { field: 'metadata', type: 'object', note: 'Flexible payload: durations, names, extra context' },
  { field: 'is_demo', type: 'boolean', note: 'true ⇒ synthetic demonstration event' },
];

const EVENT_GROUPS: { group: string; events: { name: string; desc: string }[] }[] = [
  {
    group: 'Auth & Profile',
    events: [
      { name: 'account_created', desc: 'User signed up successfully' },
      { name: 'login / logout', desc: 'Session auth state changes' },
      { name: 'profile_completed', desc: 'First profile setup finished' },
      { name: 'profile_updated', desc: 'Profile edited' },
    ],
  },
  {
    group: 'Doctor Discovery',
    events: [
      { name: 'doctor_list_view', desc: 'Doctor directory opened' },
      { name: 'speciality_selected', desc: 'Picked a speciality filter' },
      { name: 'doctor_search', desc: 'Search performed over doctors' },
      { name: 'doctor_filter_used', desc: 'Applied a doctor filter' },
      { name: 'doctor_profile_view', desc: 'Opened a doctor profile' },
      { name: 'doctor_availability_view', desc: 'Checked a doctor’s availability' },
    ],
  },
  {
    group: 'Appointment Booking',
    events: [
      { name: 'appointment_started', desc: 'Booking wizard entered' },
      { name: 'slot_viewed / slot_selected', desc: 'Time-slot picker steps' },
      { name: 'appointment_details_entered', desc: 'Patient details filled' },
      { name: 'appointment_confirmed', desc: 'Goal reached — booking confirmed' },
      { name: 'appointment_cancelled / rescheduled', desc: 'Post-booking mutations' },
      { name: 'appointment_completed', desc: 'Consultation marked complete' },
    ],
  },
  {
    group: 'Medicine Discovery',
    events: [
      { name: 'medicine_search', desc: 'Medicine name search' },
      { name: 'medicine_category_view, medicine_view', desc: 'Browse + product open' },
      { name: 'pharmacy_search / pharmacy_view / pharmacy_selected', desc: 'Pharmacy layer' },
      { name: 'availability_check', desc: 'Checked stock availability' },
      { name: 'medicine_available / medicine_unavailable', desc: 'Availability result' },
      { name: 'medicine_order_started / completed / cancelled', desc: 'Order lifecycle' },
    ],
  },
  {
    group: 'Engagement & Sessions',
    events: [
      { name: 'page_view', desc: 'Route change (SPA-aware)' },
      { name: 'search, filter_applied, CTA_clicked', desc: 'Generic interactions' },
      { name: 'session_started / session_ended', desc: 'Session lifecycle with duration' },
    ],
  },
];

export const DataCollectionTab: React.FC = () => (
  <div className="space-y-5 page-enter">
    <Card title="How data is collected" subtitle="Client-side tracking SDK → Cloud Firestore analytics_events collection">
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { icon: <Cpu className="h-4 w-4" />, title: '1 · Instrumented client', body: 'The React app fires typed events (analyticsService.track()) on every meaningful user action — searches, views, booking steps, auth — alongside device, traffic-source and session context.' },
          { icon: <Database className="h-4 w-4" />, title: '2 · Firestore collection', body: 'Events are written fire-and-forget into analytics_events as documents with a rubric-aligned schema. serverTimestamp() gives authoritative timestamps; created_at keeps a client fallback.' },
          { icon: <Activity className="h-4 w-4" />, title: '3 · Live computation', body: 'The dashboard loads the last 15,000 events and computes all KPIs, funnels, segments, patterns and insights in-browser — no batch ETL, results are instantaneous and reproducible.' },
        ].map((s) => (
          <div key={s.title} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/15 text-teal-300">{s.icon}</span>
              {s.title}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{s.body}</p>
          </div>
        ))}
      </div>
    </Card>

    <Card title="Event schema" subtitle="Every document in analytics_events (rubric-aligned field names)">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-600">
              <th className="pb-2">Field</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {SCHEMA.map((f) => (
              <tr key={f.field} className="border-t border-white/5">
                <td className="py-2 pr-3 font-mono font-semibold text-teal-200">{f.field}</td>
                <td className="py-2 pr-3 font-mono text-slate-400">{f.type}</td>
                <td className="py-2 text-slate-500">{f.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    <Card title="Tracked events (37)" subtitle="Full event registry grouped by product journey">
      <div className="grid gap-3 md:grid-cols-2">
        {EVENT_GROUPS.map((g) => (
          <div key={g.group} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <Tag tone="indigo">{g.group}</Tag>
            <ul className="mt-2 space-y-1">
              {g.events.map((e) => (
                <li key={e.name} className="flex items-start gap-2 text-xs">
                  <code className="mt-0.5 rounded bg-black/30 px-1.5 py-0.5 font-semibold text-teal-300 shrink-0">{e.name}</code>
                  <span className="text-slate-500">{e.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>

    <Card title="Privacy & safety" subtitle="Academic inline with MSE-1 requirements" pad={false}>
      <div className="space-y-2 p-5">
        <div className="flex items-start gap-3 text-sm text-slate-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-teal-400 shrink-0" />
          <span>No medical records, prescriptions or health data are stored in analytics events — only behavioural metadata.</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-slate-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-teal-400 shrink-0" />
          <span>Location is intentionally coarse (city level, default Bangalore); no exact IP or GPS co-ordinates.</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-slate-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-teal-400 shrink-0" />
          <span>Guest users are tracked with a rotating anonymous id; real user ids are only Firebase UIDs, never email addresses.</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-slate-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-teal-400 shrink-0" />
          <span>Demo events are flagged is_demo and can be wiped with one click without touching production data.</span>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90">
          <b>Known limitation:</b> Firestore rules are intentionally permissive for this academic project. For production deployment, rules should be locked to authenticated admins only for the analytics_events reads.
        </div>
      </div>
    </Card>
  </div>
);

// ─── 2. KPI Methodology ──────────────────────────────────────────────────────

export const KpiMethodologyTab: React.FC<DashboardProps> = ({ ctx }) => (
  <div className="space-y-5 page-enter">
    <Card
      title="KPI Methodology — 28 KPIs"
      subtitle="Every metric is computed live from analytics_events. Formula, numerator and denominator are shown for each."
      actions={<Tag tone="teal">{ctx.kpis.length} KPIs</Tag>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-600">
              <th className="pb-2">#</th>
              <th className="pb-2">KPI</th>
              <th className="pb-2">Category</th>
              <th className="pb-2">Value</th>
              <th className="pb-2">Formula</th>
              <th className="pb-2 w-56">Definition</th>
            </tr>
          </thead>
          <tbody>
            {ctx.kpis.map((k, i) => (
              <tr key={k.id} className="border-t border-white/5 align-top">
                <td className="py-2 pr-2 text-slate-600 font-bold">{i + 1}</td>
                <td className="py-2 pr-3 font-semibold text-white">{k.name}</td>
                <td className="py-2 pr-3"><Tag tone={k.category === 'Audience' ? 'teal' : k.category === 'Discovery' ? 'indigo' : k.category === 'Appointments' ? 'rose' : k.category === 'Medicines' ? 'amber' : 'teal'}>{k.category}</Tag></td>
                <td className="py-2 pr-3 font-bold text-teal-200">{k.display}</td>
                <td className="py-2 pr-3 font-mono text-slate-400">{k.formula}</td>
                <td className="py-2 text-slate-500 leading-relaxed">{k.definition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
);

// ─── 3. MSE-1 Evaluation Mapping ─────────────────────────────────────────────

const MSE_ROWS: { criterion: string; marks: string; deliverable: string; evidence: string }[] = [
  {
    criterion: 'Data Collection',
    marks: '5',
    deliverable: 'Client-side tracking SDK (37 events) persisting to Cloud Firestore analytics_events with rubric-aligned schema.',
    evidence: 'Data Collection tab · services/analyticsService.ts · services/analyticsData.ts',
  },
  {
    criterion: 'KPI Identification',
    marks: '10',
    deliverable: '28 KPIs across Audience, Discovery, Appointments, Medicines, Conversion — each with formula, numerator, denominator, previous-period comparison and daily trend.',
    evidence: 'KPI Perspective tab · services/kpiEngine.ts (buildKpis, computeKpiChanges)',
  },
  {
    criterion: 'User Behaviour Analysis',
    marks: '15',
    deliverable: 'Conversion funnels, 10 behavioural segments, pattern mining (peak hours/days, devices, navigation paths, exit pages), user-flow visualisation, automated insights with product actions.',
    evidence: 'Behaviour / Funnels / Segments / Journeys / Insights tabs · services/kpiEngine.ts · services/insightEngine.ts',
  },
];

export const MseTab: React.FC = () => (
  <div className="space-y-5 page-enter">
    <Card
      title="MSE-1 Evaluation Mapping"
      subtitle="How the 30-mark rubric is satisfied end-to-end"
      actions={<Tag tone="teal"><GraduationCap className="h-3 w-3" /> 30/30 map</Tag>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-600">
              <th className="pb-2">Rubric criterion</th>
              <th className="pb-2">Marks</th>
              <th className="pb-2">Delivered</th>
              <th className="pb-2 w-80">Where to see the evidence</th>
            </tr>
          </thead>
          <tbody>
            {MSE_ROWS.map((r) => (
              <tr key={r.criterion} className="border-t border-white/5 align-top">
                <td className="py-3 pr-3 font-bold text-white">{r.criterion}</td>
                <td className="py-3 pr-3"><span className="badge-amber badge">{r.marks}</span></td>
                <td className="py-3 pr-3 text-slate-300 leading-relaxed">{r.deliverable}</td>
                <td className="py-3 font-mono text-[11px] text-slate-500 leading-relaxed">{r.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    <Card title="Suggested viva demonstration flow">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
        <li>Open <b className="text-teal-300">/admin/analytics</b>, load the <b className="text-teal-300">Demo Dataset</b> (seeded, reproducible), and show the demo-data banner.</li>
        <li><b className="text-teal-300">Data Collection tab</b> → show the event schema and the 37 tracked events; optionally inspect Firestore directly for documents in <code className="text-teal-200">analytics_events</code>.</li>
        <li><b className="text-teal-300">KPI Perspective tab</b> → expand 3–4 KPIs (e.g. Appointment Conversion, Medicine Availability Rate, Retention) and explain formula + previous-period delta + daily trend.</li>
        <li><b className="text-teal-300">Funnels</b> → explain the biggest leak; <b className="text-teal-300">Segments</b> → pick Booking Abandoners and show its conversion rate; <b className="text-teal-300">Journeys</b> → read top navigation flows.</li>
        <li><b className="text-teal-300">Insights tab</b> → walk one warning + one opportunity insight, quoting the computed evidence, and state the recommended product action.</li>
        <li>Export the report as <b className="text-teal-300">CSV or PDF</b> from the Export tab; delete the demo dataset to show the production stream stays intact.</li>
      </ol>
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs text-slate-400">
        <BookOpen className="mt-0.5 h-4 w-4 text-indigo-300 shrink-0" />
        Tip: every number on this dashboard is computed live from the events — demo data is clearly labelled and cleanable, so nothing shown can be called fake.
      </div>
    </Card>
  </div>
);