export interface Coordinate {
  latitude: number;
  longitude: number;
}

export enum StockStatus {
  IN_STOCK = 'In Stock',
  LOW_STOCK = 'Low Supply',
  OUT_OF_STOCK = 'Out of Stock'
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  category: string;
  description: string;
  price: number;
  requiresPrescription: boolean;
  image?: string;
  isCritical?: boolean;
}

export interface PharmacyInventory {
  medicineId: string;
  quantity: number;
  lastUpdated: string; // ISO string
  expiryDate?: string; // ISO string
  restockTime?: string;
  price?: number;
}

export interface Pharmacy {
  id: string;
  name: string;
  type: 'Hub' | 'Local Store';
  address: string;
  location: Coordinate;
  inventory: PharmacyInventory[];
  phone: string;
  rating: number;
}

export interface CartItem extends Medicine {
  quantity: number;
  pharmacyId: string;
  distance: number; // in km
}

export interface User {
  id: string;
  name: string;
  email: string;
  points: number;
  role: 'user' | 'partner' | 'admin';
  hasSeenTour?: boolean;
}

// ─── Product Analytics (MSE-1) ──────────────────────────────────────────────

export interface AnalyticsEvent {
  event_id: string;
  user_id: string;
  anonymous_id?: string;
  session_id: string;
  event_name: string;
  timestamp?: any; // Firestore serverTimestamp
  created_at: string; // ISO client timestamp
  local_hour?: number;
  day_of_week?: number;
  page: string;
  device_type: string;
  browser: string;
  os?: string;
  city?: string;
  source?: string;
  referrer?: string;
  category?: string;
  search_query?: string;
  result_count?: number;
  doctor_id?: string;
  pharmacy_id?: string;
  medicine_id?: string;
  appointment_id?: string;
  metadata?: Record<string, any>;
  is_demo?: boolean;
}

export interface Appointment {
  id: string;
  userId: string;
  userName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  slot: string;
  date: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  createdAt: string;
}

export interface SearchResult {
  pharmacy: Pharmacy;
  medicine: Medicine;
  stock: PharmacyInventory;
  distance: number;
  isExternalApi?: boolean;
}

export interface Order {
  id: string;
  pharmacyId: string;
  customerId: string;
  customerName: string;
  items: CartItem[];
  total: number;
  status: 'Pending' | 'Packing' | 'Ready' | 'Completed' | 'Cancelled';
  createdAt: string;
  pickupTime?: string;
}