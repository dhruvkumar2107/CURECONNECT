import React, { useState, useEffect } from 'react';
import { Phone, MapPin, AlertTriangle, Navigation, Siren, ShieldAlert, HeartPulse } from 'lucide-react';
import { PHARMACIES } from '../constants';
import { Pharmacy } from '../types';
import { analytics } from '../services/posthog';

const EMERGENCY_CONTACTS = [
  { name: 'Ambulance', number: '108', color: '#ef4444' },
  { name: 'Police', number: '100', color: '#3b82f6' },
  { name: 'Fire Brigade', number: '101', color: '#f59e0b' },
  { name: 'Disaster Mgmt', number: '108', color: '#8b5cf6' },
];

export const EmergencyPage = () => {
  const [nearbyPharmacies, setNearbyPharmacies] = useState<Pharmacy[]>([]);

  useEffect(() => {
    analytics.emergencyPageViewed();
    setNearbyPharmacies(PHARMACIES.slice(0, 5));
  }, []);

  return (
    <div className="pb-20 page-enter max-w-3xl mx-auto">
      {/* Emergency Alert Banner */}
      <div className="relative rounded-3xl p-8 mb-8 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(127,29,29,0.6) 0%, rgba(5,12,26,0.95) 100%)',
          border: '1px solid rgba(239,68,68,0.25)',
          boxShadow: '0 0 60px rgba(239,68,68,0.1)',
        }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)' }} />
        </div>
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.35)' }}>
            <ShieldAlert size={28} className="text-rose-400" style={{ animation: 'glow-pulse 1.5s ease-in-out infinite' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white mb-1 tracking-tight">Emergency Mode Active</h1>
            <p className="text-rose-200/70 text-sm leading-relaxed">
              Finding nearest 24/7 pharmacies and emergency supplies.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-rose-300"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              For medical emergencies, call <strong className="ml-1">108</strong> immediately
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {EMERGENCY_CONTACTS.map(ec => (
          <a key={ec.name} href={`tel:${ec.number}`}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center transition-all active:scale-95 card-hover"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${ec.color}20`, border: `1px solid ${ec.color}40` }}>
              <Phone size={18} style={{ color: ec.color }} />
            </div>
            <span className="text-xs font-bold text-slate-400">{ec.name}</span>
            <span className="text-xl font-black" style={{ color: ec.color }}>{ec.number}</span>
          </a>
        ))}
      </div>

      {/* Nearby Pharmacies */}
      <div className="mb-6">
        <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
          <HeartPulse size={20} className="text-teal-500" /> Nearest 24/7 Pharmacies
        </h2>
        <div className="space-y-3">
          {nearbyPharmacies.map((pharmacy, idx) => (
            <div key={pharmacy.id} className="flex items-center gap-4 p-4 rounded-2xl transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ background: '#ef4444' }} />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm truncate">{pharmacy.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                  <MapPin size={11} /> {pharmacy.address}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
                    Open 24/7
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(59,130,246,0.12)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>
                    Home Delivery
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <a href={`tel:${pharmacy.phone}`}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-rose-400 transition-all active:scale-90"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <Phone size={16} />
                </a>
                <button className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 transition-all hover:text-teal-400"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Navigation size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
