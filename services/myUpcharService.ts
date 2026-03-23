import { Medicine, SearchResult } from '../types';

// NOTE: In a real production app, the API key should be stored in an environment variable.
// Retrieve the API key from environment variables (Vite uses import.meta.env)
const MYUPCHAR_API_KEY = (import.meta as any).env.VITE_MYUPCHAR_API_KEY;

export const searchMedicinesFromMyUpchar = async (query: string): Promise<SearchResult[]> => {
    if (!query || query.length < 3) return [];

    try {
        console.log(`📡 [API] Searching myUpchar for: "${query}"...`);
        // Note: Switching from beta.myupchar.com to www.myupchar.com as the beta might be returns 0.
        const response = await fetch(`https://www.myupchar.com/api/medicine/search?api_key=${MYUPCHAR_API_KEY}&name=${encodeURIComponent(query)}`);
        
        console.log(`📡 [API] Response Status: ${response.status}`);
        const data = await response.json();
        console.log("📡 [API] Data received items count:", data?.data?.length || 0);
        console.log("📡 [API] Response Data Status:", data?.status);
        if (data.status !== 'OK') {
            console.warn("📡 [API] Warning: Response status is not OK.", data);
        }

        if (data.status === 'OK' && data.data) {
            return data.data.map((item: any) => ({
                pharmacy: {
                    id: 'myupchar-online',
                    name: 'myUpchar Online',
                    address: 'Available Pan-India',
                    phone: '1800-XXX-XXXX',
                    type: 'Hub',
                    location: { latitude: 0, longitude: 0 }, // Global availability
                    rating: 4.5,
                    inventory: []
                },
                medicine: {
                    id: `myupchar-${item.product_id}`,
                    name: item.name,
                    genericName: item.manufacturer?.name || 'N/A',
                    category: 'Online Pharmacy',
                    price: item.price?.final_price || item.price?.mrp || 0,
                    image: item.image,
                    description: item.form || 'Medicine available online via myUpchar.',
                    dosage: 'As prescribed',
                    sideEffects: []
                },
                stock: {
                    medicineId: `myupchar-${item.product_id}`,
                    quantity: item.in_stock ? 999 : 0,
                    lastUpdated: new Date().toISOString()
                },
                distance: 0,
                isExternalApi: true // Flag to show "Live API Data" badge
            }));
        }
    } catch (error) {
        console.error("myUpchar API Search Error:", error);
    }
    return [];
};
