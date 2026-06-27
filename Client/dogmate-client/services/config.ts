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

import * as Linking from 'expo-linking';

export const BASE_URL = 'http://ec2-16-16-173-226.eu-north-1.compute.amazonaws.com:8080';

const DEFAULT_BACKEND_PORT = '8080';

function extractHostFromExpoUrl(rawUrl: string): string | null {
  // exp://192.168.1.10:8081/--/ or http://localhost:19006
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const normalized = trimmed.includes('://') ? trimmed : `http://${trimmed}`;
    const parsed = new URL(normalized);
    return parsed.hostname || null;
  } catch {
    const match = trimmed.match(/^[a-z]+:\/\/([^/:]+)/i);
    return match?.[1] || null;
  }
}

function deriveRuntimeApiBaseUrl(): string | null {
  try {
    const expoUrl = Linking.createURL('/');
    const host = extractHostFromExpoUrl(expoUrl);
    if (!host) return null;
    return `http://${host}:${DEFAULT_BACKEND_PORT}`;
  } catch {
    return null;
  }
}

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    return normalizeBaseUrl(configured);
  }
  return normalizeBaseUrl(deriveRuntimeApiBaseUrl() || BASE_URL);
}

export function getApiBaseUrlWithPath(pathPrefix = 'api'): string {
  const cleanPrefix = pathPrefix.replace(/^\/+|\/+$/g, '');
  return `${getApiBaseUrl()}/${cleanPrefix}`;
}

export function getWebSocketBaseUrl(path = 'ws-ping'): { websocketUrl: string; sockJsUrl: string } {
  const base = getApiBaseUrl();
  const normalizedPath = path.replace(/^\/+/, '');
  const wsScheme = base.startsWith('https://') ? 'wss://' : 'ws://';
  const hostAndPort = base.replace(/^https?:\/\//, '');
  return {
    websocketUrl: `${wsScheme}${hostAndPort}/${normalizedPath}`,
    sockJsUrl: `${base}/${normalizedPath}`,
  };
}

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
export const GOOGLE_PLACES_API_KEY = 'AIzaSyAFTY9TXMAJqhlzkqRy9BTY1fgbWHM-T-E'; // Replace with your actual key
// YOUR_ACTUAL_API_KEY_HERE
//AIzaSyBeGlIq9o_d5kvoIamv7n3l_VAPYxi6qv (what is my last name)/
//AIzaSyDKUgHgetDzDCnDVm2l7FbJyTmDPNZxmFU