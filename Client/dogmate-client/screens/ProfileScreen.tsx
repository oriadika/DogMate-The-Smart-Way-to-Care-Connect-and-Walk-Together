// screens/ProfileScreen.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { userAPI } from '../services/api';
import websocketService from '../services/websocket';
import locationService, { LocationService } from '../services/location';
import { dogMateMapStyle } from '../src/constants/MapStyles';

const PRIMARY_COLOR = '#7FB069'; // Sage green
const USERS_REFRESH_INTERVAL_MS = 5000;
const LOCATION_PUSH_INTERVAL_MS = 5000;
const HEADER_OVERLAY_HEIGHT = 56;
const MARKER_SIZE = 42;
const SELECTION_CARD_APPROX_HEIGHT = 168;

/** זום מסחרי — פירוט רחובות (~0.005) */
const WALK_MAP_LAT_DELTA = 0.005;
const WALK_MAP_LNG_DELTA = 0.005;

type ProfileCacheEntry = {
  loggedUsers: any[];
  signature: string;
};

type MapSelection = null | 'self' | { kind: 'other'; user: any };

const profileDataCache = new Map<string, ProfileCacheEntry>();
const profileDirtyUsers = new Set<string>();

const buildUsersSignature = (users: any[]): string => {
  const usersPart = users
    .map(
      (u: any) =>
        `${u?.id ?? ''}:${u?.latitude ?? ''}:${u?.longitude ?? ''}:${u?.name ?? ''}:${u?.mapDogProfileImageUrl ?? ''}`
    )
    .join('|');
  return `${users.length}#${usersPart}`;
};

function MapMarkerAvatar({
  uri,
  size = MARKER_SIZE,
  borderColor = PRIMARY_COLOR,
}: {
  uri?: string | null;
  size?: number;
  borderColor?: string;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor,
        }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: PRIMARY_COLOR,
        borderWidth: 3,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 4,
      }}
    >
      <FontAwesome5 name="paw" size={size * 0.42} color="#fff" />
    </View>
  );
}

const ProfileScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const [loggedUsers, setLoggedUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string>(
    `${route?.params?.userFirstName || ''} ${route?.params?.userLastName || ''}`.trim()
  );
  const [currentUserRoleLabel, setCurrentUserRoleLabel] = useState<string>(route?.params?.role || '');
  const [serverAccountType, setServerAccountType] = useState<string | null>(null);
  const [, setCurrentUserDogImageUrl] = useState<string | null>(null);
  const [locationTracking, setLocationTracking] = useState(false);
  const [isLocationSharingEnabled, setIsLocationSharingEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(1);
  const [selectedMarker, setSelectedMarker] = useState<MapSelection>(null);
  const mapRef = useRef<MapView>(null);

  const iosGoogleMapsKey = Constants.expoConfig?.ios?.config?.googleMapsApiKey as string | undefined;
  const useGoogleMapsOnIos =
    Platform.OS === 'ios' && typeof iosGoogleMapsKey === 'string' && iosGoogleMapsKey.trim().length > 0;
  const useGoogleMapsProvider = Platform.OS === 'android' || useGoogleMapsOnIos;
  const useAppleMapsFallback = Platform.OS === 'ios' && !useGoogleMapsOnIos;

  const isWalkerProfile = useMemo(
    () => route?.params?.userRole === 'walker' || serverAccountType === 'DogWalkerUser',
    [route?.params?.userRole, serverAccountType]
  );

  useEffect(() => {
    if (route?.params?.userRole === 'walker') {
      setCurrentUserRoleLabel('דוגווקר');
    }
  }, [route?.params?.userRole]);

  const usersInRadius = loggedUsers.filter((user: any) => {
    if (user.latitude == null || user.longitude == null) return false;
    if (user.distance == null) return true;
    return user.distance <= radiusKm;
  });

  const usersWithLocation = usersInRadius.filter(
    (user: any) => user.latitude != null && user.longitude != null
  );

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

    const refreshInterval = setInterval(() => {
      fetchLoggedUsers({ showLoader: false });
    }, USERS_REFRESH_INTERVAL_MS);

    const initializeLocation = async () => {
      const userId = route?.params?.userId;
      const permissionsGranted = await locationService.requestPermissions();

      if (permissionsGranted) {
        setLocationTracking(true);

        const initialLocation = await locationService.getCurrentLocation();
        if (initialLocation && userId) {
          setUserLocation(initialLocation);
        }

        const success = locationService.startWatchingLocation(
          async (location) => {
            setUserLocation(location);
          },
          (error) => {
            console.error('Location tracking error:', error);
          }
        );

        if (!success) {
          setLocationTracking(false);
        }
      }
    };

    if (route?.params?.userRole !== 'walker') {
      initializeLocation();
    }

    const userId = route?.params?.userId;
    if (userId) {
      const timer = setTimeout(() => {
        connectWebSocket(userId);
      }, 500);

      return () => {
        clearTimeout(timer);
        clearInterval(refreshInterval);
        locationService.stopWatchingLocation();
        websocketService.disconnect();
      };
    }

    return () => {
      clearInterval(refreshInterval);
      locationService.stopWatchingLocation();
      websocketService.disconnect();
    };
  }, [route?.params?.userId, route?.params?.userRole]);

  useEffect(() => {
    if (serverAccountType !== 'DogWalkerUser') {
      return;
    }
    locationService.stopWatchingLocation();
    setLocationTracking(false);
    setIsLocationSharingEnabled(false);
  }, [serverAccountType]);

  const userLocationRef = useRef(userLocation);
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    const userId = route?.params?.userId;
    let locationInterval: ReturnType<typeof setInterval> | null = null;

    if (isWalkerProfile) {
      return;
    }

    if (userId && isLocationSharingEnabled) {
      if (userLocationRef.current) {
        userAPI
          .updateLocation(userId, userLocationRef.current.latitude, userLocationRef.current.longitude)
          .then(() => console.log('📍 Location sent to server'))
          .catch((error) => console.error('Failed to update location:', error));
      }

      locationInterval = setInterval(() => {
        if (userLocationRef.current) {
          userAPI
            .updateLocation(userId, userLocationRef.current.latitude, userLocationRef.current.longitude)
            .catch((error) => console.error('Failed to update location:', error));
        }
      }, LOCATION_PUSH_INTERVAL_MS);
    }

    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, [isLocationSharingEnabled, route?.params?.userId, isWalkerProfile]);

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

  const toggleLocationSharing = async () => {
    if (isWalkerProfile) {
      return;
    }
    const newState = !isLocationSharingEnabled;
    setIsLocationSharingEnabled(newState);

    const userId = route?.params?.userId;
    if (!newState && userId) {
      try {
        await userAPI.clearLocation(userId);
      } catch (error) {
        console.error('Failed to clear location:', error);
      }
    }

    if (userId) {
      profileDirtyUsers.add(userId);
      fetchLoggedUsers({ showLoader: false });
    }
  };

  const connectWebSocket = (userId: string) => {
    websocketService.connect(userId, {
      onConnected: () => {},
      onDisconnected: () => {},
      onPingReceived: (ping: any) => {
        Alert.alert('פינג חדש! 🐕', `${ping.fromUserName} שלח לך פינג!`, [{ text: 'בסדר' }]);
      },
      onError: (error: any) => {
        console.error('WebSocket error:', error);
      },
    });
  };

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
          setServerAccountType(currentUser.type ?? null);
          const resolvedName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
          setCurrentUserDisplayName(
            resolvedName || currentUser.email?.split('@')[0] || route?.params?.userFirstName || 'משתמש'
          );
          setCurrentUserRoleLabel(
            currentUser.type === 'RegularUser'
              ? 'בעל כלב'
              : currentUser.type === 'DogWalkerUser'
                ? 'דוגווקר'
                : 'מנהל'
          );
          setCurrentUserDogImageUrl(
            typeof currentUser.mapDogProfileImageUrl === 'string' && currentUser.mapDogProfileImageUrl
              ? currentUser.mapDogProfileImageUrl
              : null
          );
        }

        const formattedUsers = data.users
          .filter((user: any) => user.id !== currentUserId)
          .map((user: any) => {
            const userObj: any = {
              id: user.id,
              name:
                user.type === 'RegularUser' || user.type === 'DogWalkerUser'
                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                  : `Admin: ${user.email}`,
              role:
                user.type === 'RegularUser'
                  ? 'בעל כלב'
                  : user.type === 'DogWalkerUser'
                    ? 'דוגווקר'
                    : `מנהל (רמה ${user.permissionLevel})`,
              email: user.email,
              type: user.type,
            };

            if (typeof user.mapDogProfileImageUrl === 'string' && user.mapDogProfileImageUrl) {
              userObj.mapDogProfileImageUrl = user.mapDogProfileImageUrl;
            }

            const canHaveLocation =
              (user.type === 'RegularUser' || user.type === 'DogWalkerUser') &&
              user.latitude != null &&
              user.longitude != null;
            if (canHaveLocation) {
              userObj.latitude = user.latitude;
              userObj.longitude = user.longitude;

              if (userLocation) {
                userObj.distance = LocationService.calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  user.latitude,
                  user.longitude
                );
              }
            }

            return userObj;
          });
        const updatedUsersWithDistance = userLocation
          ? formattedUsers.map((user: any) => {
              if (user.latitude != null && user.longitude != null) {
                return {
                  ...user,
                  distance: LocationService.calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    user.latitude,
                    user.longitude
                  ),
                };
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

  const focusOnUser = useCallback((user: any) => {
    if (user.latitude != null && user.longitude != null && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: user.latitude,
          longitude: user.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500
      );
    } else {
      Alert.alert('מיקום לא זמין', 'למשתמש זה אין מיקום פעיל');
    }
  }, []);

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

  const centerOnMyLocation = useCallback(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: WALK_MAP_LAT_DELTA,
          longitudeDelta: WALK_MAP_LNG_DELTA,
        },
        450
      );
    }
  }, [userLocation]);

  const headerBottom = insets.top + HEADER_OVERLAY_HEIGHT;
  const floatingTop = headerBottom + 8;
  const bottomInset = insets.bottom + 16;
  const locateButtonBottom =
    bottomInset + (selectedMarker ? SELECTION_CARD_APPROX_HEIGHT + 16 : 20);

  const renderHeaderOverlay = () => (
    <View style={styles.headerOverlay} pointerEvents="box-none">
      <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFillObject} />
      <View style={[styles.headerTint, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-forward" size={28} color="#5C4033" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>טיולים</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
    </View>
  );

  const renderWalkerPlaceholder = () => (
    <View style={[styles.walkerPlaceholder, { paddingTop: headerBottom + 24 }]}>
      <FontAwesome5 name="walking" size={40} color="#8B7355" />
      <Text style={styles.walkerPlaceholderTitle}>מפה לא זמינה לדוגווקר</Text>
      <Text style={styles.walkerPlaceholderText}>שיתוף מיקום אינו זמין לחשבונות דוגווקר בשלב זה.</Text>
    </View>
  );

  const renderBottomCard = () => {
    if (!selectedMarker || !userLocation) return null;

    if (selectedMarker === 'self') {
      return (
        <View style={[styles.bottomCard, { bottom: bottomInset }]}>
          <Text style={styles.bottomCardTitle}>{currentUserDisplayName || 'משתמש'}</Text>
          <Text style={styles.bottomCardMeta}>
            {currentUserRoleLabel || 'בעל כלב'} · המיקום שלך
          </Text>
          <Text style={styles.bottomCardDistance}>
            שיתוף מיקום: {isLocationSharingEnabled ? 'פעיל למשתמשים אחרים' : 'מוסתר'}
          </Text>
          <TouchableOpacity style={styles.bottomCardSecondary} onPress={centerOnMyLocation} activeOpacity={0.7}>
            <Ionicons name="locate" size={18} color={PRIMARY_COLOR} />
            <Text style={styles.bottomCardSecondaryText}>מרכז מפה עליי</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const { user } = selectedMarker;
    return (
      <View style={[styles.bottomCard, { bottom: bottomInset }]}>
        <Text style={styles.bottomCardTitle}>{user.name}</Text>
        <Text style={styles.bottomCardMeta}>{user.role}</Text>
        {user.distance != null && (
          <Text style={styles.bottomCardDistance}>
            {LocationService.formatDistance(user.distance)} ממך
          </Text>
        )}
        <View style={styles.bottomCardActions}>
          <TouchableOpacity
            style={styles.bottomCardSecondary}
            onPress={() => focusOnUser(user)}
            activeOpacity={0.7}
          >
            <Ionicons name="navigate-outline" size={18} color={PRIMARY_COLOR} />
            <Text style={styles.bottomCardSecondaryText}>התמקד במפה</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pingButton}
            onPress={() => handlePing(user.id, user.name)}
            activeOpacity={0.7}
          >
            <Text style={styles.pingText}>פינג</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isWalkerProfile) {
    return (
      <View style={styles.root}>
        {renderWalkerPlaceholder()}
        {renderHeaderOverlay()}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {userLocation ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={useGoogleMapsProvider ? PROVIDER_GOOGLE : undefined}
          customMapStyle={useGoogleMapsProvider ? dogMateMapStyle : undefined}
          mapType={useAppleMapsFallback ? 'mutedStandard' : 'standard'}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: WALK_MAP_LAT_DELTA,
            longitudeDelta: WALK_MAP_LNG_DELTA,
          }}
          showsUserLocation
          showsMyLocationButton={false}
          showsPointsOfInterest={useAppleMapsFallback ? false : true}
          toolbarEnabled={false}
          zoomEnabled
          scrollEnabled
          rotateEnabled={false}
          onPress={() => setSelectedMarker(null)}
        >
          <Circle
            center={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            radius={radiusKm * 1000}
            strokeColor="rgba(127, 176, 105, 0.85)"
            fillColor="rgba(127, 176, 105, 0.14)"
            strokeWidth={2}
          />

          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            onPress={() => setSelectedMarker('self')}
            tracksViewChanges={false}
          >
            <View style={styles.invisibleSelfHitTarget} />
          </Marker>

          {usersWithLocation.map((user: any) => (
            <Marker
              key={user.id}
              coordinate={{
                latitude: user.latitude,
                longitude: user.longitude,
              }}
              onPress={() => {
                setSelectedMarker({ kind: 'other', user });
              }}
              tracksViewChanges={false}
            >
              <MapMarkerAvatar uri={user.mapDogProfileImageUrl} size={MARKER_SIZE - 2} />
            </Marker>
          ))}
        </MapView>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.mapPlaceholderFull]}>
          <Ionicons name="location-outline" size={56} color="#8B7355" />
          <Text style={styles.mapPlaceholderText}>
            {locationTracking ? 'מביא מיקום...' : 'מעקב מיקום מושבת'}
          </Text>
        </View>
      )}

      {renderHeaderOverlay()}

      {userLocation && (
        <>
          <View
            style={[
              styles.floatingRangeCard,
              {
                top: floatingTop,
                left: 16,
                right: 100,
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.radiusHeader}>
              <Ionicons name="radio-button-on" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.radiusTitle} numberOfLines={2}>
                טווח חיפוש מקסימלי:{' '}
                {radiusKm >= 1 ? `${radiusKm} ק"מ` : `${Math.round(radiusKm * 1000)} מ'`}
              </Text>
            </View>
            <Text style={styles.usersInRadiusCount}>
              {usersInRadius.length} משתמשים בטווח
            </Text>
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
              <Text style={styles.radiusLabelText}>5 ק"מ</Text>
              <Text style={styles.radiusLabelText}>50 מ'</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.floatingShareChip,
              isLocationSharingEnabled ? styles.floatingShareChipOff : styles.floatingShareChipOn,
              {
                top: floatingTop,
                right: 16,
                zIndex: 16,
              },
            ]}
            onPress={toggleLocationSharing}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={isLocationSharingEnabled ? 'הסתר מיקום' : 'שתף מיקום'}
          >
            <Ionicons
              name={isLocationSharingEnabled ? 'eye-off' : 'eye'}
              size={22}
              color={isLocationSharingEnabled ? '#5C4033' : '#fff'}
            />
            <Text
              style={[
                styles.floatingShareChipText,
                isLocationSharingEnabled ? styles.floatingShareChipTextMuted : styles.floatingShareChipTextLight,
              ]}
            >
              {isLocationSharingEnabled ? 'מוסתר' : 'שיתוף'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.floatingLocateButton,
              {
                bottom: locateButtonBottom,
                right: 16,
              },
            ]}
            onPress={centerOnMyLocation}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="מרכז אותי"
          >
            <Ionicons name="locate" size={26} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </>
      )}

      {renderBottomCard()}

      {isLoadingUsers && (
        <View style={[styles.loadingOverlay, { top: headerBottom }]}>
          <ActivityIndicator color={PRIMARY_COLOR} size="small" />
        </View>
      )}
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAEFDD',
  },

  walkerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  walkerPlaceholderTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'center',
  },
  walkerPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
  },

  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(92, 64, 51, 0.1)',
  },

  headerTint: {
    backgroundColor: 'rgba(250, 239, 221, 0.48)',
  },

  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    minHeight: HEADER_OVERLAY_HEIGHT - 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
  },

  floatingRangeCard: {
    position: 'absolute',
    zIndex: 15,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#5C4033',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 9,
  },

  invisibleSelfHitTarget: {
    width: 48,
    height: 48,
    opacity: 0,
  },

  radiusHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },

  radiusTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5C4033',
    marginRight: 8,
    textAlign: 'right',
    flex: 1,
  },

  usersInRadiusCount: {
    fontSize: 11,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 6,
  },

  radiusSlider: {
    width: '100%',
    height: 36,
  },

  radiusLabels: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 2,
  },

  radiusLabelText: {
    fontSize: 10,
    color: '#8B7355',
  },

  floatingShareChip: {
    position: 'absolute',
    zIndex: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 5,
  },

  floatingShareChipOn: {
    backgroundColor: PRIMARY_COLOR,
  },

  floatingShareChipOff: {
    backgroundColor: '#fff',
  },

  floatingShareChipText: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 8,
  },

  floatingShareChipTextLight: {
    color: '#fff',
  },

  floatingShareChipTextMuted: {
    color: '#5C4033',
  },

  floatingLocateButton: {
    position: 'absolute',
    zIndex: 17,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FAEFDD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },

  mapPlaceholderFull: {
    backgroundColor: '#faf0e6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  mapPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  bottomCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    zIndex: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 10,
  },

  bottomCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'right',
  },

  bottomCardMeta: {
    marginTop: 4,
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'right',
  },

  bottomCardDistance: {
    marginTop: 8,
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    textAlign: 'right',
  },

  bottomCardActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 10,
  },

  bottomCardSecondary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  bottomCardSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },

  pingButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
  },

  pingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  loadingOverlay: {
    position: 'absolute',
    right: 16,
    zIndex: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 8,
  },
});
