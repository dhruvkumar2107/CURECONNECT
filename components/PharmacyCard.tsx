import React from 'react';
import { SearchResult } from '../types';
import { getStockStatus } from '../services/mockDatabase';
import { StockStatus } from '../types';
import { MapPin, Phone, ShoppingBag, AlertCircle, FileText, Flag, Globe, Star } from 'lucide-react';
import { analytics } from '../services/posthog';

interface Props {
  data: SearchResult;
  onAddToCart?: () => void;
  onFindAlternative?: () => void;
}

export const PharmacyCard: React.FC<Props> = ({ data, onAddToCart, onFindAlternative }) => {
  const { pharmacy, medicine, stock, distance } = data;
  const status = getStockStatus(stock.quantity);

  const statusConfig = {
    [StockStatus.IN_STOCK]: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', color: '#34d399', dot: '#10b981', label: 'In Stock' },
    [StockStatus.LOW_STOCK]: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24', dot: '#f59e0b', label: 'Low Stock' },
    [StockStatus.OUT_OF_STOCK]: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171', dot: '#ef4444', label: 'Out of Stock' },
  };
  const sc = statusConfig[status];

  const handleReport = () => {
    analytics.stockReported(medicine.name, pharmacy.name);
    alert(`Report submitted for ${medicine.name} at ${pharmacy.name}. We'll verify this.`);
  };

  const handlePhoneCall = () => {
    analytics.pharmacyCalled(pharmacy.name, pharmacy.id, pharmacy.phone);
  };

  return (
    <div className="group relative rounded-2xl overflow-hidden transition-all duration-300 card-hover"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(13,148,136,0.25)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
      }}>

      {/* Top accent bar based on stock status */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${sc.dot}, transparent)` }} />

      <div className="p-5">
        {/* ── Header Row ── */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 mr-3">
            <h3 className="font-bold text-white text-base leading-tight truncate group-hover:text-teal-300 transition-colors">
              {pharmacy.name}
            </h3>
            <div className="flex items-center flex-wrap gap-2 mt-1.5">
              <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <MapPin size={11} className="text-teal-600" />
                {distance === 999 ? 'Online' : `${distance} km`}
              </span>
              <span className="text-slate-700">·</span>
              <span className="flex items-center gap-1 text-xs font-medium"
                style={{ color: pharmacy.type === 'Hub' ? '#2dd4bf' : '#94a3b8' }}>
                <Globe size={11} />
                {pharmacy.type}
              </span>
              {pharmacy.rating > 0 && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                    <Star size={11} className="fill-amber-400" />
                    {pharmacy.rating}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {/* Stock badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
              {sc.label}
            </div>

            {/* Live API badge */}
            {data.isExternalApi && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Live API
              </div>
            )}
          </div>
        </div>

        {/* ── Medicine Info ── */}
        <div className="rounded-xl p-4 mb-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-black text-white text-lg leading-tight truncate">{medicine.name}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{medicine.genericName}</p>

              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {medicine.requiresPrescription && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                    <FileText size={10} /> Rx Required
                  </span>
                )}
                {medicine.isCritical && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    <AlertCircle size={10} /> Critical
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-500"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {medicine.category}
                </span>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-black text-white leading-none">₹{medicine.price}</p>
              <p className="text-[11px] text-slate-600 font-medium mt-1">
                {stock.quantity > 900 ? 'In Stock' : `${stock.quantity} left`}
              </p>
            </div>
          </div>
        </div>

        {/* ── Actions Row ── */}
        <div className="flex gap-2">
          {status !== StockStatus.OUT_OF_STOCK ? (
            <button onClick={onAddToCart}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all duration-300 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 20px rgba(13,148,136,0.2)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(13,148,136,0.4)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(13,148,136,0.2)'; }}>
              <ShoppingBag size={15} /> Add to Cart
            </button>
          ) : (
            <button onClick={onFindAlternative}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all duration-300 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
              <AlertCircle size={15} /> Find Alternative
            </button>
          )}

          <a href={`tel:${pharmacy.phone}`} onClick={handlePhoneCall}
            className="w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(13,148,136,0.12)';
              (e.currentTarget as HTMLElement).style.color = '#2dd4bf';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(13,148,136,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
              (e.currentTarget as HTMLElement).style.color = '#64748b';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
            }}>
            <Phone size={18} />
          </a>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {stock.expiryDate && new Date(stock.expiryDate) < new Date(Date.now() + 7776000000) && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
              <AlertCircle size={10} /> Expiring soon
            </span>
          )}
          <span className="ml-auto text-[10px] text-slate-600 font-medium">
            Updated {new Date(stock.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Report button */}
      <button onClick={handleReport}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg text-slate-600 hover:text-rose-400"
        style={{ background: 'rgba(255,255,255,0.05)' }}
        title="Report incorrect info">
        <Flag size={12} />
      </button>
    </div>
  );
};