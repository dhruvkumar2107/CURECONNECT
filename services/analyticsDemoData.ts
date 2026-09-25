// ─── Synthetic Demonstration Dataset ────────────────────────────────────────
// Generates a realistic but clearly labelled academic dataset for the product
// analytics system. Every event sequence respects the real user journey:
// e.g. a user cannot reach appointment_confirmed without first starting an
// appointment. All records carry is_demo: true and are stored separately from
// production data so they can be cleared without corrupting real analytics.

import { AnalyticsEvent } from '../types';
import { EVENTS } from './analyticsService';

export interface DemoUser {
  id: string;
  isGuest: boolean;
  name?: string;
  device: string;
  city: string;
  createdTs: number;
}

// Deterministic PRNG so reloading demo data produces the same narrative.
const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const MEDICINES = [
  { id: 'm1', name: 'Dolo 650', category: 'Analgesic' },
  { id: 'm2', name: 'Crocin Advance', category: 'Analgesic' },
  { id: 'm12', name: 'Azithral 500', category: 'Antibiotic' },
  { id: 'm21', name: 'Cetrizine', category: 'Antihistamine' },
  { id: 'm31', name: 'Pan D', category: 'Antacid' },
  { id: 'm41', name: 'Glycomet 500', category: 'Antidiabetic' },
  { id: 'm45', name: 'Lantus', category: 'Insulin' },
  { id: 'm51', name: 'Shelcal 500', category: 'Supplement' },
  { id: 'm54', name: 'Limcee', category: 'Supplement' },
  { id: 'm30', name: 'Asthalin Inhaler', category: 'Respiratory' },
  { id: 'm46', name: 'Telma 40', category: 'Antihypertensive' },
  { id: 'm69', name: 'Oximeter', category: 'Device' },
  { id: 'm36', name: 'Eno', category: 'Antacid' },
  { id: 'm11', name: 'Augmentin 625', category: 'Antibiotic' },
  { id: 'm78', name: 'Hand Sanitizer', category: 'Hygiene' },
];

const PHARMACY_IDS = ['p1', 'p3', 'p5', 'p7', 'p10', 'p12', 'p14', 'p20'];

const DOCTORS = [
  { id: 1, name: 'Dr. Anjali Sharma', specialty: 'General Physician' },
  { id: 2, name: 'Dr. Rajesh Kumar', specialty: 'Dermatologist' },
  { id: 3, name: 'Dr. Priya Singh', specialty: 'Pediatrician' },
  { id: 4, name: 'Dr. Vikram Rao', specialty: 'Cardiologist' },
  { id: 5, name: 'Dr. Neha Gupta', specialty: 'General Physician' },
  { id: 6, name: 'Dr. Arun Mehta', specialty: 'Orthopedic' },
  { id: 7, name: 'Dr. Kavita Nair', specialty: 'Gynecologist' },
  { id: 8, name: 'Dr. Suresh Iyer', specialty: 'ENT' },
];

const SPECIALTIES = ['General Physician', 'Dermatologist', 'Pediatrician', 'Cardiologist', 'Orthopedic', 'Gynecologist', 'ENT'];
const CATEGORIES = ['Analgesic', 'Antibiotic', 'Antacid', 'Antidiabetic', 'Supplement', 'Respiratory'];

const CITIES = ['Bangalore', 'Bangalore', 'Bangalore', 'Bengaluru East', 'Bengaluru West'];
const SOURCES = ['direct', 'direct', 'google', 'whatsapp', 'instagram', 'google'];

const PAGES = {
  HOME: '/',
  CART: '/cart',
  TELECONSULT: '/teleconsult',
  REMINDERS: '/reminders',
  UPLOAD: '/upload-prescription',
  EMERGENCY: '/emergency',
};

const dayMs = 86400000;
const hourMs = 3600000;

