import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, ArrowUpDown, Sparkles, TrendingUp, Shield, Clock, Zap, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SearchResult } from '../types';
import { PharmacyCard } from '../components/PharmacyCard';
import { searchMedicinesSubscription, saveExternalResults } from '../services/dbService';
import { searchMedicinesFromMyUpchar } from '../services/myUpcharService';
import { FeedbackSection } from '../components/FeedbackSection';
import { analytics } from '../services/posthog';

const QUICK_SEARCHES = ['Dolo 650', 'Paracetamol', 'Insulin', 'Azithromycin', 'Omez'];

const STATS = [
  { icon: <Zap size={13} />,        value: '20+',   label: 'Pharmacies',      color: '#f59e0b' },
  { icon: <Clock size={13} />,       value: '< 2 min', label: 'Avg Response', color: '#2dd4bf' },
  { icon: <Shield size={13} />,      value: '100%',  label: 'Verified Stock',  color: '#10b981' },
  { icon: <TrendingUp size={13} />,  value: '5k+',   label: 'Medicines',       color: '#818cf8' },
];

const FEATURE_CARDS = [
  {
    icon: '🔍',
    title: 'Real-Time Search',
    desc: 'Search across 20+ pharmacies simultaneously with live stock data updated every minute.',
    accent: 'rgba(13,148,136,0.1)',
    accentBorder: 'rgba(13,148,136,0.2)',
  },
  {
    icon: '📍',
    title: 'Location-Aware',
    desc: 'Results sorted by walking distance from your current location — automatically.',
    accent: 'rgba(99,102,241,0.1)',
    accentBorder: 'rgba(99,102,241,0.2)',
  },
  {
    icon: '🛒',
    title: 'Instant Reserve',
    desc: 'Reserve medicines online and pick up at the pharmacy — skip the queue entirely.',
    accent: 'rgba(245,158,11,0.1)',
    accentBorder: 'rgba(245,158,11,0.2)',
  },
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

  useEffect(() => {
    analytics.page('Home — Medicine Search');
  }, []);

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
      <div
        className="relative rounded-3xl overflow-hidden mb-10"
        style={{
          background: 'linear-gradient(135deg, rgba(4,14,30,0.98) 0%, rgba(5,40,35,0.5) 50%, rgba(4,14,30,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 0 100px rgba(13,148,136,0.07), inset 0 0 60px rgba(13,148,136,0.03)',
        }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-25%] right-[-8%] w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.14) 0%, transparent 65%)' }} />
          <div className="absolute bottom-[-25%] left-[-5%] w-[350px] h-[350px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 65%)' }} />
          {/* Grid overlay */}
          <div className="absolute inset-0 grid-bg opacity-[0.4]" />
        </div>

        <div className="relative z-10 p-8 md:p-12">
          {/* Status badge */}
          <div
            className="section-label mb-7"
            style={{ display: 'inline-flex' }}
          >
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
            </span>
            Real-Time Network Active
          </div>

          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-black mb-4 text-white leading-[1.1] tracking-tight font-jakarta">
              Find{' '}
              <span className="text-gradient-teal">Medicines</span>
              <br />Instantly.
            </h1>
            <p className="text-base md:text-lg text-slate-400 mb-8 max-w-xl leading-relaxed">
              Connect directly with local pharmacies for real-time stock verification and instant reservations — no calls, no wait.
              {locationError && (
                <span className="text-rose-400 text-sm block mt-2 font-medium">⚠️ {locationError}</span>
              )}
            </p>

            {/* ── Search Bar ── */}
            <form onSubmit={handleSearch} className="relative mb-4 group" id="search-bar">
              <div className="relative flex items-center">
                <Search
                  className="absolute left-4 z-10 transition-colors duration-300"
                  size={19}
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search medicines — e.g. Dolo 650, Insulin, Paracetamol..."
                  className="w-full pl-12 pr-36 py-4 rounded-2xl text-white text-base font-medium outline-none transition-all duration-300 placeholder-slate-600"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                    fontSize: '15px',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(13,148,136,0.55)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.12), 0 0 30px rgba(13,148,136,0.08)';
                    const icon = e.currentTarget.previousElementSibling as HTMLElement;
                    if (icon) icon.style.color = '#2dd4bf';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
                    e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.04)';
                    const icon = e.currentTarget.previousElementSibling as HTMLElement;
                    if (icon) icon.style.color = 'var(--text-muted)';
                  }}
                />
                <button
                  type="submit"
                  disabled={isSearching || isLoadingLocation}
                  className="absolute right-2 top-2 bottom-2 px-6 rounded-xl font-bold text-white text-sm transition-all duration-300 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                    boxShadow: '0 0 20px rgba(13,148,136,0.35)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 35px rgba(13,148,136,0.55)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(13,148,136,0.35)'; }}
                >
                  {isSearching
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Search size={14} /> Search</>
                  }
                </button>
              </div>
            </form>

            {/* Quick Searches */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-[11px] text-slate-600 font-bold uppercase tracking-widest">Quick:</span>
              {QUICK_SEARCHES.map(q => (
                <button
                  key={q}
                  onClick={(e) => handleSearch(e as any, q)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(13,148,136,0.12)';
                    e.currentTarget.style.borderColor = 'rgba(13,148,136,0.3)';
                    e.currentTarget.style.color = '#2dd4bf';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {(['Hub', 'Local Store'] as const).map((val) => {
                const isActive = filter === val;
                return (
                  <button
                    key={val}
                    onClick={() => handleFilterChange(isActive ? undefined : val)}
                    className="px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all duration-200"
                    style={{
                      background:   isActive ? 'rgba(13,148,136,0.2)'   : 'rgba(255,255,255,0.04)',
                      border:       `1px solid ${isActive ? 'rgba(13,148,136,0.45)' : 'rgba(255,255,255,0.08)'}`,
                      color:        isActive ? '#2dd4bf' : '#64748b',
                    }}
                  >
                    {val === 'Hub' ? 'Hubs Only' : 'Local Stores'}
                  </button>
                );
              })}
              <button
                onClick={handleSortToggle}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all duration-200"
                style={{
                  background: sortByPrice ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
                  border:     `1px solid ${sortByPrice ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  color:      sortByPrice ? '#fbbf24' : '#64748b',
                }}
              >
                <ArrowUpDown size={11} /> Lowest Price
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div
            className="mt-8 pt-6 flex flex-wrap gap-6"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            {STATS.map(stat => (
              <div key={stat.label} className="flex items-center gap-2">
                <span style={{ color: stat.color }}>{stat.icon}</span>
                <span className="text-white font-black text-sm">{stat.value}</span>
                <span className="text-slate-500 text-xs">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Loading Skeletons ── */}
      {isSearching && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-5 px-1">
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Querying network...</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl p-6 h-52 skeleton" style={{ border: '1px solid rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Results Header ── */}
      {results.length > 0 && !isSearching && (
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-black text-lg tracking-tight">Results</h2>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(13,148,136,0.12)', color: '#2dd4bf', border: '1px solid rgba(13,148,136,0.22)' }}
            >
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
                const btn = document.getElementById('cart-link');
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
          <div
            className="inline-flex p-8 rounded-3xl mb-6"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Search size={44} className="text-slate-700" />
          </div>
          <h3 className="text-xl font-black text-white mb-2">No results for "{query}"</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-6">
            Try a generic name, alternate spelling, or browse popular medicines below.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_SEARCHES.map(q => (
              <button
                key={q}
                onClick={(e) => handleSearch(e as any, q)}
                className="px-4 py-2 rounded-full text-sm font-medium text-teal-400 transition-all hover:scale-105 active:scale-95"
                style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)' }}
              >
                Try "{q}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Welcome / Feature Cards ── */}
      {!hasSearched && (
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {FEATURE_CARDS.map(({ icon, title, desc, accent, accentBorder }, i) => (
            <div
              key={title}
              className="group p-6 rounded-2xl transition-all duration-300 cursor-default"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                animationDelay: `${i * 80}ms`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = accent;
                (e.currentTarget as HTMLElement).style.borderColor = accentBorder;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 50px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="font-bold text-white text-sm mb-2">{title}</h3>
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
