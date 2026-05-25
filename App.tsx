import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { initPostHog } from './services/posthog';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { CartPage } from './pages/CartPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { PartnerLoginPage } from './pages/PartnerLoginPage';
import { PrescriptionUpload } from './pages/PrescriptionUpload';
import { EmergencyPage } from './pages/EmergencyPage';
import { PartnershipDashboard } from './pages/PartnershipDashboard';
import { RemindersPage } from './pages/RemindersPage';
import { PartnerSignUpPage } from './pages/PartnerSignUpPage';
import { TeleconsultationPage } from './pages/TeleconsultationPage';
import { TourGuide } from './components/TourGuide';
import { DatabaseExplorer } from './components/DatabaseExplorer';
import { HeartPulse, Github, Shield, Zap, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const App = () => {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <AppProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col" style={{ background: '#04091a' }}>

          {/* ── Premium Ambient Background ── */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* Primary teal orb - top left */}
            <div
              className="absolute orb orb-animate-1"
              style={{
                top: '-15%', left: '-8%',
                width: '700px', height: '700px',
                background: 'radial-gradient(circle, rgba(13,148,136,0.07) 0%, transparent 65%)',
              }}
            />
            {/* Indigo orb - bottom right */}
            <div
              className="absolute orb orb-animate-2"
              style={{
                bottom: '5%', right: '-12%',
                width: '600px', height: '600px',
                background: 'radial-gradient(circle, rgba(99,102,241,0.055) 0%, transparent 65%)',
              }}
            />
            {/* Center ambient */}
            <div
              className="absolute orb orb-animate-3"
              style={{
                top: '40%', left: '45%',
                width: '900px', height: '450px',
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(ellipse, rgba(13,148,136,0.035) 0%, transparent 65%)',
              }}
            />
            {/* Rose accent - mid left */}
            <div
              className="absolute orb"
              style={{
                top: '60%', left: '10%',
                width: '300px', height: '300px',
                background: 'radial-gradient(circle, rgba(244,63,94,0.03) 0%, transparent 65%)',
                animation: 'orb-drift 20s ease-in-out infinite 6s',
              }}
            />
            {/* Subtle grid overlay */}
            <div className="absolute inset-0 grid-bg opacity-[0.6]" />
          </div>

          <div className="relative z-10 flex flex-col flex-1">
            <Header />
            <TourGuide />
            <DatabaseExplorer />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Routes>
                <Route path="/"                       element={<HomePage />} />
                <Route path="/cart"                   element={<CartPage />} />
                <Route path="/upload-prescription"    element={<PrescriptionUpload />} />
                <Route path="/emergency"              element={<EmergencyPage />} />
                <Route path="/partnership-dashboard"  element={<PartnershipDashboard />} />
                <Route path="/partner-signup"         element={<PartnerSignUpPage />} />
                <Route path="/reminders"              element={<RemindersPage />} />
                <Route path="/teleconsult"            element={<TeleconsultationPage />} />
                <Route path="/login"                  element={<LoginPage />} />
                <Route path="/signup"                 element={<SignUpPage />} />
                <Route path="/partner-login"          element={<PartnerLoginPage />} />
              </Routes>
            </main>

            {/* ── Premium Footer ── */}
            <footer className="relative mt-24" style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
              {/* Footer glow */}
              <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(13,148,136,0.4), transparent)' }} />

              <div
                className="relative"
                style={{ background: 'rgba(4,9,26,0.92)', backdropFilter: 'blur(20px)' }}
              >
                <div className="max-w-7xl mx-auto px-6 py-14">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">

                    {/* Brand col */}
                    <div className="md:col-span-5">
                      <Link to="/" className="inline-flex items-center gap-3 mb-5 group">
                        <div
                          className="p-2.5 rounded-xl transition-all duration-300"
                          style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 20px rgba(13,148,136,0.35)' }}
                        >
                          <HeartPulse className="text-white" size={20} style={{ animation: 'heartbeat 2s ease-in-out infinite' }} />
                        </div>
                        <div>
                          <span className="font-black text-xl text-white tracking-tight leading-none block">
                            Cure<span className="text-teal-400">Connect</span>
                          </span>
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-0.5 block">Healthcare Platform</span>
                        </div>
                      </Link>

                      <p className="text-sm text-slate-500 leading-relaxed max-w-sm mb-6">
                        Real-time medicine availability across Bangalore's pharmacy network.
                        Find, reserve, and collect — instantly.
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500 px-3 py-1.5 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <Shield size={11} className="text-teal-500" /> HIPAA Compliant
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 px-3 py-1.5 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <Zap size={11} className="text-amber-500" /> Real-Time Network
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 px-3 py-1.5 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <Activity size={11} className="text-indigo-400" /> 99.9% Uptime
                        </div>
                      </div>
                    </div>

                    {/* Spacer */}
                    <div className="hidden md:block md:col-span-1" />

                    {/* Platform links */}
                    <div className="md:col-span-3">
                      <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Platform</h5>
                      <ul className="space-y-3">
                        {[
                          ['/', 'Find Medicines'],
                          ['/upload-prescription', 'Upload Prescription'],
                          ['/teleconsult', 'Teleconsultation'],
                          ['/reminders', 'Smart Reminders'],
                          ['/cart', 'My Reservations'],
                        ].map(([path, label]) => (
                          <li key={path}>
                            <Link to={path} className="text-sm text-slate-500 hover:text-teal-400 transition-colors duration-200 flex items-center gap-2 group">
                              <span className="w-1 h-1 rounded-full bg-slate-700 group-hover:bg-teal-500 transition-colors" />
                              {label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Partners */}
                    <div className="md:col-span-3">
                      <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Partners</h5>
                      <ul className="space-y-3">
                        {[
                          ['/partner-login', 'Partner Login'],
                          ['/partner-signup', 'Register Pharmacy'],
                          ['/emergency', 'Emergency Mode'],
                          ['/login', 'Sign In'],
                          ['/signup', 'Create Account'],
                        ].map(([path, label]) => (
                          <li key={path}>
                            <Link to={path} className="text-sm text-slate-500 hover:text-teal-400 transition-colors duration-200 flex items-center gap-2 group">
                              <span className="w-1 h-1 rounded-full bg-slate-700 group-hover:bg-teal-500 transition-colors" />
                              {label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Footer bottom */}
                  <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
                    <p className="text-xs text-slate-600">
                      © {new Date().getFullYear()} CureConnect. All rights reserved. Built with ❤️ for Bangalore.
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                        All systems operational
                      </div>
                      <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-600 hover:text-slate-400 transition-colors"
                        title="GitHub"
                      >
                        <Github size={16} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </HashRouter>
    </AppProvider>
  );
};

export default App;