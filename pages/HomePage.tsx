import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, ArrowUpDown, Sparkles, TrendingUp, Shield, Clock, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SearchResult } from '../types';
import { PharmacyCard } from '../components/PharmacyCard';
import { searchMedicinesSubscription, saveExternalResults } from '../services/dbService';
import { searchMedicinesFromMyUpchar } from '../services/myUpcharService';
import { FeedbackSection } from '../components/FeedbackSection';
import { analytics } from '../services/posthog';

const QUICK_SEARCHES = ['Dolo 650', 'Paracetamol', 'Insulin', 'Azithromycin', 'Omez'];

const STATS = [
  { icon: <Zap size={14} />, value: '20+', label: 'Pharmacies' },
  { icon: <Clock size={14} />, value: '< 2 min', label: 'Avg Response' },
  { icon: <Shield size={14} />, value: '100%', label: 'Verified Stock' },
  { icon: <TrendingUp size={14} />, value: '5k+', label: 'Medicines' },
];

export const HomePage = () => {
  const { userLocation, locationError, isLoadingLocation, addToCart } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filter, setFilter] = useState<'Hub' | 'Local Store' | undefined>(undefined);
  const [sortByPrice, setSortByPrice] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [dbResults, setDbResults] = useState<SearchResult[]>([]);
  const [apiResults, setApiResults] = useState<SearchResult[]>([]);

  // Track page view
  useEffect(() => {
    analytics.page('Home — Medicine Search');
  }, []);

  // Real-time DB Subscription
  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setDbResults([]);
      return;
    }
    const unsub = searchMedicinesSubscription(query, userLocation, filter, (newDbResults) => {
      setDbResults(newDbResults);
    });
    return () => { if (unsub) unsub(); };
  }, [query, filter, userLocation]);

  // Combine + deduplicate results
  useEffect(() => {
    let allResults = [...dbResults, ...apiResults];
    const seen = new Set();
    allResults = allResults.filter(item => {
      const key = `${item.pharmacy.id}-${item.medicine.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (sortByPrice) allResults.sort((a, b) => a.medicine.price - b.medicine.price);
    setResults(allResults);

    // Track results shown
    if (hasSearched && allResults.length > 0) {
      analytics.searchResultsShown(query, dbResults.length, apiResults.length, allResults.length);
    } else if (hasSearched && query.length >= 3 && !isSearching) {
      analytics.searchEmpty(query);
    }
  }, [dbResults, apiResults, sortByPrice]);

  const handleSearch = async (e: React.FormEvent, overrideQuery?: string) => {
    e.preventDefault();
    const searchQuery = overrideQuery || query;
    if (!searchQuery.trim()) return;
    if (overrideQuery) setQuery(overrideQuery);

    setIsSearching(true);
    setHasSearched(true);
    analytics.searchPerformed(searchQuery, 0, !!filter);

    try {
      const myUpcharResults = await searchMedicinesFromMyUpchar(searchQuery);
      setApiResults(myUpcharResults);
      if (myUpcharResults.length > 0) {
        saveExternalResults(myUpcharResults).catch(console.error);
      }
    } catch (error) {
      console.error('API Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFilterChange = (newFilter: 'Hub' | 'Local Store' | undefined) => {
    analytics.filterApplied('pharmacy_type', newFilter);
    setFilter(newFilter);
  };

  const handleSortToggle = () => {
    analytics.sortApplied('price_asc', !sortByPrice);
    setSortByPrice(!sortByPrice);
  };

  return (
    <div className="pb-20 page-enter">
      {/* ── Hero Section ── */}
      <div className="relative rounded-3xl overflow-hidden mb-10 p-8 md:p-12"
        style={{
          background: 'linear-gradient(135deg, rgba(5,20,40,0.95) 0%, rgba(6,78,59,0.4) 50%, rgba(5,20,40,0.95) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 0 80px rgba(13,148,136,0.08)',
        }}>
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-30%] right-[-10%] w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-20%] left-[-5%] w-[300px] h-[300px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative z-10 max-w-3xl">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-[11px] font-bold tracking-widest uppercase"
            style={{ background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.2)', color: '#2dd4bf' }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500"></span>
            </span>
            Real-Time Network Active
          </div>

          <h1 className="text-4xl md:text-6xl font-black mb-4 text-white leading-tight tracking-tight">
            Find <span className="text-gradient-teal">Medicines</span>
            <br />Instantly.
          </h1>
          <p className="text-base md:text-lg text-slate-400 mb-8 max-w-xl leading-relaxed">
            Connect directly with local pharmacies for real-time stock verification and instant reservations.
            {locationError && <span className="text-rose-400 text-sm block mt-2 font-medium">⚠️ {locationError}</span>}
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative group mb-4" id="search-bar">
            <div className="relative flex items-center">
              <Search className="absolute left-4 text-slate-500 group-focus-within:text-teal-400 transition-colors z-10" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for medicines (e.g. Dolo, Insulin, Paracetamol)..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl text-white text-base font-medium outline-none transition-all duration-300 placeholder-slate-500"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(13,148,136,0.5)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1), inset 0 1px 0 rgba(255,255,255,0.05)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)';
                  e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.05)';
                }}
              />
              <button type="submit" disabled={isSearching || isLoadingLocation}
                className="absolute right-2 top-2 bottom-2 px-6 rounded-xl font-bold text-white text-sm transition-all duration-300 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 20px rgba(13,148,136,0.3)' }}>
                {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Search'}
              </button>
            </div>
          </form>

          {/* Quick Search Pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs text-slate-600 self-center font-medium">Quick:</span>
            {QUICK_SEARCHES.map(q => (
              <button key={q} onClick={(e) => handleSearch(e as any, q)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(13,148,136,0.12)';
                  e.currentTarget.style.borderColor = 'rgba(13,148,136,0.3)';
                  e.currentTarget.style.color = '#2dd4bf';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#64748b';
                }}>
                {q}
              </button>
            ))}
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-2">
            {([['Hub', 'Hubs Only'], ['Local Store', 'Local Stores']] as const).map(([val, label]) => (
              <button key={val}
                onClick={() => handleFilterChange(filter === val ? undefined : val)}
                className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                style={{
                  background: filter === val ? 'rgba(13,148,136,0.25)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${filter === val ? 'rgba(13,148,136,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  color: filter === val ? '#2dd4bf' : '#64748b',
                }}>
                {label}
              </button>
            ))}
            <button onClick={handleSortToggle}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
              style={{
                background: sortByPrice ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${sortByPrice ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: sortByPrice ? '#f59e0b' : '#64748b',
              }}>
              <ArrowUpDown size={11} /> Lowest Price
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="relative z-10 mt-8 pt-6 border-t flex flex-wrap gap-6" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {STATS.map(stat => (
            <div key={stat.label} className="flex items-center gap-2">
              <span className="text-teal-500">{stat.icon}</span>
              <span className="text-white font-black text-sm">{stat.value}</span>
              <span className="text-slate-500 text-xs">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Loading State ── */}
      {isSearching && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce animation-delay-100" />
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce animation-delay-200" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Querying global network...</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl p-6 h-48 skeleton" style={{ border: '1px solid rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Results Header ── */}
      {results.length > 0 && !isSearching && (
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-bold text-lg">Results</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(13,148,136,0.15)', color: '#2dd4bf', border: '1px solid rgba(13,148,136,0.25)' }}>
              {results.length} found
            </span>
          </div>
          <span className="text-xs text-slate-600 font-medium">for "{query}"</span>
        </div>
      )}

      {/* ── Results Grid ── */}
      {!isSearching && (
        <div className="grid md:grid-cols-2 gap-4">
          {results.map((result, idx) => (
            <PharmacyCard
              key={`${result.pharmacy.id}-${result.medicine.id}-${idx}`}
              data={result}
              onAddToCart={() => {
                analytics.addToCart(result.medicine.name, result.pharmacy.id, result.pharmacy.name, result.medicine.price, 1);
                addToCart({ ...result.medicine, quantity: 1, pharmacyId: result.pharmacy.id });
                // Simple toast effect
                const btn = document.getElementById(`cart-link`);
                btn?.animate([{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 300 });
              }}
              onFindAlternative={() => {
                analytics.findAlternativeClicked(result.medicine.name, result.medicine.genericName);
                setQuery(result.medicine.genericName);
                handleSearch({ preventDefault: () => {} } as any, result.medicine.genericName);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!isSearching && results.length === 0 && hasSearched && query.length >= 3 && (
        <div className="text-center py-24">
          <div className="inline-flex p-8 rounded-3xl mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Search size={40} className="text-slate-600" />
          </div>
          <h3 className="text-xl font-black text-white mb-2">No results for "{query}"</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
            Try a different name, generic name, or check your spelling.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {QUICK_SEARCHES.map(q => (
              <button key={q} onClick={(e) => handleSearch(e as any, q)}
                className="px-4 py-2 rounded-full text-sm font-medium text-teal-400 transition-all hover:scale-105"
                style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)' }}>
                Try "{q}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Welcome State ── */}
      {!hasSearched && (
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {[
            { icon: '🔍', title: 'Real-Time Search', desc: 'Search across 20+ pharmacies simultaneously with live stock data.' },
            { icon: '📍', title: 'Location-Aware', desc: 'Results sorted by distance from your current location automatically.' },
            { icon: '🛒', title: 'Instant Reserve', desc: 'Reserve medicines online and pick up at the pharmacy — skip the queue.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl card-hover" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-bold text-white text-sm mb-1">{title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Feedback ── */}
      <div className="mt-20">
        <FeedbackSection />
      </div>
    </div>
  );
};
