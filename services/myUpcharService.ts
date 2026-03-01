import { Medicine, SearchResult } from '../types';

// NOTE: In a real production app, the API key should be stored in an environment variable.
// For this educational demonstration, we'll use a placeholder or the provided key if available.
const MYUPCHAR_API_KEY = '7119ff080479f64700dca3f77f0d0615'; // Using a sample key for demo if not provided

export const searchMedicinesFromMyUpchar = async (query: string): Promise<SearchResult[]> => {
    if (!query || query.length < 3) return [];

    try {
        const response = await fetch(`https://beta.myupchar.com/api/medicine/search?api_key=${MYUPCHAR_API_KEY}&name=${encodeURIComponent(query)}`);
        const data = await response.json();

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
