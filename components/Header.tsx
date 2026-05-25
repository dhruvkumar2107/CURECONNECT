import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingCart, HeartPulse, LogOut, FileText, AlertTriangle,
  Store, Star, Clock, Video, Menu, X, Zap,
} from 'lucide-react';
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

  useEffect(() => { setIsMenuOpen(false); }, [location]);

  const handleLogout = () => {
    analytics.userLoggedOut();
    logout();
  };

  return (
    <>
      <header
        className="sticky top-0 z-50 transition-all duration-500"
        style={{
          background: scrolled
            ? 'rgba(4,9,26,0.92)'
            : 'rgba(4,9,26,0.6)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(255,255,255,0.03)',
          boxShadow: scrolled ? '0 8px 40px rgba(0,0,0,0.4), 0 0 0 0 transparent' : 'none',
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute inset-x-0 top-0 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(13,148,136,0.5) 50%, transparent 100%)' }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[60px] gap-4">

            {/* ── Logo ── */}
            <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
              <div className="relative">
                <div
                  className="p-2 rounded-xl transition-all duration-300 group-hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                    boxShadow: '0 0 16px rgba(13,148,136,0.35)',
                  }}
                >
                  <HeartPulse
                    className="text-white"
                    size={18}
                    style={{ animation: 'heartbeat 2s ease-in-out infinite' }}
                  />
                </div>
              </div>
              <div>
                <span className="font-black text-[17px] text-white tracking-tight leading-none">
                  Cure<span className="text-teal-400">Connect</span>
                </span>
                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-0.5">
                  Healthcare Platform
                </p>
              </div>
            </Link>

            {/* ── Desktop Navigation ── */}
            <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {/* Emergency button */}
              <Link
                id="sos-button"
                to="/emergency"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black text-rose-400 uppercase tracking-widest transition-all duration-200 hover:scale-105"
                style={{
                  background: 'rgba(244,63,94,0.08)',
                  border: '1px solid rgba(244,63,94,0.2)',
                  animation: 'border-glow 3s ease-in-out infinite',
                  animationDelay: '0ms',
                  '--tw-border-opacity': 1,
                } as any}
              >
                <AlertTriangle size={12} className="flex-shrink-0" style={{ animation: 'glow-pulse 2s ease-in-out infinite' }} />
                SOS
              </Link>

              <div className="w-px h-4 bg-white/10 mx-3" />

              <NavLink to="/upload-prescription" icon={<FileText size={14} />} label="Upload Rx"  id="upload-rx-link" />
              <NavLink to="/teleconsult"          icon={<Video size={14} />}     label="Consult"    id="teleconsult-link" />
              <NavLink to="/reminders"            icon={<Clock size={14} />}     label="Reminders" />
              <NavLink to="/dbt-demo"             icon={<Zap size={14} className="text-amber-400" />} label="DBT Analytics" />

              <div className="w-px h-4 bg-white/10 mx-3" />

              {!user ? (
                <NavLink to="/partner-login" icon={<Store size={14} />} label="Partners" />
              ) : user.role === 'partner' && (
                <Link
                  to="/partnership-dashboard"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black text-teal-400 uppercase tracking-widest transition-all hover:bg-teal-500/10"
                  style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)' }}
                >
                  <Store size={13} /> Dashboard
                </Link>
              )}
            </nav>

            {/* ── Right Actions ── */}
            <div className="hidden md:flex items-center gap-2.5 flex-shrink-0">
              {/* Cart */}
              <Link
                id="cart-link"
                to="/cart"
                className="relative p-2.5 rounded-xl transition-all duration-300 hover:bg-white/[0.06] group"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <ShoppingCart size={17} className="text-slate-400 group-hover:text-teal-400 transition-colors duration-200" />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 0 12px rgba(13,148,136,0.7)' }}
                  >
                    {cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="flex items-center gap-2">
                  {/* Points badge */}
                  <div
                    id="points-badge"
                    className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', color: '#f59e0b' }}
                  >
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    {user.points} pts
                  </div>

                  {/* User avatar */}
                  <div
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all hover:bg-white/[0.05]"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div
                      className="w-7 h-7 flex items-center justify-center rounded-lg font-black text-sm text-white"
                      style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden lg:flex flex-col text-left">
                      <span className="text-[12px] font-bold text-white leading-none">{user.name.split(' ')[0]}</span>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{user.role}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
                    title="Sign Out"
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-5 py-2 rounded-xl text-[12px] font-black text-white uppercase tracking-widest transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                    boxShadow: '0 0 20px rgba(13,148,136,0.3)',
                  }}
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* ── Mobile Controls ── */}
            <div className="md:hidden flex items-center gap-2">
              <Link to="/cart" className="relative p-2 text-slate-400">
                <ShoppingCart size={19} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-teal-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-xl text-slate-400 hover:text-white transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Menu (full screen overlay) ── */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 flex flex-col pt-[60px]"
          style={{
            background: 'rgba(4,9,26,0.97)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            animation: 'slide-down 0.25s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {user && (
              <div
                className="flex items-center gap-3 p-4 rounded-2xl mb-4"
                style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.12)' }}
              >
                <div
                  className="w-12 h-12 flex items-center justify-center rounded-xl font-black text-lg text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 15px rgba(13,148,136,0.4)' }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-bold text-base">{user.name}</p>
                  <p className="text-teal-400 text-xs font-black uppercase tracking-widest">{user.points} pts · {user.role}</p>
                </div>
              </div>
            )}

            <MobileNavLink to="/emergency"           icon={<AlertTriangle size={17} />} label="Emergency SOS"        danger   onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/upload-prescription" icon={<FileText size={17} />}      label="Upload Prescription"            onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/teleconsult"         icon={<Video size={17} />}          label="Teleconsultation"               onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/reminders"           icon={<Clock size={17} />}          label="Reminders"                      onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/dbt-demo"            icon={<Zap size={17} className="text-amber-400" />} label="DBT Analytics" onClick={() => setIsMenuOpen(false)} />

            {user?.role === 'partner' ? (
              <MobileNavLink to="/partnership-dashboard" icon={<Store size={17} />} label="Partner Dashboard" highlight onClick={() => setIsMenuOpen(false)} />
            ) : !user && (
              <MobileNavLink to="/partner-login" icon={<Store size={17} />} label="For Pharmacies" onClick={() => setIsMenuOpen(false)} />
            )}

            <div className="pt-4">
              {user ? (
                <button
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl text-rose-400 text-sm font-bold transition-all"
                  style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.18)' }}
                >
                  <LogOut size={16} /> Sign Out
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-center p-3.5 rounded-2xl text-white font-black text-sm uppercase tracking-widest"
                  style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 20px rgba(13,148,136,0.3)' }}
                >
                  Sign In to CureConnect
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ── Nav Sub-components ── */

const NavLink = ({ to, icon, label, id }: { to: string; icon: React.ReactNode; label: string; id?: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      id={id}
      to={to}
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 whitespace-nowrap group"
      style={{
        color:      isActive ? '#2dd4bf' : '#8b9ab8',
        background: isActive ? 'rgba(13,148,136,0.1)' : 'transparent',
      }}
    >
      <span style={{ color: isActive ? '#2dd4bf' : '#4a5878' }}>{icon}</span>
      {label}
      {isActive && (
        <span
          className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
          style={{ background: 'linear-gradient(90deg, #2dd4bf, #34d399)' }}
        />
      )}
    </Link>
  );
};

const MobileNavLink = ({
  to, icon, label, onClick, highlight, danger,
}: {
  to: string; icon: React.ReactNode; label: string; onClick?: () => void; highlight?: boolean; danger?: boolean;
}) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center gap-3.5 p-4 rounded-2xl text-sm font-semibold transition-all duration-200"
    style={{
      color:      danger ? '#f87171' : highlight ? '#2dd4bf' : '#8b9ab8',
      background: danger ? 'rgba(244,63,94,0.07)' : highlight ? 'rgba(13,148,136,0.07)' : 'rgba(255,255,255,0.03)',
      border:     `1px solid ${danger ? 'rgba(244,63,94,0.15)' : highlight ? 'rgba(13,148,136,0.15)' : 'rgba(255,255,255,0.06)'}`,
    }}
  >
    <span style={{ color: danger ? '#f87171' : highlight ? '#2dd4bf' : '#4a5878' }}>{icon}</span>
    {label}
  </Link>
);