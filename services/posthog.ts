import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

export const initPostHog = () => {
    if (POSTHOG_KEY && POSTHOG_KEY !== 'phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            capture_pageview: true,
            persistence: 'localStorage',
            autocapture: true,
        });
        console.log('PostHog initialized');
    } else {
        console.warn('PostHog key not found or is a placeholder. Analytics will be disabled.');
    }
};

export default posthog;
