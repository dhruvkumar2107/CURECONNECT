import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, HeartPulse, LogOut, FileText, AlertTriangle, Store, Star, Clock, Video, Menu, X, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header = () => {
  const { cart, user, logout } = useApp();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-4 z-50 mx-4 md:mx-0">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] px-6 h-20 flex items-center justify-between transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group transition-all">
              <div className="bg-slate-900 p-2.5 rounded-2xl shadow-xl shadow-slate-200 group-hover:rotate-12 group-hover:bg-teal-600 transition-all duration-500">
                <HeartPulse className="text-white" size={24} />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-2xl text-slate-900 tracking-tighter leading-none">Cure<span className="text-teal-600">Connect</span></span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1.5">Platform</span>
              </div>
            </Link>

            {/* Condition Emergency SOS */}
            <Link id="sos-button" to="/emergency" className="hidden lg:flex bg-rose-50 text-rose-600 px-4 py-2 rounded-2xl text-[10px] font-black items-center gap-2 border border-rose-100 uppercase tracking-[0.1em] hover:bg-rose-100 transition-all animate-pulse">
              <AlertTriangle size={14} /> Emergency
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <div className="flex items-center gap-1 px-6 border-r border-slate-100/50 mr-6 py-2">
               <NavLink to="/upload-prescription" icon={<FileText size={18} />} label="Upload Rx" id="upload-rx-link" />
               <NavLink to="/teleconsult" icon={<Video size={18} />} label="Consult" id="teleconsult-link" />
               <NavLink to="/reminders" icon={<Clock size={18} />} label="Reminders" />
            </div>

            <div className="flex items-center gap-4">
              {!user ? (
                 <Link to="/partner-login" className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-teal-600 transition-all uppercase tracking-widest px-4 py-2.5 rounded-2xl border border-transparent hover:bg-teal-50">
                   <Store size={18} />
                   <span>Partners</span>
                 </Link>
              ) : user.role === 'partner' && (
                 <Link to="/partnership-dashboard" className="flex items-center gap-2 text-[10px] font-black text-teal-600 bg-teal-50 px-5 py-2.5 rounded-2xl border border-teal-100 transition-all uppercase tracking-widest shadow-sm hover:shadow-teal-100">
                   <Store size={18} />
                   <span>Dashboard</span>
                 </Link>
              )}

              <Link id="cart-link" to="/cart" className="relative p-3 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-white rounded-2xl transition-all group border border-transparent hover:border-slate-100 shadow-sm">
                <ShoppingCart size={22} className="group-hover:scale-110 transition-transform duration-300" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-lg">
                    {cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="flex items-center gap-4 pl-4">
                  <div id="points-badge" className="hidden lg:flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-2xl text-[10px] font-black border border-slate-800 uppercase tracking-widest shadow-xl shadow-slate-200">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {user.points} 
                  </div>

                  <div className="flex items-center gap-3 bg-white p-1 pr-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center rounded-xl font-black shadow-lg shadow-teal-100 group-hover:scale-105 transition-all">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[12px] font-black text-slate-900 leading-none">{user.name}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{user.role}</span>
                    </div>
                    <ChevronDown size={14} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                  </div>

                  <button
                    onClick={logout}
                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all group"
                    title="Sign Out"
                  >
                    <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-slate-900 text-white px-8 h-12 flex items-center justify-center rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-teal-600 hover:shadow-2xl hover:shadow-teal-100 transition-all active:scale-[0.98]"
                >
                  Join Now
                </Link>
              )}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            <Link to="/cart" className="relative p-2 text-slate-600">
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2.5 bg-slate-50 text-slate-900 rounded-2xl border border-slate-100">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-2xl animate-in slide-in-from-top-2 duration-300">
          <div className="p-6 flex flex-col gap-3 font-bold text-[13px]">
            {user && (
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                <div className="w-12 h-12 bg-teal-600 text-white flex items-center justify-center rounded-2xl font-black text-xl shadow-lg shadow-teal-100">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-900 font-black text-lg leading-none">{user.name}</span>
                  <span className="text-amber-600 flex items-center gap-1 text-[11px] font-black uppercase tracking-widest mt-1">
                    <Star size={12} className="fill-amber-500 text-amber-500" /> {user.points} Points
                  </span>
                </div>
              </div>
            )}

            <MobileNavLink to="/upload-prescription" icon={<FileText size={18} />} label="Upload Prescription" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/teleconsult" icon={<Video size={18} />} label="Teleconsultation" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink to="/reminders" icon={<Clock size={18} />} label="Medicine Reminders" onClick={() => setIsMenuOpen(false)} />
            
            {user?.role === 'partner' ? (
              <MobileNavLink to="/partnership-dashboard" icon={<Store size={18} />} label="Partner Dashboard" onClick={() => setIsMenuOpen(false)} highlight />
            ) : !user && (
              <MobileNavLink to="/partner-login" icon={<Store size={18} />} label="For Pharmacies" onClick={() => setIsMenuOpen(false)} />
            )}

            <Link to="/emergency" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center gap-3 text-white bg-red-600 p-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100">
              <AlertTriangle size={20} /> Emergency SOS
            </Link>

            {user ? (
              <button onClick={() => { logout(); setIsMenuOpen(false); }} className="flex items-center justify-center gap-3 text-red-500 p-4 rounded-2xl hover:bg-red-50 transition-colors border border-red-100 mt-2">
                <LogOut size={20} /> Sign Out
              </button>
            ) : (
              <Link to="/login" onClick={() => setIsMenuOpen(false)} className="bg-slate-900 text-white text-center py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-slate-200 mt-2">
                Sign In to CureConnect
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

const NavLink = ({ to, icon, label, id }: any) => (
  <Link 
    id={id} 
    to={to} 
    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-black text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all whitespace-nowrap"
  >
    {React.cloneElement(icon, { size: 18, className: "text-slate-400 group-hover:text-teal-600 transition-colors" })}
    {label}
  </Link>
);

const MobileNavLink = ({ to, icon, label, onClick, highlight }: any) => (
  <Link 
    to={to} 
    onClick={onClick} 
    className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
      highlight ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-50'
    }`}
  >
    <div className={`p-2 rounded-xl ${highlight ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
        {icon}
    </div>
    <span className="font-black text-sm uppercase tracking-wider">{label}</span>
  </Link>
);