import { EVENTS } from './analyticsService';
import { AnalyticsEvent } from '../types';

export type Ev = AnalyticsEvent & { ts: number };

export const APPT_EVENTS = new Set<string>([
  EVENTS.APPOINTMENT_STARTED, EVENTS.SLOT_VIEWED, EVENTS.SLOT_SELECTED,
  EVENTS.APPOINTMENT_DETAILS_ENTERED, EVENTS.APPOINTMENT_CONFIRMED,
  EVENTS.APPOINTMENT_CANCELLED, EVENTS.APPOINTMENT_RESCHEDULED, EVENTS.APPOINTMENT_COMPLETED,
]);
export const MEDICINE_EVENTS = new Set<string>([
  EVENTS.MEDICINE_SEARCH, EVENTS.MEDICINE_CATEGORY_VIEW, EVENTS.MEDICINE_VIEW,
  EVENTS.PHARMACY_SEARCH, EVENTS.PHARMACY_VIEW, EVENTS.AVAILABILITY_CHECK,
  EVENTS.MEDICINE_AVAILABLE, EVENTS.MEDICINE_UNAVAILABLE, EVENTS.PHARMACY_SELECTED,
  EVENTS.MEDICINE_ORDER_STARTED, EVENTS.MEDICINE_ORDER_COMPLETED, EVENTS.MEDICINE_ORDER_CANCELLED,
]);
export const SEARCH_EVENTS = new Set<string>([EVENTS.MEDICINE_SEARCH, EVENTS.DOCTOR_SEARCH]);
export const GOAL_CONFIRM = new Set<string>([EVENTS.APPOINTMENT_CONFIRMED, EVENTS.MEDICINE_ORDER_COMPLETED]);
export const GOAL_START = new Set<string>([EVENTS.APPOINTMENT_STARTED, EVENTS.MEDICINE_ORDER_STARTED]);

export const isGuest = (id: string) => id?.startsWith('guest') || id?.startsWith('anon-');

export const featureOf = (name: string): string => {
  if (APPT_EVENTS.has(name)) return 'appointment';
  if (MEDICINE_EVENTS.has(name)) return 'medicine';
  if (([EVENTS.DOCTOR_LIST_VIEW, EVENTS.DOCTOR_SEARCH, EVENTS.DOCTOR_PROFILE_VIEW,
    EVENTS.DOCTOR_AVAILABILITY_VIEW, EVENTS.SPECIALITY_SELECTED, EVENTS.DOCTOR_FILTER_USED] as string[]).includes(name)) return 'doctor';
  if (([EVENTS.LOGIN, EVENTS.LOGOUT, EVENTS.ACCOUNT_CREATED, EVENTS.PROFILE_COMPLETED, EVENTS.PROFILE_UPDATED] as string[]).includes(name)) return 'auth';
  if (['page_view', 'search', 'filter_applied', 'CTA_clicked'].includes(name)) return 'engagement';
  return 'other';
};

// ─── Aggregations ───────────────────────────────────────────────────────────

export interface Aggregates {
  events: number;
  pageViews: number;
  sessions: number;
  activeUsers: number;
  returningUsers: number;
  newUsers: number;
  sessionDurationAvg: number;
  pagesPerSession: number;
  medicineSearches: number;
  doctorSearches: number;
  totalSearches: number;
  searchesWithResults: number;
  medicineViews: number;
  doctorProfileViews: number;
  doctorListViews: number;
  availabilityChecks: number;
  medAvailable: number;
  medUnavailable: number;
  pharmacySearches: number;
  pharmacyViews: number;
  pharmacySelected: number;
  apptStarted: number;
  slotViewed: number;
  slotSelected: number;
  apptConfirmed: number;
  apptCompleted: number;
  apptCancelled: number;
  apptRescheduled: number;
  orderStarted: number;
  orderCompleted: number;
  orderCancelled: number;
}

export const aggregate = (events: Ev[], usersWithPrior: Set<string> = new Set()): Aggregates => {
  const a: Aggregates = {
    events: events.length,
    pageViews: 0, sessions: 0, activeUsers: 0, returningUsers: 0, newUsers: 0,
    sessionDurationAvg: 0, pagesPerSession: 0,
    medicineSearches: 0, doctorSearches: 0, totalSearches: 0, searchesWithResults: 0,
    medicineViews: 0, doctorProfileViews: 0, doctorListViews: 0,
    availabilityChecks: 0, medAvailable: 0, medUnavailable: 0,
    pharmacySearches: 0, pharmacyViews: 0, pharmacySelected: 0,
    apptStarted: 0, slotViewed: 0, slotSelected: 0,
    apptConfirmed: 0, apptCompleted: 0, apptCancelled: 0, apptRescheduled: 0,
    orderStarted: 0, orderCompleted: 0, orderCancelled: 0,
  };

  const users = new Set<string>();
  const sessions = new Map<string, { start: number; end: number; pages: number; hasEndEvent: number }>();
  const firstByUser = new Map<string, number>();

  for (const e of events) {
    users.add(e.user_id);
    if (!firstByUser.has(e.user_id) || e.ts < firstByUser.get(e.user_id)!) firstByUser.set(e.user_id, e.ts);
    const s = sessions.get(e.session_id) || { start: e.ts, end: e.ts, pages: 0, hasEndEvent: 0 };
    s.start = Math.min(s.start, e.ts);
    s.end = Math.max(s.end, e.ts);
    sessions.set(e.session_id, s);

    switch (e.event_name) {
      case EVENTS.PAGE_VIEW: a.pageViews++; s.pages++; break;
      case EVENTS.MEDICINE_SEARCH: a.medicineSearches++; a.totalSearches++; if ((e.result_count || 0) > 0) a.searchesWithResults++; break;
      case EVENTS.DOCTOR_SEARCH: a.doctorSearches++; a.totalSearches++; if ((e.result_count || 0) > 0) a.searchesWithResults++; break;
      case EVENTS.MEDICINE_VIEW: a.medicineViews++; break;
      case EVENTS.DOCTOR_PROFILE_VIEW: a.doctorProfileViews++; break;
      case EVENTS.DOCTOR_LIST_VIEW: a.doctorListViews++; break;
      case EVENTS.AVAILABILITY_CHECK: a.availabilityChecks++; break;
      case EVENTS.MEDICINE_AVAILABLE: a.medAvailable++; break;
      case EVENTS.MEDICINE_UNAVAILABLE: a.medUnavailable++; break;
      case EVENTS.PHARMACY_SEARCH: a.pharmacySearches++; break;
      case EVENTS.PHARMACY_VIEW: a.pharmacyViews++; break;
      case EVENTS.PHARMACY_SELECTED: a.pharmacySelected++; break;
      case EVENTS.APPOINTMENT_STARTED: a.apptStarted++; break;
      case EVENTS.SLOT_VIEWED: a.slotViewed++; break;
      case EVENTS.SLOT_SELECTED: a.slotSelected++; break;
      case EVENTS.APPOINTMENT_CONFIRMED: a.apptConfirmed++; break;
      case EVENTS.APPOINTMENT_COMPLETED: a.apptCompleted++; break;
      case EVENTS.APPOINTMENT_CANCELLED: a.apptCancelled++; break;
      case EVENTS.APPOINTMENT_RESCHEDULED: a.apptRescheduled++; break;
      case EVENTS.MEDICINE_ORDER_STARTED: a.orderStarted++; break;
      case EVENTS.MEDICINE_ORDER_COMPLETED: a.orderCompleted++; break;
      case EVENTS.MEDICINE_ORDER_CANCELLED: a.orderCancelled++; break;
      case EVENTS.SESSION_ENDED:
        s.hasEndEvent = e.metadata?.duration_seconds ? e.metadata.duration_seconds : 0;
        break;
      default: break;
    }
  }

  a.sessions = sessions.size;
  a.activeUsers = users.size;

  // Session durations: prefer explicit duration_seconds from session_ended
  let durSum = 0;
  sessions.forEach((s) => {
    if (s.hasEndEvent) durSum += s.hasEndEvent;
    else durSum += Math.max(1, Math.round((s.end - s.start) / 1000));
  });
  a.sessionDurationAvg = sessions.size ? Math.round(durSum / sessions.size) : 0;
  a.pagesPerSession = sessions.size ? +(a.pageViews / sessions.size).toFixed(2) : 0;

  // New / returning users
  let firstSeenHere = 0;
  users.forEach((u) => {
    const f = firstByUser.get(u)!;
    if (usersWithPrior.has(u)) a.returningUsers++;
    if (!usersWithPrior.has(u)) firstSeenHere++;
  });
  a.newUsers = firstSeenHere;

  return a;
};

