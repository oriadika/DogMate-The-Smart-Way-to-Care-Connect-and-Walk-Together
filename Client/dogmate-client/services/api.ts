import axios, { AxiosInstance } from 'axios';
import { getApiBaseUrlWithPath } from './config';

const API_BASE_URL = getApiBaseUrlWithPath('api');

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

/**
 * Prefer server `error` body (Hebrew); otherwise map common axios/network text to Hebrew.
 */
function getAuthFlowErrorMessage(error: any, fallbackHebrew: string): string {
  const serverMsg = error?.response?.data?.error;
  if (typeof serverMsg === 'string' && serverMsg.trim().length > 0) {
    return serverMsg;
  }
  const raw = String(error?.message ?? '');
  if (raw === 'Network Error' || raw === 'ERR_NETWORK') {
    return 'אין חיבור לרשת. בדוק את החיבור ונסה שוב.';
  }
  if (/timeout/i.test(raw) || raw.includes('10000')) {
    return 'השרת לא הגיב בזמן. נסה שוב.';
  }
  return fallbackHebrew;
}

// Types for API requests/responses
export interface RegisterUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Israeli mobile; required for walkers, optional for owners (validated on server) */
  phoneNumber?: string;
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
  /** Present only after email OTP completes (verify-registration). */
  userId?: string;
  email: string;
  userRole?: string;
  /** True after signup request until OTP completes the account. */
  pendingVerification?: boolean;
  /** False if SMTP is not configured or send failed — check server logs for OTP. */
  verificationEmailSent?: boolean;
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

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

/** Response from POST /auth/verify-registration (after OTP, account is created). */
export interface VerifyRegistrationResponse {
  success: boolean;
  message: string;
  userId: string;
  email: string;
  userRole?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface UserProfileResponse {
  userId: string;
  email: string;
  userRole: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface UpdateUserProfilePayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface SupportRequestPayload {
  category: 'bug' | 'feature' | 'general' | 'user_report';
  subject: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
}

export interface SupportRequestResponse {
  success: boolean;
  message: string;
  requestId: string;
}

export interface SupportRequestItem {
  id: string;
  userId: string;
  category: string;
  subject: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  createdAt: string;
  submitterEmail?: string;
}

export interface SupportRequestsListResponse {
  success: boolean;
  requests: SupportRequestItem[];
}

export interface UpdateSupportRequestStatusResponse {
  success: boolean;
  requestId: string;
  status: string;
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
  /** From registration phone; mapped from API (camelCase/snake_case) */
  phoneNumber?: string | null;
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
      const errorMessage = getAuthFlowErrorMessage(error, 'ההרשמה נכשלה');
      console.error('Registration failed:', errorMessage);
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
      const errorMessage = getAuthFlowErrorMessage(error, 'ההתחברות נכשלה');
      throw new Error(errorMessage);
    }
  },

  /** Complete signup after OTP — creates the user account (signup flow only). */
  verifyRegistration: async (payload: VerifyEmailPayload): Promise<VerifyRegistrationResponse> => {
    try {
      const response = await apiClient.post('/auth/verify-registration', payload);
      return response.data;
    } catch (error: any) {
      const errorMessage = getAuthFlowErrorMessage(error, 'אימות המייל נכשל');
      throw new Error(errorMessage);
    }
  },

  resendVerification: async (payload: ResendVerificationPayload): Promise<VerifyEmailResponse> => {
    try {
      const response = await apiClient.post('/auth/resend-verification', payload);
      return response.data;
    } catch (error: any) {
      const errorMessage = getAuthFlowErrorMessage(error, 'שליחת קוד האימות מחדש נכשלה');
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
      const errorMessage = error.response?.data?.error || error.message || 'לא ניתן לטעון את רשימת המשתמשים';
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
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה מחיקת המשתמש';
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
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה השעיית המשתמש';
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
      const errorMessage = error.response?.data?.error || error.message || 'לא ניתן לטעון משתמשים מחוברים';
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
      return { success: true, message: 'ההתנתקות המקומית הושלמה' };
    }
  },

