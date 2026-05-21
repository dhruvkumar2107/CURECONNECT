import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { HeartPulse, Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { analytics } from '../services/posthog';

const PERKS = [
  'Reserve medicines at 20+ pharmacies',
  'Upload prescriptions for instant review',
  'Real-time stock alerts on critical meds',
  'Earn Health Points on every order',
];

export const SignUpPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    analytics.page('Sign Up');
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: name });
      await setDoc(doc(db, 'users', user.uid), {
        name, email, cart: [], points: 0, role: 'user',
        hasSeenTour: false, createdAt: new Date().toISOString()
      });
      analytics.userSignedUp(user.uid, name, email);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setError('This email is already registered. Try signing in.');
      else if (err.code === 'auth/weak-password') setError('Password must be at least 6 characters.');
      else setError('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}>

        {/* Left Panel */}
        <div className="relative hidden md:flex flex-col justify-between p-10 overflow-hidden"
          style={{ background: 'linear-gradient(145deg, rgba(6,78,59,0.8) 0%, rgba(5,12,26,1) 100%)' }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] right-[-20%] w-64 h-64 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.2) 0%, transparent 70%)' }} />
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
              Join thousands<br /><span className="text-gradient-teal">getting care faster.</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Create your free account and start accessing real-time medicine availability across Bangalore.
            </p>
            <div className="space-y-3">
              {PERKS.map((perk, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle size={16} className="text-teal-500 flex-shrink-0" />
                  {perk}
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs text-slate-600">Free forever. No credit card required.</p>
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="p-8 md:p-10 flex flex-col justify-center" style={{ background: 'rgba(13,22,41,0.95)' }}>
          <div className="mb-8">
            <h1 className="text-2xl font-black text-white mb-1">Create account</h1>
            <p className="text-slate-500 text-sm">Start accessing real-time medicine availability</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3 rounded-xl text-sm text-rose-300"
              style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="input-dark pl-10" placeholder="Dhruv Kumar" />
              </div>
            </div>
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
                <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                  className="input-dark pl-10" placeholder="Min. 6 characters" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2 mt-2 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 30px rgba(13,148,136,0.3)' }}>
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                <><span>Create Free Account</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-6 pt-6 text-sm text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-slate-500">Already have an account?{' '}
              <Link to="/login" className="text-teal-400 font-bold hover:text-teal-300 transition-colors">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};