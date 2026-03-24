import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, ArrowRight, CheckCircle, Clock, ShoppingCart } from 'lucide-react';
import { PHARMACIES } from '../constants';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../services/dbService';

export const CartPage = () => {
  const { cart, removeFromCart, clearCart, user } = useApp();
  const navigate = useNavigate();

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const [checkedOut, setCheckedOut] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [pickupTime, setPickupTime] = useState('18:00');

  // Group items by pharmacy
  const groupedItems = cart.reduce((acc, item) => {
    if (!acc[item.pharmacyId]) acc[item.pharmacyId] = [];
    acc[item.pharmacyId].push(item);
    return acc;
  }, {} as Record<string, typeof cart>);

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      // 1. Create orders in Firestore for each pharmacy
      for (const [pharmacyId, items] of (Object.entries(groupedItems) as [string, any[]][])) {
        const pharmacyTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        await createOrder({
          pharmacyId,
          customerId: user.id,
          customerName: user.name,
          items: items as any,
          total: pharmacyTotal,
          status: 'Pending',
          createdAt: new Date().toISOString(),
          pickupTime: showSchedule ? pickupTime : undefined
        });
      }

      setCheckedOut(true);
      setTimeout(() => {
        clearCart();
        setCheckedOut(false);
        setShowSchedule(false);
        alert("Order reserved successfully and recorded in database! Please pick up from the pharmacy within 24 hours.");
      }, 2000);
    } catch (error: any) {
      console.error("Checkout failed:", error);
      alert(`Failed to create reservation: ${error.message || 'Database connection error'}. Please check your connection and try again.`);
    }
  };

  if (cart.length === 0 && !checkedOut) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-700">
        <div className="bg-slate-50 p-10 rounded-[3rem] mb-8 shadow-inner">
          <ShoppingCart size={64} className="text-slate-200" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Your cart is <span className="text-teal-600">empty</span></h2>
        <p className="text-slate-400 mt-4 max-w-xs font-medium uppercase text-[10px] tracking-widest leading-relaxed">Search for medicines and medications to reserve them instantly.</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-10 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-teal-600 transition-all active:scale-95 shadow-xl shadow-slate-200"
        >
          Browse Medicines
        </button>
      </div>
    );
  }

  if (checkedOut) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-in zoom-in fade-in duration-500">
        <div className="bg-teal-50 p-10 rounded-[3rem] mb-8 shadow-xl shadow-teal-100 border border-teal-100">
          <CheckCircle size={80} className="text-teal-500" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Reservation <span className="text-teal-600">Confirmed</span></h2>
        <p className="text-slate-500 mt-6 max-w-md font-medium text-sm leading-relaxed">
          Your reservation is successfully processed. A confirmation has been sent to your primary contact.
          {showSchedule && <span className="block font-black text-teal-600 mt-4 uppercase tracking-[0.1em]">Scheduled for {pickupTime}</span>}
        </p>
        <button 
          onClick={() => navigate('/')}
          className="mt-12 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-teal-600 transition-all opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-forwards"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="pb-40 px-4 sm:px-0 max-w-5xl mx-auto">
      <div className="flex flex-col mb-12 animate-in slide-in-from-left-4 duration-500">
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase">Your <span className="text-teal-600">Reservations</span></h1>
        <div className="h-2 w-24 bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full mt-6 shadow-xl shadow-teal-100"></div>
      </div>

      <div className="space-y-10">
        {(Object.entries(groupedItems) as [string, any[]][]).map(([pharmacyId, items], gIdx) => {
          const pharmacy = PHARMACIES.find(p => p.id === pharmacyId);
          return (
            <div key={pharmacyId} style={{ animationDelay: `${gIdx * 100}ms` }} className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_70px_rgba(0,0,0,0.06)] transition-all duration-700 animate-in slide-in-from-bottom-8">
              <div className="bg-slate-50/50 backdrop-blur-md px-10 py-8 border-b border-slate-100 flex flex-col sm:row justify-between items-start sm:items-center gap-6">
                <div>
                  <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">{pharmacy?.name || 'Unknown Pharmacy'}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{pharmacy?.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-5 py-2.5 bg-white rounded-2xl border border-slate-100 shadow-sm text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                  </span>
                  Accepting Pickup
                </div>
              </div>
              <div className="divide-y divide-slate-50 bg-white">
                {items.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="flex items-center justify-between p-10 hover:bg-slate-50/30 transition-all duration-300 group">
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900 text-xl uppercase tracking-tighter group-hover:text-teal-600 transition-colors">{item.name}</h4>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Inventory Group: <span className="text-slate-900">RX-{item.id.slice(0,4).toUpperCase()}</span></p>
                      <div className="flex items-center gap-4 mt-4">
                        <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest">QTY: {item.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-10">
                      <div className="flex flex-col">
                        <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">₹{item.price * item.quantity}</span>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Total</span>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id, item.pharmacyId)}
                        className="w-14 h-14 flex items-center justify-center text-slate-200 hover:text-rose-500 bg-white border border-slate-100 rounded-2xl hover:shadow-2xl hover:border-rose-100 transition-all duration-300 active:scale-90"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Premium Floating Checkout Bar */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-50 animate-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both">
        <div className="bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.4)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-10">
          <div className="flex items-center gap-10 divide-x divide-white/10">
            {/* Schedule Pickup Toggle */}
            <div className="flex items-center gap-4">
              <div 
                className={`w-14 h-7 rounded-full p-1.5 cursor-pointer transition-all duration-500 ${showSchedule ? 'bg-teal-500' : 'bg-slate-700'}`}
                onClick={() => setShowSchedule(!showSchedule)}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-lg transition-all duration-500 ${showSchedule ? 'translate-x-7 rotate-[360deg]' : 'translate-x-0'}`}></div>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2 whitespace-nowrap">
                  <Clock size={12} className="text-teal-400" /> Pickup Time
                </label>
                {showSchedule ? (
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="bg-transparent border-none text-teal-400 p-0 text-lg font-black tracking-tight outline-none focus:ring-0"
                  />
                ) : (
                  <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1">Asap Pickup</span>
                )}
              </div>
            </div>

            <div className="pl-10">
              <p className="text-[10px] font-black text-teal-400 uppercase tracking-[0.4em] mb-2 opacity-70">Pay at Pharmacy</p>
              <div className="flex items-baseline gap-2">
                <span className="text-white text-[14px] font-black uppercase opacity-40">INR</span>
                <p className="text-4xl font-black text-white tracking-tighter leading-none">₹{total}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            className="group relative bg-white hover:bg-teal-500 text-slate-900 hover:text-white px-12 h-20 rounded-[2rem] font-black text-[13px] uppercase tracking-[0.3em] transition-all duration-500 transform active:scale-[0.97] shadow-2xl flex items-center justify-center gap-4 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="relative z-10">{user ? (showSchedule ? 'Confirm Schedule' : 'Reserve Locally') : 'Sign in to Continue'}</span>
            <ArrowRight size={20} className="relative z-10 group-hover:translate-x-2 transition-transform duration-500" />
          </button>
        </div>
      </div>
    </div>
  );
}