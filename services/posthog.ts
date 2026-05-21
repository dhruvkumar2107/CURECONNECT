import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let isInitialized = false;

export const initPostHog = () => {
    if (POSTHOG_KEY && POSTHOG_KEY !== 'phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            capture_pageview: true,
            capture_pageleave: true,
            persistence: 'localStorage',
            autocapture: true,
            person_profiles: 'always',
            session_recording: {
                maskAllInputs: false,
                maskInputOptions: { password: true },
            },
            loaded: (ph) => {
                isInitialized = true;
                console.log('✅ PostHog initialized — Customer analytics active');
            }
        });
    } else {
        console.warn('⚠️ PostHog key missing. Analytics disabled.');
    }
};

// ─── Analytics Helpers ──────────────────────────────────────────────────────

/** Identify a user in PostHog after login/signup */
export const identifyUser = (userId: string, properties: {
    name?: string;
    email?: string;
    role?: string;
    createdAt?: string;
}) => {
    posthog.identify(userId, {
        ...properties,
        platform: 'CureConnect Web',
    });
};

/** Reset identity on logout */
export const resetAnalytics = () => {
    posthog.reset();
};

// ─── Customer Behavior Events ────────────────────────────────────────────────

export const analytics = {
    // ── Page Views ──
    page: (name: string, properties?: Record<string, any>) => {
        posthog.capture('$pageview', { page_name: name, ...properties });
    },

    // ── Search Behavior ──
    searchPerformed: (query: string, resultCount: number, hasFilter: boolean) => {
        posthog.capture('search_performed', {
            query,
            query_length: query.length,
            result_count: resultCount,
            has_filter: hasFilter,
            timestamp: new Date().toISOString(),
        });
    },

    searchResultsShown: (query: string, dbCount: number, apiCount: number, totalCount: number) => {
        posthog.capture('search_results_shown', {
            query,
            db_results: dbCount,
            api_results: apiCount,
            total_results: totalCount,
        });
    },

    searchEmpty: (query: string) => {
        posthog.capture('search_no_results', { query });
    },

    // ── Filters & Sorting ──
    filterApplied: (filterType: string, value: string | undefined) => {
        posthog.capture('filter_applied', { filter_type: filterType, filter_value: value || 'none' });
    },

    sortApplied: (sortType: string, active: boolean) => {
        posthog.capture('sort_applied', { sort_type: sortType, is_active: active });
    },

    // ── Medicine Interactions ──
    medicineCardViewed: (medicineName: string, pharmacyName: string, price: number, isExternalApi: boolean) => {
        posthog.capture('medicine_card_viewed', {
            medicine_name: medicineName,
            pharmacy_name: pharmacyName,
            price,
            source: isExternalApi ? 'myUpchar API' : 'Firestore DB',
        });
    },

    addToCart: (medicineName: string, pharmacyId: string, pharmacyName: string, price: number, quantity: number) => {
        posthog.capture('add_to_cart', {
            medicine_name: medicineName,
            pharmacy_id: pharmacyId,
            pharmacy_name: pharmacyName,
            price,
            quantity,
            total_value: price * quantity,
        });
    },

    findAlternativeClicked: (medicineName: string, genericName: string) => {
        posthog.capture('find_alternative_clicked', { medicine_name: medicineName, generic_name: genericName });
    },

    pharmacyCalled: (pharmacyName: string, pharmacyId: string, phone: string) => {
        posthog.capture('pharmacy_called', { pharmacy_name: pharmacyName, pharmacy_id: pharmacyId, phone });
    },

    stockReported: (medicineName: string, pharmacyName: string) => {
        posthog.capture('stock_reported', { medicine_name: medicineName, pharmacy_name: pharmacyName });
    },

    // ── Cart & Checkout ──
    cartViewed: (itemCount: number, totalValue: number, uniquePharmacies: number) => {
        posthog.capture('cart_viewed', {
            item_count: itemCount,
            total_value: totalValue,
            unique_pharmacies: uniquePharmacies,
        });
    },

    checkoutInitiated: (itemCount: number, totalValue: number, scheduled: boolean) => {
        posthog.capture('checkout_initiated', {
            item_count: itemCount,
            total_value: totalValue,
            scheduled_pickup: scheduled,
        });
    },

    orderPlaced: (pharmacyIds: string[], itemCount: number, totalValue: number, pickupTime?: string) => {
        posthog.capture('order_placed', {
            pharmacy_count: pharmacyIds.length,
            pharmacy_ids: pharmacyIds,
            item_count: itemCount,
            total_value: totalValue,
            pickup_time: pickupTime || 'asap',
            $value: totalValue,
        });
    },

    itemRemovedFromCart: (medicineName: string, price: number) => {
        posthog.capture('item_removed_from_cart', { medicine_name: medicineName, price });
    },

    // ── Auth ──
    userSignedUp: (userId: string, name: string, email: string) => {
        posthog.capture('user_signed_up', { user_id: userId, name, email });
        identifyUser(userId, { name, email, role: 'user' });
    },

    userLoggedIn: (userId: string, email: string, role: string) => {
        posthog.capture('user_logged_in', { user_id: userId, email, role });
        identifyUser(userId, { email, role });
    },

    userLoggedOut: () => {
        posthog.capture('user_logged_out');
        resetAnalytics();
    },

    partnerLoggedIn: (pharmacyName: string) => {
        posthog.capture('partner_logged_in', { pharmacy_name: pharmacyName });
    },

    partnerSignedUp: (pharmacyName: string, email: string) => {
        posthog.capture('partner_signed_up', { pharmacy_name: pharmacyName, email });
    },

    // ── Feature Usage ──
    prescriptionUploaded: (fileType: string, fileSize: number) => {
        posthog.capture('prescription_uploaded', { file_type: fileType, file_size_bytes: fileSize });
    },

    emergencyPageViewed: () => {
        posthog.capture('emergency_page_viewed', {
            urgency: 'high',
            timestamp: new Date().toISOString(),
        });
    },

    teleconsultPageViewed: () => {
        posthog.capture('teleconsult_page_viewed');
    },

    doctorConsultClicked: (doctorName: string, specialty: string, isAvailable: boolean) => {
        posthog.capture('doctor_consult_clicked', {
            doctor_name: doctorName,
            specialty,
            is_available: isAvailable,
        });
    },

    reminderPageViewed: () => {
        posthog.capture('reminder_page_viewed');
    },

    feedbackSubmitted: (rating: number, hasComment: boolean) => {
        posthog.capture('feedback_submitted', {
            rating,
            has_comment: hasComment,
            sentiment: rating >= 4 ? 'positive' : rating >= 3 ? 'neutral' : 'negative',
        });
    },

    partnerDashboardViewed: (tab: string) => {
        posthog.capture('partner_dashboard_viewed', { tab });
    },

    // ── Engagement Scoring ──
    sessionEngagement: (timeOnPageSeconds: number, actionsCount: number) => {
        posthog.capture('session_engagement', {
            time_on_page_seconds: timeOnPageSeconds,
            actions_count: actionsCount,
            engagement_score: Math.min(100, Math.round((timeOnPageSeconds / 60) * 20 + actionsCount * 5)),
        });
    },
};

export default posthog;
