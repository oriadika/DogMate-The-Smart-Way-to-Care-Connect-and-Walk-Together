// screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
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
import { userAPI } from '../services/api';
import websocketService from '../services/websocket';
import locationService from '../services/location';

const ProfileScreen = ({ navigation, route }: any) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loggedUsers, setLoggedUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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
          try {
            await userAPI.updateLocation(userId, initialLocation.latitude, initialLocation.longitude);
            console.log('📍 Initial location sent to server');
          } catch (error) {
            console.error('Failed to send initial location:', error);
          }
        }

        // Start watching location for continuous updates
        const success = locationService.startWatchingLocation(
          async (location) => {
            setUserLocation(location);
            if (userId) {
              try {
                await userAPI.updateLocation(userId, location.latitude, location.longitude);
              } catch (error) {
                console.error('Failed to update location:', error);
              }
            }
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
        console.log('Ping received:', ping);
        // Show instant notification when ping is received
        Alert.alert(
          'New Ping! 🐕',
          `${ping.fromUserName} pinged you!`,
          [
            {
              text: 'OK',
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
      
      if (data.success && data.users) {
        // Format users for display
        const formattedUsers = data.users.map((user: any) => ({
          id: user.id,
          name: user.type === 'RegularUser' 
            ? `${user.firstName} ${user.lastName}` 
            : `Admin: ${user.email}`,
          role: user.type === 'RegularUser' ? 'Dog owner' : `Admin (Level ${user.permissionLevel})`,
          email: user.email,
          type: user.type,
        }));
        setLoggedUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Failed to fetch logged users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handlePing = async (toUserId: string, toUserName: string) => {
    try {
      const fromUserId = route?.params?.userId;
      const fromUserName = `${route?.params?.userFirstName} ${route?.params?.userLastName}`;
      
      if (!fromUserId) {
        Alert.alert('Error', 'User ID not found');
        return;
      }

      await userAPI.sendPing(fromUserId, toUserId, fromUserName);
      Alert.alert('Success', `Ping sent to ${toUserName}!`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send ping');
      console.error('Ping error:', error);
    }
  };

  const renderContact = ({ item }: any) => (
    <View style={styles.userCard}>
      <View style={styles.avatar}>
        {item.role === 'Dog owner' ? (
          <MaterialCommunityIcons name="dog" size={20} color="#fff" />
        ) : (
          <FontAwesome5 name="walking" size={20} color="#fff" />
        )}
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userMeta}>{item.role}</Text>
      </View>

      {/* Ping button */}
      <TouchableOpacity 
        style={styles.pingButton} 
        onPress={() => handlePing(item.id, item.name)}
      >
        <Text style={styles.pingText}>Ping</Text>
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
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>

        <View style={{ width: 24 }} />
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

            {/* Profile details */}
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>{route?.params?.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>{route?.params?.phone}</Text>
            </View>

            {/* Location Display */}
            {userLocation ? (
              <View style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <Ionicons name="location" size={18} color="#FF7043" />
                  <Text style={styles.locationTitle}>Your Location</Text>
                  {locationTracking && <Text style={styles.trackingBadge}>📍 Live</Text>}
                </View>
                <Text style={styles.locationText}>
                  Latitude: {userLocation.latitude.toFixed(6)}
                </Text>
                <Text style={styles.locationText}>
                  Longitude: {userLocation.longitude.toFixed(6)}
                </Text>
              </View>
            ) : (
              <View style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <Ionicons name="location" size={18} color="#9CA3AF" />
                  <Text style={styles.locationTitle}>Your Location</Text>
                </View>
                <Text style={styles.locationText}>
                  {locationTracking ? 'Fetching location...' : 'Location tracking disabled'}
                </Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Logged In Users</Text>
            {isLoadingUsers && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FF7043" size="large" />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoadingUsers ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No logged-in users found</Text>
            </View>
          ) : null
        }
      />

      {/* Sign Out Button */}
      <TouchableOpacity
        style={[styles.signOutButton, isLoggingOut && styles.signOutButtonDisabled]}
        onPress={handleSignOut}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <MaterialCommunityIcons name="logout" size={20} color="#fff" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 100,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF7043',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileTextBlock: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  profileRole: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },

  locationCard: {
    backgroundColor: '#FFF5F2',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF7043',
  },

  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },

  trackingBadge: {
    fontSize: 12,
    color: '#FF7043',
    fontWeight: '600',
  },

  locationText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontFamily: 'Courier New',
  },

  sectionTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF7043',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  userMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  pingButton: {
    backgroundColor: '#2F80ED',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },

  pingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  signOutButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  signOutButtonDisabled: {
    opacity: 0.6,
  },

  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },

  loadingContainer: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyContainer: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
