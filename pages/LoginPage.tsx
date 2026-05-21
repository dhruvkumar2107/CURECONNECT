import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, auth } from '../services/firebase';
import { HeartPulse, Lock, Mail, AlertCircle, ArrowRight, Pill, ShieldCheck, Zap } from 'lucide-react';
import { analytics } from '../services/posthog';

const FEATURES = [
  { icon: <Zap size={16} className="text-teal-400" />, text: 'Real-time stock across 20+ pharmacies' },
  { icon: <ShieldCheck size={16} className="text-teal-400" />, text: 'Verified medicine authenticity' },
  { icon: <Pill size={16} className="text-teal-400" />, text: '5,000+ medicines in our network' },
];

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    analytics.page('Login');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      analytics.userLoggedIn(cred.user.uid, email, 'user');
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('Failed to sign in. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}>

        {/* Left Panel — Brand Story */}
        <div className="relative hidden md:flex flex-col justify-between p-10 overflow-hidden"
          style={{ background: 'linear-gradient(145deg, rgba(6,78,59,0.8) 0%, rgba(5,12,26,1) 100%)' }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] right-[-20%] w-64 h-64 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.2) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />
            <div className="absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="bg-teal-600 p-2.5 rounded-xl">
                <HeartPulse className="text-white" size={22} />
              </div>
              <span className="font-black text-xl text-white">Cure<span className="text-teal-400">Connect</span></span>
            </div>

            <h2 className="text-3xl font-black text-white leading-tight mb-4">
              Your health,<br /><span className="text-gradient-teal">instantly connected.</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Access real-time medicine availability, reserve your prescriptions, and connect with pharmacies — all in one place.
            </p>

            <div className="space-y-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-300 py-2.5 px-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {f.icon}
                  {f.text}
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Real-time network operational
            </div>
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="p-8 md:p-10 flex flex-col justify-center"
          style={{ background: 'rgba(13,22,41,0.95)' }}>
          <div className="mb-8">
            <h1 className="text-2xl font-black text-white mb-1">Welcome back</h1>
            <p className="text-slate-500 text-sm">Sign in to your CureConnect account</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3 rounded-xl text-sm text-rose-300 font-medium"
              style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="input-dark pl-10" placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="input-dark pl-10" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2 mt-2 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: loading ? 'none' : '0 0 30px rgba(13,148,136,0.3)' }}>
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><span>Sign In</span><ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 flex flex-col gap-3 text-sm text-center"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-slate-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-teal-400 font-bold hover:text-teal-300 transition-colors">Create one free</Link>
            </p>
            <p className="text-slate-600">
              Are you a pharmacy partner?{' '}
              <Link to="/partner-login" className="text-slate-400 hover:text-teal-400 transition-colors font-medium">Partner Login →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};