// ─── KPI definition & computation ───────────────────────────────────────────

export interface KPI {
  id: string;
  name: string;
  category: 'Audience' | 'Discovery' | 'Appointments' | 'Medicines' | 'Conversion';
  definition: string;
  formula: string;
  numerator: string;
  denominator: string;
  unit: string;
  value: number;
  display: string;
  previousValue: number | null;
  changePct: number | null;
  trend: number[];
  trendLabels: string[];
  interpretation: string;
  whyMatters: string;
  hasData: boolean;
}

const fmtCount = (v: number) => Math.round(v).toLocaleString();
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const pct = (num: number, den: number): number => (den > 0 ? (num / den) * 100 : 0);
const ratio = (num: number, den: number): number => (den > 0 ? num / den : 0);

interface KpiDeps { a: Aggregates; events: Ev[]; usersWithPrior: Set<string>; periodLabel: string; previousLabel: string; activeUsersTrailing7: number; activeUsersTrailing30: number; retentionPct: number; featureUsers: number; convertingSessions: number; }

const buildKpis = (d: KpiDeps): KPI[] => {
  const { a } = d;
  const list: KPI[] = [];

  const kpi = (id: string, name: string, category: KPI['category'], definition: string, formula: string, numerator: string, denominator: string,
    unit: string, value: number, interpretation: string, whyMatters: string, trend?: number[], trendLabels?: string[]): KPI => {
    const prevVal = null; // previous period computed separately below
    const hasData = a.events > 0;
    let display = '';
    if (unit === '%') display = fmtPct(value);
    else if (unit === 'sec') display = `${Math.round(value)}s`;
    else if (unit === 'ratio') display = value.toFixed(2);
    else display = fmtCount(value);
    return {
      id, name, category, definition, formula, numerator, denominator, unit,
      value, display, previousValue: prevVal, changePct: null,
      trend: trend || [], trendLabels: trendLabels || [],
      interpretation, whyMatters, hasData,
    };
  };

  // 1. Total Users
  list.push(kpi('total_users', 'Total Users', 'Audience',
    'Total number of unique user identifiers recorded across the selected period.',
    'Distinct user_id', 'Count of unique user_id', 'All recorded users in period',
    'count', a.activeUsers,
    'The full reach of the platform during this period, including both signed-in members and anonymous/guest visitors.',
    'Defines the addressable audience the metrics below are drawn from.'));
  // 2. New Users
  list.push(kpi('new_users', 'New Users', 'Audience',
    'Users whose very first recorded interaction on CureConnect falls within the period.',
    'Users with no earlier event before period start', 'Count of first-timers', 'All users in period',
    'count', a.newUsers,
    `Represents first-time users acquired in the window. ${a.newUsers} of ${a.activeUsers} active users were first seen here.`,
    'Measures acquisition of new users and the growth of the user base.'));
  // 3. Active Users
  list.push(kpi('active_users', 'Active Users', 'Audience',
    'Unique users who performed at least one tracked action in the period.',
    'Distinct user_id with ≥ 1 event', 'Count of distinct users', 'Period',
    'count', a.activeUsers,
    'The number of people who actually used CureConnect in this window.',
    'Core volume metric; the foundation for DAU/WAU/MAU and retention.'));
  // 4. DAU
  list.push(kpi('dau', 'Daily Active Users (DAU)', 'Audience',
    'Unique users active on the most recent day of the period.',
    'Distinct user_id on last day', 'Count on last day', 'Last day of period',
    'count', lastDayActive(d.events),
    'Number of distinct users active on the latest recorded day.',
    'Daily engagement pulse and baseline for short-term health.'));
  // 5. WAU
  list.push(kpi('wau', 'Weekly Active Users (WAU)', 'Audience',
    'Unique users active in the trailing 7 days ending at the period end.',
    'Distinct user_id in last 7 days', 'Count in window', 'Trailing 7 days',
    'count', d.activeUsersTrailing7,
    'Weekly reach of the platform.', 'Weekly engagement health, smooths daily noise.'));
  // 6. MAU
  list.push(kpi('mau', 'Monthly Active Users (MAU)', 'Audience',
    'Unique users active in the trailing 30 days ending at the period end.',
    'Distinct user_id in last 30 days', 'Count in window', 'Trailing 30 days',
    'count', d.activeUsersTrailing30,
    'Monthly reach of the platform.', 'Monthly scale used for retention cohorts and growth.'));
  // 7. Returning User Rate
  list.push(kpi('returning_rate', 'Returning User Rate', 'Audience',
    'Share of active users who had recorded activity before the start of the selected period.',
    'Returning users / Active users × 100', fmtCount(a.returningUsers), fmtCount(a.activeUsers),
    '%', pct(a.returningUsers, a.activeUsers),
    `${fmtPct(pct(a.returningUsers, a.activeUsers))} of active users were returning (pre-existing) users.`,
    'Loyalty indicator; a healthy product shows a rising returning share.'));
  // 8. Session Count
  list.push(kpi('sessions', 'Session Count', 'Audience',
    'Total number of tracked user sessions in the period.',
    'Distinct session_id', 'Count of sessions', 'Period',
    'count', a.sessions,
    'How many times users opened/used the product in this window.',
    'Volume baseline for session-level metrics and funnel denominators.'));
  // 9. Avg Session Duration
  list.push(kpi('avg_session_duration', 'Average Session Duration', 'Audience',
    'Mean time spent per session, from session_ended durations (or event spanned windows).',
    'Σ session durations / # sessions', 'Total seconds', 'Session count',
    'sec', a.sessionDurationAvg,
    `Average session length ≈ ${Math.round(a.sessionDurationAvg / 60)} min.`,
    'Engagement depth; longer sessions generally imply higher interest.'));
  // 10. Pages Per Session
  list.push(kpi('pages_per_session', 'Pages Per Session', 'Audience',
    'Average number of page views per session.',
    'Page views / Sessions', fmtCount(a.pageViews), fmtCount(a.sessions),
    'ratio', a.pagesPerSession,
    'How many pages a typical session explores.', 'Navigation depth of the user journey.'));
  // 11. Doctor Profile Views
  list.push(kpi('doctor_profile_views', 'Doctor Profile Views', 'Discovery',
    'Number of times doctor profiles were viewed.',
    'Count of doctor_profile_view events', 'Count', 'Period',
    'count', a.doctorProfileViews,
    'How often users engage with doctor cards and profiles.',
    'Indicates demand and interest for the teleconsultation service.'));
  // 12. Doctor Search Rate
  list.push(kpi('doctor_search_rate', 'Doctor Search Rate', 'Discovery',
    'Share of total searches that were doctor/speciality searches.',
    'Doctor searches / Total searches × 100', fmtCount(a.doctorSearches), fmtCount(a.totalSearches),
    '%', pct(a.doctorSearches, a.totalSearches),
    `${fmtPct(pct(a.doctorSearches, a.totalSearches))} of searches were for doctors.`,
    'Helps weight product roadmap between medicine discovery and teleconsultation.'));
  // 13. Appointment Conversion Rate
  list.push(kpi('appt_conversion', 'Appointment Conversion Rate', 'Appointments',
    'Share of appointment bookings started that are confirmed.',
    'Confirmed appointments / Appointment starts × 100', fmtCount(a.apptConfirmed), fmtCount(a.apptStarted),
    '%', pct(a.apptConfirmed, a.apptStarted),
    `${fmtPct(pct(a.apptConfirmed, a.apptStarted))} of started bookings result in a confirmed appointment.`,
    'The headline goal-funnel metric for the teleconsultation product.'));
  // 14. Appointment Completion Rate
  list.push(kpi('appt_completion', 'Appointment Completion Rate', 'Appointments',
    'Share of confirmed appointments that reach completion.',
    'Completed appointments / Confirmed appointments × 100', fmtCount(a.apptCompleted), fmtCount(a.apptConfirmed),
    '%', pct(a.apptCompleted, a.apptConfirmed),
    `${fmtPct(pct(a.apptCompleted, a.apptConfirmed))} of confirmed appointments are completed.`,
    'Shows fulfilment of the healthcare consultation journey.'));
  // 15. Appointment Cancellation Rate
  list.push(kpi('appt_cancellation', 'Appointment Cancellation Rate', 'Appointments',
    'Share of confirmed appointments that are cancelled.',
    'Cancelled appointments / Confirmed appointments × 100', fmtCount(a.apptCancelled), fmtCount(a.apptConfirmed),
    '%', pct(a.apptCancelled, a.apptConfirmed),
    `${fmtPct(pct(a.apptCancelled, a.apptConfirmed))} of confirmed appointments were cancelled.`,
    'High cancellation flags friction, timing issues, or trust problems.'));
  // 16. Rescheduling Rate
  list.push(kpi('appt_reschedule', 'Appointment Rescheduling Rate', 'Appointments',
    'Share of confirmed appointments that are rescheduled.',
    'Rescheduled appointments / Confirmed appointments × 100', fmtCount(a.apptRescheduled), fmtCount(a.apptConfirmed),
    '%', pct(a.apptRescheduled, a.apptConfirmed),
    `${fmtPct(pct(a.apptRescheduled, a.apptConfirmed))} of confirmed appointments were rescheduled.`,
    'Rescheduling signals scheduling flexibility needs.'));
  // 17. Medicine Searches
  list.push(kpi('medicine_searches', 'Medicine Searches', 'Medicines',
    'Total medicine search events in the period.',
    'Count of medicine_search events', 'Count', 'Period',
    'count', a.medicineSearches,
    'Volume of medicine demand searches.',
    'Core demand signal for the medicine availability product.'));
  // 18. Medicine Availability Check Rate
  list.push(kpi('availability_check_rate', 'Medicine Availability Check Rate', 'Medicines',
    'Share of medicine views where the user checked pharmacy availability.',
    'Availability checks / Medicine views × 100', fmtCount(a.availabilityChecks), fmtCount(a.medicineViews),
    '%', pct(a.availabilityChecks, a.medicineViews),
    `${fmtPct(pct(a.availabilityChecks, a.medicineViews))} of viewed medicines had stock checked.`,
    'How often interest converts into an availability verification.'));
  // 19. Medicine Availability Rate
  list.push(kpi('availability_rate', 'Medicine Availability Rate', 'Medicines',
    'Percentage of availability checks where the medicine was available.',
    'Available results / Availability checks × 100', fmtCount(a.medAvailable), fmtCount(a.availabilityChecks),
    '%', pct(a.medAvailable, a.availabilityChecks),
    `${fmtPct(pct(a.medAvailable, a.availabilityChecks))} of availability checks returned an in-stock result.`,
    'Directly measures CureConnect\u2019s core promise: connecting users to available medicines.'));
  // 20. Medicine Unavailability Rate
  list.push(kpi('unavailability_rate', 'Medicine Unavailability Rate', 'Medicines',
    'Percentage of availability checks where the medicine was unavailable.',
    'Unavailable results / Availability checks × 100', fmtCount(a.medUnavailable), fmtCount(a.availabilityChecks),
    '%', pct(a.medUnavailable, a.availabilityChecks),
    `${fmtPct(pct(a.medUnavailable, a.availabilityChecks))} of checks returned no stock.`,
    'Unfulfilled demand — the single most actionable supply-side metric.'));
  // 21. Pharmacy Search Rate
  list.push(kpi('pharmacy_search_rate', 'Pharmacy Search Rate', 'Medicines',
    'Share of searches that included pharmacy-level results browsing.',
    'Pharmacy searches / Total searches × 100', fmtCount(a.pharmacySearches), fmtCount(a.totalSearches),
    '%', pct(a.pharmacySearches, a.totalSearches),
    `${fmtPct(pct(a.pharmacySearches, a.totalSearches))} of searches involved pharmacy result sets.`,
    'Shows how far users go into the pharmacy selection layer.'));
  // 22. Medicine Order Conversion Rate
  list.push(kpi('order_conversion', 'Medicine Order Conversion Rate', 'Medicines',
    'Share of started medicine orders that are completed.',
    'Completed orders / Order starts × 100', fmtCount(a.orderCompleted), fmtCount(a.orderStarted),
    '%', pct(a.orderCompleted, a.orderStarted),
    `${fmtPct(pct(a.orderCompleted, a.orderStarted))} of started orders were completed.`,
    'The goal-funnel metric for the medicine reservation product.'));
  // 23. Order Cancellation Rate
  list.push(kpi('order_cancellation', 'Order Cancellation Rate', 'Medicines',
    'Share of completed-order volume cancelled after starting.',
    'Cancelled orders / Order starts × 100', fmtCount(a.orderCancelled), fmtCount(a.orderStarted),
    '%', pct(a.orderCancelled, a.orderStarted),
    `${fmtPct(pct(a.orderCancelled, a.orderStarted))} of started orders were cancelled.`,
    'Dropout after starting a purchase indicates checkout friction.'));
  // 24. Search-to-Result Rate
  list.push(kpi('search_to_result', 'Search-to-Result Rate', 'Conversion',
    'Share of searches that returned at least one result.',
    'Searches with results / Total searches × 100', fmtCount(a.searchesWithResults), fmtCount(a.totalSearches),
    '%', pct(a.searchesWithResults, a.totalSearches),
    `${fmtPct(pct(a.searchesWithResults, a.totalSearches))} of searches returned results.`,
    'Supply coverage; low values mean users search for medicines not in the catalogue.'));
  // 25. Search-to-Action Conversion Rate
  list.push(kpi('search_to_action', 'Search-to-Action Conversion Rate', 'Conversion',
    'Share of searches that led to starting an appointment or medicine order.',
    '(Appointment starts + Order starts) / Total searches × 100', fmtCount(a.apptStarted + a.orderStarted), fmtCount(a.totalSearches),
    '%', pct(a.apptStarted + a.orderStarted, a.totalSearches),
    `${fmtPct(pct(a.apptStarted + a.orderStarted, a.totalSearches))} of searches converted into a booking/order start.`,
    'How effectively search drives downstream commerce and consultation.'));
  // 26. User Retention
  list.push(kpi('user_retention', 'User Retention', 'Audience',
    'Share of users active in the immediate previous period who returned in the current period.',
    'Repeat users / Previous-period active users × 100', 'Users active in both periods', 'Users active in previous period',
    '%', d.retentionPct,
    `${fmtPct(d.retentionPct)} of previously-active users returned in the current period.`,
    'Retention is the strongest signal of product-market fit and long-term growth.'));
  // 27. Feature Adoption Rate
  list.push(kpi('feature_adoption', 'Feature Adoption Rate', 'Audience',
    'Share of active users who engaged with at least one conversion feature (appointments, orders, uploads, reminders).',
    'Feature users / Active users × 100', fmtCount(d.featureUsers), fmtCount(a.activeUsers),
    '%', pct(d.featureUsers, a.activeUsers),
    `${fmtPct(pct(d.featureUsers, a.activeUsers))} of active users used a product feature beyond search.`,
    'Product depth — how many users move from search into feature usage.'));
  // 28. Overall Conversion Rate
  list.push(kpi('overall_conversion', 'Overall Conversion Rate', 'Conversion',
    'Share of sessions that reached a completed goal (appointment confirmed or order completed).',
    'Converting sessions / Total sessions × 100', fmtCount(d.convertingSessions), fmtCount(a.sessions),
    '%', pct(d.convertingSessions, a.sessions),
    `${fmtPct(pct(d.convertingSessions, a.sessions))} of sessions resulted in a confirmed booking or completed order.`,
    'Top-line business health across both product journeys.'));

  // Attach previous-period comparison
  return list;
};

