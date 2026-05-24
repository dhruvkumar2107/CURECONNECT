import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, ArrowRight, CheckCircle, Clock, ShoppingCart, Package, MapPin, Sparkles } from 'lucide-react';
import { PHARMACIES } from '../constants';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../services/dbService';
import { analytics } from '../services/posthog';

export const CartPage = () => {
  const { cart, removeFromCart, clearCart, user } = useApp();
  const navigate = useNavigate();
  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const [checkedOut, setCheckedOut] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [pickupTime, setPickupTime] = useState('18:00');

  const groupedItems = cart.reduce((acc, item) => {
    if (!acc[item.pharmacyId]) acc[item.pharmacyId] = [];
    acc[item.pharmacyId].push(item);
    return acc;
  }, {} as Record<string, typeof cart>);

  useEffect(() => {
    if (cart.length > 0) {
      analytics.cartViewed(cart.length, total, Object.keys(groupedItems).length);
    }
  }, []);

  const handleCheckout = async () => {
    if (!user) { navigate('/login'); return; }
    analytics.checkoutInitiated(cart.length, total, showSchedule);
    try {
      for (const [pharmacyId, items] of Object.entries(groupedItems) as [string, any[]][]) {
        const pharmacyTotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
        await createOrder({
          pharmacyId, customerId: user.id, customerName: user.name,
          items: items as any, total: pharmacyTotal, status: 'Pending',
          createdAt: new Date().toISOString(),
          pickupTime: showSchedule ? pickupTime : undefined
        });
      }
      analytics.orderPlaced(Object.keys(groupedItems), cart.length, total, showSchedule ? pickupTime : undefined);
      setCheckedOut(true);
      setTimeout(() => {
        clearCart();
        setCheckedOut(false);
        setShowSchedule(false);
      }, 3000);
    } catch (error: any) {
      alert(`Reservation failed: ${error.message || 'Please check your connection and try again.'}`);
    }
  };

  // ── Empty Cart ──
  if (cart.length === 0 && !checkedOut) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center page-enter">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.065)' }}
        >
          <ShoppingCart size={40} className="text-slate-700" />
        </div>
        <h2 className="text-2xl font-black text-white mb-3 font-jakarta">Your cart is empty</h2>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-8">
          Search for medicines and reserve them from local pharmacies near you.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3.5 rounded-xl font-bold text-white text-sm transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 25px rgba(13,148,136,0.3)' }}
        >
          Browse Medicines
        </button>
      </div>
    );
  }

  // ── Success State ──
  if (checkedOut) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center page-enter">
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.3)', boxShadow: '0 0 50px rgba(13,148,136,0.15)' }}
        >
          <CheckCircle size={56} className="text-teal-400" />
        </div>
        <h2 className="text-3xl font-black text-white mb-3 font-jakarta">Reservation Confirmed!</h2>
        <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
          Your medicines are reserved. Please pick them up from the pharmacy within 24 hours.
          {showSchedule && <span className="block text-teal-400 font-bold mt-3">Scheduled for {pickupTime}</span>}
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-8 px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 25px rgba(13,148,136,0.3)' }}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="pb-48 max-w-4xl mx-auto page-enter">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight font-jakarta">
          Your <span className="text-gradient-teal">Reservations</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {cart.length} item{cart.length !== 1 ? 's' : ''} across{' '}
          {Object.keys(groupedItems).length} pharmacy{Object.keys(groupedItems).length !== 1 ? 'ies' : ''}
        </p>
      </div>

      {/* Groups */}
      <div className="space-y-4">
        {(Object.entries(groupedItems) as [string, any[]][]).map(([pharmacyId, items]) => {
          const pharmacy = PHARMACIES.find(p => p.id === pharmacyId);
          const groupTotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
          return (
            <div
              key={pharmacyId}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(8,15,34,0.7)', border: '1px solid rgba(255,255,255,0.065)' }}
            >
              {/* Pharmacy header */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.055)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.22)' }}
                  >
                    <Package size={16} className="text-teal-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{pharmacy?.name || 'myUpchar Online'}</h3>
                    {pharmacy?.address && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={9} /> {pharmacy.address}
                      </p>
                    )}
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 text-xs font-bold text-teal-400 px-3 py-1 rounded-full"
                  style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.18)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  Accepting
                </div>
              </div>

              {/* Items */}
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                {items.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex items-center gap-4 px-6 py-4 transition-all hover:bg-white/[0.015] group"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-base text-slate-400"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      {item.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Qty: {item.quantity} × ₹{item.price}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-white font-black text-base">₹{item.price * item.quantity}</span>
                      <button
                        onClick={() => {
                          analytics.itemRemovedFromCart(item.name, item.price);
                          removeFromCart(item.id, item.pharmacyId);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.055)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-3 flex justify-end" style={{ background: 'rgba(0,0,0,0.12)' }}>
                <span className="text-xs text-slate-500 font-medium">Subtotal: <span className="text-white font-bold">₹{groupTotal}</span></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Floating Checkout Bar ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-50">
        <div
          className="rounded-2xl p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
          style={{
            background: 'rgba(8,15,34,0.95)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 60px rgba(13,148,136,0.06)',
          }}
        >
          <div className="flex items-center gap-5">
            {/* Schedule toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSchedule(!showSchedule)}
                className="w-12 h-6 rounded-full p-0.5 transition-all duration-300 relative"
                style={{ background: showSchedule ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255,255,255,0.1)' }}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${showSchedule ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Clock size={10} className="text-teal-500" /> Schedule
                </p>
                {showSchedule ? (
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={e => setPickupTime(e.target.value)}
                    className="text-teal-400 font-black text-sm bg-transparent border-none outline-none mt-0.5"
                  />
                ) : (
                  <span className="text-slate-600 text-xs">ASAP pickup</span>
                )}
              </div>
            </div>

            <div className="w-px h-10 bg-white/10" />

            {/* Total */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total</p>
              <p className="text-2xl font-black text-white leading-none">₹{total}</p>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            className="flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-black text-sm text-white uppercase tracking-wider transition-all duration-300 active:scale-[0.97] sm:min-w-[200px]"
            style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 30px rgba(13,148,136,0.35)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 50px rgba(13,148,136,0.55)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(13,148,136,0.35)'; }}
          >
            <span>{user ? (showSchedule ? 'Confirm Schedule' : 'Reserve Now') : 'Sign In to Continue'}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};