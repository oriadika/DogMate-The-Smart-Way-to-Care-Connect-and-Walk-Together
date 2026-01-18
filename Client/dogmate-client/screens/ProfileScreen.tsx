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
import MapView, { Marker } from 'react-native-maps';
import { userAPI } from '../services/api';
import websocketService from '../services/websocket';
import locationService, { LocationService } from '../services/location';

const PRIMARY_COLOR = '#7FB069'; // Sage green

const ProfileScreen = ({ navigation, route }: any) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loggedUsers, setLoggedUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const [isLocationSharingEnabled, setIsLocationSharingEnabled] = useState(false); // Default: sharing disabled (location hidden)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<any>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchLoggedUsers();
    
    // Set up auto-refresh of logged-in users every 7 seconds
    const refreshInterval = setInterval(() => {
      fetchLoggedUsers();
    }, 7000);
    
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
          // Only send to server if sharing is enabled
          if (isLocationSharingEnabled) {
            try {
              await userAPI.updateLocation(userId, initialLocation.latitude, initialLocation.longitude);
              console.log('📍 Initial location sent to server');
            } catch (error) {
              console.error('Failed to send initial location:', error);
            }
          }
        }

        // Start watching location for continuous updates
        const success = locationService.startWatchingLocation(
          async (location) => {
            setUserLocation(location);
            // Location will be sent to server via useEffect when isLocationSharingEnabled changes
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
        locationService.stopWatchingLocation();
        console.log('📱 ProfileScreen unmounting, disconnecting WebSocket');
        websocketService.disconnect();
      };
    }

    // Cleanup on unmount
    return () => {
      clearInterval(refreshInterval);
      locationService.stopWatchingLocation();
      console.log('📱 ProfileScreen unmounting, disconnecting WebSocket');
      websocketService.disconnect();
    };
  }, [route?.params?.userId]);

  // Send location updates to server when location changes and sharing is enabled
  useEffect(() => {
    const userId = route?.params?.userId;
    if (userId && userLocation && isLocationSharingEnabled) {
      userAPI.updateLocation(userId, userLocation.latitude, userLocation.longitude)
        .then(() => console.log('📍 Location updated on server'))
        .catch((error) => console.error('Failed to update location:', error));
    }
  }, [userLocation, isLocationSharingEnabled, route?.params?.userId]);

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
      const usersWithLocation = loggedUsers.filter((user: any) => user.latitude && user.longitude);
      
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
  const toggleLocationSharing = () => {
    const newState = !isLocationSharingEnabled;
    setIsLocationSharingEnabled(newState);
    // Location will be sent/stopped automatically via useEffect when state changes
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
        console.log('=== PING RECEIVED DEBUG ===');
        console.log('Full ping object:', JSON.stringify(ping, null, 2));
        console.log('ping.fromUserName:', ping.fromUserName);
        console.log('ping.fromUserId:', ping.fromUserId);
        console.log('ping.toUserId:', ping.toUserId);
        console.log('===========================');
        
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

  const fetchLoggedUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const data = await userAPI.getLoggedUsers();
      const currentUserId = route?.params?.userId;
      
      if (data.success && data.users) {
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
          if (user.type === 'RegularUser' && user.latitude && user.longitude) {
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
        setLoggedUsers(formattedUsers);

        // Recalculate distances with current location when list is updated
        if (userLocation && formattedUsers.length > 0) {
          const updatedUsersWithDistance = formattedUsers.map((user: any) => {
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
          setLoggedUsers(updatedUsersWithDistance);
        }      }
    } catch (error) {
      console.error('Failed to fetch logged users:', error);
      Alert.alert('שגיאה', 'טעינת המשתמשים נכשלה');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handlePing = async (toUserId: string, toUserName: string) => {
    try {
      const fromUserId = route?.params?.userId;
      const fromUserName = `${route?.params?.userFirstName || ''} ${route?.params?.userLastName || ''}`.trim();
      
      console.log('=== PING DEBUG ===');
      console.log('fromUserId:', fromUserId);
      console.log('fromUserName:', fromUserName);
      console.log('toUserId:', toUserId);
      console.log('toUserName:', toUserName);
      console.log('route.params:', route?.params);
      console.log('==================');
      
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
    <View style={styles.userCard}>
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
          <Text style={styles.distanceText}>
            📍 {LocationService.formatDistance(item.distance)} ממך
          </Text>
        )}
      </View>

      {/* Ping button */}
      <TouchableOpacity 
        style={styles.pingButton} 
        onPress={() => handlePing(item.id, item.name)}
      >
        <Text style={styles.pingText}>פינג</Text>
      </TouchableOpacity>
    </View>
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
        data={loggedUsers}
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
                <Text style={styles.profileName}>{route?.params?.userFirstName} {route?.params?.userLastName}</Text>
                <Text style={styles.profileRole}>{route?.params?.role}</Text>
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
                      mapRef.current.animateToRegion({
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      }, 500);
                    }
                    }}
                  >
                    <Ionicons name="locate" size={24} color={PRIMARY_COLOR} />
                  </TouchableOpacity>
                )}
              </View>
              {userLocation ? (
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={mapRegion || {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                  toolbarEnabled={false}
                  zoomEnabled={true}
                  scrollEnabled={true}
                  rotateEnabled={false}
                >
                  {/* Current user marker */}
                  <Marker
                    coordinate={{
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    }}
                    title="אתה כאן"
                    pinColor={PRIMARY_COLOR}
                  />

                  {/* Other users markers */}
                  {loggedUsers
                    .filter((user: any) => user.latitude && user.longitude)
                    .map((user: any) => (
                      <Marker
                        key={user.id}
                        coordinate={{
                          latitude: user.latitude,
                          longitude: user.longitude,
                        }}
                        title={user.name}
                        description={user.distance ? `${LocationService.formatDistance(user.distance)} ממך` : ''}
                        pinColor="#5C4033"
                      />
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

            <Text style={styles.sectionTitle}>משתמשים מחוברים:</Text>
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
    marginTop: 6,
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
});
