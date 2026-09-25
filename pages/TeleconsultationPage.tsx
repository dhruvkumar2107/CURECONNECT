import React, { useEffect, useMemo, useState } from 'react';
import { Video, Calendar, Star, Clock, ArrowRight, ArrowLeft, CheckCircle, Stethoscope, User, Phone, FileText, RotateCcw, X } from 'lucide-react';
import { analytics } from '../services/posthog';
import { track, EVENTS, trackCta } from '../services/analyticsService';

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  experience: string;
  available: boolean;
  consultFee: number;
  initials: string;
  color: string;
  colorBg: string;
}

const DOCTORS: Doctor[] = [
  { id: 1, name: 'Dr. Anjali Sharma', specialty: 'General Physician', rating: 4.9, experience: '8 yrs', available: true,  consultFee: 299, initials: 'AS', color: '#0d9488', colorBg: 'rgba(13,148,136,0.12)' },
  { id: 2, name: 'Dr. Rajesh Kumar',  specialty: 'Dermatologist',     rating: 4.7, experience: '12 yrs', available: false, consultFee: 499, initials: 'RK', color: '#6366f1', colorBg: 'rgba(99,102,241,0.12)' },
  { id: 3, name: 'Dr. Priya Singh',   specialty: 'Pediatrician',      rating: 4.8, experience: '5 yrs',  available: true,  consultFee: 349, initials: 'PS', color: '#f59e0b', colorBg: 'rgba(245,158,11,0.12)' },
];

const TIMESLOTS = ['09:00', '10:30', '12:00', '15:00', '17:30', '19:00'];
const SPECIALITY_CATEGORIES = ['General Physician', 'Dermatologist', 'Pediatrician', 'Cardiologist', 'Orthopedic'];

// Deterministic-looking 7-day slot grid for the demo.
const DAY_LABELS = ['Today', 'Tomorrow', ...Array.from({ length: 5 }, (_, i) =>
  new Date(Date.now() + (i + 2) * 86400000).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }))];

// Deterministic slot availability per (doctor, day)
const slotFor = (doctorId: number, day: number, slotIdx: number) => {
  const h = Math.floor((doctorId * 7919 + day * 104729 + slotIdx * 17) % 100);
  return h % 100 < 78;
};

const formatFee = (fee: number) => `₹${fee}`;