const lastDayActive = (events: Ev[]): number => {
  if (!events.length) return 0;
  const maxTs = Math.max(...events.map((e) => e.ts));
  const start = new Date(maxTs); start.setHours(0, 0, 0, 0);
  const set = new Set<string>();
  events.forEach((e) => { if (e.ts >= start.getTime()) set.add(e.user_id); });
  return set.size;
};

export interface Filters {
  mode: 'real' | 'demo' | 'combined';
  periodStart: number;
  periodEnd: number;
  prevStart: number;
  prevEnd: number;
  device: string;
  userType: string;
  city: string;
  feature: string;
  source: string;
}

const passesFilters = (e: Ev, f: Filters): boolean => {
  if (e.ts < f.periodStart || e.ts > f.periodEnd + 86400000) return false;
  if (f.device !== 'all' && e.device_type !== f.device) return false;
  if (f.userType !== 'all') {
    const guest = isGuest(e.user_id);
    if (f.userType === 'guest' && !guest) return false;
    if (f.userType === 'auth' && guest) return false;
  }
  if (f.city !== 'all' && (e.city || 'Bangalore') !== f.city) return false;
  if (f.feature !== 'all' && featureOf(e.event_name) !== f.feature) return false;
  if (f.source !== 'all' && (e.source || 'direct') !== f.source) return false;
  return true;
};

