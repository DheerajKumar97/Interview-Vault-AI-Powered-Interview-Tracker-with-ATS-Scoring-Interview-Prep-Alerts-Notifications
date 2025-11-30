// Centralized API Configuration
// Handles switching between local backend and Netlify Functions

export const getApiBaseUrl = () => {
    // If running in production (Netlify), use the functions path
    if (import.meta.env.PROD) {
        return '/.netlify/functions';
    }

    // If VITE_API_URL is set (e.g. in .env), use it
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // Default to local backend
    return 'http://localhost:3001/api';
};

export const API_BASE_URL = getApiBaseUrl();
