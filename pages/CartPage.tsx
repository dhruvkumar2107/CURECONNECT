import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, ArrowRight, CheckCircle, Clock, ShoppingCart, Package, MapPin } from 'lucide-react';
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
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <ShoppingCart size={40} className="text-slate-700" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Your cart is empty</h2>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-8">
          Search for medicines and reserve them from local pharmacies near you.
        </p>
        <button onClick={() => navigate('/')}
          className="px-8 py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 20px rgba(13,148,136,0.3)' }}>
          Browse Medicines
        </button>
      </div>
    );
  }

  // ── Success State ──
  if (checkedOut) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center page-enter">
        <div className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.3)' }}>
          <CheckCircle size={56} className="text-teal-400" />
        </div>
        <h2 className="text-3xl font-black text-white mb-3">Reservation Confirmed!</h2>
        <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
          Your medicines are reserved. Please pick them up from the pharmacy within 24 hours.
          {showSchedule && <span className="block text-teal-400 font-bold mt-3">Scheduled for {pickupTime}</span>}
        </p>
        <div className="flex gap-3 mt-8">
          <button onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-48 max-w-4xl mx-auto page-enter">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">
          Your <span className="text-gradient-teal">Reservations</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">{cart.length} item{cart.length !== 1 ? 's' : ''} across {Object.keys(groupedItems).length} pharmacy{Object.keys(groupedItems).length !== 1 ? 's' : ''}</p>
      </div>

      {/* Pharmacy Groups */}
      <div className="space-y-4">
        {(Object.entries(groupedItems) as [string, any[]][]).map(([pharmacyId, items], gIdx) => {
          const pharmacy = PHARMACIES.find(p => p.id === pharmacyId);
          const groupTotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
          return (
            <div key={pharmacyId} className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {/* Pharmacy Header */}
              <div className="flex items-center justify-between px-6 py-4"
                style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.25)' }}>
                    <Package size={16} className="text-teal-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{pharmacy?.name || 'myUpchar Online'}</h3>
                    {pharmacy?.address && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {pharmacy.address}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400"
                  style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)', padding: '4px 10px', borderRadius: '999px' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  Accepting
                </div>
              </div>

              {/* Items */}
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                {items.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="flex items-center gap-4 px-6 py-4 group transition-all hover:bg-white/[0.02]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <span className="text-base font-black text-slate-400">{item.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Qty: {item.quantity} × ₹{item.price}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-white font-black text-base">₹{item.price * item.quantity}</span>
                      <button onClick={() => {
                        analytics.itemRemovedFromCart(item.name, item.price);
                        removeFromCart(item.id, item.pharmacyId);
                      }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Group total */}
              <div className="px-6 py-3 flex justify-end" style={{ background: 'rgba(0,0,0,0.1)' }}>
                <span className="text-xs text-slate-500 font-medium">Subtotal: <span className="text-white font-bold">₹{groupTotal}</span></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Floating Checkout Bar ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-50">
        <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
          style={{
            background: 'rgba(13,22,41,0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(13,148,136,0.05)',
          }}>

          <div className="flex items-center gap-6">
            {/* Schedule Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => setShowSchedule(!showSchedule)}
                  className="w-12 h-6 rounded-full p-0.5 transition-all duration-300 relative"
                  style={{ background: showSchedule ? '#0d9488' : 'rgba(255,255,255,0.1)' }}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${showSchedule ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Clock size={11} className="text-teal-500" /> Schedule
                </p>
                {showSchedule ? (
                  <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)}
                    className="text-teal-400 font-black text-sm bg-transparent border-none outline-none mt-0.5" />
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

          <button onClick={handleCheckout}
            className="flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-black text-sm text-white uppercase tracking-wider transition-all duration-300 active:scale-[0.97] sm:min-w-[200px]"
            style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 30px rgba(13,148,136,0.3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 50px rgba(13,148,136,0.5)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(13,148,136,0.3)'; }}>
            <span>{user ? (showSchedule ? 'Confirm Schedule' : 'Reserve Now') : 'Sign In to Continue'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};