export interface AnalyticsContext {
  all: Ev[];
  real: Ev[];
  demo: Ev[];
  visible: Ev[];
  previous: Ev[];
  filters: Filters;
  periodLabel: string;
  previousLabel: string;
  agg: Aggregates;
  prevAgg: Aggregates;
  kpis: KPI[];
  usersWithPrior: Set<string>;
  retentionPct: number;
  featureUsers: number;
  convertingSessions: number;
  activeUsersTrailing7: number;
  activeUsersTrailing30: number;
  trends: DailyTrend[];
}

export const buildContext = (events: Ev[], filters: Filters): AnalyticsContext => {
  const real = events.filter((e) => !e.is_demo);
  const demo = events.filter((e) => e.is_demo);
  const sourcePool = filters.mode === 'real' ? real : filters.mode === 'demo' ? demo : events;

  const visible = sourcePool.filter((e) => passesFilters(e, filters));
  const previous = sourcePool.filter((e) => e.ts >= filters.prevStart && e.ts < filters.prevEnd && e.ts > 0 &&
    (filters.device === 'all' || e.device_type === filters.device) &&
    (filters.userType === 'all' || (filters.userType === 'guest' ? isGuest(e.user_id) : !isGuest(e.user_id))) &&
    (filters.city === 'all' || (e.city || 'Bangalore') === filters.city) &&
    (filters.feature === 'all' || featureOf(e.event_name) === filters.feature) &&
    (filters.source === 'all' || (e.source || 'direct') === filters.source));

  // users with prior activity: earliest event (in sourcePool) before the period start
  const firstByUser = new Map<string, number>();
  sourcePool.forEach((e) => {
    if (!firstByUser.has(e.user_id) || e.ts < firstByUser.get(e.user_id)!) firstByUser.set(e.user_id, e.ts);
  });
  const usersWithPrior = new Set<string>();
  firstByUser.forEach((ts, uid) => { if (ts < filters.periodStart) usersWithPrior.add(uid); });

  const agg = aggregate(visible, usersWithPrior);
  const prevAgg = aggregate(previous);

  const featureUsers = new Set<string>();
  visible.forEach((e) => {
    const f = featureOf(e.event_name);
    if (['appointment', 'medicine', 'doctor', 'auth', 'other'].includes(f)) featureUsers.add(e.user_id);
  });

  // converting sessions
  const convSessions = new Set<string>();
  visible.forEach((e) => {
    if (([EVENTS.APPOINTMENT_CONFIRMED, EVENTS.MEDICINE_ORDER_COMPLETED] as string[]).includes(e.event_name)) convSessions.add(e.session_id);
  });

  const previousConvSessions = new Set<string>();
  previous.forEach((e) => {
    if (([EVENTS.APPOINTMENT_CONFIRMED, EVENTS.MEDICINE_ORDER_COMPLETED] as string[]).includes(e.event_name)) previousConvSessions.add(e.session_id);
  });

  // change % per KPI (computed per KPI below)
  const build = buildKpis({
    a: agg, events: visible, usersWithPrior, periodLabel: 'period', previousLabel: 'prev',
    activeUsersTrailing7: 0, activeUsersTrailing30: 0,
    retentionPct: 0, featureUsers: featureUsers.size, convertingSessions: convSessions.size,
  });

  // Trailing windows
  const end = filters.periodEnd + 86400000;
  const t7 = end - 7 * 86400000;
  const t30 = end - 30 * 86400000;
  const u7 = new Set<string>(); const u30 = new Set<string>();
  sourcePool.forEach((e) => {
    if (e.ts >= t7 && e.ts <= end && passesDim(e, filters)) u7.add(e.user_id);
    if (e.ts >= t30 && e.ts <= end && passesDim(e, filters)) u30.add(e.user_id);
  });

  // previous-period trailing windows (for WAU/MAU period-over-period change)
  const prevEnd = filters.prevEnd;
  const retentionPct = prevAgg.activeUsers > 0 ? pct(previousActiveAndCurrent(sourcePool, filters), prevAgg.activeUsers) : 0;
  const pt7 = prevEnd - 7 * 86400000;
  const pt30 = prevEnd - 30 * 86400000;
  const pU7 = new Set<string>(); const pU30 = new Set<string>();
  sourcePool.forEach((e) => {
    if (e.ts >= pt7 && e.ts < prevEnd && passesDim(e, filters)) pU7.add(e.user_id);
    if (e.ts >= pt30 && e.ts < prevEnd && passesDim(e, filters)) pU30.add(e.user_id);
  });

  const kpisRaw = computeKpiChanges(build, agg, prevAgg, retentionPct, featureUsers.size, convSessions.size, u7.size, u30.size, pU7.size, pU30.size, visible, previous, previousConvSessions.size);

  const trends = buildDailyTrends(visible);
  const kpis = kpisRaw.map((k) => {
    const s = trendSeriesFor(k.id, trends);
    return { ...k, trend: s.trend, trendLabels: s.trendLabels };
  });

  const periodLabel = `${new Date(filters.periodStart).toLocaleDateString()} → ${new Date(filters.periodEnd).toLocaleDateString()}`;
  const previousLabel = `${new Date(filters.prevStart).toLocaleDateString()} → ${new Date(filters.prevEnd).toLocaleDateString()}`;

  return {
    all: events, real, demo, visible, previous, filters,
    periodLabel, previousLabel,
    agg, prevAgg, kpis, usersWithPrior, retentionPct,
    featureUsers: featureUsers.size,
    convertingSessions: convSessions.size,
    activeUsersTrailing7: u7.size, activeUsersTrailing30: u30.size,
    trends,
  };
};

const passesDim = (e: Ev, f: Filters): boolean => {
  if (f.device !== 'all' && e.device_type !== f.device) return false;
  if (f.userType !== 'all') {
    const g = isGuest(e.user_id);
    if (f.userType === 'guest' && !g) return false;
    if (f.userType === 'auth' && g) return false;
  }
  if (f.city !== 'all' && (e.city || 'Bangalore') !== f.city) return false;
  if (f.feature !== 'all' && featureOf(e.event_name) !== f.feature) return false;
  if (f.source !== 'all' && (e.source || 'direct') !== f.source) return false;
  return true;
};

