/**
 * App Configuration
 * 
 * Backend URL Configuration:
 * - For development: Use your machine's local IP address (not localhost)
 * - Find your IP: Run `ifconfig | grep "inet " | grep -v 127.0.0.1` (Mac/Linux)
 *                 or `ipconfig` (Windows) and look for IPv4 Address
 * - Example: 'http://192.168.1.100:8000'
 * 
 * - For production: Use your production backend URL
 * - Example: 'https://api.yourdomain.com'
 * 
 * Set to null to use fallback assets (no backend connection)
 */

// TODO: Replace with your actual backend URL
// For development, use your machine's IP address (e.g., 'http://192.168.1.100:8000')
// For production, use your production URL (e.g., 'https://api.yourdomain.com')
// Set to null to disable backend and use fallback assets

// Auto-detected IP: 10.153.140.5
// 
// To use backend: Set to 'http://10.153.140.5:8000' (make sure backend is running first!)
// To use fallback only: Set to null (no errors, uses mock data)
// 
// Currently set to null for testing - app will use fallback assets (no backend needed)
export const BACKEND_BASE_URL: string | null = null;

