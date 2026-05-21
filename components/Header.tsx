import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, HeartPulse, LogOut, FileText, AlertTriangle, Store, Star, Clock, Video, Menu, X, ChevronDown, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { analytics } from '../services/posthog';

export const Header = () => {
  const { cart, user, logout } = useApp();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    analytics.userLoggedOut();
    logout();
  };

  return (
    <header className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? 'rgba(5,12,26,0.9)'
          : 'rgba(5,12,26,0.5)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        boxShadow: scrolled ? '0 4px 40px rgba(0,0,0,0.4)' : 'none',
      }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="relative">
              <div className="bg-teal-600 p-2 rounded-xl group-hover:bg-teal-500 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(13,148,136,0.5)]">
                <HeartPulse className="text-white" size={20} />
              </div>
            </div>
            <div>
              <span className="font-black text-lg text-white tracking-tight leading-none">
                Cure<span className="text-teal-400">Connect</span>
              </span>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em] mt-0.5">Platform</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            <Link id="sos-button" to="/emergency"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 uppercase tracking-widest hover:bg-rose-500/20 transition-all"
              style={{ animation: 'glow-pulse 2s ease-in-out infinite' }}>
              <AlertTriangle size={12} /> Emergency
            </Link>

            <div className="w-px h-5 bg-white/10 mx-2" />

            <NavLink to="/upload-prescription" icon={<FileText size={15} />} label="Upload Rx" id="upload-rx-link" />
            <NavLink to="/teleconsult" icon={<Video size={15} />} label="Consult" id="teleconsult-link" />
            <NavLink to="/reminders" icon={<Clock size={15} />} label="Reminders" />

            <div className="w-px h-5 bg-white/10 mx-2" />

            {!user ? (
              <NavLink to="/partner-login" icon={<Store size={15} />} label="Partners" />
            ) : user.role === 'partner' && (
              <Link to="/partnership-dashboard"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black text-teal-400 bg-teal-500/10 border border-teal-500/20 uppercase tracking-widest hover:bg-teal-500/20 transition-all">
                <Store size={14} /> Dashboard
              </Link>
            )}
          </nav>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            {/* Cart */}
            <Link id="cart-link" to="/cart"
              className="relative p-2.5 rounded-xl transition-all duration-300 hover:bg-white/5 group"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <ShoppingCart size={18} className="text-slate-400 group-hover:text-teal-400 transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-teal-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(13,148,136,0.6)]">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                {/* Points */}
                <div id="points-badge" className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black border"
                  style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  {user.points} pts
                </div>

                {/* User avatar */}
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer group transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center rounded-lg font-black text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-[12px] font-bold text-white leading-none">{user.name.split(' ')[0]}</span>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{user.role}</span>
                  </div>
                </div>

                <button onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
                  title="Sign Out">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link to="/login"
                className="px-4 py-2 rounded-xl text-[12px] font-black text-white uppercase tracking-widest transition-all duration-300 hover:shadow-[0_0_20px_rgba(13,148,136,0.3)]"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}>
                Join Now
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <Link to="/cart" className="relative p-2 text-slate-400">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-teal-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t" style={{ background: 'rgba(5,12,26,0.98)', backdropFilter: 'blur(24px)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-4 py-4 space-y-1">
            {user && (
              <div className="flex items-center gap-3 p-3 rounded-xl mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center rounded-xl font-black text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-bold">{user.name}</p>
                  <p className="text-teal-400 text-xs font-black uppercase tracking-widest">{user.points} pts</p>
                </div>
              </div>
            )}

            <MobileNavLink to="/emergency" icon={<AlertTriangle size={16} />} label="Emergency SOS" danger onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/upload-prescription" icon={<FileText size={16} />} label="Upload Prescription" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/teleconsult" icon={<Video size={16} />} label="Teleconsultation" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/reminders" icon={<Clock size={16} />} label="Reminders" onClick={() => setIsMenuOpen(false)} />

            {user?.role === 'partner' ? (
              <MobileNavLink to="/partnership-dashboard" icon={<Store size={16} />} label="Partner Dashboard" highlight onClick={() => setIsMenuOpen(false)} />
            ) : !user && (
              <MobileNavLink to="/partner-login" icon={<Store size={16} />} label="For Pharmacies" onClick={() => setIsMenuOpen(false)} />
            )}

            <div className="pt-2">
              {user ? (
                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-rose-400 text-sm font-bold transition-all"
                  style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                  <LogOut size={16} /> Sign Out
                </button>
              ) : (
                <Link to="/login" onClick={() => setIsMenuOpen(false)}
                  className="block text-center p-3 rounded-xl text-white font-black text-sm uppercase tracking-widest"
                  style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}>
                  Sign In to CureConnect
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

const NavLink = ({ to, icon, label, id }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link id={id} to={to}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 whitespace-nowrap"
      style={{
        color: isActive ? '#2dd4bf' : '#94a3b8',
        background: isActive ? 'rgba(13,148,136,0.1)' : 'transparent',
      }}>
      {React.cloneElement(icon, { className: isActive ? 'text-teal-400' : 'text-slate-500' })}
      {label}
    </Link>
  );
};

const MobileNavLink = ({ to, icon, label, onClick, highlight, danger }: any) => (
  <Link to={to} onClick={onClick}
    className="flex items-center gap-3 p-3 rounded-xl text-sm font-semibold transition-all"
    style={{
      color: danger ? '#f87171' : highlight ? '#2dd4bf' : '#94a3b8',
      background: danger ? 'rgba(244,63,94,0.08)' : highlight ? 'rgba(13,148,136,0.08)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${danger ? 'rgba(244,63,94,0.15)' : highlight ? 'rgba(13,148,136,0.15)' : 'rgba(255,255,255,0.06)'}`,
    }}>
    <span style={{ color: danger ? '#f87171' : highlight ? '#2dd4bf' : '#475569' }}>{icon}</span>
    {label}
  </Link>
);