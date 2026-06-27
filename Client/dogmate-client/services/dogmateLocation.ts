import * as Location from 'expo-location';
const LOCATION_DEBUG_LOGS = false;
const locationDebug = (...args: any[]) => {
  if (__DEV__ && LOCATION_DEBUG_LOGS) {
    console.log(...args);
  }
};

export interface UserLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

class LocationService {
  private permissionGranted = false;
  private locationWatcher: Location.LocationSubscription | null = null;

  /**
   * Request location permissions from the user
   * Required for iOS and Android
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.permissionGranted = status === 'granted';
      locationDebug('Location permission status:', status);
      return this.permissionGranted;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Get current user location (one-time fetch)
   */
  async getCurrentLocation(): Promise<UserLocation | null> {
    try {
      if (!this.permissionGranted) {
        const granted = await this.requestPermissions();
        if (!granted) return null;
      }

      locationDebug('Fetching current location');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const userLocation: UserLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
      };

      locationDebug('Location fetched');
      return userLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Start watching user location for continuous updates
   * Call the callback whenever location changes significantly
   */
  startWatchingLocation(
    onLocationUpdate: (location: UserLocation) => void,
    onError?: (error: any) => void
  ): boolean {
    if (this.locationWatcher) {
      // Expected in some re-render paths; keep silent.
      return false;
    }

    if (!this.permissionGranted) {
      // Avoid noisy error logs when user denied permission.
      return false;
    }

    try {
      locationDebug('Starting location watcher');
      
      // Watch location with more frequent updates for better nearby user detection
      this.locationWatcher = Location.watchPositionAsync(
        {
          // דיוק גבוה לטיול רגלי — נקודה קרובה יותר למיקום האמיתי על המפה
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (location) => {
          const userLocation: UserLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
          };
          onLocationUpdate(userLocation);
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting location watcher:', error);
      if (onError) onError(error);
      return false;
    }
  }

  /**
   * Stop watching user location
   */
  stopWatchingLocation(): boolean {
    if (this.locationWatcher) {
      try {
        // Handle both promise-based and subscription-based APIs
        if (typeof this.locationWatcher.remove === 'function') {
          this.locationWatcher.remove();
        } else if (this.locationWatcher instanceof Promise) {
          // For promise-based API
          (this.locationWatcher as any).then((subscription: any) => {
            if (subscription && typeof subscription.remove === 'function') {
              subscription.remove();
            }
          });
        }
        this.locationWatcher = null;
        locationDebug('Location watcher stopped');
        return true;
      } catch (error) {
        console.error('Error stopping location watcher:', error);
        this.locationWatcher = null;
        return false;
      }
    }
    return false;
  }

  /**
   * Calculate distance between two coordinates (in meters)
   * Uses Haversine formula
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  /**
   * Get readable distance string
   */
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  }
}

// Export singleton instance
const locationService = new LocationService();
export default locationService;
export { LocationService };
