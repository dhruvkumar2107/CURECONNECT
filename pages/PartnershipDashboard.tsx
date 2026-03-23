import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Package,
    ClipboardList,
    PieChart,
    Settings,
    Bell,
    Plus,
    Edit2,
    TrendingUp,
    TrendingDown,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    ArrowUpRight,
    IndianRupee,
    ShoppingBag,
    FileUp,
    FileDown,
    Database,
    Upload,
    Zap,
    History,
    Store,
    MapPin
} from 'lucide-react';
import { PHARMACIES, MEDICINES } from '../constants';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, collection, setDoc } from 'firebase/firestore';
import { searchMedicinesFromMyUpchar } from '../services/myUpcharService';
import { seedDatabase } from '../services/seed';
import { saveGlobalMedicine } from '../services/dbService';

type TabType = 'overview' | 'inventory' | 'orders' | 'finances' | 'settings';

export const PartnershipDashboard = () => {
    const { user, isLoadingAuth } = useApp();
    const navigate = useNavigate();

    // State for pharmacy data
    const [pharmacy, setPharmacy] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [inventory, setInventory] = useState<any[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    // Form State
    const [isCustomMedicine, setIsCustomMedicine] = useState(false);
    const [selectedMedicineId, setSelectedMedicineId] = useState('');
    const [customName, setCustomName] = useState('');
    const [customGeneric, setCustomGeneric] = useState('');
    const [customCategory, setCustomCategory] = useState('General');
    const [newMedicineQty, setNewMedicineQty] = useState(10);
    const [newMedicineExpiry, setNewMedicineExpiry] = useState('');
    const [newMedicinePrice, setNewMedicinePrice] = useState(0);
    const [newMedicineRestock, setNewMedicineRestock] = useState('');

    useEffect(() => {
        if (!isLoadingAuth) {
            if (!user) {
                navigate('/partner-login');
            } else if (user.role !== 'partner') {
                alert("Access Denied. This area is for Pharmacy Partners only.");
                navigate('/');
            } else {
                // Real-time listener for pharmacy document
                console.log(`🔗 [Dashboard] Subscribing to Pharmacy: ${user.uid}`);
                const unsub = onSnapshot(doc(db, 'pharmacies', user.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setPharmacy(data);
                        setInventory(data.inventory || []);
                        console.log("🔗 [Dashboard] Remote update received.");
                    } else {
                        console.error("No pharmacy found for this user.");
                    }
                }, (error) => {
                    console.error("Dashboard Subscription Error:", error);
                });

                return () => unsub();
            }
        }
    }, [user, isLoadingAuth, navigate]);

    const updateFirestoreInventory = async (newInventory: any[]) => {
        if (!user) return;
        try {
            const docRef = doc(db, 'pharmacies', user.uid);
            await updateDoc(docRef, {
                inventory: newInventory
            });
        } catch (error) {
            console.error("Error updating inventory:", error);
            alert("Failed to save changes to database.");
        }
    };

    const handleUpdateStock = (medicineId: string, newQty: number) => {
        const updatedInventory = inventory.map(item =>
            item.medicineId === medicineId ? { ...item, quantity: newQty, lastUpdated: new Date().toISOString() } : item
        );
        updateFirestoreInventory(updatedInventory);
    };

    const handleAddMedicine = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let targetMedicineId = selectedMedicineId;

        // 1. If custom, create the medicine globally first
        if (isCustomMedicine) {
            if (!customName) return;
            const newMedId = `custom-${Date.now()}`;
            targetMedicineId = newMedId;

            const newGlobalMed = {
                id: newMedId,
                name: customName,
                genericName: customGeneric || 'N/A',
                category: customCategory,
                description: 'Added by partner',
                price: newMedicinePrice,
                requiresPrescription: false
            };

            try {
                await saveGlobalMedicine(newGlobalMed);
            } catch (err) {
                alert("Failed to create global medicine entry.");
                return;
            }
        }

        if (!targetMedicineId || newMedicineQty < 0) return;

        const newItem = {
            medicineId: targetMedicineId,
            quantity: newMedicineQty,
            lastUpdated: new Date().toISOString(),
            expiryDate: newMedicineExpiry ? new Date(newMedicineExpiry).toISOString() : undefined,
            price: newMedicinePrice || MEDICINES.find(m => m.id === targetMedicineId)?.price,
            restockTime: newMedicineRestock || 'N/A'
        };

        // Check if already in inventory
        const existingIdx = inventory.findIndex(i => i.medicineId === targetMedicineId);
        let updatedInventory;
        if (existingIdx !== -1) {
            updatedInventory = [...inventory];
            updatedInventory[existingIdx] = { ...updatedInventory[existingIdx], ...newItem };
        } else {
            updatedInventory = [newItem, ...inventory];
        }

        await updateFirestoreInventory(updatedInventory);

        setIsAddModalOpen(false);
        setIsCustomMedicine(false);
        setSelectedMedicineId('');
        setCustomName('');
        setCustomGeneric('');
        setNewMedicineQty(10);
        setNewMedicineExpiry('');
        setNewMedicinePrice(0);
        setNewMedicineRestock('');
    };

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const lines = text.split('\n');
            const newItems: any[] = [];

            // Skip header if it exists
            const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const [name, restockTime, quantity, cost] = line.split(',').map(s => s.trim());

                // Find medicine ID by name
                const med = MEDICINES.find(m => m.name.toLowerCase() === name.toLowerCase());

                if (med) {
                    newItems.push({
                        medicineId: med.id,
                        quantity: parseInt(quantity) || 0,
                        restockTime: restockTime || 'N/A',
                        price: parseFloat(cost) || med.price,
                        lastUpdated: new Date().toISOString()
                    });
                }
            }

            if (newItems.length > 0) {
                const updatedInventory = [...inventory];
                newItems.forEach(newItem => {
                    const index = updatedInventory.findIndex(item => item.medicineId === newItem.medicineId);
                    if (index !== -1) {
                        updatedInventory[index] = { ...updatedInventory[index], ...newItem };
                    } else {
                        updatedInventory.push(newItem);
                    }
                });

                setInventory(updatedInventory);
                updateFirestoreInventory(updatedInventory);
                alert(`Successfully imported ${newItems.length} medicines!`);
            } else {
                alert("No valid medicines found in CSV. Make sure names match our database.");
            }
        };
        reader.readAsText(file);
    };

    const handleExportForPowerBI = async () => {
        try {
            const csvRows = [];
            // Header
            csvRows.push(['Source', 'Medicine Name', 'Quantity', 'Price (INR)', 'Restock Time', 'Last Updated', 'Manufacturer', 'Category'].join(','));

            // 1. Local Inventory Data
            for (const item of inventory) {
                const med = MEDICINES.find(m => m.id === item.medicineId);
                csvRows.push([
                    'Local Pharmacy',
                    `"${med?.name || 'Unknown'}"`,
                    item.quantity,
                    item.price || med?.price || 0,
                    `"${item.restockTime || 'N/A'}"`,
                    item.lastUpdated,
                    `"${med?.genericName || 'N/A'}"`,
                    `"${med?.category || 'General'}"`
                ].join(','));
            }

            // 2. Enrich with API Data (Market Reference)
            // We'll search for one common term to get a batch of "Market" data for comparison
            const apiResults = await searchMedicinesFromMyUpchar(inventory[0]?.medicineId ? MEDICINES.find(m => m.id === inventory[0].medicineId)?.name || 'Dolo' : 'Dolo');

            for (const apiItem of apiResults) {
                csvRows.push([
                    'myUpchar API (Market)',
                    `"${apiItem.medicine.name}"`,
                    apiItem.stock.quantity,
                    apiItem.medicine.price,
                    '"Instant"',
                    new Date().toISOString(),
                    `"${apiItem.medicine.genericName}"`,
                    '"Online Retail"'
                ].join(','));
            }

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', `CureConnect_Analytics_${pharmacy.name.replace(/\s+/g, '_')}.csv`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            alert("Analytics data exported successfully! You can now import this into Power BI.");
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to generate export file.");
        }
    };

    if (isLoadingAuth || !pharmacy) return <div className="p-10 text-center animate-pulse text-slate-400">Loading Dashboard...</div>;
    if (!user || user.role !== 'partner') return null;

    const navItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'orders', label: 'Orders', icon: ClipboardList },
        { id: 'finances', label: 'Finances', icon: PieChart },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-slate-50 -my-4 -mx-4 pb-20">
            {/* Top Bar */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-30 px-8 py-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-teal-400 shadow-xl shadow-slate-200">
                        <Store size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">{pharmacy.name}</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <MapPin size={10} /> {pharmacy.address}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportForPowerBI}
                        className="bg-slate-50 text-slate-600 px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-slate-100 transition-all border border-slate-200 text-xs font-bold"
                    >
                        <FileDown size={16} /> Export
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-teal-600 transition-all shadow-xl shadow-slate-200 text-xs font-black uppercase tracking-wider"
                    >
                        <Plus size={18} /> Update Stock
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-10 flex flex-col md:flex-row gap-10">
                {/* Sidebar Navigation */}
                <aside className="md:w-72 space-y-3">
                    <div className="bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-1">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as TabType)}
                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[13px] font-bold transition-all relative group ${activeTab === item.id
                                    ? 'bg-slate-900 text-white shadow-2xl shadow-slate-300'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                <item.icon size={20} className={activeTab === item.id ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-600'} />
                                {item.label}
                                {activeTab === item.id && (
                                    <div className="absolute right-4 w-1.5 h-1.5 bg-teal-400 rounded-full"></div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Pro Insight Card */}
                    <div className="bg-teal-600 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl shadow-teal-100 group cursor-pointer hover:-translate-y-1 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-all"></div>
                        <h4 className="text-sm font-black mb-1 flex items-center gap-2">
                           <Zap size={16} /> Smart Insights
                        </h4>
                        <p className="text-[11px] text-teal-50 font-medium leading-relaxed mb-4">
                            Dolo 650 is trending in your area. Consider restock.
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-200 group-hover:text-white transition-colors">
                            View Report <ArrowUpRight size={12} />
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'overview' && <OverviewSection inventory={inventory} />}
                    {activeTab === 'inventory' && (
                        <InventorySection
                            inventory={inventory}
                            MEDICINES={MEDICINES}
                            onUpdateStock={handleUpdateStock}
                            onOpenAddModal={() => setIsAddModalOpen(true)}
                            onCSVUpload={handleCSVUpload}
                        />
                    )}
                    {activeTab === 'orders' && <OrdersSection />}
                    {activeTab === 'finances' && <FinancesSection />}
                    {activeTab === 'settings' && <SettingsSection pharmacy={pharmacy} />}
                </main>
            </div>

            {/* Add Medicine Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -mr-16 -mt-16"></div>
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Manage Stock</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Pharmacy Inventory Update</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all">
                                <Plus className="rotate-45" size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddMedicine} className="space-y-6 relative z-10">
                            {/* Toggle for New Medicine */}
                            <div className="flex p-1 bg-slate-100 rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() => setIsCustomMedicine(false)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${!isCustomMedicine ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    Select from List
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCustomMedicine(true)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${isCustomMedicine ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    Add New Medicine
                                </button>
                            </div>

                            {!isCustomMedicine ? (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Select Medicine</label>
                                    <select
                                        value={selectedMedicineId}
                                        onChange={(e) => setSelectedMedicineId(e.target.value)}
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-sm font-bold"
                                        required
                                    >
                                        <option value="">-- Choose from Database --</option>
                                        {MEDICINES.map(med => (
                                            <option key={med.id} value={med.id}>
                                                {med.name} ({med.genericName})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Medicine Name</label>
                                        <input
                                            type="text"
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                            className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-sm font-bold"
                                            placeholder="e.g. AI-Cure 500"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Generic Name</label>
                                            <input
                                                type="text"
                                                value={customGeneric}
                                                onChange={(e) => setCustomGeneric(e.target.value)}
                                                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-sm font-bold"
                                                placeholder="e.g. Paracetamol"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Category</label>
                                            <select
                                                value={customCategory}
                                                onChange={(e) => setCustomCategory(e.target.value)}
                                                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-sm font-bold"
                                            >
                                                <option>General</option>
                                                <option>Critical Care</option>
                                                <option>Diabetes</option>
                                                <option>Heart Care Care</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Market Price (₹)</label>
                                    <input
                                        type="number"
                                        value={newMedicinePrice}
                                        onChange={(e) => setNewMedicinePrice(parseFloat(e.target.value))}
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-sm font-bold"
                                        placeholder="Enter price"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Restock Lead Time</label>
                                    <input
                                        type="text"
                                        value={newMedicineRestock}
                                        onChange={(e) => setNewMedicineRestock(e.target.value)}
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-sm font-bold"
                                        placeholder="e.g. 24 hours"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Current Stock</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newMedicineQty}
                                        onChange={(e) => setNewMedicineQty(parseInt(e.target.value))}
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-sm font-bold"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Expiry Date</label>
                                    <input
                                        type="date"
                                        value={newMedicineExpiry}
                                        onChange={(e) => setNewMedicineExpiry(e.target.value)}
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-sm font-bold"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] hover:bg-teal-600 font-black shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Plus size={20} className="group-hover:rotate-90 transition-all" /> Update Dashboard
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-sections ---

const OverviewSection = ({ inventory }: { inventory: any[] }) => {
    const lowStockCount = inventory.filter(i => i.quantity < 10).length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Gross Revenue"
                    value="₹48,240"
                    trend="+12.5%"
                    icon={IndianRupee}
                    color="teal"
                />
                <StatCard
                    title="Active Orders"
                    value="14"
                    trend="+2"
                    icon={ShoppingBag}
                    color="indigo"
                />
                <StatCard
                    title="Low Stock Items"
                    value={lowStockCount.toString()}
                    trend="-1"
                    icon={AlertCircle}
                    color="amber"
                    isWarning={lowStockCount > 0}
                />
                <StatCard
                    title="Avg. Rating"
                    value="4.8"
                    trend="Stable"
                    icon={CheckCircle2}
                    color="emerald"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800">Performance Analytics</h3>
                        <select className="text-xs font-bold text-slate-500 bg-slate-50 border-none rounded-lg p-1 px-2">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-64 flex items-end gap-2 px-2">
                        {[45, 60, 40, 80, 55, 90, 70].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div
                                    className="w-full bg-teal-500/10 group-hover:bg-teal-500/20 rounded-t-lg transition-all relative overflow-hidden"
                                    style={{ height: `${h}%` }}
                                >
                                    <div className="absolute bottom-0 left-0 w-full bg-teal-500 rounded-t-lg transition-all" style={{ height: '30%' }}></div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">Day {i + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6">Recent Alerts</h3>
                    <div className="space-y-4">
                        <AlertItem
                            type="stock"
                            title="Paracetamol running low"
                            time="2h ago"
                            desc="Only 4 units left in stock."
                        />
                        <AlertItem
                            type="order"
                            title="New Bulk Order"
                            time="4h ago"
                            desc="Order #4928 requires manual verification."
                        />
                        <AlertItem
                            type="expiry"
                            title="Dolo 650 Expiry"
                            time="1d ago"
                            desc="10 units expiring in 15 days."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const InventorySection = ({ inventory, MEDICINES, onUpdateStock, onOpenAddModal, onCSVUpload }: {
    inventory: any[];
    MEDICINES: any[];
    onUpdateStock: (medicineId: string, newQty: number) => void;
    onOpenAddModal: () => void;
    onCSVUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredInventory = inventory.filter((item: any) => {
        const med = MEDICINES.find((m: any) => m.id === item.medicineId);
        return med?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            med?.genericName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Inventory Management</h2>
                    <p className="text-xs text-slate-500">{inventory.length} items total</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search meds..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>
                    <div className="flex gap-2">
                        <label className="cursor-pointer bg-white text-slate-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all border border-slate-200">
                            <FileUp size={18} /> Upload CSV
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={onCSVUpload}
                            />
                        </label>
                        <button
                            onClick={onOpenAddModal}
                            className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-teal-700 transition-all shadow-lg shadow-teal-100"
                        >
                            <Plus size={18} /> Add
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50">
                            <th className="px-6 py-4">Medicine</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Stock</th>
                            <th className="px-6 py-4">Cost (₹)</th>
                            <th className="px-6 py-4">Restock Time</th>
                            <th className="px-6 py-4">Expiry</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredInventory.map((item: any) => {
                            const med = MEDICINES.find((m: any) => m.id === item.medicineId);
                            if (!med) return null;
                            const isLow = item.quantity < 10;
                            const isExpiring = item.expiryDate && new Date(item.expiryDate).getTime() < Date.now() + 2592000000;

                            return (
                                <tr key={item.medicineId} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-teal-600 font-bold">
                                                {med.name[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{med.name}</div>
                                                <div className="text-[10px] text-slate-400">{med.genericName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {isLow ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-100">
                                                <AlertCircle size={10} /> Low Stock
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 text-[10px] font-bold border border-teal-100">
                                                <CheckCircle2 size={10} /> In Stock
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-sm font-bold ${isLow ? 'text-amber-600' : 'text-slate-700'}`}>
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700">
                                        ₹{item.price || med.price}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                        {item.restockTime || 'Immediate'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`text-[11px] font-medium ${isExpiring ? 'text-red-500' : 'text-slate-500'}`}>
                                            {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => {
                                                const q = prompt("Update quantity:", item.quantity);
                                                if (q) onUpdateStock(item.medicineId, parseInt(q));
                                            }}
                                            className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const OrdersSection = () => {
    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Incoming Orders</h2>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all border border-slate-100 flex items-center gap-2">
                        <Filter size={14} /> Filter
                    </button>
                </div>
            </div>

            <div className="divide-y divide-slate-50">
                {[
                    { id: '4928', customer: 'John Doe', items: 3, total: 450, status: 'Packing', time: '12 min ago' },
                    { id: '4927', customer: 'Sarah Miller', items: 1, total: 120, status: 'Completed', time: '45 min ago' },
                    { id: '4926', customer: 'David Chen', items: 5, total: 1240, status: 'Pending', time: '1h ago' },
                ].map(order => (
                    <div key={order.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${order.status === 'Completed' ? 'bg-teal-50 text-teal-600' : 'bg-indigo-50 text-indigo-600'
                                }`}>
                                #{order.id.slice(-2)}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-800 uppercase tracking-tight">Order #{order.id}</div>
                                <div className="text-xs text-slate-500 font-medium">{order.customer} • {order.items} items</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="hidden sm:block text-right">
                                <div className="text-xs text-slate-400 font-bold uppercase">{order.time}</div>
                                <div className="text-sm font-bold text-slate-800">₹{order.total}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${order.status === 'Completed'
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : order.status === 'Packing'
                                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                                        : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                    }`}>
                                    {order.status}
                                </span>
                                <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200">
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FinancesSection = () => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Available for Payout</p>
                        <h3 className="text-4xl font-bold mb-8 tracking-tighter">₹12,450.00</h3>
                        <button className="bg-teal-500 hover:bg-teal-400 text-slate-900 px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2">
                            Withdraw to Bank <ArrowUpRight size={16} />
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500" />
                        Payout History
                    </h4>
                    <div className="space-y-6">
                        {[
                            { date: 'Oct 24, 2023', amount: '₹8,900', status: 'Deposited' },
                            { date: 'Oct 17, 2023', amount: '₹14,200', status: 'Deposited' }
                        ].map((h, i) => (
                            <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                <div>
                                    <p className="text-xs font-bold text-slate-800">{h.date}</p>
                                    <p className="text-[10px] text-slate-400 font-medium italic">{h.status}</p>
                                </div>
                                <span className="font-bold text-slate-900">{h.amount}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SettingsSection = ({ pharmacy }: any) => {
    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-8">Store Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
                <div className="space-y-4">
                    <SettingInput label="Store Name" value={pharmacy.name} />
                    <SettingInput label="Contact Number" value={pharmacy.phone} />
                    <SettingInput label="Store Address" value={pharmacy.address} isArea />
                </div>
                <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <h4 className="text-sm font-bold text-slate-800 mb-2">Operational Status</h4>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-6 bg-teal-600 rounded-full relative p-1 cursor-pointer">
                                <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                            </div>
                            <span className="text-sm font-bold text-slate-600">Open for Deliveries</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-12 flex justify-end gap-3 border-t border-slate-50 pt-8">
                <button className="px-6 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-50 text-sm">Discard</button>
                <button className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all">Save Changes</button>
            </div>
        </div>
    );
};

// --- Helper UI Components ---

const StatCard = ({ title, value, trend, icon: Icon, color, isWarning }: any) => {
    const colorMap: any = {
        teal: 'text-teal-600 bg-teal-50',
        indigo: 'text-indigo-600 bg-indigo-50',
        amber: 'text-amber-600 bg-amber-50',
        emerald: 'text-emerald-600 bg-emerald-50'
    };

    return (
        <div className={`p-6 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 ${isWarning ? 'ring-1 ring-amber-400' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${colorMap[color]}`}>
                    <Icon size={20} />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${trend.includes('+') ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-50'
                    }`}>
                    {trend.includes('+') && <TrendingUp size={10} />}
                    {trend.includes('-') && <TrendingDown size={10} />}
                    {trend}
                </div>
            </div>
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
                <p className="text-2xl font-black text-slate-900">{value}</p>
            </div>
        </div>
    );
};

const AlertItem = ({ type, title, time, desc }: any) => {
    const iconMap: any = {
        stock: <Package size={14} className="text-red-500" />,
        order: <ShoppingBag size={14} className="text-indigo-500" />,
        expiry: <Clock size={14} className="text-amber-500" />
    };

    return (
        <div className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                {iconMap[type]}
            </div>
            <div>
                <div className="flex justify-between items-center gap-2">
                    <h5 className="text-[11px] font-bold text-slate-800">{title}</h5>
                    <span className="text-[9px] font-medium text-slate-400 whitespace-nowrap">{time}</span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1">{desc}</p>
            </div>
        </div>
    );
};

const SettingInput = ({ label, value, isArea }: any) => (
    <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
        {isArea ? (
            <textarea
                defaultValue={value}
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-500/20 outline-none text-sm font-medium transition-all"
            />
        ) : (
            <input
                type="text"
                defaultValue={value}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-teal-500/20 outline-none text-sm font-medium transition-all"
            />
        )}
    </div>
);