  getProfile: async (userId: string): Promise<UserProfileResponse> => {
    try {
      const response = await apiClient.get(`/users/${userId}/profile`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה טעינת הפרופיל';
      throw new Error(errorMessage);
    }
  },

  updateProfile: async (userId: string, payload: UpdateUserProfilePayload): Promise<UserProfileResponse> => {
    try {
      const response = await apiClient.put(`/users/${userId}/profile`, payload);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'נכשל עדכון הפרופיל';
      throw new Error(errorMessage);
    }
  },

  changePassword: async (
    userId: string,
    payload: ChangePasswordPayload
  ): Promise<ChangePasswordResponse> => {
    try {
      const response = await apiClient.post(`/users/${userId}/change-password`, payload);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'נכשל עדכון הסיסמה';
      throw new Error(errorMessage);
    }
  },

  createSupportRequest: async (
    userId: string,
    payload: SupportRequestPayload
  ): Promise<SupportRequestResponse> => {
    try {
      const response = await apiClient.post(`/users/${userId}/support-requests`, payload);
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'שליחת הפנייה נכשלה';
      throw new Error(errorMessage);
    }
  },

  getSupportRequests: async (adminUserId: string): Promise<SupportRequestsListResponse> => {
    try {
      const response = await apiClient.get(`/users/${adminUserId}/support-requests`);
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'לא ניתן לטעון את הפניות';
      throw new Error(errorMessage);
    }
  },

  updateSupportRequestStatus: async (
    adminUserId: string,
    requestId: string,
    status: 'OPEN' | 'CLOSED'
  ): Promise<UpdateSupportRequestStatusResponse> => {
    try {
      const response = await apiClient.patch(`/users/${adminUserId}/support-requests/${requestId}`, {
        status,
      });
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'עדכון הסטטוס נכשל';
      throw new Error(errorMessage);
    }
  },

  /**
   * Send a ping / meet invite to another user (optional dog snapshot for the recipient UI).
   */
  sendPing: async (payload: {
    fromUserId: string;
    toUserId: string;
    fromUserName?: string;
    dogName?: string | null;
    dogBreed?: string | null;
    dogAgeLabel?: string | null;
    dogImageUrl?: string | null;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.post('/users/ping', {
        fromUserId: payload.fromUserId,
        toUserId: payload.toUserId,
        fromUserName: payload.fromUserName || 'משתמש לא ידוע',
        dogName: payload.dogName ?? undefined,
        dogBreed: payload.dogBreed ?? undefined,
        dogAgeLabel: payload.dogAgeLabel ?? undefined,
        dogImageUrl: payload.dogImageUrl ?? undefined,
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה שליחת הפינג';
      throw new Error(errorMessage);
    }
  },

  /**
   * Accept or decline a meet invite (notifies original sender via WebSocket).
   */
  respondToPingMeet: async (payload: {
    originalSenderId: string;
    responderId: string;
    responderName: string;
    accepted: boolean;
    pingId?: string | null;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.post('/users/ping/respond', {
        originalSenderId: payload.originalSenderId,
        responderId: payload.responderId,
        responderName: payload.responderName,
        accepted: payload.accepted,
        pingId: payload.pingId ?? undefined,
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה שליחת התגובה';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get unread pings as a recovery path when WebSocket delivery was missed.
   */
  getPendingPings: async (
    userId: string
  ): Promise<{
    success: boolean;
    pings: Array<{
      id: string;
      fromUserId: string;
      fromUserName: string;
      toUserId: string;
      dogName?: string | null;
      dogBreed?: string | null;
      dogAgeLabel?: string | null;
      dogImageUrl?: string | null;
      createdAt?: string;
      read?: boolean;
    }>;
  }> => {
    try {
      const response = await apiClient.get(`/users/pings/pending/${userId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה טעינת פינגים ממתינים';
      throw new Error(errorMessage);
    }
  },

  markPingAsRead: async (pingId: string): Promise<{ success: boolean; message: string; pingId: string }> => {
    try {
      const response = await apiClient.post(`/users/pings/${pingId}/read`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'נכשל סימון פינג כנקרא';
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
      const errorMessage = error.response?.data?.error || error.message || 'נכשל עדכון המיקום';
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
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה הסרת המיקום';
      throw new Error(errorMessage);
    }
  },

  searchUsers: async (query: string) => {
    try {
      const response = await apiClient.get(`/users/search?query=${query}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה חיפוש המשתמשים';
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
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה הוספת הכלב';
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
      const errorMessage = error.response?.data?.error || error.message || 'לא ניתן לטעון את רשימת הכלבים';
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
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה מחיקת הכלב';
      console.error("Failed to delete dog:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete a dog for a user
   */
  deleteDogForever: async (dogId: string) => {
    try {
      const response = await apiClient.delete(`/dogs/${dogId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה מחיקת הכלב';
      console.error("Failed to delete dog:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Get all dogs
   */
  getAllDogs: async () => {
    try {
      const response = await apiClient.get('/dogs');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'לא ניתן לטעון את רשימת הכלבים';
      console.error("Failed to get all dogs:", errorMessage);
      throw new Error(errorMessage);
    }
  },
  searchDogs: async (query: string) => {
    try {
      const response = await apiClient.get(`/dogs/search?query=${query}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה חיפוש הכלבים';
      throw new Error(errorMessage);
    }
  },
};

function mapProfessionalProfileResponse(row: unknown): ProfessionalProfileResponse {
  const o = row as Record<string, unknown>;
  const merged =
    o.phoneNumber ?? o.phone_number ?? o.PhoneNumber ?? o.phone;
  let phoneNumber: string | null = null;
  if (merged != null && merged !== '') {
    phoneNumber =
      typeof merged === 'number' && Number.isFinite(merged)
        ? String(Math.trunc(merged))
        : String(merged);
  }
  return { ...o, phoneNumber } as ProfessionalProfileResponse;
}

export const dogWalkerAPI = {
  /**
   * Dog walkers who saved at least one professional offering (city, availability, pricing).
   */
  getWalkersWithProfessionalProfiles: async (ownerId?: string): Promise<ProfessionalProfileResponse[]> => {
    try {
      const response = await apiClient.get('/dog-walkers/available-with-professional-profile', {
        params: ownerId ? { ownerId } : undefined,
      });
      const list = Array.isArray(response.data) ? response.data : [];
      return list.map(mapProfessionalProfileResponse);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'לא ניתן לטעון דוגווקרים זמינים';
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
        'נכשלה יצירת הדירוג';
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
        'נכשלה מחיקת הדירוג';
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
      return mapProfessionalProfileResponse(response.data);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'נכשלה טעינת הפרופיל המקצועי';
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
      return mapProfessionalProfileResponse(response.data);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'נכשל עדכון הפרופיל המקצועי';
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
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה יצירת התזכורת';
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
      const errorMessage = error.response?.data?.error || error.message || 'לא ניתן לטעון תזכורות';
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
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה מחיקת התזכורת';
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
      const errorMessage = error.response?.data?.error || error.message || 'לא ניתן לטעון את מלאי המזון';
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
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה יצירת רשומת המזון';
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
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה קישור המזון לכלב';
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
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה חידוש המלאי';
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
      const errorMessage = error.response?.data?.error || error.message || 'נכשל עדכון המלאי';
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
      const errorMessage = error.response?.data?.error || error.message || 'נכשלה מחיקת המלאי';
      console.error("Failed to delete food stock:", errorMessage);
      throw new Error(errorMessage);
    }
  },
};

