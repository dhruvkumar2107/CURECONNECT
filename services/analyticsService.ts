import { db } from './firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AnalyticsEvent } from '../types';

// ─── Event Name Registry ────────────────────────────────────────────────────
// Every meaningful user action across the CureConnect journey is tracked here.
// These events power all KPIs, funnels, segments and insights in the
// product analytics dashboard.

export const EVENTS = {
  // USER EVENTS
  ACCOUNT_CREATED: 'account_created',
  LOGIN: 'login',
  LOGOUT: 'logout',
  PROFILE_COMPLETED: 'profile_completed',
  PROFILE_UPDATED: 'profile_updated',

  // DOCTOR DISCOVERY
  DOCTOR_LIST_VIEW: 'doctor_list_view',
  SPECIALITY_SELECTED: 'speciality_selected',
  DOCTOR_SEARCH: 'doctor_search',
  DOCTOR_FILTER_USED: 'doctor_filter_used',
  DOCTOR_PROFILE_VIEW: 'doctor_profile_view',
  DOCTOR_AVAILABILITY_VIEW: 'doctor_availability_view',

  // APPOINTMENT JOURNEY
  APPOINTMENT_STARTED: 'appointment_started',
  SLOT_VIEWED: 'slot_viewed',
  SLOT_SELECTED: 'slot_selected',
  APPOINTMENT_DETAILS_ENTERED: 'appointment_details_entered',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  APPOINTMENT_RESCHEDULED: 'appointment_rescheduled',
  APPOINTMENT_COMPLETED: 'appointment_completed',

  // MEDICINE DISCOVERY
  MEDICINE_SEARCH: 'medicine_search',
  MEDICINE_CATEGORY_VIEW: 'medicine_category_view',
  MEDICINE_VIEW: 'medicine_view',
  PHARMACY_SEARCH: 'pharmacy_search',
  PHARMACY_VIEW: 'pharmacy_view',
  AVAILABILITY_CHECK: 'availability_check',
  MEDICINE_AVAILABLE: 'medicine_available',
  MEDICINE_UNAVAILABLE: 'medicine_unavailable',
  PHARMACY_SELECTED: 'pharmacy_selected',
  MEDICINE_ORDER_STARTED: 'medicine_order_started',
  MEDICINE_ORDER_COMPLETED: 'medicine_order_completed',
  MEDICINE_ORDER_CANCELLED: 'medicine_order_cancelled',

  // ENGAGEMENT
  PAGE_VIEW: 'page_view',
  SEARCH: 'search',
  FILTER_APPLIED: 'filter_applied',
  CTA_CLICKED: 'CTA_clicked',
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
} as const;

export const SEARCH_EVENTS = [EVENTS.MEDICINE_SEARCH, EVENTS.DOCTOR_SEARCH];
export const REVENUE_GOALS = [EVENTS.APPOINTMENT_CONFIRMED, EVENTS.MEDICINE_ORDER_COMPLETED];

export interface TrackOptions {
  page?: string;
  searchQuery?: string | null;
  resultCount?: number;
  doctorId?: string | null;
  pharmacyId?: string | null;
  medicineId?: string | null;
  appointmentId?: string | null;
  category?: string | null;
  source?: string;
  city?: string;
  isDemo?: boolean;
  metadata?: Record<string, any>;
}

// ─── Session Management ─────────────────────────────────────────────────────

const SESSION_KEY = 'cc_analytics_session';
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

let activeUserId: string | null = null;
let sessionId = '';
let sessionStartedAt = 0;
let sessionEndedFired = false;

export const identifyAnalyticsUser = (userId: string | null) => {
  activeUserId = userId;
};

export const getActiveUserId = (): string => {
  if (activeUserId) return activeUserId;
  try {
    const gid = localStorage.getItem('cureconnect_guest_id');
    if (gid) return gid;
  } catch { /* ignore */ }
  return `anon-${Math.random().toString(36).substring(2, 10)}`;
};

const getOrCreateSessionId = (): string => {
  if (sessionId) return sessionId;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const age = Date.now() - parsed.createdAt;
        if (age < SESSION_TTL_MS) {
          // Continue existing session on SPA navigation, but treat a fresh
          // page-load after TTL as a new session.
          sessionId = parsed.id;
          return sessionId;
        }
      } catch { /* ignore */ }
    }
    sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: sessionId, createdAt: Date.now() }));
  } catch { /* ignore */ }
  return sessionId;
};

export const resetSessionForLogout = () => {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  sessionId = '';
};

// ─── Client / device detection (privacy-safe) ───────────────────────────────

