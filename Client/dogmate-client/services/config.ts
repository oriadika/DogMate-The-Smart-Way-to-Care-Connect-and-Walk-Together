/**
 * DogMate API Configuration
 * 
 * Edit the BASE_URL below to match your backend server address.
 * This file is git-ignored so you can change it per environment without
 * affecting version control.
 * 
 * Examples:
 * - Local/LAN: http://192.168.1.100:8080
 * - Docker: http://172.18.25.45:8080
 * - Cloud: https://api.dogmate.example.com
 */

export const BASE_URL = 'http://172.20.10.4:8080';

/**
 * Google Maps & Places API Key
 * 
 * To get an API key:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable these APIs:
 *    - Places API
 *    - Places API (New)
 *    - Maps SDK for Android
 *    - Maps SDK for iOS
 * 4. Go to Credentials and create an API key
 * 5. (Optional) Restrict the key to only the APIs above for security
 */
export const GOOGLE_PLACES_API_KEY = 'YOUR_ACTUAL_API_KEY_HERE'; // Replace with your actual key
// YOUR_ACTUAL_API_KEY_HERE