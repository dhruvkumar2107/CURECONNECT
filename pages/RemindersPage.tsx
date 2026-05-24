import React, { useEffect } from 'react';
import { Clock, Calendar, RefreshCw, Bell, Pill, Plus, CheckCircle, Sparkles } from 'lucide-react';
import { analytics } from '../services/posthog';

export const RemindersPage = () => {
  useEffect(() => {
    analytics.reminderPageViewed();
    analytics.page('Reminders');
  }, []);

  return (
    <div className="pb-20 max-w-3xl mx-auto page-enter">
      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.2), rgba(13,148,136,0.08))', border: '1px solid rgba(13,148,136,0.25)', boxShadow: '0 0 20px rgba(13,148,136,0.1)' }}
          >
            <Clock size={22} className="text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight font-jakarta">Smart Reminders</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage your medicine schedule &amp; refill alerts</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* ── Refill Alerts Card ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(8,15,34,0.7)', border: '1px solid rgba(255,255,255,0.065)' }}
        >
          {/* Card header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.055)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <RefreshCw size={13} className="text-amber-400" />
              </div>
              <h2 className="font-bold text-white text-sm">Refill Alerts</h2>
            </div>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-bold text-amber-400"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.18)' }}
            >
              0 due
            </span>
          </div>

          {/* Empty state */}
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.055)' }}
            >
              <Bell size={26} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-semibold text-sm mb-1">No refill reminders yet</p>
            <p className="text-slate-600 text-xs max-w-xs">Your past orders will appear here to help you refill on time and never run out.</p>
          </div>
        </div>

        {/* ── Active Courses Card ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(8,15,34,0.7)', border: '1px solid rgba(255,255,255,0.065)' }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.055)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <Calendar size={13} className="text-indigo-400" />
              </div>
              <h2 className="font-bold text-white text-sm">Active Medicine Courses</h2>
            </div>
            <button
              className="flex items-center gap-1.5 text-xs font-bold text-teal-400 px-3 py-1.5 rounded-lg transition-all hover:bg-teal-500/10 active:scale-95"
              style={{ border: '1px solid rgba(13,148,136,0.22)' }}
            >
              <Plus size={11} /> Add Course
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.055)' }}
            >
              <Pill size={26} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-semibold text-sm mb-1">No active courses</p>
            <p className="text-slate-600 text-xs max-w-xs">Track your daily medicine intake schedule here to stay on top of your health.</p>
          </div>
        </div>

        {/* ── How It Works ── */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}
        >
          <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
            <Sparkles size={15} className="text-indigo-400" />
            How Smart Reminders work
          </h3>
          <div className="space-y-3">
            {[
              'Place an order — we track your refill schedule automatically',
              'Get alerts 3 days before your medicines run out',
              'One-tap reorder from previous purchases — seamless',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-slate-400">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black text-indigo-400"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', minWidth: '24px' }}
                >
                  {i + 1}
                </span>
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