export const TeleconsultationPage = () => {
  const [selDoc, setSelDoc] = useState<Doctor | null>(null);
  const [step, setStep] = useState<'slots' | 'details' | 'confirmed'>('slots');
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [apptId, setApptId] = useState<string | null>(null);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [speciality, setSpeciality] = useState<string | null>(null);

  const visibleDoctors = useMemo(() => {
    let list = DOCTORS;
    if (speciality) list = list.filter((d) => d.specialty === speciality);
    if (doctorSearch.trim()) {
      const q = doctorSearch.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q));
    }
    return list;
  }, [speciality, doctorSearch]);

  useEffect(() => {
    analytics.teleconsultPageViewed();
    analytics.page('Teleconsultation');
    track(EVENTS.DOCTOR_LIST_VIEW, { page: '/teleconsult' });
  }, []);

  const openBooking = (doc: Doctor) => {
    setSelDoc(doc);
    setStep('slots');
    setSlot(null);
    setName('');
    setPhone('');
    setReason('');
    track(EVENTS.DOCTOR_PROFILE_VIEW, { page: '/teleconsult', doctorId: String(doc.id), category: doc.specialty });
    track(EVENTS.APPOINTMENT_STARTED, { page: '/teleconsult', doctorId: String(doc.id), category: doc.specialty });
    track(EVENTS.SLOT_VIEWED, { page: '/teleconsult', doctorId: String(doc.id), category: doc.specialty });
  };

  const selectSlot = (t: string) => {
    if (!selDoc) return;
    setSlot(t);
    setStep('details');
    track(EVENTS.SLOT_SELECTED, { page: '/teleconsult', doctorId: String(selDoc.id), category: selDoc.specialty, metadata: { slot: t, day: DAY_LABELS[dayIdx] } });
  };

  const submitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selDoc || !slot) return;
    track(EVENTS.APPOINTMENT_DETAILS_ENTERED, { page: '/teleconsult', doctorId: String(selDoc.id), category: selDoc.specialty, metadata: { slot, day: DAY_LABELS[dayIdx], has_phone: !!phone, has_reason: !!reason.trim() } });
    const appt = `appt-${Date.now()}-${selDoc.id}-${Math.floor(Math.random() * 1000)}`;
    setApptId(appt);
    setStep('confirmed');
    track(EVENTS.APPOINTMENT_CONFIRMED, { page: '/teleconsult', doctorId: String(selDoc.id), category: selDoc.specialty, appointmentId: appt, metadata: { slot, day: DAY_LABELS[dayIdx], consult_fee: selDoc.consultFee } });
  };

  const cancelFlow = () => {
    if (!selDoc) return;
    track(EVENTS.APPOINTMENT_CANCELLED, { page: '/teleconsult', doctorId: String(selDoc.id), category: selDoc.specialty, appointmentId: apptId || undefined, metadata: { stage: step } });
    resetFlow();
  };

  const reschedule = () => {
    if (!selDoc) return;
    track(EVENTS.APPOINTMENT_RESCHEDULED, { page: '/teleconsult', doctorId: String(selDoc.id), category: selDoc.specialty, appointmentId: apptId || undefined, metadata: { from_slot: slot, to_step: 'slots' } });
    setSlot(null);
    setStep('slots');
  };

  const markCompleted = () => {
    if (!selDoc) return;
    track(EVENTS.APPOINTMENT_COMPLETED, { page: '/teleconsult', doctorId: String(selDoc.id), category: selDoc.specialty, appointmentId: apptId || undefined, metadata: { slot } });
    resetFlow();
  };

  const resetFlow = () => {
    setSelDoc(null);
    setApptId(null);
    setStep('slots');
    setSlot(null);
  };

  return (
    <div className="pb-20 page-enter">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 0 20px rgba(99,102,241,0.1)' }}
          >
            <Stethoscope size={22} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight font-jakarta">Teleconsultation</h1>
            <p className="text-slate-500 text-sm mt-0.5">Connect with top doctors instantly from home</p>
          </div>
        </div>
        <button
          onClick={() => trackCta('my_appointments', '/teleconsult')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-indigo-400 transition-all self-start sm:self-auto hover:bg-indigo-500/10"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <Calendar size={15} /> My Appointments
        </button>
      </div>

      {/* ── Live indicator ── */}
      <div
        className="flex items-center gap-3 mb-6 px-4 py-3.5 rounded-2xl text-sm text-slate-300"
        style={{ background: 'rgba(13,148,136,0.05)', border: '1px solid rgba(13,148,136,0.12)' }}
      >
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
        </span>
        <span className="font-semibold">{DOCTORS.filter(d => d.available).length} doctors available right now</span>
        <span className="ml-auto text-xs text-slate-600 font-medium flex items-center gap-1">
          <Clock size={11} /> Avg wait: &lt;5 min
        </span>
      </div>

      {/* ── Discovery controls ── */}
      {!selDoc && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            value={doctorSearch}
            onChange={(e) => {
              track(EVENTS.DOCTOR_SEARCH, { page: '/teleconsult', searchQuery: e.target.value });
              setDoctorSearch(e.target.value);
            }}
            placeholder="Search doctor or speciality..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none placeholder-slate-600"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          <div className="flex flex-wrap gap-2">
            {SPECIALITY_CATEGORIES.slice(0, 4).map((s) => {
              const active = speciality === s;
              return (
                <button
                  key={s}
                  onClick={() => {
                    track(EVENTS.SPECIALITY_SELECTED, { page: '/teleconsult', category: s });
                    setSpeciality(active ? null : s);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: active ? '#a5b4fc' : '#64748b',
                  }}
                >
                  {s}
                </button>
              );
            })}
            {speciality && (
              <button
                onClick={() => setSpeciality(null)}
                className="px-3 py-2 rounded-lg text-xs font-bold text-rose-400"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}
              >
                <X size={11} className="inline mr-1" />Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Doctor Cards ── */}
      {!selDoc ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleDoctors.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 text-center py-16 text-slate-500 text-sm">
              No doctors match "{doctorSearch}".
            </div>
          )}
          {visibleDoctors.map(doc => (
            <div
              key={doc.id}
              className="rounded-2xl overflow-hidden card-hover"
              style={{ background: 'rgba(8,15,34,0.7)', border: '1px solid rgba(255,255,255,0.065)' }}
            >
              {/* Availability strip */}
              <div className="h-[2px]" style={{
                background: doc.available
                  ? `linear-gradient(90deg, ${doc.color}, transparent)`
                  : 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)',
              }} />

              <div className="p-5">
                {/* Doctor info */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xl"
                    style={{ background: doc.colorBg, border: `1px solid ${doc.color}35`, boxShadow: doc.available ? `0 0 15px ${doc.color}20` : 'none' }}
                  >
                    <span style={{ color: doc.color }}>{doc.initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white text-sm leading-tight">{doc.name}</h3>
                      <div
                        className="flex items-center gap-1 flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold text-amber-400"
                        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.18)' }}
                      >
                        <Star size={9} className="fill-amber-400" /> {doc.rating}
                      </div>
                    </div>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: doc.color }}>{doc.specialty}</p>
                    <div className="flex items-center flex-wrap gap-2 mt-1.5">
                      <span className="text-xs text-slate-500">{doc.experience} exp</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-xs text-slate-500">MBBS, MD</span>
                      <span className="text-slate-700">·</span>
                      <span className={`flex items-center gap-1 text-xs font-bold ${doc.available ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${doc.available ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                        {doc.available ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fee row */}
                <div
                  className="flex items-center justify-between mb-4 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <span className="text-xs text-slate-500 font-medium">Consultation Fee</span>
                  <span className="font-black text-white text-lg">{formatFee(doc.consultFee)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {doc.available ? (
                    <button
                      onClick={() => { analytics.doctorConsultClicked(doc.name, doc.specialty, doc.available); openBooking(doc); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs text-white transition-all active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 15px rgba(13,148,136,0.25)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 25px rgba(13,148,136,0.45)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 15px rgba(13,148,136,0.25)'; }}
                    >
                      <Video size={13} /> Consult Now
                    </button>
                  ) : (
                    <button
                      onClick={() => { analytics.doctorConsultClicked(doc.name, doc.specialty, doc.available); openBooking(doc); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs text-slate-400 transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <Calendar size={13} /> Schedule
                    </button>
                  )}
                  <button
                    onClick={() => openBooking(doc)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-white/[0.06]"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#4a5878' }}
                    title="Book appointment"
                  >
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Booking Wizard ── */
        <div
          className="rounded-2xl overflow-hidden card-hover mb-8"
          style={{ background: 'rgba(8,15,34,0.8)', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          {/* Wizard header */}
          <div className="flex items-center gap-4 px-6 py-5" style={{ background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={resetFlow}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
              title="Close booking"
            >
              <X size={16} />
            </button>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0"
              style={{ background: selDoc.colorBg, border: `1px solid ${selDoc.color}35` }}>
              <span style={{ color: selDoc.color }}>{selDoc.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-white text-sm truncate">{selDoc.name}</h3>
              <p className="text-xs font-semibold" style={{ color: selDoc.color }}>{selDoc.specialty} · {formatFee(selDoc.consultFee)}</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              {(['slots', 'details', 'confirmed'] as const).map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <span className="text-slate-700">→</span>}
                  <span
                    className="px-2.5 py-1 rounded-full"
                    style={{
                      background: step === s ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                      color: step === s ? '#a5b4fc' : '#475569',
                      border: `1px solid ${step === s ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    {s === 'slots' ? 'Slot' : s === 'details' ? 'Details' : 'Done'}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="p-6">
            {step === 'slots' && (
              <>
                <h4 className="text-sm font-bold text-white mb-4">Choose a day &amp; time slot</h4>
                {/* Day picker */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={label + i}
                      onClick={() => { setDayIdx(i); trackCta('select_day', '/teleconsult'); }}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: dayIdx === i ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${dayIdx === i ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.08)'}`,
                        color: dayIdx === i ? '#a5b4fc' : '#64748b',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Slot grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  {TIMESLOTS.map((t, idx) => {
                    const open = slotFor(selDoc.id, dayIdx, idx);
                    return (
                      <button
                        key={t}
                        disabled={!open}
                        onClick={() => selectSlot(t)}
                        className="py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{
                          background: slot === t ? 'rgba(99,102,241,0.2)' : open ? 'rgba(13,148,136,0.08)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${slot === t ? 'rgba(99,102,241,0.5)' : open ? 'rgba(13,148,136,0.2)' : 'rgba(255,255,255,0.05)'}`,
                          color: slot === t ? '#a5b4fc' : open ? '#2dd4bf' : '#334155',
                        }}
                      >
                        {t} {!open && <span className="block text-[10px] text-slate-600 font-medium">booked</span>}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={resetFlow}
                  className="text-xs text-slate-500 hover:text-teal-400 transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={11} /> Change doctor
                </button>
              </>
            )}

            {step === 'details' && selDoc && slot && (
              <form onSubmit={submitDetails} className="space-y-4 max-w-xl">
                <h4 className="text-sm font-bold text-white">
                  Confirm details · <span className="text-indigo-300">{DAY_LABELS[dayIdx]}, {slot}</span>
                </h4>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
                  <input required value={name} onChange={e => setName(e.target.value)} placeholder="Patient full name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none placeholder-slate-600"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
                  <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="Mobile number" inputMode="tel"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none placeholder-slate-600"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
                  <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for consultation (optional)"
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none placeholder-slate-600 resize-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep('slots')}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-slate-400 transition-all hover:bg-white/[0.05]"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button type="submit"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white uppercase tracking-wider transition-all active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}>
                    Confirm &amp; Pay {formatFee(selDoc.consultFee)} <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}

            {step === 'confirmed' && selDoc && (
              <div className="text-center py-6">
                <div className="inline-flex p-4 rounded-2xl mb-4"
                  style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.3)' }}>
                  <CheckCircle size={40} className="text-teal-400" />
                </div>
                <h4 className="text-xl font-black text-white mb-1">Appointment Confirmed!</h4>
                <p className="text-slate-400 text-sm mb-1">
                  {selDoc.name} · <span style={{ color: selDoc.color }}>{selDoc.specialty}</span>
                </p>
                <p className="text-slate-400 text-sm mb-2">
                  {DAY_LABELS[dayIdx]} at <span className="text-teal-400 font-black">{slot}</span>
                </p>
                <p className="text-xs text-slate-600 mb-6 break-all">Booking ID: {apptId}</p>

                <div className="flex flex-wrap justify-center gap-3">
                  <button onClick={reschedule}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-indigo-300 transition-all hover:bg-indigo-500/10"
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
                    <RotateCcw size={13} /> Reschedule
                  </button>
                  <button onClick={cancelFlow}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-rose-400 transition-all hover:bg-rose-500/10"
                    style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                    <X size={13} /> Cancel Appointment
                  </button>
                  <button onClick={markCompleted}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 20px rgba(13,148,136,0.3)' }}>
                    <CheckCircle size={13} /> Mark Completed
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Benefits Panel ── */}
      {!selDoc && (
        <div
          className="mt-8 rounded-2xl p-6"
          style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}
        >
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle size={14} className="text-indigo-400" /> Why CureConnect Teleconsult?
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              'Certified MBBS/MD doctors only',
              'Digital prescriptions issued instantly',
              'Follow-up consultations are free',
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-slate-400">
                <CheckCircle size={13} className="text-indigo-400 flex-shrink-0" /> {b}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};