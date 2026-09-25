import { db } from './firebase';
import {
  collection, query, orderBy, limit, getDocs, writeBatch, doc, getDoc, setDoc, deleteDoc, where,
} from 'firebase/firestore';
import { AnalyticsEvent } from '../types';
import { generateDemoEvents } from './analyticsDemoData';

const EVENT_LIMIT = 15000;

export interface DemoStatus {
  loaded: boolean;
  count: number;
  loadedAt?: string;
  label?: string;
}

// Normalise a Firestore doc into a typed AnalyticsEvent with a numeric ts
export const normaliseEvent = (raw: any, id: string): AnalyticsEvent & { ts: number } => {
  let ts: number = Date.now();
  const created = raw?.created_at || raw?.createdAt;
  if (raw?.timestamp) {
    try {
      if (typeof raw.timestamp.toDate === 'function') ts = raw.timestamp.toDate().getTime();
      else if (raw.timestamp.seconds) ts = raw.timestamp.seconds * 1000;
      else ts = new Date(raw.timestamp).getTime();
    } catch { /* ignore */ }
  } else if (created) {
    const d = new Date(created).getTime();
    if (!isNaN(d)) ts = d;
  }
  return {
    event_id: raw?.event_id || raw?.id || id,
    user_id: raw?.user_id || raw?.userId || 'unknown',
    session_id: raw?.session_id || raw?.sessionId || `sess-${id}`,
    event_name: raw?.event_name || raw?.eventName || 'unknown',
    timestamp: raw?.timestamp,
    created_at: created || new Date(ts).toISOString(),
    local_hour: typeof raw?.local_hour === 'number' ? raw.local_hour : new Date(ts).getHours(),
    day_of_week: typeof raw?.day_of_week === 'number' ? raw.day_of_week : new Date(ts).getDay(),
    page: raw?.page || '/',
    device_type: raw?.device_type || raw?.deviceType || 'desktop',
    browser: raw?.browser || 'Unknown',
    os: raw?.os || 'Unknown',
    city: raw?.city || 'Bangalore',
    source: raw?.source || 'direct',
    referrer: raw?.referrer || '',
    category: raw?.category ?? undefined,
    search_query: raw?.search_query ?? raw?.searchQuery ?? undefined,
    result_count: raw?.result_count ?? raw?.resultCount ?? undefined,
    doctor_id: raw?.doctor_id ?? raw?.doctorId ?? undefined,
    pharmacy_id: raw?.pharmacy_id ?? raw?.pharmacyId ?? undefined,
    medicine_id: raw?.medicine_id ?? raw?.medicineId ?? undefined,
    appointment_id: raw?.appointment_id ?? raw?.appointmentId ?? undefined,
    metadata: raw?.metadata || undefined,
    is_demo: !!raw?.is_demo,
    ts,
  } as any;
};

// Load the full analytics event stream (demo + real), newest first.
export const loadAnalyticsEvents = async (): Promise<Array<AnalyticsEvent & { ts: number }>> => {
  const q = query(collection(db, 'analytics_events'), orderBy('timestamp', 'desc'), limit(EVENT_LIMIT));
  const snap = await getDocs(q);
  return snap.docs.map((d) => normaliseEvent(d.data(), d.id));
};

const DEMO_STATUS_DOC = doc(db, 'analytics_demo', 'status');

export const getDemoStatus = async (): Promise<DemoStatus> => {
  try {
    const snap = await getDoc(DEMO_STATUS_DOC);
    if (snap.exists()) {
      const d = snap.data();
      return { loaded: !!d.loaded, count: d.count || 0, loadedAt: d.loadedAt, label: d.label };
    }
  } catch (err) {
    console.warn('[Analytics] Demo status check failed:', err);
  }
  return { loaded: false, count: 0 };
};

// Load the synthetic academic demonstration dataset.
export const seedDemoData = async (onProgress?: (phase: string) => void): Promise<DemoStatus> => {
  onProgress?.('Generating synthetic dataset…');
  const events = generateDemoEvents();

  const CHUNK = 400;
  for (let i = 0; i < events.length; i += CHUNK) {
    const batch = writeBatch(db);
    const chunk = events.slice(i, i + CHUNK);
    chunk.forEach((ev) => {
      const ref = doc(collection(db, 'analytics_events'), ev.event_id);
      batch.set(ref, ev);
    });
    onProgress?.(`Writing events ${Math.min(i + CHUNK, events.length)} / ${events.length}…`);
    await batch.commit();
  }

  await setDoc(DEMO_STATUS_DOC, {
    loaded: true,
    count: events.length,
    loadedAt: new Date().toISOString(),
    label: 'DEMO DATA — Synthetic academic demonstration data',
  });

  return { loaded: true, count: events.length, loadedAt: new Date().toISOString() };
};

// Remove all demo events (identified by is_demo=true) without touching production data.
export const clearDemoData = async (): Promise<void> => {
  const CHUNK = 400;
  while (true) {
    const q = query(collection(db, 'analytics_events'), where('is_demo', '==', true), limit(CHUNK));
    const snap = await getDocs(q);
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(DEMO_STATUS_DOC).catch(() => {});
};