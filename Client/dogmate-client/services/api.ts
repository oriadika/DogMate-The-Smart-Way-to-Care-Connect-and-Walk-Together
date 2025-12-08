import axios, { AxiosInstance } from 'axios';

// Configure your backend URL here
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.105:8080/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types for API requests/responses
export interface RegisterUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterUserResponse {
  success: boolean;
  message: string;
  userId: string;
  email: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userRole?: string;
  phoneNumber?: string;
  token?: string;
}

export interface ErrorResponse {
  success: boolean;
  error: string;
}

// API Methods
export const userAPI = {
  /**
   * Register a new user
   */
  register: async (payload: RegisterUserPayload): Promise<RegisterUserResponse> => {
    try {
      const response = await apiClient.post('/users/register', payload);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      console.error("Registration failed:", errorMessage); // 👈 הדפסה לקונסול
      throw new Error(errorMessage);
    }
  },

  /**
   * Login user (placeholder - implement based on your auth endpoint)
   */
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    try {
      // Replace with your actual login endpoint once available
      const response = await apiClient.post('/auth/login', payload);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get all users
   */
  getAllUsers: async () => {
    try {
      const response = await apiClient.get('/users');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch users';
      throw new Error(errorMessage);
    }
  },

  /**
   * Logout user
   */
  logout: async (userId: string, email?: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Call logout endpoint on backend
      console.log('Logging out user:', { userId, email });
      const response = await apiClient.post('/auth/logout', { userId, email });
      return response.data;
    } catch (error: any) {
      // Even if logout fails on backend, we can still clear local data
      console.warn('Logout request failed:', error.message);
      // Return success anyway to allow local logout
      return { success: true, message: 'Local logout completed' };
    }
  },
};

export default apiClient;
