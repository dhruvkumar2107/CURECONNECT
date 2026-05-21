import React, { useEffect } from 'react';
import { Clock, Calendar, RefreshCw, Bell, Pill, Plus, CheckCircle } from 'lucide-react';
import { analytics } from '../services/posthog';

export const RemindersPage = () => {
  useEffect(() => {
    analytics.reminderPageViewed();
    analytics.page('Reminders');
  }, []);

  return (
    <div className="pb-20 max-w-3xl mx-auto page-enter">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.25)' }}>
            <Clock size={20} className="text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Smart Reminders</h1>
            <p className="text-slate-500 text-sm">Manage your medicine schedule & refill alerts</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Refill Alerts */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5">
              <RefreshCw size={16} className="text-amber-400" />
              <h2 className="font-bold text-white text-sm">Refill Alerts</h2>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold text-amber-400"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
              0 due
            </span>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Bell size={24} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium text-sm mb-1">No refill reminders yet</p>
            <p className="text-slate-600 text-xs">Your past orders will appear here to help you refill on time.</p>
          </div>
        </div>

        {/* Active Courses */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5">
              <Calendar size={16} className="text-indigo-400" />
              <h2 className="font-bold text-white text-sm">Active Medicine Courses</h2>
            </div>
            <button className="flex items-center gap-1.5 text-xs font-bold text-teal-400 px-3 py-1.5 rounded-lg transition-all hover:bg-teal-500/10"
              style={{ border: '1px solid rgba(13,148,136,0.25)' }}>
              <Plus size={12} /> Add Course
            </button>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Pill size={24} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium text-sm mb-1">No active courses</p>
            <p className="text-slate-600 text-xs">Track your daily medicine intake schedule here.</p>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl p-6"
          style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-indigo-400" /> How Smart Reminders work
          </h3>
          <div className="space-y-2.5">
            {[
              'Place an order and we track your refill schedule automatically',
              'Get alerts 3 days before your medicines run out',
              'One-tap reorder from previous purchases',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-slate-400">
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black text-indigo-400"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
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
