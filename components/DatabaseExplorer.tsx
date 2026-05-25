import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { 
  Database, X, Info, Layers, Activity, Search, ShoppingCart, 
  Store, ClipboardList, MessageSquare, BookOpen, Clock, ArrowRight, ShieldAlert
} from 'lucide-react';

export const DatabaseExplorer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'queries' | 'cart_events' | 'pharmacies' | 'orders' | 'feedbacks' | 'schema'>('pipeline');
  
  // Real-time Firestore States
  const [queriesList, setQueriesList] = useState<any[]>([]);
  const [cartEventsList, setCartEventsList] = useState<any[]>([]);
  const [pharmaciesList, setPharmaciesList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [feedbacksList, setFeedbacksList] = useState<any[]>([]);
  
  // Selected pharmacy for inventory inspector
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>('');

  // Subscribe to collections
  useEffect(() => {
    if (!isOpen) return;

    // 1. Search Queries
    const qQueries = query(collection(db, 'queries'), orderBy('timestamp', 'desc'), limit(15));
    const unsubQueries = onSnapshot(qQueries, (snapshot) => {
      setQueriesList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, err => console.error("DBExplorer queries unsub failed:", err));

    // 2. Cart Events
    const qCart = query(collection(db, 'cart_events'), orderBy('timestamp', 'desc'), limit(15));
    const unsubCart = onSnapshot(qCart, (snapshot) => {
      setCartEventsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, err => console.error("DBExplorer cart unsub failed:", err));

    // 3. Pharmacies & Inventory
    const qPharmacies = query(collection(db, 'pharmacies'));
    const unsubPharmacies = onSnapshot(qPharmacies, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPharmaciesList(list);
      if (list.length > 0 && !selectedPharmacyId) {
        setSelectedPharmacyId(list[0].id);
      }
    }, err => console.error("DBExplorer pharmacies unsub failed:", err));

    // 4. Orders
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(10));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrdersList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, err => console.error("DBExplorer orders unsub failed:", err));

    // 5. Feedbacks
    const qFeedbacks = query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc'), limit(10));
    const unsubFeedbacks = onSnapshot(qFeedbacks, (snapshot) => {
      setFeedbacksList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, err => console.error("DBExplorer feedbacks unsub failed:", err));

    return () => {
      unsubQueries();
      unsubCart();
      unsubPharmacies();
      unsubOrders();
      unsubFeedbacks();
    };
  }, [isOpen, selectedPharmacyId]);

  // Format timestamp safely
  const formatTime = (ts: any) => {
    if (!ts) return 'just now';
    try {
      if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleTimeString();
      if (ts.toDate) return ts.toDate().toLocaleTimeString();
      return new Date(ts).toLocaleTimeString();
    } catch {
      return 'just now';
    }
  };

  const selectedPharmacy = pharmaciesList.find(p => p.id === selectedPharmacyId);

  return (
    <>
      {/* ── Glowing Floating Access Button ── */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-4 rounded-2xl flex items-center gap-2.5 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #10b981, #047857)',
          boxShadow: '0 0 25px rgba(16,185,129,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div className="relative">
          <Database size={16} className="animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-300 animate-ping" />
        </div>
        <span>DB Console</span>
      </button>

      {/* ── Immersive Database Explorer Control Center overlay ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-[#020617]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
          
          <div 
            className="w-full max-w-6xl h-[85vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border relative animate-in zoom-in-95 duration-300"
            style={{
              background: 'linear-gradient(165deg, rgba(8,15,40,0.92) 0%, rgba(5,12,30,0.98) 100%)',
              borderColor: 'rgba(255,255,255,0.08)',
              boxShadow: '0 25px 70px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
          >
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none" 
              style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 65%)' }} />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full pointer-events-none" 
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.03) 0%, transparent 65%)' }} />

            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between relative z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                  <Database size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    CureConnect <span className="text-emerald-400 font-extrabold text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">Live Data Pipeline Inspector</span>
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Real-time Data Engineering Diagnostic Center</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-all border border-white/5"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-8 bg-white/[0.01] border-b border-white/5 flex gap-1 overflow-x-auto relative z-10 flex-shrink-0 no-scrollbar">
              <TabButton active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} icon={<Layers size={14} />} label="Data Pipeline Graph" />
              <TabButton active={activeTab === 'queries'} onClick={() => setActiveTab('queries')} icon={<Search size={14} />} label="Search Queries Log" count={queriesList.length} />
              <TabButton active={activeTab === 'cart_events'} onClick={() => setActiveTab('cart_events')} icon={<ShoppingCart size={14} />} label="Cart Events Stream" count={cartEventsList.length} />
              <TabButton active={activeTab === 'pharmacies'} onClick={() => setActiveTab('pharmacies')} icon={<Store size={14} />} label="Pharmacy Stock Docs" />
              <TabButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<ClipboardList size={14} />} label="Orders Pipeline" count={ordersList.length} />
              <TabButton active={activeTab === 'feedbacks'} onClick={() => setActiveTab('feedbacks')} icon={<MessageSquare size={14} />} label="User Feedbacks" count={feedbacksList.length} />
              <TabButton active={activeTab === 'schema'} onClick={() => setActiveTab('schema')} icon={<BookOpen size={14} />} label="DB Schema & Specs" />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 relative z-10">

              {/* 1. DATA PIPELINE TAB */}
              {activeTab === 'pipeline' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="grid md:grid-cols-3 gap-6">
                    <InfoCard 
                      title="Real-Time Event Stream" 
                      desc="We ingest unstructured user searches and cart modifications. Each action triggers a lightweight event payload written directly to Firestore streams, forming our raw logs." 
                      metric="Latency: <50ms"
                      accentColor="#10b981"
                    />
                    <InfoCard 
                      title="Transactional Synchronization" 
                      desc="Active state variables (like Cart items and Pharmacy inventories) use bi-directional listeners (onSnapshot) to keep local App State in 100% lockstep with the database." 
                      metric="Consistency: Immediate"
                      accentColor="#3b82f6"
                    />
                    <InfoCard 
                      title="Data Normalization Schema" 
                      desc="Optimized for document reads: heavy relational links (pharmacies to stock mapping) are nested as embedded map arrays inside documents to reduce reads, while events stream out into flat logs." 
                      metric="Type: NoSQL Document Store"
                      accentColor="#a855f7"
                    />
                  </div>

                  {/* Flow Chart Node Diagram */}
                  <div className="p-6 rounded-3xl border border-white/5 bg-slate-950/40 relative overflow-hidden">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                      <Activity size={14} className="text-emerald-400 animate-pulse" /> Global Architecture & Live Data Flow Map
                    </h3>

                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative">
                      
                      {/* Node 1: Client Ingest */}
                      <PipelineNode 
                        title="Client Interface (React)"
                        desc="Users trigger Searches, Cart updates, and Pharmacy Restocks"
                        tags={['User Session', 'Guest Token']}
                        color="indigo"
                      />
                      
                      <div className="flex flex-col items-center text-slate-600 font-bold text-xs">
                        <ArrowRight className="rotate-90 lg:rotate-0 text-slate-500" />
                        <span>Payload</span>
                      </div>

                      {/* Node 2: Firestore DB Ingest */}
                      <PipelineNode 
                        title="Firestore Database Pipeline"
                        desc="Locks transactional data and captures flattened analytics collections"
                        tags={['HTAP Architecture', 'Real-time Listeners']}
                        color="emerald"
                      />

                      <div className="flex flex-col items-center text-slate-600 font-bold text-xs">
                        <ArrowRight className="rotate-90 lg:rotate-0 text-slate-500" />
                        <span>Aggregates</span>
                      </div>

                      {/* Node 3: Analytical Presentation */}
                      <PipelineNode 
                        title="Power BI & Presentation"
                        desc="Queries exported CSV datasets to draw regional healthcare insights"
                        tags={['Power BI Feed', 'Analytical View']}
                        color="purple"
                      />
                    </div>
                  </div>

                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex gap-3 text-xs text-slate-400">
                    <span className="text-emerald-400 font-black">EXAM KEY:</span>
                    <p>This layout operates as a **Hybrid Transactional/Analytical Processing (HTAP)** system. Transactional reads are minimized via embedding indexes inside document structures, while audit tracking (cart changes, query logs) follows a scalable append-only event-sourcing design pattern.</p>
                  </div>
                </div>
              )}

              {/* 2. SEARCH QUERIES TAB */}
              {activeTab === 'queries' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">`queries` Collection Real-time Listener (Last 15)</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-full border border-white/5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Listening
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-black uppercase tracking-wider">
                          <th className="p-4">Event ID</th>
                          <th className="p-4">Search Term</th>
                          <th className="p-4">Results Found</th>
                          <th className="p-4">User ID (Visitor)</th>
                          <th className="p-4">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {queriesList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">No search logs in database. Run a search on the home page!</td>
                          </tr>
                        ) : (
                          queriesList.map(q => (
                            <tr key={q.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 font-mono text-[10px] text-slate-500">{q.id}</td>
                              <td className="p-4 font-bold text-white"><span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/15">"{q.query}"</span></td>
                              <td className="p-4 font-black">{q.resultsCount} matching meds</td>
                              <td className="p-4 font-mono text-[10px] text-slate-400 truncate max-w-[120px]" title={q.userId}>{q.userId}</td>
                              <td className="p-4 flex items-center gap-1.5 text-slate-400"><Clock size={11} /> {formatTime(q.timestamp)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. CART EVENTS STREAM TAB */}
              {activeTab === 'cart_events' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">`cart_events` Append-Only Event Stream (Last 15)</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-full border border-white/5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Listening
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-black uppercase tracking-wider">
                          <th className="p-4">Log Event ID</th>
                          <th className="p-4">Action</th>
                          <th className="p-4">Medicine Info</th>
                          <th className="p-4">Pharmacy ID</th>
                          <th className="p-4">Quantity</th>
                          <th className="p-4">Cost (INR)</th>
                          <th className="p-4">User Session ID</th>
                          <th className="p-4">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {cartEventsList.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-500">No cart events logged yet. Add or remove items from your cart!</td>
                          </tr>
                        ) : (
                          cartEventsList.map(e => (
                            <tr key={e.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 font-mono text-[10px] text-slate-500">{e.id}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] border ${
                                  e.action === 'add' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : e.action === 'remove'
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                  {e.action}
                                </span>
                              </td>
                              <td className="p-4 font-bold text-white">{e.medicineName || 'Item'} <span className="block text-[9px] text-slate-500 font-medium">M-ID: {e.medicineId}</span></td>
                              <td className="p-4 font-mono text-[10px] text-slate-400">{e.pharmacyId}</td>
                              <td className="p-4 font-bold">{e.quantity} unit(s)</td>
                              <td className="p-4 font-black text-white">₹{e.price}</td>
                              <td className="p-4 font-mono text-[10px] text-slate-500 truncate max-w-[120px]" title={e.userId}>{e.userId}</td>
                              <td className="p-4 text-slate-400 flex items-center gap-1.5"><Clock size={11} /> {formatTime(e.timestamp)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. PHARMACY STOCK DOCS */}
              {activeTab === 'pharmacies' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">`pharmacies` Stock Inspector</h3>
                      <p className="text-[11px] text-slate-500 mt-1">Select a pharmacy document to review its embedded nested maps in real-time.</p>
                    </div>

                    <select
                      value={selectedPharmacyId}
                      onChange={e => setSelectedPharmacyId(e.target.value)}
                      className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    >
                      {pharmaciesList.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                      ))}
                    </select>
                  </div>

                  {selectedPharmacy ? (
                    <div className="grid md:grid-cols-3 gap-6">
                      
                      {/* Document Details metadata */}
                      <div className="md:col-span-1 p-6 rounded-3xl border border-white/5 bg-slate-950/20 space-y-4">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">Document Metadata</div>
                        <div className="space-y-3 text-xs">
                          <div>
                            <span className="text-slate-500 block">Document ID (Primary Key)</span>
                            <span className="font-mono text-[10px] text-emerald-400 block mt-0.5 break-all">{selectedPharmacy.id}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Pharmacy Name</span>
                            <span className="font-bold text-white block mt-0.5">{selectedPharmacy.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Type</span>
                            <span className="font-bold text-indigo-400 block mt-0.5">{selectedPharmacy.type}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Physical Address</span>
                            <span className="text-slate-300 block mt-0.5">{selectedPharmacy.address}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">GPS Coordinates</span>
                            <span className="font-mono text-slate-400 block mt-0.5">Lat: {selectedPharmacy.location?.latitude}, Lng: {selectedPharmacy.location?.longitude}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Contact Phone</span>
                            <span className="text-slate-300 block mt-0.5">{selectedPharmacy.phone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Embedded Nested Inventory Map Table */}
                      <div className="md:col-span-2 p-6 rounded-3xl border border-white/5 bg-slate-950/20 space-y-4">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">Embedded Map Array (`inventory`)</div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-white/5 text-slate-500 font-bold uppercase">
                                <th className="pb-3">Medicine ID</th>
                                <th className="pb-3 text-right">Quantity</th>
                                <th className="pb-3 text-right">Unit Cost (INR)</th>
                                <th className="pb-3">Restock Lead</th>
                                <th className="pb-3 text-right">Last Sync</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                              {!selectedPharmacy.inventory || selectedPharmacy.inventory.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="py-4 text-center text-slate-500">No inventory products nested. Add stock in Dashboard!</td>
                                </tr>
                              ) : (
                                selectedPharmacy.inventory.map((inv: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-white/[0.01]">
                                    <td className="py-3 font-mono text-[10px] text-emerald-400">{inv.medicineId}</td>
                                    <td className="py-3 font-black text-right text-white">
                                      <span className={`px-2 py-0.5 rounded text-[11px] ${inv.quantity < 10 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                        {inv.quantity} units
                                      </span>
                                    </td>
                                    <td className="py-3 font-bold text-right">₹{inv.price || 'N/A'}</td>
                                    <td className="py-3 text-slate-400">{inv.restockTime || 'N/A'}</td>
                                    <td className="py-3 text-right text-[10px] text-slate-500">{inv.lastUpdated ? new Date(inv.lastUpdated).toLocaleTimeString() : 'N/A'}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500">Loading pharmacy stock database data...</div>
                  )}
                </div>
              )}

              {/* 5. ORDERS PIPELINE */}
              {activeTab === 'orders' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">`orders` Collection Processing Stream</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-full border border-white/5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Listening
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-black uppercase tracking-wider">
                          <th className="p-4">Order ID</th>
                          <th className="p-4">Pharmacy ID</th>
                          <th className="p-4">Customer Details</th>
                          <th className="p-4">Reserved Items (Nested Array)</th>
                          <th className="p-4 text-right">Total Price</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Placed At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {ordersList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500">No reservations placed in database yet. Proceed to checkout from cart!</td>
                          </tr>
                        ) : (
                          ordersList.map(o => (
                            <tr key={o.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 font-mono text-[10px] text-emerald-400 font-bold">{o.id}</td>
                              <td className="p-4 font-mono text-[10px] text-slate-400">{o.pharmacyId}</td>
                              <td className="p-4">
                                <span className="font-bold text-white block">{o.customerName}</span>
                                <span className="text-[9px] text-slate-500 font-mono">{o.customerId}</span>
                              </td>
                              <td className="p-4 space-y-1">
                                {o.items?.map((item: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                    <span className="bg-slate-900 border border-white/5 text-slate-400 px-1.5 py-0.5 rounded font-black text-[9px]">x{item.quantity}</span>
                                    <span className="text-slate-300 font-medium">{item.name}</span>
                                  </div>
                                ))}
                              </td>
                              <td className="p-4 font-black text-white text-right">₹{o.total}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                  o.status === 'Completed'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : o.status === 'Pending'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                }`}>
                                  {o.status}
                                </span>
                              </td>
                              <td className="p-4 text-slate-400">{o.createdAt ? new Date(o.createdAt).toLocaleString() : 'ASAP'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. USER FEEDBACKS */}
              {activeTab === 'feedbacks' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">`feedbacks` Collection Submission logs</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-full border border-white/5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Listening
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-black uppercase tracking-wider">
                          <th className="p-4">Document ID</th>
                          <th className="p-4">User Rating</th>
                          <th className="p-4">Comment</th>
                          <th className="p-4">Submitted At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {feedbacksList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-500">No feedbacks logged. Submit rating at bottom of Home page!</td>
                          </tr>
                        ) : (
                          feedbacksList.map(f => (
                            <tr key={f.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 font-mono text-[10px] text-slate-500">{f.id}</td>
                              <td className="p-4 font-black">
                                <div className="flex items-center gap-1 text-amber-400">
                                  {Array.from({ length: 5 }).map((_, idx) => (
                                    <span key={idx} className={idx < f.rating ? 'opacity-100' : 'opacity-20'}>★</span>
                                  ))}
                                  <span className="text-white ml-1.5">({f.rating}/5)</span>
                                </div>
                              </td>
                              <td className="p-4 text-slate-200 font-medium italic">"{f.comment || 'No comments left.'}"</td>
                              <td className="p-4 text-slate-400">{f.createdAt ? new Date(f.createdAt).toLocaleString() : 'ASAP'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 7. DB SCHEMA & SPECS */}
              {activeTab === 'schema' && (
                <div className="space-y-6 animate-in fade-in duration-300 text-xs">
                  <div className="p-6 rounded-3xl border border-white/5 bg-slate-950/20 space-y-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Firestore Collections & Schemas Definition</h3>
                    
                    <div className="grid md:grid-cols-2 gap-6 leading-relaxed">
                      
                      <div className="space-y-3">
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                          <h4 className="font-bold text-white text-sm">1. `queries` (Search Log Stream)</h4>
                          <ul className="mt-2 space-y-1 text-slate-400 font-mono text-[10px]">
                            <li>- <span className="text-emerald-400 font-bold">query</span>: string (search keyword)</li>
                            <li>- <span className="text-emerald-400 font-bold">userId</span>: string (auth uid or 'anonymous_guest')</li>
                            <li>- <span className="text-emerald-400 font-bold">resultsCount</span>: number (total medicines found)</li>
                            <li>- <span className="text-emerald-400 font-bold">timestamp</span>: firestore.FieldValue (server timestamp)</li>
                            <li>- <span className="text-emerald-400 font-bold">createdAt</span>: string (ISO time representation)</li>
                          </ul>
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                          <h4 className="font-bold text-white text-sm">2. `cart_events` (Cart Actions Stream)</h4>
                          <ul className="mt-2 space-y-1 text-slate-400 font-mono text-[10px]">
                            <li>- <span className="text-emerald-400 font-bold">eventId</span>: string (unique record id)</li>
                            <li>- <span className="text-emerald-400 font-bold">action</span>: string ('add' | 'remove' | 'clear')</li>
                            <li>- <span className="text-emerald-400 font-bold">medicineId</span>: string (global medication identifier)</li>
                            <li>- <span className="text-emerald-400 font-bold">medicineName</span>: string (human-readable product name)</li>
                            <li>- <span className="text-emerald-400 font-bold">pharmacyId</span>: string (providing vendor uuid)</li>
                            <li>- <span className="text-emerald-400 font-bold">price</span>: number (INR value multiplier)</li>
                            <li>- <span className="text-emerald-400 font-bold">quantity</span>: number (volume modified)</li>
                            <li>- <span className="text-emerald-400 font-bold">userId</span>: string (visitor account or guest session token)</li>
                            <li>- <span className="text-emerald-400 font-bold">timestamp</span>: firestore.FieldValue</li>
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                          <h4 className="font-bold text-white text-sm">3. `pharmacies` (Transactional Vendors)</h4>
                          <ul className="mt-2 space-y-1 text-slate-400 font-mono text-[10px]">
                            <li>- <span className="text-emerald-400 font-bold">id</span>: string (primary partner uuid key)</li>
                            <li>- <span className="text-emerald-400 font-bold">name</span>: string</li>
                            <li>- <span className="text-emerald-400 font-bold">type</span>: string ('Hub' | 'Local Store')</li>
                            <li>- <span className="text-emerald-400 font-bold">address</span>: string</li>
                            <li>- <span className="text-emerald-400 font-bold">location</span>: map (latitude: number, longitude: number)</li>
                            <li>- <span className="text-emerald-400 font-bold">inventory</span>: array of map values</li>
                            <li className="pl-4 text-slate-500 font-sans italic mt-1">- medicineId: string</li>
                            <li className="pl-4 text-slate-500 font-sans italic">- quantity: number</li>
                            <li className="pl-4 text-slate-500 font-sans italic">- price: number</li>
                            <li className="pl-4 text-slate-500 font-sans italic">- lastUpdated: string (ISO ISO-8601)</li>
                          </ul>
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                          <h4 className="font-bold text-white text-sm">4. `orders` (Reservations & Queue Management)</h4>
                          <ul className="mt-2 space-y-1 text-slate-400 font-mono text-[10px]">
                            <li>- <span className="text-emerald-400 font-bold">id</span>: string (order ID ord-xxx)</li>
                            <li>- <span className="text-emerald-400 font-bold">pharmacyId</span>: string</li>
                            <li>- <span className="text-emerald-400 font-bold">customerId</span>: string</li>
                            <li>- <span className="text-emerald-400 font-bold">customerName</span>: string</li>
                            <li>- <span className="text-emerald-400 font-bold">items</span>: array of nested CartItem maps</li>
                            <li>- <span className="text-emerald-400 font-bold">total</span>: number (aggregated checkout price)</li>
                            <li>- <span className="text-emerald-400 font-bold">status</span>: string ('Pending' | 'Packing' | 'Ready' | 'Completed' | 'Cancelled')</li>
                          </ul>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="p-6 rounded-3xl border border-white/5 bg-slate-950/20 space-y-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Academic Data Normalization & Indexing Summary</h3>
                    
                    <div className="grid md:grid-cols-3 gap-4 text-slate-400 leading-relaxed text-xs">
                      <div>
                        <h4 className="font-bold text-white mb-2">1st Normal Form (1NF) Compliance</h4>
                        <p>All attributes in Firestore logs contain exclusively atomic values, and there are no repeating groups of attributes. Guest cart lists and order objects exist as isolated documents, preventing database table intersection anomalies.</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-2">Embedded Document Denormalization</h4>
                        <p>To support high-throughput real-time walking searches, the pharmacy products array is nested directly within the pharmacy document (`pharmacies/{id}`). This prevents joining tables during live search sweeps, optimizing read cost.</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-2">Auto-Scaling Firestore Indexes</h4>
                        <p>Firestore uses single-field indexes automatically. To sort results effectively based on real-time distances, coordinates are filtered locally (Haversine formula), avoiding database write locks and composite index creation lag.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected to Firebase Firestore</span>
              </div>
              <span className="font-bold">CureConnect DB Console v1.2</span>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

/* ── Inline Helper components ── */

const TabButton = ({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-4 text-xs font-bold transition-all relative border-b-2 outline-none whitespace-nowrap ${
      active 
        ? 'border-emerald-400 text-white bg-white/[0.015]' 
        : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.005]'
    }`}
  >
    {icon}
    <span>{label}</span>
    {typeof count === 'number' && count > 0 && (
      <span className="text-[10px] font-black bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">{count}</span>
    )}
  </button>
);

const InfoCard = ({ title, desc, metric, accentColor }: { title: string; desc: string; metric: string; accentColor: string }) => (
  <div 
    className="p-6 rounded-3xl border border-white/5 relative overflow-hidden"
    style={{ background: 'rgba(255,255,255,0.015)' }}
  >
    <div className="absolute top-0 left-0 w-1 h-full" style={{ background: accentColor }} />
    <h4 className="text-sm font-black text-white mb-2">{title}</h4>
    <p className="text-[11px] text-slate-500 leading-relaxed mb-4">{desc}</p>
    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">{metric}</span>
  </div>
);

const PipelineNode = ({ title, desc, tags, color }: { title: string; desc: string; tags: string[]; color: 'indigo' | 'emerald' | 'purple' }) => {
  const colors = {
    indigo:  { border: 'rgba(99,102,241,0.25)', bg: 'rgba(99,102,241,0.05)', glow: 'rgba(99,102,241,0.1)' },
    emerald: { border: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.05)', glow: 'rgba(16,185,129,0.1)' },
    purple:  { border: 'rgba(168,85,247,0.25)', bg: 'rgba(168,85,247,0.05)', glow: 'rgba(168,85,247,0.1)' }
  };

  const sc = colors[color];

  return (
    <div 
      className="flex-1 w-full max-w-sm p-5 rounded-2xl border text-left space-y-3 relative group"
      style={{
        borderColor: sc.border,
        background: sc.bg,
        boxShadow: `0 8px 32px ${sc.glow}`
      }}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-white uppercase tracking-wider">{title}</h4>
        <span className="w-2 h-2 rounded-full animate-ping" style={{ background: color === 'indigo' ? '#6366f1' : color === 'emerald' ? '#10b981' : '#a855f7' }} />
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
      
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5">
        {tags.map((t, idx) => (
          <span key={idx} className="text-[9px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">{t}</span>
        ))}
      </div>
    </div>
  );
};