const previousActiveAndCurrent = (pool: Ev[], f: Filters): number => {
  const prevSet = new Set<string>();
  const curSet = new Set<string>();
  pool.forEach((e) => {
    if (!passesDim(e, f)) return;
    if (e.ts >= f.prevStart && e.ts < f.prevEnd) prevSet.add(e.user_id);
    if (e.ts >= f.periodStart && e.ts <= f.periodEnd + 86400000) curSet.add(e.user_id);
  });
  let n = 0;
  prevSet.forEach((u) => { if (curSet.has(u)) n++; });
  return n;
};

const computeKpiChanges = (
  kpis: KPI[],
  agg: Aggregates,
  prevAgg: Aggregates,
  retentionPct: number,
  featureUsers: number,
  convertingSessions: number,
  u7: number,
  u30: number,
  prevU7: number,
  prevU30: number,
  events: Ev[],
  previousEvents: Ev[],
  previousConvertingSessions: number,
): KPI[] => {
  const map: Record<string, { value: number }> = {
    total_users: { value: agg.activeUsers },
    new_users: { value: agg.newUsers },
    active_users: { value: agg.activeUsers },
    dau: { value: lastDayActive(events) },
    wau: { value: u7 },
    mau: { value: u30 },
    returning_rate: { value: pct(agg.returningUsers, agg.activeUsers) },
    sessions: { value: agg.sessions },
    avg_session_duration: { value: agg.sessionDurationAvg },
    pages_per_session: { value: agg.pagesPerSession },
    doctor_profile_views: { value: agg.doctorProfileViews },
    doctor_search_rate: { value: pct(agg.doctorSearches, agg.totalSearches) },
    appt_conversion: { value: pct(agg.apptConfirmed, agg.apptStarted) },
    appt_completion: { value: pct(agg.apptCompleted, agg.apptConfirmed) },
    appt_cancellation: { value: pct(agg.apptCancelled, agg.apptConfirmed) },
    appt_reschedule: { value: pct(agg.apptRescheduled, agg.apptConfirmed) },
    medicine_searches: { value: agg.medicineSearches },
    availability_check_rate: { value: pct(agg.availabilityChecks, agg.medicineViews) },
    availability_rate: { value: pct(agg.medAvailable, agg.availabilityChecks) },
    unavailability_rate: { value: pct(agg.medUnavailable, agg.availabilityChecks) },
    pharmacy_search_rate: { value: pct(agg.pharmacySearches, agg.totalSearches) },
    order_conversion: { value: pct(agg.orderCompleted, agg.orderStarted) },
    order_cancellation: { value: pct(agg.orderCancelled, agg.orderStarted) },
    search_to_result: { value: pct(agg.searchesWithResults, agg.totalSearches) },
    search_to_action: { value: pct(agg.apptStarted + agg.orderStarted, agg.totalSearches) },
    user_retention: { value: retentionPct },
    feature_adoption: { value: pct(featureUsers, agg.activeUsers) },
    overall_conversion: { value: pct(convertingSessions, agg.sessions) },
  };

  const prevMap: Record<string, { value: number }> = {
    total_users: { value: prevAgg.activeUsers },
    new_users: { value: prevAgg.newUsers },
    active_users: { value: prevAgg.activeUsers },
    dau: { value: lastDayActive(previousEvents) },
    wau: { value: prevU7 },
    mau: { value: prevU30 },
    returning_rate: { value: pct(prevAgg.returningUsers, prevAgg.activeUsers) },
    sessions: { value: prevAgg.sessions },
    avg_session_duration: { value: prevAgg.sessionDurationAvg },
    pages_per_session: { value: prevAgg.pagesPerSession },
    doctor_profile_views: { value: prevAgg.doctorProfileViews },
    doctor_search_rate: { value: pct(prevAgg.doctorSearches, prevAgg.totalSearches) },
    appt_conversion: { value: pct(prevAgg.apptConfirmed, prevAgg.apptStarted) },
    appt_completion: { value: pct(prevAgg.apptCompleted, prevAgg.apptConfirmed) },
    appt_cancellation: { value: pct(prevAgg.apptCancelled, prevAgg.apptConfirmed) },
    appt_reschedule: { value: pct(prevAgg.apptRescheduled, prevAgg.apptConfirmed) },
    medicine_searches: { value: prevAgg.medicineSearches },
    availability_check_rate: { value: pct(prevAgg.availabilityChecks, prevAgg.medicineViews) },
    availability_rate: { value: pct(prevAgg.medAvailable, prevAgg.availabilityChecks) },
    unavailability_rate: { value: pct(prevAgg.medUnavailable, prevAgg.availabilityChecks) },
    pharmacy_search_rate: { value: pct(prevAgg.pharmacySearches, prevAgg.totalSearches) },
    order_conversion: { value: pct(prevAgg.orderCompleted, prevAgg.orderStarted) },
    order_cancellation: { value: pct(prevAgg.orderCancelled, prevAgg.orderStarted) },
    search_to_result: { value: pct(prevAgg.searchesWithResults, prevAgg.totalSearches) },
    search_to_action: { value: pct(prevAgg.apptStarted + prevAgg.orderStarted, prevAgg.totalSearches) },
    overall_conversion: { value: pct(previousConvertingSessions, prevAgg.sessions) },
  };

  return kpis.map((k) => {
    const cur = map[k.id];
    const prev = prevMap[k.id];
    const previousValue = prev ? prev.value : null;
    let changePct: number | null = null;
    if (prev && prev.value !== 0 && cur && cur.value !== 0) changePct = ((cur.value - prev.value) / Math.abs(prev.value)) * 100;
    return { ...k, value: cur ? cur.value : k.value, previousValue, changePct };
  });
};

// ─── Funnels ────────────────────────────────────────────────────────────────

export interface FunnelStage {
  key: string;
  label: string;
  users: number;
  events: number;
  conversionToPrev: number | null; // % of previous stage
  cumulativeConversion: number;    // % of stage-1
  dropoffPct: number | null;       // % who dropped between prev and this
}

export interface Funnel {
  id: string;
  name: string;
  description: string;
  stages: FunnelStage[];
  biggestDropoff: { from: string; to: string; pct: number } | null;
}

const usersAt = (events: Ev[], eventName: string | string[]): { users: Set<string>; events: number } => {
  const names = Array.isArray(eventName) ? eventName : [eventName];
  const users = new Set<string>();
  let count = 0;
  events.forEach((e) => { if (names.includes(e.event_name)) { users.add(e.user_id); count++; } });
  return { users, events: count };
};

export const buildFunnels = (visible: Ev[]): Funnel[] => {
  const build = (id: string, name: string, description: string, stagesDef: { key: string; label: string; ev: string | string[] }[]): Funnel => {
    const stages: FunnelStage[] = [];
    let prevUsers: number | null = null;
    for (let i = 0; i < stagesDef.length; i++) {
      const def = stagesDef[i];
      const { users, events } = usersAt(visible, def.ev);
      const count = users.size;
      const conversionToPrev = prevUsers !== null && prevUsers > 0 ? (count / prevUsers) * 100 : i === 0 ? 100 : null;
      const cumulative = count / Math.max(1, stagesDef[0] && usersAt(visible, stagesDef[0].ev).users.size) * 100;
      const dropoffPct = i > 0 && prevUsers !== null && prevUsers > 0 ? 100 - (count / prevUsers) * 100 : null;
      stages.push({
        key: def.key, label: def.label, users: count, events,
        conversionToPrev, cumulativeConversion: cumulative, dropoffPct,
      });
      prevUsers = count;
    }
    let biggestDropoff: Funnel['biggestDropoff'] = null;
    for (let i = 1; i < stages.length; i++) {
      if (stages[i].dropoffPct === null) continue;
      if (!biggestDropoff || stages[i].dropoffPct! > biggestDropoff.pct) {
        biggestDropoff = { from: stages[i - 1].label, to: stages[i].label, pct: stages[i].dropoffPct! };
      }
    }
    return { id, name, description, stages, biggestDropoff };
  };

  const medicine = build('medicine_funnel', 'Medicine Discovery Funnel',
    'How users move from arriving on the platform to completing a medicine reservation.',
    [
      { key: 'landing', label: 'Landing', ev: EVENTS.PAGE_VIEW },
      { key: 'search', label: 'Medicine Search', ev: EVENTS.MEDICINE_SEARCH },
      { key: 'view', label: 'Medicine Viewed', ev: EVENTS.MEDICINE_VIEW },
      { key: 'avail', label: 'Availability Checked', ev: EVENTS.AVAILABILITY_CHECK },
      { key: 'start', label: 'Order Started', ev: EVENTS.MEDICINE_ORDER_STARTED },
      { key: 'complete', label: 'Order Completed', ev: EVENTS.MEDICINE_ORDER_COMPLETED },
    ]);

  const doctor = build('appointment_funnel', 'Appointment Booking Funnel',
    'How users move from arriving on the platform to completing a doctor consultation.',
    [
      { key: 'landing', label: 'Landing', ev: EVENTS.PAGE_VIEW },
      { key: 'doctor_list', label: 'Doctor List Viewed', ev: EVENTS.DOCTOR_LIST_VIEW },
      { key: 'profile', label: 'Doctor Profile Viewed', ev: EVENTS.DOCTOR_PROFILE_VIEW },
      { key: 'start', label: 'Appointment Started', ev: EVENTS.APPOINTMENT_STARTED },
      { key: 'confirm', label: 'Appointment Confirmed', ev: EVENTS.APPOINTMENT_CONFIRMED },
      { key: 'complete', label: 'Appointment Completed', ev: EVENTS.APPOINTMENT_COMPLETED },
    ]);

  return [medicine, doctor];
};

