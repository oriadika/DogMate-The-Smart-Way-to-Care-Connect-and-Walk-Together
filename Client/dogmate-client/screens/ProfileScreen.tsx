// screens/ProfileScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { userAPI } from '../services/api';
import websocketService from '../services/websocket';
import locationService, { LocationService } from '../services/location';

const PRIMARY_COLOR = '#7FB069'; // Sage green
const USERS_REFRESH_INTERVAL_MS = 5000;
const LOCATION_PUSH_INTERVAL_MS = 5000;

type ProfileCacheEntry = {
  loggedUsers: any[];
  signature: string;
};

const profileDataCache = new Map<string, ProfileCacheEntry>();
const profileDirtyUsers = new Set<string>();

const buildUsersSignature = (users: any[]): string => {
  const usersPart = users
    .map((u: any) => `${u?.id ?? ''}:${u?.latitude ?? ''}:${u?.longitude ?? ''}:${u?.name ?? ''}`)
    .join('|');
  return `${users.length}#${usersPart}`;
};

const ProfileScreen = ({ navigation, route }: any) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loggedUsers, setLoggedUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string>(
    `${route?.params?.userFirstName || ''} ${route?.params?.userLastName || ''}`.trim()
  );
  const [currentUserRoleLabel, setCurrentUserRoleLabel] = useState<string>(route?.params?.role || '');
  const [wsConnected, setWsConnected] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const [isLocationSharingEnabled, setIsLocationSharingEnabled] = useState(false); // Default: sharing disabled (location hidden)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [radiusKm, setRadiusKm] = useState<number>(1); // Default 1km radius
  const [showRadiusFilter, setShowRadiusFilter] = useState<boolean>(true);
  const mapRef = useRef<MapView>(null);

  // Radius filter for map visibility
  const usersInRadius = loggedUsers.filter((user: any) => {
    if (user.latitude == null || user.longitude == null) return false; // No location = skip
    if (user.distance == null) return true; // Distance not calculated yet - include them
    return user.distance <= radiusKm;
  });

  // Ping list includes all logged users, even those hiding location.
  const usersForPing = loggedUsers;

  // Show same cohort on map and in list for consistent UX.
  const usersWithLocation = usersInRadius.filter((user: any) => user.latitude != null && user.longitude != null);

  // Debug: Log users data
  useEffect(() => {
    console.log('📊 Total logged users:', loggedUsers.length);
    console.log('📊 Users with location:', usersWithLocation.length);
    console.log('📊 Users in radius:', usersInRadius.length);
    if (loggedUsers.length > 0) {
      console.log('📊 First user data:', JSON.stringify(loggedUsers[0]));
    }
  }, [loggedUsers]);

  useEffect(() => {
    const currentUserId = route?.params?.userId;
    const cached = currentUserId ? profileDataCache.get(currentUserId) : null;
    const shouldFetch = !cached || (currentUserId ? profileDirtyUsers.has(currentUserId) : true);

    if (cached) {
      setLoggedUsers(cached.loggedUsers || []);
      setIsLoadingUsers(false);
    }

    if (shouldFetch) {
      fetchLoggedUsers({ showLoader: !cached });
    }
    
    // Always refresh in background so other users become visible without reopening screen.
    const refreshInterval = setInterval(() => {
      fetchLoggedUsers({ showLoader: false });
    }, USERS_REFRESH_INTERVAL_MS);
    
    // Set up periodic location sending (every 5 seconds when sharing is enabled)
    let locationSendInterval: ReturnType<typeof setInterval> | null = null;
    
    // Request location permissions and start tracking
    const initializeLocation = async () => {
      const userId = route?.params?.userId;
      const permissionsGranted = await locationService.requestPermissions();
      
      if (permissionsGranted) {
        setLocationTracking(true);
        
        // Get initial location
        const initialLocation = await locationService.getCurrentLocation();
        if (initialLocation && userId) {
          setUserLocation(initialLocation);
          console.log('📍 Initial location obtained:', initialLocation);
        }

        // Start watching location for continuous updates
        const success = locationService.startWatchingLocation(
          async (location) => {
            setUserLocation(location);
          },
          (error) => {
            console.error('Location tracking error:', error);
          }
        );
        
        if (!success) {
          console.warn('⚠️ Failed to start location watching');
          setLocationTracking(false);
        }
      }
    };

    initializeLocation();
    
    // Connect to WebSocket for real-time ping notifications
    const userId = route?.params?.userId;
    if (userId) {
      console.log('📱 ProfileScreen mounted, connecting WebSocket for user:', userId);
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        connectWebSocket(userId);
      }, 500);
      
      return () => {
        clearTimeout(timer);
        clearInterval(refreshInterval);
        if (locationSendInterval) clearInterval(locationSendInterval);
        locationService.stopWatchingLocation();
        console.log('📱 ProfileScreen unmounting, disconnecting WebSocket');
        websocketService.disconnect();
      };
    }

    // Cleanup on unmount
    return () => {
      clearInterval(refreshInterval);
      if (locationSendInterval) clearInterval(locationSendInterval);
      locationService.stopWatchingLocation();
      console.log('📱 ProfileScreen unmounting, disconnecting WebSocket');
      websocketService.disconnect();
    };
  }, [route?.params?.userId]);

  // Send location updates to server continuously when sharing is enabled
  // Use a ref to store the latest location to avoid recreating the interval
  const userLocationRef = useRef(userLocation);
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    const userId = route?.params?.userId;
    let locationInterval: ReturnType<typeof setInterval> | null = null;
    
    if (userId && isLocationSharingEnabled) {
      // Send location immediately
      if (userLocationRef.current) {
        userAPI.updateLocation(userId, userLocationRef.current.latitude, userLocationRef.current.longitude)
          .then(() => console.log('📍 Location sent to server'))
          .catch((error) => console.error('Failed to update location:', error));
      }
      
      // Send location on a moderate interval to reduce backend load.
      locationInterval = setInterval(() => {
        if (userLocationRef.current) {
          userAPI.updateLocation(userId, userLocationRef.current.latitude, userLocationRef.current.longitude)
            .catch((error) => console.error('Failed to update location:', error));
        }
      }, LOCATION_PUSH_INTERVAL_MS);
    }
    
    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, [isLocationSharingEnabled, route?.params?.userId]);

  // Recalculate distances when userLocation changes
  useEffect(() => {
    if (userLocation && loggedUsers.length > 0) {
      const updatedUsers = loggedUsers.map((user: any) => {
        if (user.latitude && user.longitude) {
          const distance = LocationService.calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              user.latitude,
              user.longitude
          );
          return { ...user, distance };
        }
        return user;
      });
      setLoggedUsers(updatedUsers);
    }
  }, [userLocation]);

  // Calculate map region to include all users
  useEffect(() => {
    if (userLocation) {
      const usersWithLocation = loggedUsers.filter((user: any) => user.latitude != null && user.longitude != null);
      
      if (usersWithLocation.length === 0) {
        // Only current user, center on their location with 500 meter radius
        setMapRegion({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      } else {
        // Calculate bounds to include all users, but limit to 500 meter radius
        const latitudes = [userLocation.latitude, ...usersWithLocation.map((u: any) => u.latitude)];
        const longitudes = [userLocation.longitude, ...usersWithLocation.map((u: any) => u.longitude)];
        
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);
        
        const latDelta = (maxLat - minLat) * 1.5;
        const lngDelta = (maxLng - minLng) * 1.5;
        
        // Use calculated delta if it's within 500 meters, otherwise use 500 meter radius
        const finalLatDelta = latDelta > 0 && latDelta < 0.005 ? latDelta : 0.005;
        const finalLngDelta = lngDelta > 0 && lngDelta < 0.005 ? lngDelta : 0.005;
        
        setMapRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max(finalLatDelta, 0.005),
          longitudeDelta: Math.max(finalLngDelta, 0.005),
        });
      }
    }
  }, [userLocation, loggedUsers]);
  const toggleLocationSharing = async () => {
    const newState = !isLocationSharingEnabled;
    setIsLocationSharingEnabled(newState);
    
    const userId = route?.params?.userId;
    if (!newState && userId) {
      // Clear location from server when sharing is disabled
      try {
        await userAPI.clearLocation(userId);
        console.log('🔒 Location cleared from server - you are now hidden');
      } catch (error) {
        console.error('Failed to clear location:', error);
      }
    }

    if (userId) {
      profileDirtyUsers.add(userId);
      fetchLoggedUsers({ showLoader: false });
    }
    
    console.log(`📍 Location sharing ${newState ? 'enabled' : 'disabled'}`);
  };

  const connectWebSocket = (userId: string) => {
    websocketService.connect(userId, {
      onConnected: () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      },
      onDisconnected: () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
      },
      onPingReceived: (ping: any) => {
        console.log('Ping received from:', ping.fromUserName);
        
        // Show instant notification when ping is received
        Alert.alert(
          'פינג חדש! 🐕',
          `${ping.fromUserName} שלח לך פינג!`,
          [
            {
              text: 'בסדר',
            },
          ]
        );
      },
      onError: (error: any) => {
        console.error('WebSocket error:', error);
      },
    });
  };

  const checkPendingPings = async () => {
    const currentUserId = route?.params?.userId;
    if (!currentUserId) return;

    try {
      const response = await userAPI.getPendingPings(currentUserId);
      if (response.success && response.pings && response.pings.length > 0) {
        for (const ping of response.pings) {
          Alert.alert(
            'פינג חדש! 🐕',
            `${ping.fromUserName || 'משתמש'} שלח לך פינג!`,
            [{ text: 'בסדר' }]
          );

          if (ping.id) {
            try {
              await userAPI.markPingAsRead(ping.id);
            } catch (markError) {
              console.warn('Failed to mark ping as read:', markError);
            }
          }
        }
      }
    } catch (error) {
      // Silent fallback polling: do not interrupt user.
      console.log('Pending ping check failed:', error);
    }
  };

  useEffect(() => {
    if (wsConnected) {
      return;
    }

    checkPendingPings();
    const pendingInterval = setInterval(() => {
      checkPendingPings();
    }, 5000);

    return () => {
      clearInterval(pendingInterval);
    };
  }, [wsConnected, route?.params?.userId]);

  const fetchLoggedUsers = async (options?: { showLoader?: boolean }) => {
    const shouldShowLoader = options?.showLoader ?? true;

    try {
      if (shouldShowLoader) {
        setIsLoadingUsers(true);
      }
      const data = await userAPI.getLoggedUsers();
      const currentUserId = route?.params?.userId;
      
      if (data.success && data.users) {
        const currentUser = data.users.find((user: any) => user.id === currentUserId);
        if (currentUser) {
          const resolvedName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
          setCurrentUserDisplayName(
            resolvedName || currentUser.email?.split('@')[0] || route?.params?.userFirstName || 'משתמש'
          );
          setCurrentUserRoleLabel(currentUser.type === 'RegularUser' ? 'בעל כלב' : 'מנהל');
        }

        // Format users for display and filter out current user
        const formattedUsers = data.users
          .filter((user: any) => user.id !== currentUserId) // Filter out current user
          .map((user: any) => {
          const userObj: any = {
            id: user.id,
            name: user.type === 'RegularUser' 
              ? `${user.firstName} ${user.lastName}` 
              : `Admin: ${user.email}`,
            role: user.type === 'RegularUser' ? 'בעל כלב' : `מנהל (רמה ${user.permissionLevel})`,
            email: user.email,
            type: user.type,
          };

          // Add location data if available (only for RegularUser)
          if (user.type === 'RegularUser' && user.latitude != null && user.longitude != null) {
            userObj.latitude = user.latitude;
            userObj.longitude = user.longitude;
            
            // Calculate distance if current user has location
            if (userLocation) {
              const distance = LocationService.calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                user.latitude,
                user.longitude
              );
              userObj.distance = distance;
            }
          }

          return userObj;
        });
        const updatedUsersWithDistance = userLocation
          ? formattedUsers.map((user: any) => {
              if (user.latitude != null && user.longitude != null) {
                const distance = LocationService.calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    user.latitude,
                    user.longitude
                );
                return { ...user, distance };
              }
              return user;
            })
          : formattedUsers;

        const nextSignature = buildUsersSignature(updatedUsersWithDistance);
        const cached = currentUserId ? profileDataCache.get(currentUserId) : null;
        const hasChanged = !cached || cached.signature !== nextSignature;

        if (hasChanged) {
          setLoggedUsers(updatedUsersWithDistance);
        }

        if (currentUserId) {
          profileDataCache.set(currentUserId, {
            loggedUsers: updatedUsersWithDistance,
            signature: nextSignature,
          });
          profileDirtyUsers.delete(currentUserId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch logged users:', error);
      if (shouldShowLoader) {
        Alert.alert('שגיאה', 'טעינת המשתמשים נכשלה');
      }
    } finally {
      if (shouldShowLoader) {
        setIsLoadingUsers(false);
      }
    }
  };

  // Function to focus map on a user's location
  const focusOnUser = (user: any) => {
    if (user.latitude != null && user.longitude != null && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: user.latitude,
        longitude: user.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    } else {
      Alert.alert('מיקום לא זמין', 'למשתמש זה אין מיקום פעיל');
    }
  };

  const handlePing = async (toUserId: string, toUserName: string) => {
    try {
      const fromUserId = route?.params?.userId;
      const fromUserName = `${route?.params?.userFirstName || ''} ${route?.params?.userLastName || ''}`.trim();
      
      if (!fromUserId) {
        Alert.alert('שגיאה', 'מזהה משתמש לא נמצא');
        return;
      }

      await userAPI.sendPing(fromUserId, toUserId, fromUserName);
      Alert.alert('הצלחה', `פינג נשלח ל-${toUserName}!`);
    } catch (error: any) {
      Alert.alert('שגיאה', error.message || 'שליחת הפינג נכשלה');
      console.error('Ping error:', error);
    }
  };

  const renderContact = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => focusOnUser(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        {item.role === 'בעל כלב' ? (
          <MaterialCommunityIcons name="dog" size={24} color="#fff" />
        ) : (
          <FontAwesome5 name="user-shield" size={20} color="#fff" />
        )}
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userMeta}>{item.role}</Text>
        {/* Show distance if user has location */}
        {item.distance !== undefined && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={PRIMARY_COLOR} />
            <Text style={styles.distanceText}>
              {LocationService.formatDistance(item.distance)} ממך
            </Text>
            <Text style={styles.tapToShowText}>(לחץ להצגה במפה)</Text>
          </View>
        )}
      </View>

      {/* Ping button */}
      <TouchableOpacity 
        style={styles.pingButton} 
        onPress={() => handlePing(item.id, item.name)}
      >
        <Text style={styles.pingText}>פינג</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          onPress: () => { },
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              // Call logout API with userId and email
              await userAPI.logout(route?.params?.userId || '', route?.params?.email || '');

              // Clear user data and navigate back to Start
              navigation.reset({
                index: 0,
                routes: [{ name: 'Start' }],
              });
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to sign out');
              console.error('Sign out error:', error);
            } finally {
              setIsLoggingOut(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color="#5C4033" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>טיולים</Text>

        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={usersForPing}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* PROFILE CARD */}
            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                {route?.params?.role === 'Dog walker' ? (
                  <FontAwesome5 name="walking" size={26} color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="dog" size={28} color="#fff" />
                )}
              </View>

              <View style={styles.profileTextBlock}>
                <Text style={styles.profileName}>{currentUserDisplayName || 'משתמש'}</Text>
                <Text style={styles.profileRole}>{currentUserRoleLabel || route?.params?.role || 'בעל כלב'}</Text>
              </View>
            </View>

            {/* Location Display */}
            {userLocation ? (
              <View style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <Ionicons name="location" size={18} color={PRIMARY_COLOR} />
                  <Text style={styles.locationTitle}>המיקום שלך</Text>
                  {locationTracking && (
                    <View style={styles.locationStatusContainer}>
                      <Text style={[
                        styles.locationSharingStatus,
                        isLocationSharingEnabled ? styles.locationSharingActive : styles.locationSharingInactive
                      ]}>
                        {isLocationSharingEnabled ? '📍 פעיל למשתמשים אחרים' : '🔒 מוסתר ממשתמשים אחרים'}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleSharingButton,
                    isLocationSharingEnabled ? styles.toggleSharingButtonActive : styles.toggleSharingButtonInactive
                  ]}
                  onPress={toggleLocationSharing}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isLocationSharingEnabled ? "eye-off" : "eye"}
                    size={18}
                    color="#FFFFFF"
                    style={styles.toggleIcon}
                  />
                  <Text style={styles.toggleSharingButtonText}>
                    {isLocationSharingEnabled ? 'הסתר מיקום' : 'שתף מיקום'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <Ionicons name="location" size={18} color="#8B7355" />
                  <Text style={styles.locationTitle}>המיקום שלך</Text>
                </View>
                <Text style={styles.locationText}>
                  {locationTracking ? 'מביא מיקום...' : 'מעקב מיקום מושבת'}
                </Text>
              </View>
            )}

            {/* Map Display */}
            <View style={styles.mapContainer}>
              <View style={styles.mapHeader}>
                <Text style={styles.mapTitle}>מפה</Text>
                {userLocation && (
                  <TouchableOpacity
                    style={styles.myLocationButton}
                    onPress={() => {
                    if (mapRef.current && userLocation) {
                      // Zoom to fit the radius
                      const latDelta = (radiusKm / 111) * 2.5; // ~111km per degree latitude
                      mapRef.current.animateToRegion({
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        latitudeDelta: latDelta,
                        longitudeDelta: latDelta,
                      }, 500);
                    }
                    }}
                  >
                    <Ionicons name="locate" size={24} color={PRIMARY_COLOR} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Radius Filter Slider */}
              {userLocation && (
                <View style={styles.radiusFilterContainer}>
                  <View style={styles.radiusHeader}>
                    <Ionicons name="radio-button-on" size={16} color={PRIMARY_COLOR} />
                    <Text style={styles.radiusTitle}>טווח חיפוש: {radiusKm >= 1 ? `${radiusKm} ק"מ` : `${Math.round(radiusKm * 1000)} מ'`}</Text>
                    <Text style={styles.usersInRadiusCount}>
                      ({usersInRadius.length} משתמשים בטווח)
                    </Text>
                  </View>
                  <Slider
                    style={styles.radiusSlider}
                    minimumValue={0.05}
                    maximumValue={5}
                    step={0.05}
                    value={radiusKm}
                    onValueChange={(value) => setRadiusKm(Math.round(value * 100) / 100)}
                    minimumTrackTintColor={PRIMARY_COLOR}
                    maximumTrackTintColor="#E0D5C7"
                    thumbTintColor={PRIMARY_COLOR}
                  />
                  <View style={styles.radiusLabels}>
                    <Text style={styles.radiusLabelText}>50 מ'</Text>
                    <Text style={styles.radiusLabelText}>5 ק"מ</Text>
                  </View>
                </View>
              )}

              {userLocation ? (
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={mapRegion || {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: (radiusKm / 111) * 2.5,
                    longitudeDelta: (radiusKm / 111) * 2.5,
                  }}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                  toolbarEnabled={false}
                  zoomEnabled={true}
                  scrollEnabled={true}
                  rotateEnabled={false}
                >
                  {/* Radius circle */}
                  <Circle
                    center={{
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    }}
                    radius={radiusKm * 1000} // Convert km to meters
                    strokeColor="rgba(127, 176, 105, 0.8)"
                    fillColor="rgba(127, 176, 105, 0.15)"
                    strokeWidth={2}
                  />

                  {/* Current user marker */}
                  <Marker
                    coordinate={{
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    }}
                    title="אתה כאן"
                  >
                    <View style={styles.currentUserMarker}>
                      <MaterialCommunityIcons name="dog" size={20} color="#fff" />
                    </View>
                  </Marker>

                  {/* Other users markers */}
                  {usersWithLocation
                    .map((user: any) => (
                      <Marker
                        key={user.id}
                        coordinate={{
                          latitude: user.latitude,
                          longitude: user.longitude,
                        }}
                        title={user.name}
                        description={user.distance ? `${LocationService.formatDistance(user.distance)} ממך` : ''}
                      >
                        <View style={styles.otherUserMarker}>
                          <FontAwesome5 name="dog" size={16} color="#fff" />
                        </View>
                      </Marker>
                    ))}
                </MapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Ionicons name="location-outline" size={48} color="#8B7355" />
                  <Text style={styles.mapPlaceholderText}>
                    {locationTracking ? 'מביא מיקום...' : 'מעקב מיקום מושבת'}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>משתמשים מחוברים ({usersForPing.length}):</Text>
            {isLoadingUsers && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={PRIMARY_COLOR} size="large" />
                <Text style={styles.loadingText}>טוען נתונים...</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoadingUsers ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>לא נמצאו משתמשים מחוברים</Text>
            </View>
          ) : null
        }
      />

    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAEFDD',
  },

  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 20,
  },

  profileCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#faf0e6',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0D5C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  profileTextBlock: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'right',
  },
  profileRole: {
    marginTop: 2,
    fontSize: 13,
    color: '#8B7355',
    textAlign: 'right',
  },

  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  infoText: {
    marginRight: 8,
    fontSize: 14,
    color: '#5C4033',
    textAlign: 'right',
  },

  locationCard: {
    backgroundColor: '#faf0e6',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },

  locationHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },

  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C4033',
    marginRight: 8,
    textAlign: 'right',
    flex: 1,
  },

  locationStatusContainer: {
    marginTop: 4,
    width: '100%',
  },

  locationSharingStatus: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 4,
  },

  locationSharingActive: {
    color: PRIMARY_COLOR,
  },

  locationSharingInactive: {
    color: '#8B7355',
  },

  trackingBadge: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },

  locationText: {
    fontSize: 12,
    color: '#8B7355',
    marginBottom: 4,
    textAlign: 'right',
  },

  toggleSharingButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  toggleSharingButtonActive: {
    backgroundColor: '#8B7355',
  },

  toggleSharingButtonInactive: {
    backgroundColor: PRIMARY_COLOR,
  },

  toggleIcon: {
    marginLeft: 8,
  },

  toggleSharingButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  sectionTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 12,
    textAlign: 'right',
  },

  userCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#faf0e6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0D5C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'right',
  },

  userMeta: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 4,
    textAlign: 'right',
  },

  distanceText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    marginRight: 4,
    textAlign: 'right',
  },

  pingButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  pingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  loadingContainer: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#5C4033',
    fontSize: 16,
  },

  emptyContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'center',
  },

  mapContainer: {
    marginTop: 8,
    marginBottom: 8,
  },

  mapHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  mapTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'right',
    flex: 1,
  },

  myLocationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#faf0e6',
    borderWidth: 1,
    borderColor: '#E0D5C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  map: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },

  mapPlaceholder: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: '#faf0e6',
    borderWidth: 1,
    borderColor: '#E0D5C7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  mapPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'center',
  },

  currentUserMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  otherUserMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5C4033',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  // Radius filter styles
  radiusFilterContainer: {
    backgroundColor: '#faf0e6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },

  radiusHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
  },

  radiusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C4033',
    marginRight: 8,
    textAlign: 'right',
  },

  usersInRadiusCount: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    marginRight: 8,
  },

  radiusSlider: {
    width: '100%',
    height: 40,
  },

  radiusLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },

  radiusLabelText: {
    fontSize: 11,
    color: '#8B7355',
  },

  // Location row for user cards
  locationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 2,
  },

  tapToShowText: {
    fontSize: 10,
    color: '#8B7355',
    marginRight: 4,
    fontStyle: 'italic',
  },
});
