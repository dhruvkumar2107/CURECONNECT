import React, { useState, useEffect } from 'react';
import { Search, MapPin, Filter, ArrowUpDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SearchResult } from '../types';
import { PharmacyCard } from '../components/PharmacyCard';
import { searchMedicinesRealTime, saveExternalResults } from '../services/dbService';
import { searchMedicinesFromMyUpchar } from '../services/myUpcharService';
import { FeedbackSection } from '../components/FeedbackSection';

export const HomePage = () => {
  const { userLocation, locationError, isLoadingLocation, addToCart } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filter, setFilter] = useState<'Hub' | 'Local Store' | undefined>(undefined);
  const [sortByPrice, setSortByPrice] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);

    try {
      // 1. Search DB
      let allResultsFromDb: SearchResult[] = [];
      try {
        allResultsFromDb = await searchMedicinesRealTime(query, userLocation, filter);
      } catch (dbError: any) {
        console.error("DB Search failed:", dbError);
        if (dbError.code === 'permission-denied') {
          alert("Firebase Permission Error: Please update your Firestore Security Rules in the Firebase Console (Rules tab) to 'allow read, write: if true;'.");
        }
      }

      // 2. Search API
      let myUpcharResults: SearchResult[] = [];
      try {
        myUpcharResults = await searchMedicinesFromMyUpchar(query);
        console.log(`API returned ${myUpcharResults.length} results`);
      } catch (apiError) {
        console.error("API Search failed:", apiError);
      }
      
      // Sync external data to DB in background (silent fail)
      if (myUpcharResults.length > 0) {
        saveExternalResults(myUpcharResults).catch(e => console.error("Background sync failed:", e));
      }

      let allResults = [...allResultsFromDb, ...myUpcharResults];

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

    } catch (error) {
      console.error("Total Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Find Medicines Instantly</h1>
          <p className="text-teal-100 mb-8 max-w-lg">
            Real-time availability from pharmacies near you.
            {locationError && <span className="text-amber-300 text-sm block mt-2">⚠️ {locationError}</span>}
          </p>

          <form onSubmit={handleSearch} className="relative max-w-2xl" id="search-bar">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for medicines (e.g. Dolo, Insulin)..."
              className="w-full h-14 pl-12 pr-4 rounded-xl text-slate-800 shadow-lg focus:ring-4 focus:ring-teal-500/30 outline-none transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <button
              type="submit"
              disabled={isSearching || isLoadingLocation}
              className="absolute right-2 top-2 h-10 bg-teal-600 hover:bg-teal-700 text-white px-6 rounded-lg font-medium transition-colors disabled:opacity-70"
            >
              {isSearching ? 'Searching...' : 'Search'}
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