// ─── Segments ───────────────────────────────────────────────────────────────

export interface UserStat {
  id: string;
  isGuest: boolean;
  firstTs: number;
  lastTs: number;
  sessions: number;
  actions: number;
  searches: number;
  apptStarted: number;
  apptConfirmed: number;
  apptCompleted: number;
  orderStarted: number;
  orderCompleted: number;
  orderCancelled: number;
  featureEvents: number;
  topEvent: string;
  topEventCount: number;
  hasAppointment: boolean;
  hasMedicine: boolean;
  hasGoal: boolean;
}

export const buildUserStats = (events: Ev[], periodStart: number): Map<string, UserStat> => {
  const map = new Map<string, UserStat>();
  const topEventTracker = new Map<string, Map<string, number>>();
  events.forEach((e) => {
    let s = map.get(e.user_id);
    if (!s) {
      s = {
        id: e.user_id, isGuest: isGuest(e.user_id), firstTs: e.ts, lastTs: e.ts, sessions: new Set<string>().size,
        actions: 0, searches: 0, apptStarted: 0, apptConfirmed: 0, apptCompleted: 0,
        orderStarted: 0, orderCompleted: 0, orderCancelled: 0, featureEvents: 0,
        topEvent: '', topEventCount: 0, hasAppointment: false, hasMedicine: false, hasGoal: false,
      };
      map.set(e.user_id, s);
    }
    s.firstTs = Math.min(s.firstTs, e.ts);
    s.lastTs = Math.max(s.lastTs, e.ts);
    s.actions++;
    if (APPT_EVENTS.has(e.event_name)) s.hasAppointment = true;
    if (MEDICINE_EVENTS.has(e.event_name)) s.hasMedicine = true;
    if (GOAL_CONFIRM.has(e.event_name)) s.hasGoal = true;
    if (SEARCH_EVENTS.has(e.event_name)) s.searches++;
    if (e.event_name === EVENTS.APPOINTMENT_STARTED) s.apptStarted++;
    if (e.event_name === EVENTS.APPOINTMENT_CONFIRMED) s.apptConfirmed++;
    if (e.event_name === EVENTS.APPOINTMENT_COMPLETED) s.apptCompleted++;
    if (e.event_name === EVENTS.MEDICINE_ORDER_STARTED) s.orderStarted++;
    if (e.event_name === EVENTS.MEDICINE_ORDER_COMPLETED) s.orderCompleted++;
    if (e.event_name === EVENTS.MEDICINE_ORDER_CANCELLED) s.orderCancelled++;
    if (!([EVENTS.PAGE_VIEW, EVENTS.SESSION_STARTED, EVENTS.SESSION_ENDED] as string[]).includes(e.event_name)) s.featureEvents++;

    if (e.event_name !== EVENTS.PAGE_VIEW) {
      const perUser = topEventTracker.get(e.user_id) || new Map<string, number>();
      perUser.set(e.event_name, (perUser.get(e.event_name) || 0) + 1);
      topEventTracker.set(e.user_id, perUser);
    }
  });

  // sessions count
  const sessionCount = new Map<string, number>();
  events.forEach((e) => {
    sessionCount.set(e.session_id, (sessionCount.get(e.session_id) || 0) + 1);
  });
  const userSessions = new Map<string, Set<string>>();
  events.forEach((e) => {
    if (!userSessions.has(e.user_id)) userSessions.set(e.user_id, new Set());
    userSessions.get(e.user_id)!.add(e.session_id);
  });
  map.forEach((s) => { s.sessions = userSessions.get(s.id)?.size || 1; });
  topEventTracker.forEach((perUser, uid) => {
    let best = ''; let bestCount = 0;
    perUser.forEach((c, n) => { if (c > bestCount) { bestCount = c; best = n; } });
    const s = map.get(uid);
    if (s) { s.topEvent = best; s.topEventCount = bestCount; }
  });
  return map;
};

export interface Segment extends UserStat {
  segmentId: string;
  segmentName: string;
  segmentDescription: string;
  rule: string;
  pctOfActive: number;
  avgSessions: number;
  avgActions: number;
  conversionRate: number;
  totalActive: number;
}

export const buildSegments = (visible: Ev[], periodStart: number, periodEnd: number): Segment[] => {
  const users = buildUserStats(visible, periodStart);
  const totalActive = users.size;

  const mk = (identity: string, name: string, description: string, rule: string, predicate: (u: UserStat) => boolean): Segment[] => {
    const rows = Array.from(users.values()).filter(predicate);
    const avgSessions = rows.length ? +(rows.reduce((a, b) => a + b.sessions, 0) / rows.length).toFixed(2) : 0;
    const avgActions = rows.length ? +(rows.reduce((a, b) => a + b.actions, 0) / rows.length).toFixed(2) : 0;
    const converters = rows.filter((r) => r.hasGoal);
    const conversionRate = rows.length ? (converters.length / rows.length) * 100 : 0;
    const topBehavior = mostCommon(rows.map((r) => r.topEvent).filter(Boolean));
    return rows.map((u) => ({
      ...u,
      segmentId: identity, segmentName: name, segmentDescription: description, rule,
      pctOfActive: rows.length ? (rows.length / totalActive) * 100 : 0,
      avgSessions, avgActions, conversionRate, totalActive,
      topEvent: topBehavior || u.topEvent,
    } as Segment));
  };

  const mostCommon = (arr: string[]): string => {
    if (!arr.length) return '';
    const m = new Map<string, number>();
    arr.forEach((x) => m.set(x, (m.get(x) || 0) + 1));
    let best = ''; let bestN = 0;
    m.forEach((c, k) => { if (c > bestN) { bestN = c; best = k; } });
    return best;
  };

  const result: Segment[] = [];
  result.push(...mk('new_users', 'New Users',
    'Users whose first recorded interaction with CureConnect happened inside the selected period.',
    'firstTs >= periodStart',
    (u) => u.firstTs >= periodStart && !u.isGuest));
  result.push(...mk('returning_users', 'Returning Users',
    'Users who had prior activity before the selected period began, or who appear across multiple sessions.',
    'firstTs < periodStart or sessions > 1',
    (u) => u.firstTs < periodStart && u.sessions > 1));
  result.push(...mk('highly_engaged', 'Highly Engaged Users',
    'Users with strong usage depth — 3+ sessions or 10+ meaningful actions in the period.',
    'sessions >= 3 OR actions >= 10',
    (u) => u.sessions >= 3 || u.actions >= 10));
  result.push(...mk('low_engagement', 'Low Engagement Users',
    'Users with a single shallow session and almost no meaningful actions.',
    'sessions == 1 AND actions <= 3 AND no goal',
    (u) => u.sessions === 1 && u.actions <= 3 && !u.hasGoal));
  result.push(...mk('appointment_focused', 'Appointment-focused Users',
    'Users whose activity centres on the teleconsultation / appointment journey.',
    'any appointment_* event',
    (u) => u.hasAppointment));
  result.push(...mk('medicine_focused', 'Medicine-focused Users',
    'Users whose activity centres on medicine discovery and ordering.',
    'any medicine_* / pharmacy_* event',
    (u) => u.hasMedicine && !u.hasAppointment));
  result.push(...mk('search_heavy', 'Search-heavy Users',
    'Users who ran a high number of searches relative to cohort (5+ searches in the period).',
    'searches >= 5',
    (u) => u.searches >= 5));
  result.push(...mk('booking_abandoners', 'Booking Abandoners',
    'Users who started booking an appointment but never confirmed in the period.',
    'apptStarted > 0 AND apptConfirmed == 0',
    (u) => u.apptStarted > 0 && u.apptConfirmed === 0));
  result.push(...mk('order_abandoners', 'Medicine Search Abandoners',
    'Users who searched medicines but never started an order in the period.',
    'hasMedicine AND orderStarted == 0',
    (u) => u.hasMedicine && u.orderStarted === 0));
  result.push(...mk('completers', 'Users who Complete Appointments/Orders',
    'Users who reached a completed conversion goal (confirmed appointment or completed order).',
    'hasGoal',
    (u) => u.hasGoal));

  return result;
};

