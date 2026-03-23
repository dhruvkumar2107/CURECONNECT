import React, { useState, useEffect } from 'react';
import { Search, MapPin, Filter, ArrowUpDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SearchResult } from '../types';
import { PharmacyCard } from '../components/PharmacyCard';
import { searchMedicinesSubscription, saveExternalResults } from '../services/dbService';
import { searchMedicinesFromMyUpchar } from '../services/myUpcharService';
import { FeedbackSection } from '../components/FeedbackSection';

export const HomePage = () => {
  const { userLocation, locationError, isLoadingLocation, addToCart } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filter, setFilter] = useState<'Hub' | 'Local Store' | undefined>(undefined);
  const [sortByPrice, setSortByPrice] = useState(false);

  const [dbResults, setDbResults] = useState<SearchResult[]>([]);
  const [apiResults, setApiResults] = useState<SearchResult[]>([]);

  // 1. Real-time DB Subscription
  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setDbResults([]);
      return;
    }

    console.log(`🔄 [Real-time] Subscribing to search: "${query}"`);
    const unsub = searchMedicinesSubscription(query, userLocation, filter, (newDbResults) => {
      console.log(`🔄 [Real-time] DB updated: ${newDbResults.length} items`);
      setDbResults(newDbResults);
    });

    return () => {
      console.log(`🔕 [Real-time] Unsubscribing from: "${query}"`);
      if (unsub) unsub();
    };
  }, [query, filter, userLocation]);

  // 2. Combine Results
  useEffect(() => {
    let allResults = [...dbResults, ...apiResults];

    // Remove duplicates
    const seen = new Set();
    allResults = allResults.filter(item => {
      const key = `${item.pharmacy.id}-${item.medicine.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (sortByPrice) {
      allResults.sort((a, b) => a.medicine.price - b.medicine.price);
    }

    setResults(allResults);
  }, [dbResults, apiResults, sortByPrice]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    // API results are one-time, but DB results are real-time via the useEffect above.
    
    try {
      // Search API
      const myUpcharResults = await searchMedicinesFromMyUpchar(query);
      console.log(`📡 [API] Search returned ${myUpcharResults.length} results`);
      setApiResults(myUpcharResults);
      
      // Sync external data to DB in background
      if (myUpcharResults.length > 0) {
        saveExternalResults(myUpcharResults).catch(e => console.error("Background sync failed:", e));
      }
    } catch (error) {
      console.error("API Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="pb-20">
      {/* Premium Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-teal-900 to-teal-800 rounded-[2.5rem] p-12 text-white shadow-2xl mb-12 relative overflow-hidden border border-white/5 mx-2 sm:mx-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full -mr-32 -mt-32 blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-[80px]"></div>
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-teal-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            Real-Time Network Active
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-[1.1] tracking-tight">
            Find <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-300">Medicines</span> <br/>
            Instantly.
          </h1>
          
          <p className="text-lg text-teal-100/70 mb-10 max-w-xl font-medium leading-relaxed">
            Connect directly with local pharmacies for real-time stock verification and instant reservations.
            {locationError && <span className="text-rose-400 text-sm block mt-3 font-bold">⚠️ {locationError}</span>}
          </p>

          <form onSubmit={handleSearch} className="relative group" id="search-bar">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for medicines (e.g. Dolo, Insulin)..."
              className="w-full h-16 pl-14 pr-32 rounded-2xl text-slate-800 shadow-2xl shadow-black/20 focus:ring-4 focus:ring-teal-500/30 outline-none transition-all duration-500 placeholder:text-slate-400 text-lg font-medium group-hover:scale-[1.01]"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={24} />
            <button
              type="submit"
              disabled={isSearching || isLoadingLocation}
              className="absolute right-2 top-2 bottom-2 bg-teal-600 hover:bg-teal-500 text-white px-8 rounded-xl font-bold transition-all duration-300 disabled:opacity-70 flex items-center gap-2 shadow-lg shadow-teal-900/40 active:scale-95"
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Search'
              )}
            </button>
          </form>

          {/* Filters */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setFilter(filter === 'Hub' ? undefined : 'Hub')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === 'Hub' ? 'bg-white text-teal-800 border-white' : 'bg-white/20 text-white border-white/30 hover:bg-white/30'}`}
            >
              Hubs Only
            </button>
            <button
              onClick={() => setFilter(filter === 'Local Store' ? undefined : 'Local Store')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === 'Local Store' ? 'bg-white text-teal-800 border-white' : 'bg-white/20 text-white border-white/30 hover:bg-white/30'}`}
            >
              Local Stores
            </button>
            <button
              onClick={() => setSortByPrice(!sortByPrice)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${sortByPrice ? 'bg-amber-400 text-amber-900 border-amber-400' : 'bg-white/20 text-white border-white/30 hover:bg-white/30'}`}
            >
              <ArrowUpDown size={12} /> Lowest Price
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid md:grid-cols-2 gap-4">
        {results.map((result, idx) => (
          <PharmacyCard
            key={`${result.pharmacy.id}-${result.medicine.id}-${idx}`}
            data={result}
            onAddToCart={() => {
              addToCart({
                ...result.medicine,
                quantity: 1,
                pharmacyId: result.pharmacy.id
              });
              alert(`Added ${result.medicine.name} to cart!`);
            }}
            onFindAlternative={() => {
              setQuery(result.medicine.genericName);
              handleSearch({ preventDefault: () => { } } as any);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ))}
      </div>

      {!isSearching && results.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p>Search for a medicine to see real-time stock.</p>
        </div>
      )}

      <div className="mt-16">
        <FeedbackSection />
      </div>
    </div>
  );
};
