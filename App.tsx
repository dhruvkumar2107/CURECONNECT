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
import { HeartPulse, Github, Twitter, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const App = () => {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <AppProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col" style={{ background: '#050c1a' }}>

          {/* Ambient Background Orbs — fixed behind everything */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[10%] right-[-15%] w-[500px] h-[500px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)' }} />
            <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full"
              style={{ background: 'radial-gradient(ellipse, rgba(13,148,136,0.04) 0%, transparent 70%)' }} />
          </div>

          <div className="relative z-10 flex flex-col flex-1">
            <Header />
            <TourGuide />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/upload-prescription" element={<PrescriptionUpload />} />
                <Route path="/emergency" element={<EmergencyPage />} />
                <Route path="/partnership-dashboard" element={<PartnershipDashboard />} />
                <Route path="/partner-signup" element={<PartnerSignUpPage />} />
                <Route path="/reminders" element={<RemindersPage />} />
                <Route path="/teleconsult" element={<TeleconsultationPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/partner-login" element={<PartnerLoginPage />} />
              </Routes>
            </main>

            {/* Premium Footer */}
            <footer className="relative mt-20 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(5,12,26,0.8)' }}>
              <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-teal-600 p-2 rounded-xl">
                        <HeartPulse className="text-white" size={20} />
                      </div>
                      <span className="font-black text-xl text-white tracking-tight">
                        Cure<span className="text-teal-400">Connect</span>
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                      Real-time medicine availability across Bangalore's pharmacy network. Find, reserve, and collect — instantly.
                    </p>
                    <div className="flex items-center gap-3 mt-6">
                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                        <Shield size={12} className="text-teal-500" /> HIPAA Compliant
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                        <Zap size={12} className="text-amber-500" /> Real-Time Network
                      </div>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Platform</h5>
                    <ul className="space-y-2.5">
                      {[['/', 'Find Medicines'], ['/upload-prescription', 'Upload Rx'], ['/teleconsult', 'Teleconsult'], ['/reminders', 'Reminders']].map(([path, label]) => (
                        <li key={path}><Link to={path} className="text-sm text-slate-500 hover:text-teal-400 transition-colors">{label}</Link></li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Partners</h5>
                    <ul className="space-y-2.5">
                      {[['/partner-login', 'Partner Login'], ['/partner-signup', 'Register Pharmacy'], ['/emergency', 'Emergency Mode']].map(([path, label]) => (
                        <li key={path}><Link to={path} className="text-sm text-slate-500 hover:text-teal-400 transition-colors">{label}</Link></li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-slate-600">
                    © {new Date().getFullYear()} CureConnect. All rights reserved.
                  </p>
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse mr-1"></span>
                    All systems operational
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