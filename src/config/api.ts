// config/api.ts
// API Configuration for local development and Render deployment

// Detect environment
const isLocalhost = window.location.hostname === 'localhost';

// Base URLs for different environments
// Priority:
// 1. If running on localhost, always use local Python FastAPI server (port 3001)
// 2. If VITE_API_URL is set AND not on localhost, use it
// 3. Otherwise (Production on Render), use relative /api path
const getApiBaseUrl = (): string => {
    // Use environment variable or default to relative /api
    // This allows Nginx to handle the proxying in Docker/Production
    // And Vite proxy to handle it in local development
    return import.meta.env.VITE_API_URL || '/api';
    // Use environment variable or default to relative /api for production
    return import.meta.env.VITE_API_URL || '/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper to get full endpoint URL
export const getApiEndpoint = (functionName: string): string => {
    return `${API_BASE_URL}/${functionName}`;
};

// Log configuration on module load
console.log('🔧 API Configuration:');
console.log('   Environment:', isLocalhost ? 'Development (Local)' : 'Production (Render)');
console.log('   Base URL:', API_BASE_URL);
console.log('   Interview Questions Endpoint:', getApiEndpoint('generate-interview-questions'));

export default API_BASE_URL;