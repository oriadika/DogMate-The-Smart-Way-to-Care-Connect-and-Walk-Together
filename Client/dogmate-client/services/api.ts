import axios, { AxiosInstance } from 'axios';
import { BASE_URL } from './config';

// Configure your backend URL here
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.130:8080/api';

let authToken: string | null = null;

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include JWT token
apiClient.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Export function to set token
export const setAuthToken = (token: string) => {
  authToken = token;
  // Update the default header for future requests
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// Export function to clear token
export const clearAuthToken = () => {
  authToken = null;
  delete apiClient.defaults.headers.common['Authorization'];
};

// Types for API requests/responses
export interface RegisterUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  userRole?: 'owner' | 'walker';
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
  userRole?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  userId: string;
  email: string;
  suspended?: boolean;
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

// Dog-related interfaces
export interface AddDogPayload {
  userId: string;
  name: string;
  breed: string;
  birthdate: string; // ISO date format (YYYY-MM-DD)
  gender?: string; // 'M' for male, 'F' for female
  profileImageUrl?: string;
}

export interface DogData {
  id: string;
  name: string;
  breed: string;
  birthdate: string;
  gender: string;
  profileImageUrl: string;
}

export interface AddDogResponse {
  success: boolean;
  message: string;
  dog: DogData;
}

export interface CityOffering {
  city: string;
  availability: string;
  pricing: string;
}

export interface ProfessionalProfileResponse {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  cityOfferings: CityOffering[];
  averageRating: number;
  ratingsCount: number;
  alreadyRatedByCurrentOwner: boolean;
  reviews: WalkerReview[];
}

export interface ProfessionalProfileUpdatePayload {
  cityOfferings: CityOffering[];
}

export interface WalkerReview {
  ratingId: string;
  reviewerId: string;
  stars: number;
  comment: string;
  reviewerName: string;
  createdAt: string | null;
}

export interface CreateWalkerRatingPayload {
  ownerId: string;
  stars: number;
  comment: string;
}

export interface CreateWalkerRatingResponse {
  success: boolean;
  message: string;
  ratingId: string;
}

export interface DeleteWalkerRatingResponse {
  success: boolean;
  message: string;
  ratingId: string;
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
      console.log("Login response data:", response.data); // 👈 הדפסה לקונסול

      // Save token if provided
      if (response.data.token) {
        setAuthToken(response.data.token);
      }

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
   * delete a user by ID
   */
  deleteUser: async (userId: string) => {
    try {
      const response = await apiClient.delete(`/users/${userId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete user';
      throw new Error(errorMessage);
    }
  },

  /**
   * suspend a user by ID
   */
  suspendUser: async (userId: string) => {
    try {
      const response = await apiClient.post(`/users/${userId}/suspend`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to suspend user';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get all logged-in users
   */
  getLoggedUsers: async () => {
    try {
      const response = await apiClient.get('users/logged');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch logged users';
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

      // Clear token on logout
      clearAuthToken();

      return response.data;
    } catch (error: any) {
      // Even if logout fails on backend, we can still clear local data
      console.warn('Logout request failed:', error.message);
      clearAuthToken();
      // Return success anyway to allow local logout
      return { success: true, message: 'Local logout completed' };
    }
  },

  /**
   * Send a ping to another user
   */
  sendPing: async (fromUserId: string, toUserId: string, fromUserName?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.post('/users/ping', {
        fromUserId,
        toUserId,
        fromUserName: fromUserName || 'Unknown User'
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send ping';
      throw new Error(errorMessage);
    }
  },

  /**
   * Update user's current location
   */
  updateLocation: async (userId: string, latitude: number, longitude: number): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.post(`/users/${userId}/location`, {
        latitude,
        longitude
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update location';
      throw new Error(errorMessage);
    }
  },

  /**
   * Clear user's location (hide from other users)
   */
  clearLocation: async (userId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.delete(`/users/${userId}/location`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to clear location';
      throw new Error(errorMessage);
    }
  },

  /**
   * Note: Ping notifications are now received via WebSocket in real-time.
   * No polling or marking as read needed.
   */
};

export const dogAPI = {
  /**
   * Add a new dog to a user
   */
  addDog: async (payload: AddDogPayload): Promise<AddDogResponse> => {
    try {
      const response = await apiClient.post('/dogs/add', payload);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add dog';
      console.error("Add dog failed:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Get all dogs for a user
   */
  getDogsForUser: async (userId: string) => {
    try {
      const response = await apiClient.get(`/dogs/user/${userId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch dogs';
      console.error("Failed to get dogs:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete a dog for a user
   */
  deleteDog: async (userId: string, dogId: string) => {
    try {
      const response = await apiClient.delete(`/dogs/${userId}/${dogId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete dog';
      console.error("Failed to delete dog:", errorMessage);
      throw new Error(errorMessage);
    }
  },
};

export const dogWalkerAPI = {
  /**
   * Dog walkers who saved at least one professional offering (city, availability, pricing).
   */
  getWalkersWithProfessionalProfiles: async (ownerId?: string): Promise<ProfessionalProfileResponse[]> => {
    try {
      const response = await apiClient.get('/dog-walkers/available-with-professional-profile', {
        params: ownerId ? { ownerId } : undefined,
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'Failed to load available dog walkers';
      console.error('getWalkersWithProfessionalProfiles failed:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  createWalkerRating: async (
    walkerId: string,
    payload: CreateWalkerRatingPayload
  ): Promise<CreateWalkerRatingResponse> => {
    try {
      const response = await apiClient.post(`/dog-walkers/${walkerId}/ratings`, payload);
      return response.data;
    } catch (error: any) {
      const responseData = error?.response?.data;
      const errorMessage =
        responseData?.error ||
        responseData?.message ||
        responseData?.detail ||
        error.message ||
        'Failed to create rating';
      console.error('createWalkerRating failed', {
        url: `${error?.config?.baseURL || API_BASE_URL}${error?.config?.url || ''}`,
        status: error?.response?.status,
        data: responseData,
      });
      throw new Error(errorMessage);
    }
  },

  deleteWalkerRating: async (
    walkerId: string,
    ratingId: string,
    ownerId: string
  ): Promise<DeleteWalkerRatingResponse> => {
    try {
      const response = await apiClient.delete(`/dog-walkers/${walkerId}/ratings/${ratingId}`, {
        params: { ownerId },
      });
      return response.data;
    } catch (error: any) {
      const responseData = error?.response?.data;
      const errorMessage =
        responseData?.error ||
        responseData?.message ||
        responseData?.detail ||
        error.message ||
        'Failed to delete rating';
      console.error('deleteWalkerRating failed', {
        url: `${error?.config?.baseURL || API_BASE_URL}${error?.config?.url || ''}`,
        status: error?.response?.status,
        data: responseData,
      });
      throw new Error(errorMessage);
    }
  },

  getProfessionalProfile: async (userId: string): Promise<ProfessionalProfileResponse> => {
    try {
      const response = await apiClient.get(`/dog-walkers/${userId}/professional-profile`);
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'Failed to load professional profile';
      console.error('getProfessionalProfile failed:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  updateProfessionalProfile: async (
    userId: string,
    body: ProfessionalProfileUpdatePayload
  ): Promise<ProfessionalProfileResponse> => {
    try {
      const response = await apiClient.put(`/dog-walkers/${userId}/professional-profile`, body);
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'Failed to update professional profile';
      console.error('updateProfessionalProfile failed:', errorMessage);
      throw new Error(errorMessage);
    }
  },
};

// Reminder API methods
export const reminderAPI = {
  /**
   * Create a new reminder for a user
   */
  createReminder: async (userId: string, title: string, description: string, remindAt: Date, dogIds: string[]): Promise<{ success: boolean; message: string; reminder: any }> => {
    try {
      const url = `/users/${userId}/reminders`;

      // Format the date as yyyy-MM-dd HH:mm for server
      const year = remindAt.getFullYear();
      const month = String(remindAt.getMonth() + 1).padStart(2, '0');
      const day = String(remindAt.getDate()).padStart(2, '0');
      const hours = String(remindAt.getHours()).padStart(2, '0');
      const minutes = String(remindAt.getMinutes()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`;

      console.log('Creating reminder with URL:', url);
      console.log('Request body:', { title, description, remindAt: formattedDate, dogIds });

      const response = await apiClient.post(url, {
        title,
        description,
        remindAt: formattedDate,
        dogIds,
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create reminder';
      console.error("Failed to create reminder:", errorMessage);
      console.error("Error response status:", error.response?.status);
      console.error("Error response data:", error.response?.data);
      throw new Error(errorMessage);
    }
  },

  /**
   * Get all reminders for a user
   */
  getRemindersForUser: async (userId: string) => {
    try {
      const response = await apiClient.get(`/users/${userId}/reminders`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch reminders';
      console.error("Failed to get reminders:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete a reminder
   */
  deleteReminder: async (userId: string, reminderId: string) => {
    try {
      const response = await apiClient.delete(`/users/${userId}/reminders/${reminderId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete reminder';
      console.error("Failed to delete reminder:", errorMessage);
      throw new Error(errorMessage);
    }
  },
};

// Food Stock API methods
export const foodStockAPI = {
  /**
   * Get all food stocks for a user's dogs
   */
  getFoodStocksForUser: async (userId: string) => {
    try {
      const response = await apiClient.get(`/food-stock/user/${userId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch food stocks';
      console.error("Failed to get food stocks:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Create a new food stock and assign to a dog
   */
  createFoodStock: async (dogId: string, brandName: string, bagSizeInKg: number, dailyConsumptionInGram: number, currentLevelInKg: number) => {
    try {
      const response = await apiClient.post(`/dogs/${dogId}/food-stock`, {
        brandName,
        bagSizeInKg,
        dailyConsumptionInGram,
        currentLevelInKg,
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create food stock';
      console.error("Failed to create food stock:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Connect an existing food stock to a dog
   */
  connectFoodStockToDog: async (dogId: string, foodStockId: string) => {
    try {
      const response = await apiClient.post(`/dogs/${dogId}/food-stock/${foodStockId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to connect food stock to dog';
      console.error("Failed to connect food stock:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Renew/refill food stock to full bag size
   */
  renewFoodStock: async (foodStockId: string) => {
    try {
      const response = await apiClient.put(`/food-stock/${foodStockId}/renew`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to renew food stock';
      console.error("Failed to renew food stock:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Update food stock details
   */
  updateFoodStock: async (foodStockId: string, brandName?: string, bagSize?: number, dailyConsumption?: number, currentLevel?: number) => {
    try {
      const response = await apiClient.put(`/food-stock/${foodStockId}`, {
        brandName,
        bagSize,
        dailyConsumption,
        currentLevel,
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update food stock';
      console.error("Failed to update food stock:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete a food stock
   */
  deleteFoodStock: async (foodStockId: string) => {
    try {
      const response = await apiClient.delete(`/food-stock/${foodStockId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete food stock';
      console.error("Failed to delete food stock:", errorMessage);
      throw new Error(errorMessage);
    }
  },
};

