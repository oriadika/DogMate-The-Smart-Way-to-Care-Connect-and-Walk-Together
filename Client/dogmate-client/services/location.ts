import * as Location from 'expo-location';

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
      
      if (this.permissionGranted) {
        console.log('✅ Location permissions granted');
      } else {
        console.log('❌ Location permissions denied');
      }
      
      return this.permissionGranted;
    } catch (error) {
      console.error('❌ Error requesting location permissions:', error);
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

      console.log('📍 Fetching current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userLocation: UserLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
      };

      console.log('✅ Location fetched:', userLocation);
      return userLocation;
    } catch (error) {
      console.error('❌ Error getting current location:', error);
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
      console.warn('⚠️ Location watcher already active');
      return false;
    }

    if (!this.permissionGranted) {
      console.error('❌ Location permissions not granted');
      return false;
    }

    try {
      console.log('📍 Starting location watcher...');
      
      // Watch location with 1000ms update interval and 100m distance threshold
      this.locationWatcher = Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds minimum
          distanceInterval: 10, // Update if location changes by 10 meters
        },
        (location) => {
          const userLocation: UserLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
          };
          console.log('📍 Location updated:', userLocation);
          onLocationUpdate(userLocation);
        }
      );

      return true;
    } catch (error) {
      console.error('❌ Error starting location watcher:', error);
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
        console.log('📍 Location watcher stopped');
        return true;
      } catch (error) {
        console.error('❌ Error stopping location watcher:', error);
        this.locationWatcher = null;
        return false;
      }
    }
    console.warn('⚠️ No active location watcher');
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
export default new LocationService();