// Weighted hour index: peak usage 10–12 and 18–21.
const pickHour = (r: any): number => {
  const w = new Array(24).fill(1);
  for (let h = 9; h <= 12; h++) w[h] = 4;
  for (let h = 17; h <= 21; h++) w[h] = 5;
  for (let h = 0; h <= 5; h++) w[h] = 0.05;
  w[13] = 2; w[14] = 2;
  const total = w.reduce((a, b) => a + b, 0);
  let roll = r() * total;
  for (let h = 0; h < 24; h++) { roll -= w[h]; if (roll <= 0) return h; }
  return 18;
};

// Weighted day: Mon–Sat more than Sunday, slight recency boost.
const pickDayOffset = (r: any): number => {
  const days: number[] = [];
  for (let d = 0; d < 90; d++) {
    const date = new Date(Date.now() - d * dayMs);
    const dow = date.getDay();
    let w = dow === 0 ? 1.6 : 4;
    w *= 1 + (90 - d) * 0.008; // recent days slightly more data
    for (let i = 0; i < w; i++) days.push(d);
  }
  const pick = days[Math.floor(r() * days.length)];
  return pick;
};

export const generateDemoEvents = (): any[] => {
  const r = mulberry32(20250407);
  const events: any[] = [];
  let pushed = 0;
  const now = Date.now();

  const push = (userId: string, sessionId: string, eventName: string, ts: number, page: string, extra: any = {}) => {
    events.push({
      event_id: `demo-${(100001 + pushed++).toString(36).toUpperCase()}${Math.floor(r() * 9999)}`,
      user_id: userId,
      session_id: sessionId,
      event_name: eventName,
      timestamp: new Date(ts),
      created_at: new Date(ts).toISOString(),
      local_hour: new Date(ts).getHours(),
      day_of_week: new Date(ts).getDay(),
      page,
      device_type: extra.deviceType || 'desktop',
      browser: extra.browser || 'Chrome',
      os: extra.os || 'Windows',
      city: extra.city || 'Bangalore',
      source: extra.source || 'direct',
      referrer: extra.referrer || '',
      category: extra.category,
      search_query: extra.searchQuery,
      result_count: extra.resultCount,
      doctor_id: extra.doctorId === undefined ? undefined : String(extra.doctorId),
      pharmacy_id: extra.pharmacyId,
      medicine_id: extra.medicineId,
      appointment_id: extra.appointmentId,
      metadata: extra.metadata,
      is_demo: true,
    });
  };

  // ── Build user population ──
  const users: DemoUser[] = [];
  const USER_COUNT = 96;
  for (let i = 0; i < USER_COUNT; i++) {
    const isGuest = r() < 0.28;
    users.push({
      id: isGuest ? `guest-demo-${i + 1000}` : `demo-user-${i + 10}`,
      isGuest,
      device: r() < 0.56 ? 'mobile' : 'desktop',
      city: CITIES[Math.floor(r() * CITIES.length)],
      createdTs: Date.now() - Math.floor(r() * 120) * dayMs,
    });
  }

  // Some dedicated "returning" users with more sessions
  const totalSessions = 520;
  let sessionNo = 0;

  // ── Build sessions / journeys ──
  for (let s = 0; s < totalSessions; s++) {
    const user = users[Math.floor(r() * users.length)];
    const dayOffset = pickDayOffset(r);
    const hour = pickHour(r);
    const startOfDay = new Date(now - dayOffset * dayMs);
    startOfDay.setHours(hour, Math.floor(r() * 60), 0, 0);
    const s0 = startOfDay.getTime();
    const sessionId = `demo-sess-${++sessionNo}`;
    const deviceType = user.device;
    const browser = deviceType === 'mobile' ? (r() < 0.7 ? 'Chrome' : 'Safari') : 'Chrome';
    const os = deviceType === 'mobile' ? (r() < 0.5 ? 'Android' : 'iOS') : 'Windows';
    const source = SOURCES[Math.floor(r() * SOURCES.length)];
    const common = { deviceType, browser, os, city: user.city, source, referrer: source !== 'direct' ? `https://www.${source}.com` : '' };
    let t = s0;

    // Session start
    push(user.id, sessionId, EVENTS.SESSION_STARTED, t, PAGES.HOME, common);
    t += 2000 + r() * 4000;

    // Optional auth lifecycle
    if (!user.isGuest && r() < 0.18) {
      push(user.id, sessionId, EVENTS.LOGIN, t, PAGES.HOME, common);
      t += 3000 + r() * 6000;
    }

    const journey = r();
    const sessionPages: string[] = [PAGES.HOME];

    if (journey < 0.52) {
      // ── MEDICINE JOURNEY ──
      push(user.id, sessionId, EVENTS.PAGE_VIEW, t, PAGES.HOME, common);
      t += 1500 + r() * 5000;
      const medicine = MEDICINES[Math.floor(r() * MEDICINES.length)];
      const resultCount = r() < 0.18 ? 0 : Math.floor(r() * 10) + 1;

      push(user.id, sessionId, EVENTS.MEDICINE_SEARCH, t, PAGES.HOME, { ...common, searchQuery: medicine.name, resultCount, category: medicine.category, medicineId: medicine.id });
      t += 1500 + r() * 4000;

      if (resultCount === 0) {
        // No-result search → user exits or retries
        if (r() < 0.5) {
          push(user.id, sessionId, EVENTS.SEARCH, t, PAGES.HOME, { ...common, searchQuery: medicine.name, resultCount: 0, category: medicine.category });
          t += 2000 + r() * 4000;
        }
      } else {
        push(user.id, sessionId, EVENTS.PHARMACY_SEARCH, t, PAGES.HOME, { ...common, searchQuery: medicine.name });
        t += 1200 + r() * 3000;

        push(user.id, sessionId, EVENTS.MEDICINE_VIEW, t, PAGES.HOME, { ...common, medicineId: medicine.id, category: medicine.category });
        t += 1500 + r() * 5000;

        const pharmacyId = PHARMACY_IDS[Math.floor(r() * PHARMACY_IDS.length)];
        push(user.id, sessionId, EVENTS.PHARMACY_VIEW, t, PAGES.HOME, { ...common, pharmacyId, medicineId: medicine.id });
        t += 1200 + r() * 3000;

        push(user.id, sessionId, EVENTS.FILTER_APPLIED, t, PAGES.HOME, { ...common, metadata: { filter_type: 'pharmacy_type', filter_value: r() < 0.5 ? 'Hub' : 'Local Store' } });
        t += 800 + r() * 2000;

        const available = r() < 0.66;
        push(user.id, sessionId, EVENTS.AVAILABILITY_CHECK, t, PAGES.HOME, { ...common, medicineId: medicine.id, pharmacyId });
        t += 1000 + r() * 3000;
        push(user.id, sessionId, available ? EVENTS.MEDICINE_AVAILABLE : EVENTS.MEDICINE_UNAVAILABLE, t, PAGES.HOME, { ...common, medicineId: medicine.id, pharmacyId, metadata: available ? { quantity: Math.floor(r() * 60) + 5 } : { quantity: 0 } });
        t += 1000 + r() * 3000;

        // Often add to cart then start order
        const proceeds = r() < 0.62;
        if (proceeds) {
          push(user.id, sessionId, EVENTS.PHARMACY_SELECTED, t, PAGES.HOME, { ...common, pharmacyId, medicineId: medicine.id });
          t += 1200 + r() * 3000;
          push(user.id, sessionId, EVENTS.PAGE_VIEW, t, PAGES.CART, common);
          sessionPages.push(PAGES.CART);
          t += 1500 + r() * 4000;
          push(user.id, sessionId, EVENTS.MEDICINE_ORDER_STARTED, t, PAGES.CART, { ...common, pharmacyId, medicineId: medicine.id, metadata: { order_value: Math.floor(r() * 400) + 30 } });
          t += 1500 + r() * 4000;

          if (r() < 0.68) {
            push(user.id, sessionId, EVENTS.MEDICINE_ORDER_COMPLETED, t, PAGES.CART, { ...common, pharmacyId, medicineId: medicine.id, metadata: { order_value: Math.floor(r() * 400) + 30 } });
            t += 1500 + r() * 3000;
          } else if (r() < 0.5) {
            push(user.id, sessionId, EVENTS.MEDICINE_ORDER_CANCELLED, t, PAGES.CART, { ...common, pharmacyId, medicineId: medicine.id });
            t += 1000 + r() * 2000;
          }
          // else: abandoned after starting
        }
      }
    } else if (journey < 0.84) {
      // ── DOCTOR / APPOINTMENT JOURNEY ──
      push(user.id, sessionId, EVENTS.PAGE_VIEW, t, PAGES.TELECONSULT, common);
      t += 1500 + r() * 5000;
      push(user.id, sessionId, EVENTS.DOCTOR_LIST_VIEW, t, PAGES.TELECONSULT, common);
      t += 1200 + r() * 3000;

      const specialty = SPECIALTIES[Math.floor(r() * SPECIALTIES.length)];
      push(user.id, sessionId, EVENTS.SPECIALITY_SELECTED, t, PAGES.TELECONSULT, { ...common, category: specialty });
      t += 800 + r() * 2000;

      if (r() < 0.35) {
        push(user.id, sessionId, EVENTS.DOCTOR_FILTER_USED, t, PAGES.TELECONSULT, { ...common, category: specialty });
        t += 700 + r() * 1800;
      }
      if (r() < 0.3) {
        push(user.id, sessionId, EVENTS.DOCTOR_SEARCH, t, PAGES.TELECONSULT, { ...common, searchQuery: specialty, category: specialty, resultCount: Math.floor(r() * 4) + 1 });
        t += 1000 + r() * 2500;
      }

      const doctor = DOCTORS[Math.floor(r() * DOCTORS.length)];
      push(user.id, sessionId, EVENTS.DOCTOR_PROFILE_VIEW, t, PAGES.TELECONSULT, { ...common, doctorId: doctor.id, category: doctor.specialty });
      t += 1500 + r() * 4000;
      push(user.id, sessionId, EVENTS.DOCTOR_AVAILABILITY_VIEW, t, PAGES.TELECONSULT, { ...common, doctorId: doctor.id, category: doctor.specialty });
      t += 900 + r() * 2000;

      if (r() < 0.66) {
        push(user.id, sessionId, EVENTS.APPOINTMENT_STARTED, t, PAGES.TELECONSULT, { ...common, doctorId: doctor.id, category: doctor.specialty });
        t += 1200 + r() * 3000;
        push(user.id, sessionId, EVENTS.SLOT_VIEWED, t, PAGES.TELECONSULT, { ...common, doctorId: doctor.id });
        t += 900 + r() * 2500;
        push(user.id, sessionId, EVENTS.SLOT_SELECTED, t, PAGES.TELECONSULT, { ...common, doctorId: doctor.id });
        t += 900 + r() * 2500;
        push(user.id, sessionId, EVENTS.APPOINTMENT_DETAILS_ENTERED, t, PAGES.TELECONSULT, { ...common, doctorId: doctor.id });
        t += 1500 + r() * 4000;

        if (r() < 0.7) {
          const apptId = `demo-appt-${Math.floor(r() * 90000) + 1000}`;
          push(user.id, sessionId, EVENTS.APPOINTMENT_CONFIRMED, t, PAGES.TELECONSULT, { ...common, doctorId: doctor.id, appointmentId: apptId, category: doctor.specialty });
          t += 1000 + r() * 3000;

          const outcome = r();
          if (outcome < 0.62) {
            push(user.id, sessionId, EVENTS.APPOINTMENT_COMPLETED, t, PAGES.TELECONSULT, { ...common, doctorId: doctor.id, appointmentId: apptId, category: doctor.specialty });
          } else if (outcome < 0.82) {
            push(user.id, sessionId, EVENTS.APPOINTMENT_CANCELLED, t, PAGES.TELECONSULT, { ...common, doctorId: doctor.id, appointmentId: apptId });
          } else {
            push(user.id, sessionId, EVENTS.APPOINTMENT_RESCHEDULED, t, PAGES.TELECONSULT, { ...common, doctorId: doctor.id, appointmentId: apptId });
            t += 800 + r() * 2000;
            push(user.id, sessionId, EVENTS.SLOT_SELECTED, t, PAGES.TELECONSULT, { ...common, doctorId: doctor.id, appointmentId: apptId });
          }
        }
        // else abandoned booking
      }
    } else if (journey < 0.94) {
      // ── BROWSE / ENGAGEMENT (no conversion) ──
      push(user.id, sessionId, EVENTS.PAGE_VIEW, t, PAGES.HOME, common);
      t += 1000 + r() * 4000;
      const cat = CATEGORIES[Math.floor(r() * CATEGORIES.length)];
      push(user.id, sessionId, EVENTS.MEDICINE_CATEGORY_VIEW, t, PAGES.HOME, { ...common, category: cat });
      t += 800 + r() * 2500;
      push(user.id, sessionId, EVENTS.CTA_CLICKED, t, PAGES.HOME, { ...common, metadata: { cta_label: 'quick_search' } });
      t += 700 + r() * 2000;
      if (r() < 0.4) {
        push(user.id, sessionId, EVENTS.PAGE_VIEW, t, PAGES.REMINDERS, common);
        push(user.id, sessionId, EVENTS.CTA_CLICKED, t, PAGES.REMINDERS, { ...common, metadata: { cta_label: 'reminders' } });
        t += 1000 + r() * 3000;
      }
    } else {
      // ── UPLOAD / EMERGENCY users ──
      const page = PAGES.UPLOAD;
      push(user.id, sessionId, EVENTS.PAGE_VIEW, t, page, common);
      t += 1000 + r() * 3000;
      push(user.id, sessionId, EVENTS.CTA_CLICKED, t, page, { ...common, metadata: { cta_label: 'upload_prescription' } });
      t += 900 + r() * 2500;
    }

    // Optional extra page hops
    if (r() < 0.3) {
      const extra = PAGES.REMINDERS;
      push(user.id, sessionId, EVENTS.PAGE_VIEW, t, extra, common);
      sessionPages.push(extra);
      t += 800 + r() * 2500;
    }

    const duration = Math.max(8, Math.round((t - s0) / 1000));
    push(user.id, sessionId, EVENTS.SESSION_ENDED, t, sessionPages[sessionPages.length - 1], { ...common, metadata: { duration_seconds: duration } });
  }

  // ── Account creation events for a portion of users ──
  let acctNo = 0;
  for (const u of users) {
    if (u.isGuest) continue;
    if (r() < 0.5) {
      const sid = `demo-acct-sess-${++acctNo}`;
      const t0 = u.createdTs;
      const c = { deviceType: u.device, browser: 'Chrome', os: u.device === 'mobile' ? 'Android' : 'Windows', city: u.city, source: 'direct', referrer: '' };
      push(u.id, sid, EVENTS.ACCOUNT_CREATED, t0, PAGES.HOME, c);
      push(u.id, sid, EVENTS.PROFILE_COMPLETED, t0 + 5000, PAGES.HOME, c);
      push(u.id, sid, EVENTS.PAGE_VIEW, t0 + 10000, PAGES.HOME, c);
      push(u.id, sid, EVENTS.SESSION_ENDED, t0 + 20000, PAGES.HOME, { ...c, metadata: { duration_seconds: 20 } });
    }
  }

  return events;
};