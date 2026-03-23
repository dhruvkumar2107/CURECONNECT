import { db } from './firebase';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, setDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Medicine, Pharmacy, SearchResult, Coordinate, Order } from '../types';

// Haversine formula to calculate distance in KM
const calculateDistance = (coord1: Coordinate, coord2: Coordinate): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(coord2.latitude - coord1.latitude);
    const dLon = deg2rad(coord2.longitude - coord1.longitude);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(coord1.latitude)) * Math.cos(deg2rad(coord2.latitude)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return parseFloat(d.toFixed(2));
};

const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
};

export const searchMedicinesSubscription = (
    queryText: string,
    userLocation: Coordinate | null,
    filterType: 'Hub' | 'Local Store' | undefined,
    onUpdate: (results: SearchResult[]) => void
) => {
    const normalizedQuery = queryText.toLowerCase();

    // 1. Merge Static and Firestore Medicines
    const { MEDICINES: CONST_MEDICINES } = require('../constants');
    
    const unsubMedicines = onSnapshot(collection(db, 'medicines'), (medicinesSnap) => {
        const firestoreMeds: Medicine[] = [];
        medicinesSnap.forEach(doc => firestoreMeds.push(doc.data() as Medicine));

        // Combine and unique by ID
        const allAvailableMeds = [...CONST_MEDICINES];
        firestoreMeds.forEach(fm => {
            if (!allAvailableMeds.find(m => m.id === fm.id)) allAvailableMeds.push(fm);
        });

        const matchingMedicines = allAvailableMeds.filter(data => 
            data.name.toLowerCase().includes(normalizedQuery) ||
            data.genericName.toLowerCase().includes(normalizedQuery) ||
            data.category.toLowerCase().includes(normalizedQuery)
        );

        if (matchingMedicines.length === 0) {
            onUpdate([]);
            return;
        }

        // Listen to Pharmacies collection for those medicines
        const unsubPharmacies = onSnapshot(collection(db, 'pharmacies'), (pharmaciesSnap) => {
            const results: SearchResult[] = [];
            const pharmacies: Pharmacy[] = [];
            
            pharmaciesSnap.forEach(doc => {
                const data = doc.data() as Pharmacy;
                if (!filterType || data.type === filterType) {
                    pharmacies.push(data);
                }
            });

            matchingMedicines.forEach(medicine => {
                pharmacies.forEach(pharmacy => {
                    const stock = pharmacy.inventory.find(i => i.medicineId === medicine.id);
                    if (stock) {
                        const distance = userLocation ? calculateDistance(userLocation, pharmacy.location) : 0;
                        results.push({
                            pharmacy,
                            medicine,
                            stock,
                            distance
                        });
                    }
                });
            });

            // AI-Powered Sorting: Distance -> Availability -> Stock Level
            results.sort((a, b) => {
                const distA = a.distance || 0;
                const distB = b.distance || 0;
                
                if (Math.abs(distA - distB) < 1) { // If same distance (~1km)
                    return b.stock.quantity - a.stock.quantity; // More stock first
                }
                return distA - distB;
            });

            onUpdate(results);
        });

        return unsubPharmacies;
    });

    return unsubMedicines;
};

// Listen to real-time updates for a specific pharmacy's inventory
export const subscribeToPharmacyInventory = (pharmacyId: string, callback: (inventory: any[]) => void) => {
    const unsub = onSnapshot(doc(db, 'pharmacies', pharmacyId), (doc) => {
        if (doc.exists()) {
            callback(doc.data().inventory);
        }
    });
    return unsub;
};

/**
 * Saves results from external API into Firestore collections
 * This ensures the database grows as users search for new medicines
 */
export const saveExternalResults = async (results: SearchResult[]) => {
    if (results.length === 0) {
        console.log("Sync skipped: No results to save.");
        return;
    }

    console.log(`📡 [Sync] Attempting to save ${results.length} items to Firestore...`);

    try {
        for (const result of results) {
            const { medicine, pharmacy } = result;

            console.log(`📝 [Sync] Saving medicine: ${medicine.name} (${medicine.id})`);
            const medicineRef = doc(db, 'medicines', medicine.id);
            await setDoc(medicineRef, medicine, { merge: true });

            console.log(`📝 [Sync] Checking pharmacy: ${pharmacy.name} (${pharmacy.id})`);
            const pharmacyRef = doc(db, 'pharmacies', pharmacy.id);
            const pharmacySnap = await getDoc(pharmacyRef);

            if (!pharmacySnap.exists()) {
                console.log(`🆕 [Sync] Adding new pharmacy info: ${pharmacy.id}`);
                await setDoc(pharmacyRef, pharmacy, { merge: true });
            } else {
                const existingPharmacy = pharmacySnap.data() as Pharmacy;
                const hasMedicine = existingPharmacy.inventory.some(i => i.medicineId === medicine.id);

                if (!hasMedicine) {
                    console.log(`➕ [Sync] Adding ${medicine.name} to existing pharmacy inventory: ${pharmacy.id}`);
                    const updatedInventory = [...existingPharmacy.inventory, result.stock];
                    await setDoc(pharmacyRef, { inventory: updatedInventory }, { merge: true });
                }
            }
        }
        console.log("✅ [Sync] Successfully synced all items!");
    } catch (error) {
        console.error("❌ [Sync] FAILED to save data:", error);
    }
};

// Save a new medicine globally
export const saveGlobalMedicine = async (medicine: Medicine) => {
    try {
        const docRef = doc(db, 'medicines', medicine.id);
        await setDoc(docRef, medicine, { merge: true });
        console.log(`✅ Global medicine saved: ${medicine.name}`);
    } catch (error) {
        console.error("Error saving global medicine:", error);
        throw error;
    }
};

// Create a new order
export const createOrder = async (order: Omit<Order, 'id'>) => {
    try {
        const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const orderRef = doc(db, 'orders', orderId);
        await setDoc(orderRef, { ...order, id: orderId });
        console.log(`✅ Order created: ${orderId}`);
        return orderId;
    } catch (error) {
        console.error("Error creating order:", error);
        throw error;
    }
};

// Save user feedback
export const addFeedback = async (rating: number, comment: string) => {
    try {
        const feedbackRef = collection(db, 'feedbacks');
        // Using addDoc for automatic ID generation and server-side timestamp
        const docRef = await addDoc(feedbackRef, {
            rating,
            comment,
            createdAt: new Date().toISOString(), // Keeping both for local and server
            timestamp: serverTimestamp()
        });
        console.log(`✅ Feedback saved in "feedbacks" with ID: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error("Error saving feedback to Firestore:", error);
        throw error;
    }
};
