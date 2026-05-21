import React, { useEffect } from 'react';
import { Video, Calendar, Star, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import { analytics } from '../services/posthog';

const DOCTORS = [
  { id: 1, name: 'Dr. Anjali Sharma', specialty: 'General Physician', rating: 4.9, experience: '8 yrs', available: true, consultFee: 299, initials: 'AS', color: '#0d9488' },
  { id: 2, name: 'Dr. Rajesh Kumar', specialty: 'Dermatologist', rating: 4.7, experience: '12 yrs', available: false, consultFee: 499, initials: 'RK', color: '#6366f1' },
  { id: 3, name: 'Dr. Priya Singh', specialty: 'Pediatrician', rating: 4.8, experience: '5 yrs', available: true, consultFee: 349, initials: 'PS', color: '#f59e0b' },
];

export const TeleconsultationPage = () => {
  useEffect(() => {
    analytics.teleconsultPageViewed();
    analytics.page('Teleconsultation');
  }, []);

  return (
    <div className="pb-20 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Teleconsultation</h1>
          <p className="text-slate-500 text-sm mt-1">Connect with top doctors instantly from home</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-teal-400 transition-all self-start sm:self-auto"
          style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)' }}>
          <Calendar size={16} /> My Appointments
        </button>
      </div>

      {/* Live Indicator */}
      <div className="flex items-center gap-2.5 mb-6 px-4 py-3 rounded-xl text-sm text-slate-300"
        style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.12)' }}>
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
        <span className="font-medium">{DOCTORS.filter(d => d.available).length} doctors available right now</span>
        <span className="ml-auto text-xs text-slate-600 font-medium flex items-center gap-1">
          <Clock size={11} /> Avg wait: &lt;5 min
        </span>
      </div>

      {/* Doctor Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOCTORS.map(doc => (
          <div key={doc.id} className="rounded-2xl overflow-hidden card-hover"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Available indicator strip */}
            <div className="h-0.5" style={{
              background: doc.available
                ? 'linear-gradient(90deg, #10b981, transparent)'
                : 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)'
            }} />

            <div className="p-5">
              {/* Doctor avatar + info */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-xl text-white"
                  style={{ background: `${doc.color}25`, border: `1px solid ${doc.color}40` }}>
                  <span style={{ color: doc.color }}>{doc.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-white text-sm leading-tight">{doc.name}</h3>
                    <div className="flex items-center gap-1 flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold text-amber-400"
                      style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <Star size={10} className="fill-amber-400" /> {doc.rating}
                    </div>
                  </div>
                  <p className="text-sm font-medium mt-0.5" style={{ color: doc.color }}>{doc.specialty}</p>
                  <div className="flex items-center gap-2 mt-1.5">
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

              {/* Fee */}
              <div className="flex items-center justify-between mb-4 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-xs text-slate-500 font-medium">Consultation Fee</span>
                <span className="font-black text-white">₹{doc.consultFee}</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {doc.available ? (
                  <button
                    onClick={() => analytics.doctorConsultClicked(doc.name, doc.specialty, doc.available)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs text-white transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 15px rgba(13,148,136,0.2)' }}>
                    <Video size={14} /> Consult Now
                  </button>
                ) : (
                  <button
                    onClick={() => analytics.doctorConsultClicked(doc.name, doc.specialty, doc.available)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs text-slate-400 transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Calendar size={14} /> Schedule
                  </button>
                )}
                <button className="w-10 h-10 flex items-center justify-center rounded-xl transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#64748b' }}>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div className="mt-8 rounded-2xl p-6"
        style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)' }}>
        <h3 className="text-sm font-bold text-white mb-4">Why use CureConnect Teleconsult?</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {['Certified MBBS/MD doctors', 'Prescriptions issued digitally', 'Follow-up consultations free'].map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
              <CheckCircle size={14} className="text-indigo-400 flex-shrink-0" /> {b}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