// ─── Patterns ───────────────────────────────────────────────────────────────

export interface Patterns {
  features: { label: string; count: number; pct: number }[];
  topMedicines: { label: string; count: number }[];
  topSpecialties: { label: string; count: number }[];
  topDoctors: { label: string; count: number }[];
  peakHours: { hour: number; count: number }[];
  peakDays: { day: number; label: string; count: number }[];
  navPaths: { path: string[]; count: number; goals: number }[];
  searchPatterns: { label: string; count: number }[];
  highDropoffPages: { page: string; count: number }[];
  highConversionPages: { page: string; conversions: number; entrance: number }[];
  returningVsNew: { group: string; avgActions: number; sessions: number; conversionRate: number }[];
  mobileVsDesktop: { device: string; sessions: number; conversionRate: number }[];
  apptAbandonment: { started: number; confirmed: number; rate: number };
  medAbandonment: { searches: number; ordersStarted: number; rate: number };
}

export const buildPatterns = (visible: Ev[], ctx: AnalyticsContext): Patterns => {
  const counts = (key: (e: Ev) => string, filter?: (e: Ev) => boolean) => {
    const m = new Map<string, number>();
    visible.forEach((e) => {
      if (filter && !filter(e)) return;
      const k = key(e);
      if (!k) return;
      m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  };

  const features = counts((e) => {
    const page = e.page || '/';
    if (page.includes('teleconsult')) return 'Teleconsultation';
    if (page.includes('cart')) return 'Cart / Checkout';
    if (page.includes('reminders')) return 'Reminders';
    if (page.includes('upload')) return 'Prescription Upload';
    if (page.includes('emergency')) return 'Emergency';
    if (page.includes('dbt')) return 'DBT Analytics';
    if (page === '/' || page === '') return 'Home / Medicine Search';
    return page;
  });
  const featuresTotal = features.reduce((a, b) => a + b.count, 0);

  const topMedicines = counts((e) => e.event_name === EVENTS.MEDICINE_SEARCH ? e.search_query || e.metadata?.medicine_name || '' : '', (e) => e.event_name === EVENTS.MEDICINE_SEARCH).slice(0, 10);
  const topSpecialties = counts((e) => (e.event_name === EVENTS.SPECIALITY_SELECTED || e.event_name === EVENTS.DOCTOR_SEARCH) ? (e.category || '') : '', (e) => e.event_name === EVENTS.SPECIALITY_SELECTED || e.event_name === EVENTS.DOCTOR_SEARCH).slice(0, 10);
  const topDoctors = counts((e) => {
    if (e.event_name !== EVENTS.DOCTOR_PROFILE_VIEW) return '';
    const name = e.metadata?.doctor_name;
    if (name) return name;
    const id = String(e.doctor_id || '');
    const known: Record<string, string> = { '1': 'Dr. Anjali Sharma', '2': 'Dr. Rajesh Kumar', '3': 'Dr. Priya Singh', '4': 'Dr. Vikram Rao', '5': 'Dr. Neha Gupta', '6': 'Dr. Arun Mehta', '7': 'Dr. Kavita Nair', '8': 'Dr. Suresh Iyer' };
    return known[id] || `Doctor ${id || 'unknown'}`;
  }, (e) => e.event_name === EVENTS.DOCTOR_PROFILE_VIEW).slice(0, 10);

  const hours = new Array(24).fill(0);
  const days = new Array(7).fill(0);
  visible.forEach((e) => {
    const h = typeof e.local_hour === 'number' ? e.local_hour : new Date(e.ts).getHours();
    hours[Math.min(23, Math.max(0, h))]++;
    const d = typeof e.day_of_week === 'number' ? e.day_of_week : new Date(e.ts).getDay();
    days[d]++;
  });

  // navigation paths from page_view per session
  const sessions = new Map<string, string[]>();
  visible.forEach((e) => {
    if (e.event_name === EVENTS.PAGE_VIEW) {
      if (!sessions.has(e.session_id)) sessions.set(e.session_id, []);
      sessions.get(e.session_id)!.push(shortPage(e.page));
    }
  });
  const goalSessions = new Set<string>();
  visible.forEach((e) => {
    if (GOAL_CONFIRM.has(e.event_name)) goalSessions.add(e.session_id);
  });
  const pathCount = new Map<string, { count: number; goals: number; path: string[] }>();
  sessions.forEach((path, sid) => {
    if (!path.length) return;
    if (path.length > 8) path = path.slice(0, 8);
    const key = path.join(' → ');
    const entry = pathCount.get(key) || { count: 0, goals: 0, path };
    entry.count++;
    if (goalSessions.has(sid)) entry.goals++;
    pathCount.set(key, entry);
  });
  const navPaths = Array.from(pathCount.values()).sort((a, b) => b.count - a.count).slice(0, 8);

  const searchPatterns = counts((e) => {
    if (!SEARCH_EVENTS.has(e.event_name)) return '';
    const len = (e.search_query || '').length;
    if (len <= 4) return 'Short query (≤4 chars)';
    if (len <= 10) return 'Medium query (5–10 chars)';
    return 'Long query (>10 chars)';
  }, (e) => SEARCH_EVENTS.has(e.event_name));

  // high drop-off pages: pages that are the LAST page of sessions without a goal
  const exitCount = new Map<string, number>();
  sessions.forEach((path, sid) => {
    const last = path[path.length - 1];
    if (!goalSessions.has(sid)) exitCount.set(last, (exitCount.get(last) || 0) + 1);
  });
  const highDropoffPages = Array.from(exitCount.entries()).map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count).slice(0, 6);

  // high-conversion pages: enter + goals
  const entranceCount = new Map<string, number>();
  const pageGoalCount = new Map<string, number>();
  sessions.forEach((path, sid) => {
    const pages = new Set(path);
    pages.forEach((p) => entranceCount.set(p, (entranceCount.get(p) || 0) + 1));
    if (goalSessions.has(sid)) {
      pages.forEach((p) => pageGoalCount.set(p, (pageGoalCount.get(p) || 0) + 1));
    }
  });
  const highConversionPages = Array.from(entranceCount.entries())
    .filter(([, c]) => c >= 2)
    .map(([page, entrance]) => ({ page, entrance, conversions: pageGoalCount.get(page) || 0 }))
    .sort((a, b) => (b.conversions / b.entrance) - (a.conversions / a.entrance)).slice(0, 6);

  // returning vs new
  const userStats = buildUserStats(visible, ctx.filters.periodStart);
  const returning = Array.from(userStats.values()).filter((u) => u.firstTs < ctx.filters.periodStart);
  const newU = Array.from(userStats.values()).filter((u) => u.firstTs >= ctx.filters.periodStart);
  const groupStats = (rows: UserStat[]) => {
    const avgActions = rows.length ? +(rows.reduce((a, b) => a + b.actions, 0) / rows.length).toFixed(1) : 0;
    const sessions = rows.length ? +(rows.reduce((a, b) => a + b.sessions, 0) / rows.length).toFixed(1) : 0;
    const conversionRate = rows.length ? (rows.filter((x) => x.hasGoal).length / rows.length) * 100 : 0;
    return { avgActions, sessions, conversionRate };
  };
  const returningVsNew = [
    { group: 'Returning Users', ...groupStats(returning) },
    { group: 'New Users', ...groupStats(newU) },
  ];

  // mobile vs desktop
  const deviceSessions = new Map<string, Set<string>>();
  const deviceGoals = new Map<string, Set<string>>();
  visible.forEach((e) => {
    const d = e.device_type || 'desktop';
    if (!deviceSessions.has(d)) deviceSessions.set(d, new Set());
    deviceSessions.get(d)!.add(e.session_id);
    if (GOAL_CONFIRM.has(e.event_name)) {
      if (!deviceGoals.has(d)) deviceGoals.set(d, new Set());
      deviceGoals.get(d)!.add(e.session_id);
    }
  });
  const mobileVsDesktop = Array.from(deviceSessions.entries()).map(([device, s]) => ({
    device,
    sessions: s.size,
    conversionRate: s.size ? (deviceGoals.get(device)?.size || 0) / s.size * 100 : 0,
  }));

  // abandonment patterns
  const apptStarted = visible.filter((e) => e.event_name === EVENTS.APPOINTMENT_STARTED).length;
  const apptConfirmed = visible.filter((e) => e.event_name === EVENTS.APPOINTMENT_CONFIRMED).length;
  const medSearches = visible.filter((e) => e.event_name === EVENTS.MEDICINE_SEARCH).length;
  const ordersStarted = visible.filter((e) => e.event_name === EVENTS.MEDICINE_ORDER_STARTED).length;

  return {
    features: features.map((f) => ({ ...f, pct: featuresTotal ? (f.count / featuresTotal) * 100 : 0 })),
    topMedicines, topSpecialties, topDoctors,
    peakHours: hours.map((count, hour) => ({ hour, count })),
    peakDays: days.map((count, day) => ({ day, count, label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] })),
    navPaths, searchPatterns, highDropoffPages, highConversionPages,
    returningVsNew, mobileVsDesktop,
    apptAbandonment: { started: apptStarted, confirmed: apptConfirmed, rate: apptStarted ? (1 - apptConfirmed / apptStarted) * 100 : 0 },
    medAbandonment: { searches: medSearches, ordersStarted, rate: medSearches ? (1 - ordersStarted / medSearches) * 100 : 0 },
  };
};