const getDeviceInfo = (): { deviceType: string; browser: string; os: string } => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const lower = ua.toLowerCase();
  const isMobile = /android|iphone|ipod|opera mini|iemobile|wpdesktop/i.test(lower);
  const isTablet = /ipad|tablet|kindle|silk/i.test(lower) || (isMobile && /mobile/i.test(lower) === false && /android/i.test(lower));
  let browser = 'Unknown';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  let os = 'Unknown';
  if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  return { deviceType: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop', browser, os };
};

const getTrafficSource = (): { source: string; referrer: string } => {
  let referrer = '';
  try { referrer = document.referrer || ''; } catch { /* ignore */ }
  let source = 'direct';
  if (referrer.includes('google')) source = 'google';
  else if (referrer.includes('instagram')) source = 'instagram';
  else if (referrer.includes('facebook')) source = 'facebook';
  else if (referrer.includes('whatsapp')) source = 'whatsapp';
  else if (referrer) source = 'other_referral';
  return { source, referrer };
};

// ─── Core tracking ──────────────────────────────────────────────────────────

export const track = (eventName: string, options: TrackOptions = {}): void => {
  try {
    const now = new Date();
    const { deviceType, browser, os } = getDeviceInfo();
    const { source, referrer } = getTrafficSource();

    const event: AnalyticsEvent = {
      event_id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      user_id: getActiveUserId(),
      anonymous_id: activeUserId ? activeUserId : `anon-${Math.random().toString(36).substring(2, 8)}`,
      session_id: getOrCreateSessionId(),
      event_name: eventName,
      timestamp: serverTimestamp(),
      created_at: now.toISOString(),
      local_hour: now.getHours(),
      day_of_week: now.getDay(),
      page: options.page || getCurrentPage(),
      device_type: deviceType,
      browser,
      os,
      city: options.city || 'Bangalore',
      source: options.source || source,
      referrer,
      category: options.category || undefined,
      search_query: options.searchQuery || undefined,
      result_count: options.resultCount,
      doctor_id: options.doctorId || undefined,
      pharmacy_id: options.pharmacyId || undefined,
      medicine_id: options.medicineId || undefined,
      appointment_id: options.appointmentId || undefined,
      metadata: options.metadata || undefined,
      is_demo: !!options.isDemo,
    };

    // Fire-and-forget write. Analytics must never block the user journey.
    setDoc(doc(collection(db, 'analytics_events'), event.event_id), event).catch((err) => {
      console.warn('[Analytics] Failed to persist event:', eventName, err?.message || err);
    });
  } catch (err) {
    console.warn('[Analytics] Track failed:', eventName, err);
  }
};

const getCurrentPage = (): string => {
  try {
    const hash = window.location.hash || '#/';
    return hash.replace(/^#/, '') || '/';
  } catch {
    return '/';
  }
};

// ─── Session lifecycle ──────────────────────────────────────────────────────

let startedRef = 0;

export const startSession = (): void => {
  if (startedRef) return;
  startedRef = 1;
  sessionStartedAt = Date.now();
  sessionEndedFired = false;
  track(EVENTS.SESSION_STARTED, { page: getCurrentPage() });
};

export const endSession = (): void => {
  if (sessionEndedFired) return;
  sessionEndedFired = true;
  const durationSeconds = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000));
  track(EVENTS.SESSION_ENDED, {
    page: getCurrentPage(),
    metadata: { duration_seconds: durationSeconds },
  });
};

export const trackPageView = (path: string): void => {
  track(EVENTS.PAGE_VIEW, { page: path || '/' });
};

export const trackCta = (label: string, page?: string): void => {
  track(EVENTS.CTA_CLICKED, { page, metadata: { cta_label: label } });
};

// ─── Convenience trackers grouped per journey ──────────────────────────────

export const analytics = {
  // User lifecycle
  accountCreated: (userId: string, email: string) => {
    identifyAnalyticsUser(userId);
    track(EVENTS.ACCOUNT_CREATED, { metadata: { email_domain: email?.split('@')[1] || 'unknown' } });
    track(EVENTS.PROFILE_COMPLETED, {});
  },
  loggedIn: (userId: string, role?: string) => {
    identifyAnalyticsUser(userId);
    track(EVENTS.LOGIN, { metadata: { role: role || 'user' } });
  },
  loggedOut: () => {
    track(EVENTS.LOGOUT, {});
    resetSessionForLogout();
    identifyAnalyticsUser(null);
  },
  profileUpdated: () => track(EVENTS.PROFILE_UPDATED, {}),
  track,
};