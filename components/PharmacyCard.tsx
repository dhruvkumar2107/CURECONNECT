import React from 'react';
import { SearchResult } from '../types';
import { getStockStatus } from '../services/mockDatabase';
import { StockStatus } from '../types';
import { MapPin, Phone, ShoppingBag, AlertCircle, FileText, Flag, Globe } from 'lucide-react';

interface Props {
  data: SearchResult;
  onAddToCart?: () => void;
  onFindAlternative?: () => void;
}

export const PharmacyCard: React.FC<Props> = ({ data, onAddToCart, onFindAlternative }) => {
  const { pharmacy, medicine, stock, distance } = data;
  const status = getStockStatus(stock.quantity);

  const getStatusColor = (s: StockStatus) => {
    switch (s) {
      case StockStatus.IN_STOCK: return 'bg-green-100 text-green-800 border-green-200';
      case StockStatus.LOW_STOCK: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case StockStatus.OUT_OF_STOCK: return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const handleReportIssue = () => {
    // In a real app, this would send a report to the backend
    alert(`Report submitted: Stock info for ${medicine.name} at ${pharmacy.name} is incorrect. We will verify this.`);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 p-6 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 relative group border-b-4 border-b-transparent hover:border-b-teal-500/20 active:scale-[0.99]">
      <div className="flex justify-between items-start mb-5">
        <div className="max-w-[70%]">
          <h3 className="font-black text-xl text-slate-900 tracking-tight leading-tight group-hover:text-teal-600 transition-colors uppercase">{pharmacy.name}</h3>
          <div className="flex flex-wrap items-center gap-y-1 text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">
            <div className="flex items-center bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
              <MapPin size={12} className="mr-1.5 text-teal-500" />
              <span>{distance} km away</span>
            </div>
            <span className="mx-2 text-slate-200">|</span>
            <div className="flex items-center bg-teal-50 text-teal-600 px-2 py-1 rounded-lg border border-teal-100/50">
              <Globe size={12} className="mr-1.5" />
              <span>{pharmacy.type}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusColor(status)}`}>
            {status}
          </div>
          {data.isExternalApi && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[9px] font-black border border-indigo-100/50 animate-pulse tracking-widest uppercase">
              <Globe size={10} />
              <span>Live API</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-50/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-100/50 mb-6 group-hover:bg-white group-hover:border-teal-100/50 transition-all duration-500">
        <div className="flex items-start justify-between">
          <div className="max-w-[65%]">
            <p className="font-black text-slate-900 text-lg leading-none uppercase tracking-tight">{medicine.name}</p>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">{medicine.genericName}</p>
            
            <div className="flex flex-wrap gap-2 mt-4">
              {medicine.requiresPrescription && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[9px] font-black border border-amber-100/50 uppercase tracking-widest">
                  <FileText size={12} />
                  <span>Rx Required</span>
                </div>
              )}
              {medicine.isCritical && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-[9px] font-black border border-rose-100/50 animate-pulse uppercase tracking-widest">
                  <AlertCircle size={12} />
                  <span>Critical</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-slate-900 tracking-tighter">₹{medicine.price}</p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-60">
              {stock.quantity} Units left
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {status !== StockStatus.OUT_OF_STOCK ? (
          <button
            onClick={onAddToCart}
            className="flex-1 bg-slate-900 hover:bg-teal-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all duration-300 shadow-xl shadow-slate-200 hover:shadow-teal-100 active:scale-95"
          >
            <ShoppingBag size={18} /> Add to Cart
          </button>
        ) : (
          <button
            onClick={onFindAlternative}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all duration-300 shadow-xl shadow-indigo-100 active:scale-95"
          >
            <AlertCircle size={18} /> Find Alternative
          </button>
        )}
        <a 
          href={`tel:${pharmacy.phone}`} 
          className="w-14 h-14 flex items-center justify-center text-slate-400 border border-slate-100 rounded-xl hover:bg-slate-50 hover:text-teal-600 hover:border-teal-100 transition-all duration-300 active:scale-95"
        >
          <Phone size={22} />
        </a>
      </div>

      <div className="flex justify-between items-center mt-5 px-1">
        {stock.expiryDate && new Date(stock.expiryDate) < new Date(Date.now() + 7776000000) && (
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100/50 flex items-center gap-1.5 animate-pulse">
            <AlertCircle size={10} /> Expiring soon
          </span>
        )}
        <div className="flex-1"></div>
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
          Updated {new Date(stock.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Report Button */}
      <button
        onClick={handleReportIssue}
        className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 text-slate-200 hover:text-rose-500 bg-white shadow-lg rounded-full"
        title="Report Issue"
      >
        <Flag size={14} />
      </button>
    </div>
  );
};