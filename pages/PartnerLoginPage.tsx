import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, Mail, Lock, AlertCircle, ArrowRight, BarChart3, Package, ShoppingBag, TrendingUp } from 'lucide-react';
import { signInWithEmailAndPassword } from '../services/firebase';
import { auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { analytics } from '../services/posthog';

const PARTNER_PERKS = [
  { icon: <BarChart3 size={16} />, text: 'Real-time sales analytics dashboard' },
  { icon: <Package size={16} />, text: 'Live inventory management & alerts' },
  { icon: <ShoppingBag size={16} />, text: 'Digital order management system' },
  { icon: <TrendingUp size={16} />, text: 'Smart insights & demand forecasting' },
];

export const PartnerLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useApp();

  useEffect(() => {
    analytics.page('Partner Login');
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === 'partner') navigate('/partnership-dashboard');
      else if (loading) {
        setError('This account is not registered as a partner.');
        setLoading(false);
      }
    }
  }, [user, navigate, loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setTimeout(() => setLoading(false), 3000);
    } catch (err: any) {
      setError('Invalid email or password.');
      setLoading(false);
    }
  };

  const handleUpgradeToPartner = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'pharmacies', user.id), {
        id: user.id, name: `${user.name}'s Pharmacy`,
        address: 'Update your address in dashboard', phone: 'Add phone number',
        type: 'Local Store', rating: 5,
        location: { latitude: 12.9716, longitude: 77.5946 }, inventory: []
      });
      await setDoc(doc(db, 'users', user.id), { role: 'partner' }, { merge: true });
      analytics.partnerSignedUp(`${user.name}'s Pharmacy`, user.email);
      window.location.reload();
    } catch {
      setError('Failed to upgrade. Please use the Register Pharmacy page.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}>

        {/* Left Panel */}
        <div className="relative hidden md:flex flex-col justify-between p-10 overflow-hidden"
          style={{ background: 'linear-gradient(145deg, rgba(6,50,80,0.9) 0%, rgba(5,12,26,1) 100%)' }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] right-[-20%] w-64 h-64 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)' }} />
            <div className="absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-8"
              style={{ background: 'rgba(13,148,136,0.2)', border: '1px solid rgba(13,148,136,0.3)' }}>
              <Store className="text-teal-400" size={22} />
            </div>
            <h2 className="text-3xl font-black text-white leading-tight mb-3">
              Partner<br /><span className="text-gradient-teal">Dashboard Access</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Manage your pharmacy, inventory, and orders from one powerful dashboard.
            </p>
            <div className="space-y-3">
              {PARTNER_PERKS.map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-300 py-2 px-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-teal-500">{p.icon}</span>
                  {p.text}
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10">
            <Link to="/partner-signup" className="text-xs text-teal-400 hover:text-teal-300 transition-colors font-medium">
              Register a new pharmacy →
            </Link>
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="p-8 md:p-10 flex flex-col justify-center" style={{ background: 'rgba(13,22,41,0.95)' }}>
          <div className="mb-8">
            <h1 className="text-2xl font-black text-white mb-1">Partner Sign In</h1>
            <p className="text-slate-500 text-sm">Access your pharmacy dashboard</p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl text-sm text-rose-300 space-y-3"
              style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" /> {error}
              </div>
              {user && user.role === 'user' && !loading && (
                <div className="pt-3 border-t" style={{ borderColor: 'rgba(244,63,94,0.2)' }}>
                  <p className="text-xs text-slate-400 mb-3">You're signed in as a member. Upgrade to a partner account?</p>
                  <button onClick={handleUpgradeToPartner}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black text-white uppercase tracking-widest transition-all"
                    style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}>
                    <Store size={14} /> Become a Partner Now
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Partner Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="input-dark pl-10" placeholder="pharmacy@example.com" />
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
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 30px rgba(13,148,136,0.3)' }}>
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                <><span>Access Dashboard</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-6 pt-6 space-y-2 text-sm text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-slate-500">
              New pharmacy?{' '}
              <Link to="/partner-signup" className="text-teal-400 font-bold hover:text-teal-300 transition-colors">Register here</Link>
            </p>
            <p>
              <Link to="/login" className="text-slate-600 hover:text-slate-400 transition-colors text-xs">
                Regular user login →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