const shortPage = (page: string): string => {
  if (!page) return 'Home';
  const p = page.split('?')[0];
  if (p === '/' || p === '') return 'Home';
  if (p.includes('cart')) return 'Cart';
  if (p.includes('teleconsult')) return 'Consult';
  if (p.includes('reminders')) return 'Reminders';
  if (p.includes('upload')) return 'Upload Rx';
  if (p.includes('emergency')) return 'Emergency';
  return p.replace(/^\//, '').split('/')[0].replace(/^./, (c) => c.toUpperCase());
};

// ─── Daily trends ────────────────────────────────────────────────────────────

export interface DailyTrend {
  ts: number;
  label: string;
  sessions: number;
  users: number;
  newUsers: number;
  pageViews: number;
  searches: number;
  medSearches: number;
  doctorSearches: number;
  apptStarted: number;
  apptConfirmed: number;
  apptCompleted: number;
  orderStarted: number;
  orderCompleted: number;
  convertingSessions: number;
}

export const buildDailyTrends = (events: Ev[]): DailyTrend[] => {
  const byDay = new Map<number, {
    ts: number; sessions: Set<string>; users: Set<string>; pageViews: number;
    searches: number; medSearches: number; doctorSearches: number;
    apptStarted: number; apptConfirmed: number; apptCompleted: number;
    orderStarted: number; orderCompleted: number; convertingSessions: Set<string>;
  }>();
  const firstTs = new Map<string, number>();
  events.forEach((e) => {
    if (!firstTs.has(e.user_id) || e.ts < firstTs.get(e.user_id)!) firstTs.set(e.user_id, e.ts);
  });

  events.forEach((e) => {
    const d = new Date(e.ts); d.setHours(0, 0, 0, 0);
    const key = d.getTime();
    let r = byDay.get(key);
    if (!r) {
      r = {
        ts: key, sessions: new Set(), users: new Set(), pageViews: 0,
        searches: 0, medSearches: 0, doctorSearches: 0,
        apptStarted: 0, apptConfirmed: 0, apptCompleted: 0,
        orderStarted: 0, orderCompleted: 0, convertingSessions: new Set(),
      };
      byDay.set(key, r);
    }
    r.sessions.add(e.session_id);
    r.users.add(e.user_id);
    if (e.event_name === EVENTS.PAGE_VIEW) r.pageViews++;
    if (e.event_name === EVENTS.MEDICINE_SEARCH) { r.searches++; r.medSearches++; }
    if (e.event_name === EVENTS.DOCTOR_SEARCH) { r.searches++; r.doctorSearches++; }
    if (e.event_name === EVENTS.APPOINTMENT_STARTED) r.apptStarted++;
    if (e.event_name === EVENTS.APPOINTMENT_CONFIRMED) { r.apptConfirmed++; r.convertingSessions.add(e.session_id); }
    if (e.event_name === EVENTS.APPOINTMENT_COMPLETED) r.apptCompleted++;
    if (e.event_name === EVENTS.MEDICINE_ORDER_STARTED) r.orderStarted++;
    if (e.event_name === EVENTS.MEDICINE_ORDER_COMPLETED) { r.orderCompleted++; r.convertingSessions.add(e.session_id); }
  });

  return Array.from(byDay.values()).sort((a, b) => a.ts - b.ts).map((r) => ({
    ts: r.ts,
    label: new Date(r.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    sessions: r.sessions.size,
    users: r.users.size,
    newUsers: Array.from(r.users).filter((u) => firstTs.get(u) === r.ts).length,
    pageViews: r.pageViews,
    searches: r.searches,
    medSearches: r.medSearches,
    doctorSearches: r.doctorSearches,
    apptStarted: r.apptStarted,
    apptConfirmed: r.apptConfirmed,
    apptCompleted: r.apptCompleted,
    orderStarted: r.orderStarted,
    orderCompleted: r.orderCompleted,
    convertingSessions: r.convertingSessions.size,
  }));
};

export const trendSeriesFor = (id: string, trends: DailyTrend[]): { trend: number[]; trendLabels: string[] } => {
  const vals = trends.map((t) => {
    switch (id) {
      case 'sessions': return t.sessions;
      case 'new_users': return t.newUsers;
      case 'dau':
      case 'active_users': return t.users;
      case 'medicine_searches': return t.medSearches;
      case 'doctor_profile_views':
      case 'doctor_search_rate': return t.doctorSearches;
      case 'appt_conversion': return t.apptStarted > 0 ? Math.round((t.apptConfirmed / t.apptStarted) * 100 * 10) / 10 : 0;
      case 'appt_completion': return t.apptConfirmed > 0 ? Math.round((t.apptCompleted / t.apptConfirmed) * 100 * 10) / 10 : 0;
      case 'order_conversion': return t.orderStarted > 0 ? Math.round((t.orderCompleted / t.orderStarted) * 100 * 10) / 10 : 0;
      case 'overall_conversion': return t.sessions > 0 ? Math.round((t.convertingSessions / t.sessions) * 100 * 10) / 10 : 0;
      default: return t.users;
    }
  });
  return { trend: vals, trendLabels: trends.map((t) => t.label) };
};