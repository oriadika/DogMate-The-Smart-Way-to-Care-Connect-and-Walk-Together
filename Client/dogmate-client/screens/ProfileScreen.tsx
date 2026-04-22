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
  Modal,
  Pressable,
} from 'react-native';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { userAPI } from '../services/api';
import websocketService, { type PingNotification } from '../services/websocket';
import locationService, { LocationService } from '../services/location';
import { dogMateMapStyle } from '../src/constants/MapStyles';

const PRIMARY_COLOR = '#7FB069'; // Sage green
const USERS_REFRESH_INTERVAL_MS = 5000;
const LOCATION_PUSH_INTERVAL_MS = 5000;
const PENDING_PINGS_REFRESH_INTERVAL_MS = 6000;
const HEADER_OVERLAY_HEIGHT = 56;
const MARKER_SIZE = 46;
const SELECTION_CARD_APPROX_HEIGHT = 168;
/** גובה משוער של כרטיס טווח החיפוש — לסידור שכבות מעליו בלי לשנות את עיצוב הכרטיס */
const RANGE_CARD_APPROX_HEIGHT = 132;

/** זום מסחרי — פירוט רחובות (~0.005) */
const WALK_MAP_LAT_DELTA = 0.005;
const WALK_MAP_LNG_DELTA = 0.005;

/** מרחק מקסימימלי (מטר) כדי לחשב נקודות כ"אותו מיקום" ולפרוס סמנים */
const MAP_MARKER_COINCIDENT_MAX_DISTANCE_M = 14;
/** רדיוס (מטר) שבו מסודרים סמנים סביב מרכז הקבוצה */
const MAP_MARKER_SPREAD_RING_RADIUS_M = 16;
const SELF_MAP_MARKER_ID = '__self__';

type MapClusterPoint = { id: string; latitude: number; longitude: number };

function clusterMapPointsByProximity(points: MapClusterPoint[], maxDistM: number): MapClusterPoint[][] {
  const n = points.length;
  if (n === 0) return [];
  const parent = points.map((_, i) => i);
  const find = (i: number): number => {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  };
  const union = (i: number, j: number) => {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = LocationService.calculateDistance(
        points[i].latitude,
        points[i].longitude,
        points[j].latitude,
        points[j].longitude
      );
      if (d <= maxDistM) union(i, j);
    }
  }
  const byRoot = new Map<number, MapClusterPoint[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    const arr = byRoot.get(r) ?? [];
    arr.push(points[i]);
    byRoot.set(r, arr);
  }
  return [...byRoot.values()];
}

function offsetMetersToLatLng(
  latRef: number,
  lngRef: number,
  northM: number,
  eastM: number
): { latitude: number; longitude: number } {
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((latRef * Math.PI) / 180);
  const safeLngScale = Math.max(Math.abs(metersPerDegLng), 1e-6);
  return {
    latitude: latRef + northM / metersPerDegLat,
    longitude: lngRef + eastM / safeLngScale,
  };
}

/** קואורדינטות תצוגה למפה בלבד — המיקום האמיתי נשמר ב-user / userLocation */
function buildMapMarkerDisplayCoords(
  selfLat: number,
  selfLng: number,
  others: { id: string; latitude: number; longitude: number }[],
  coincidentM: number,
  ringRadiusM: number
): Map<string, { latitude: number; longitude: number }> {
  const out = new Map<string, { latitude: number; longitude: number }>();
  const points: MapClusterPoint[] = [
    { id: SELF_MAP_MARKER_ID, latitude: selfLat, longitude: selfLng },
    ...others.map((o) => ({ id: o.id, latitude: o.latitude, longitude: o.longitude })),
  ];
  const clusters = clusterMapPointsByProximity(points, coincidentM);
  for (const cluster of clusters) {
    if (cluster.length <= 1) {
      const p = cluster[0];
      out.set(p.id, { latitude: p.latitude, longitude: p.longitude });
      continue;
    }
    const sorted = [...cluster].sort((a, b) => a.id.localeCompare(b.id));
    const cLat = sorted.reduce((s, p) => s + p.latitude, 0) / sorted.length;
    const cLng = sorted.reduce((s, p) => s + p.longitude, 0) / sorted.length;
    const m = sorted.length;
    const ringR = ringRadiusM * Math.sqrt(Math.max(1, m / 2));
    sorted.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / m - Math.PI / 2;
      const northM = ringR * Math.cos(angle);
      const eastM = ringR * Math.sin(angle);
      out.set(p.id, offsetMetersToLatLng(cLat, cLng, northM, eastM));
    });
  }
  return out;
}

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
        `${u?.id ?? ''}:${u?.latitude ?? ''}:${u?.longitude ?? ''}:${u?.name ?? ''}:${u?.mapDogProfileImageUrl ?? ''}:${u?.mapDogName ?? ''}:${u?.mapDogBreed ?? ''}:${u?.mapDogAgeYears ?? ''}`
    )
    .join('|');
  return `${users.length}#${usersPart}`;
};

function formatDogAgeLine(user: any): string | null {
  const yearsRaw = user?.mapDogAgeYears;
  const years = Number(yearsRaw);
  if (Number.isFinite(years) && years > 0) {
    return `${Math.floor(years)} שנים`;
  }

  const birthdateRaw = user?.mapDogBirthdate;
  if (typeof birthdateRaw === 'string' && birthdateRaw.trim().length > 0) {
    const birth = new Date(birthdateRaw);
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date();
      let months =
        (now.getFullYear() - birth.getFullYear()) * 12 +
        (now.getMonth() - birth.getMonth());
      if (now.getDate() < birth.getDate()) {
        months -= 1;
      }
      months = Math.max(0, months);
      if (months < 12) {
        return months === 1 ? 'חודש' : `${months} חודשים`;
      }
      const computedYears = Math.floor(months / 12);
      return `${computedYears} שנים`;
    }
  }
  return null;
}

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
  const [currentUserDogImageUrl, setCurrentUserDogImageUrl] = useState<string | null>(null);
  const [myPingDog, setMyPingDog] = useState<{
    name: string | null;
    breed: string | null;
    ageLabel: string | null;
    imageUrl: string | null;
  }>({ name: null, breed: null, ageLabel: null, imageUrl: null });
  const [meetDetailUser, setMeetDetailUser] = useState<any | null>(null);
  const [incomingMeetInvite, setIncomingMeetInvite] = useState<PingNotification | null>(null);
  const [locationTracking, setLocationTracking] = useState(false);
  /** ברירת מחדל: מיקום גלוי לבעל כלב בטיולים; דוגווקר מהניווט מתחיל מוסתר */
  const [isLocationSharingEnabled, setIsLocationSharingEnabled] = useState(
    () => route?.params?.userRole !== 'walker'
  );
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(0.25);
  const [selectedMarker, setSelectedMarker] = useState<MapSelection>(null);
  const mapRef = useRef<MapView>(null);
  const isFetchingLoggedUsersRef = useRef(false);
  /** MapView onPress נורה גם אחרי לחיצה על Marker — בלי זה המודל נסגר מיד */
  const suppressMeetModalClearUntilRef = useRef(0);

  const iosGoogleMapsKey = Constants.expoConfig?.ios?.config?.googleMapsApiKey as string | undefined;
  const useGoogleMapsOnIos =
    Platform.OS === 'ios' && typeof iosGoogleMapsKey === 'string' && iosGoogleMapsKey.trim().length > 0;
  const useGoogleMapsProvider = Platform.OS === 'android' || useGoogleMapsOnIos;
  const useAppleMapsFallback = Platform.OS === 'ios' && !useGoogleMapsOnIos;

  const isWalkerProfile = useMemo(
    () => route?.params?.userRole === 'walker' || serverAccountType === 'DogWalkerUser',
    [route?.params?.userRole, serverAccountType]
  );

  const fetchPendingMeetInvites = useCallback(async () => {
    const userId = route?.params?.userId;
    if (!userId || incomingMeetInvite) {
      return;
    }
    try {
      const data = await userAPI.getPendingPings(userId);
      const firstPending = data?.pings?.find((p: any) => p?.fromUserId && p?.toUserId);
      if (!firstPending) return;
      setIncomingMeetInvite({
        kind: 'PING',
        pingId: firstPending.id,
        fromUserId: firstPending.fromUserId,
        fromUserName: firstPending.fromUserName || 'משתמש',
        toUserId: firstPending.toUserId,
        dogName: firstPending.dogName ?? null,
        dogBreed: firstPending.dogBreed ?? null,
        dogAgeLabel: firstPending.dogAgeLabel ?? null,
        dogImageUrl: firstPending.dogImageUrl ?? null,
        timestamp: firstPending.createdAt ? Date.parse(firstPending.createdAt) : Date.now(),
      });
      if (firstPending.id) {
        userAPI.markPingAsRead(firstPending.id).catch(() => {});
      }
    } catch {
      // WebSocket is primary; polling keeps delivery reliable if connection drops.
    }
  }, [incomingMeetInvite, route?.params?.userId]);

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

  const mapMarkerDisplayCoords = useMemo(() => {
    if (!isLocationSharingEnabled || !userLocation) {
      return new Map<string, { latitude: number; longitude: number }>();
    }
    const others = usersWithLocation.map((u: any) => ({
      id: String(u.id),
      latitude: u.latitude as number,
      longitude: u.longitude as number,
    }));
    return buildMapMarkerDisplayCoords(
      userLocation.latitude,
      userLocation.longitude,
      others,
      MAP_MARKER_COINCIDENT_MAX_DISTANCE_M,
      MAP_MARKER_SPREAD_RING_RADIUS_M
    );
  }, [isLocationSharingEnabled, userLocation, usersWithLocation]);

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
    const pendingPingsInterval = setInterval(() => {
      fetchPendingMeetInvites();
    }, PENDING_PINGS_REFRESH_INTERVAL_MS);

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
        clearInterval(pendingPingsInterval);
        locationService.stopWatchingLocation();
        websocketService.disconnect();
      };
    }

    return () => {
      clearInterval(refreshInterval);
      clearInterval(pendingPingsInterval);
      locationService.stopWatchingLocation();
      websocketService.disconnect();
    };
  }, [route?.params?.userId, route?.params?.userRole, fetchPendingMeetInvites]);

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
    if (!isLocationSharingEnabled) {
      setSelectedMarker(null);
      setMeetDetailUser(null);
      setIncomingMeetInvite(null);
    }
  }, [isLocationSharingEnabled]);

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
      onPingReceived: (ping: PingNotification) => {
        if (ping.kind === 'MEET_RESPONSE') {
          Alert.alert(
            ping.accepted ? 'הזמנה אושרה' : 'הזמנה נדחתה',
            `${ping.fromUserName || 'משתמש'} ${ping.accepted ? 'אישר/ה את הצעת המפגש' : 'דחה/תה את הצעת המפגש'}.`
          );
          return;
        }
        if (ping.pingId) {
          userAPI.markPingAsRead(ping.pingId).catch(() => {});
        }
        setIncomingMeetInvite(ping);
      },
      onError: (error: any) => {
        console.error('WebSocket error:', error);
      },
    });
  };

  const fetchLoggedUsers = async (options?: { showLoader?: boolean }) => {
    const shouldShowLoader = options?.showLoader ?? true;
    if (isFetchingLoggedUsersRef.current) {
      return;
    }
    isFetchingLoggedUsersRef.current = true;

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
          setMyPingDog({
            name: typeof currentUser.mapDogName === 'string' ? currentUser.mapDogName : null,
            breed: typeof currentUser.mapDogBreed === 'string' ? currentUser.mapDogBreed : null,
            ageLabel: formatDogAgeLine(currentUser),
            imageUrl:
              typeof currentUser.mapDogProfileImageUrl === 'string' && currentUser.mapDogProfileImageUrl
                ? currentUser.mapDogProfileImageUrl
                : null,
          });
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
            if (typeof user.mapDogName === 'string' && user.mapDogName) {
              userObj.mapDogName = user.mapDogName;
            }
            if (typeof user.mapDogBreed === 'string' && user.mapDogBreed) {
              userObj.mapDogBreed = user.mapDogBreed;
            }
            if (user.mapDogAgeYears != null) {
              userObj.mapDogAgeYears = user.mapDogAgeYears;
            }
            if (typeof user.mapDogBirthdate === 'string' && user.mapDogBirthdate) {
              userObj.mapDogBirthdate = user.mapDogBirthdate;
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
      isFetchingLoggedUsersRef.current = false;
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
      const fromUserName = currentUserDisplayName?.trim()
        ? currentUserDisplayName
        : `${route?.params?.userFirstName || ''} ${route?.params?.userLastName || ''}`.trim();

      if (!fromUserId) {
        Alert.alert('שגיאה', 'מזהה משתמש לא נמצא');
        return;
      }

      await userAPI.sendPing({
        fromUserId,
        toUserId,
        fromUserName: fromUserName || 'משתמש',
        dogName: myPingDog.name,
        dogBreed: myPingDog.breed,
        dogAgeLabel: myPingDog.ageLabel,
        dogImageUrl: myPingDog.imageUrl,
      });
      Alert.alert('הצלחה', `נשלחה הזמנת מפגש ל-${toUserName}`);
    } catch (error: any) {
      Alert.alert('שגיאה', error.message || 'שליחת הפינג נכשלה');
      console.error('Ping error:', error);
    }
  };

  const respondToMeetInvite = async (accepted: boolean) => {
    if (!incomingMeetInvite) return;
    const myId = route?.params?.userId as string | undefined;
    if (!myId) {
      Alert.alert('שגיאה', 'מזהה משתמש לא נמצא');
      return;
    }
    try {
      await userAPI.respondToPingMeet({
        originalSenderId: incomingMeetInvite.fromUserId,
        responderId: myId,
        responderName: currentUserDisplayName?.trim() || 'משתמש',
        accepted,
        pingId: incomingMeetInvite.pingId,
      });
      setIncomingMeetInvite(null);
      Alert.alert(accepted ? 'מעולה' : 'בוצע', accepted ? 'שלחת אישור למארח' : 'סירוב נשלח');
    } catch (error: any) {
      Alert.alert('שגיאה', error.message || 'שליחת התגובה נכשלה');
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
  /** הרמה קלה של כרטיס הטווח מעל שפת המסך */
  const RANGE_PANEL_LIFT = 14;
  const rangePanelBottom = bottomInset + RANGE_PANEL_LIFT;
  const selectionCardBottom =
    selectedMarker === 'self'
      ? isLocationSharingEnabled
        ? rangePanelBottom + RANGE_CARD_APPROX_HEIGHT + 12
        : bottomInset
      : bottomInset;

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
        <View style={[styles.bottomCard, { bottom: selectionCardBottom }]}>
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

    return null;
  };

  const renderDogMeetModal = () => {
    const u = meetDetailUser;
    if (!u) return null;
    const ageLine = formatDogAgeLine(u);
    const isWalker = u.type === 'DogWalkerUser';
    const displayDogName = u.mapDogName || (isWalker ? null : 'לא צוין');
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setMeetDetailUser(null)}
      >
        <View style={styles.meetModalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setMeetDetailUser(null)} />
          <View style={styles.meetModalCard}>
            <Text style={styles.meetModalTitle}>פרטי {isWalker ? 'משתמש' : 'כלב'}</Text>
            <View style={styles.meetModalAvatarWrap}>
              <MapMarkerAvatar uri={u.mapDogProfileImageUrl} size={88} />
            </View>
            {!isWalker && (
              <>
                <Text style={styles.meetModalLine}>
                  <Text style={styles.meetModalLabel}>שם: </Text>
                  {displayDogName}
                </Text>
                {!!u.mapDogBreed && (
                  <Text style={styles.meetModalLine}>
                    <Text style={styles.meetModalLabel}>גזע: </Text>
                    {u.mapDogBreed}
                  </Text>
                )}
                {!!ageLine && (
                  <Text style={styles.meetModalLine}>
                    <Text style={styles.meetModalLabel}>גיל: </Text>
                    {ageLine}
                  </Text>
                )}
              </>
            )}
            <Text style={styles.meetModalLine}>
              <Text style={styles.meetModalLabel}>בעלים: </Text>
              {u.name}
            </Text>
            {u.distance != null && (
              <Text style={styles.meetModalMeta}>{LocationService.formatDistance(u.distance)} ממך</Text>
            )}
            {isWalker && (
              <Text style={styles.meetModalMeta}>אין פרטי כלב למסלול דוגווקר</Text>
            )}
            <View style={styles.meetModalActions}>
              <TouchableOpacity
                style={styles.bottomCardSecondary}
                onPress={() => {
                  focusOnUser(u);
                  setMeetDetailUser(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="navigate-outline" size={18} color={PRIMARY_COLOR} />
                <Text style={styles.bottomCardSecondaryText}>התמקד במפה</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pingButton}
                onPress={() => handlePing(u.id, u.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.pingText} numberOfLines={2}>
                  הצעת מפגש
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.meetModalClose} onPress={() => setMeetDetailUser(null)}>
              <Text style={styles.meetModalCloseText}>סגירה</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderIncomingMeetModal = () => {
    const p = incomingMeetInvite;
    if (!p) return null;
    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setIncomingMeetInvite(null)}>
        <View style={styles.meetModalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIncomingMeetInvite(null)} />
          <View style={styles.meetModalCard}>
            <Text style={styles.meetModalTitle}>הצעת מפגש</Text>
            <Text style={styles.meetModalSubtitle}>{p.fromUserName} מזמין/ה אותך למפגש כלבים</Text>
            <View style={styles.meetModalAvatarWrap}>
              {p.dogImageUrl ? (
                <Image source={{ uri: p.dogImageUrl }} style={styles.meetModalDogImage} />
              ) : (
                <View style={styles.meetModalDogImagePlaceholder}>
                  <FontAwesome5 name="paw" size={36} color="#fff" />
                </View>
              )}
            </View>
            {!!p.dogName && (
              <Text style={styles.meetModalLine}>
                <Text style={styles.meetModalLabel}>שם הכלב: </Text>
                {p.dogName}
              </Text>
            )}
            {!!p.dogBreed && (
              <Text style={styles.meetModalLine}>
                <Text style={styles.meetModalLabel}>גזע: </Text>
                {p.dogBreed}
              </Text>
            )}
            {!!p.dogAgeLabel && (
              <Text style={styles.meetModalLine}>
                <Text style={styles.meetModalLabel}>גיל: </Text>
                {p.dogAgeLabel}
              </Text>
            )}
            <View style={styles.meetInviteButtons}>
              <TouchableOpacity
                style={[styles.meetInviteBtn, styles.meetInviteAccept]}
                onPress={() => respondToMeetInvite(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.meetInviteBtnTextLight}>אישור</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.meetInviteBtn, styles.meetInviteDecline]}
                onPress={() => respondToMeetInvite(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.meetInviteBtnTextDark}>סירוב</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsPointsOfInterest={useAppleMapsFallback ? false : true}
          toolbarEnabled={false}
          zoomEnabled
          scrollEnabled
          rotateEnabled={false}
          onPress={() => {
            setSelectedMarker(null);
            if (Date.now() < suppressMeetModalClearUntilRef.current) {
              return;
            }
            setMeetDetailUser(null);
          }}
        >
          {isLocationSharingEnabled && (
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
          )}

          {isLocationSharingEnabled && (
            <Marker
              coordinate={
                mapMarkerDisplayCoords.get(SELF_MAP_MARKER_ID) ?? {
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                }
              }
              onPress={() => {
              setMeetDetailUser(null);
              setSelectedMarker('self');
            }}
              tracksViewChanges={false}
              zIndex={110}
            >
              <MapMarkerAvatar uri={currentUserDogImageUrl} size={MARKER_SIZE - 2} />
            </Marker>
          )}

          {isLocationSharingEnabled &&
            usersWithLocation.map((user: any) => {
              const openOtherUserMeetDetail = () => {
                suppressMeetModalClearUntilRef.current = Date.now() + 450;
                setSelectedMarker(null);
                setMeetDetailUser(user);
              };
              return (
                <Marker
                  key={user.id}
                  coordinate={
                    mapMarkerDisplayCoords.get(String(user.id)) ?? {
                      latitude: user.latitude,
                      longitude: user.longitude,
                    }
                  }
                  onPress={(e: any) => {
                    e?.stopPropagation?.();
                    openOtherUserMeetDetail();
                  }}
                  tracksViewChanges={false}
                  zIndex={100}
                >
                  <Pressable
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      openOtherUserMeetDetail();
                    }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      user.name ? `פרטי כלב של ${user.name}` : 'פרטי כלב של משתמש אחר'
                    }
                  >
                    <MapMarkerAvatar uri={user.mapDogProfileImageUrl} size={MARKER_SIZE - 2} />
                  </Pressable>
                </Marker>
              );
            })}
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
          {isLocationSharingEnabled && (
            <View
              style={[
                styles.floatingRangeCard,
                {
                  bottom: rangePanelBottom,
                  left: 16,
                  right: 16,
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
                maximumValue={1}
                step={0.05}
                value={radiusKm}
                onValueChange={(value) => setRadiusKm(Math.round(value * 100) / 100)}
                minimumTrackTintColor={PRIMARY_COLOR}
                maximumTrackTintColor="#E0D5C7"
                thumbTintColor={PRIMARY_COLOR}
              />
              <View style={styles.radiusLabels}>
                <Text style={styles.radiusLabelText}>1 ק"מ</Text>
                <Text style={styles.radiusLabelText}>50 מ'</Text>
              </View>
            </View>
          )}

          <View style={[styles.mapTopControlsRow, { top: floatingTop }]} pointerEvents="box-none">
            <TouchableOpacity
              style={[
                styles.floatingShareChip,
                isLocationSharingEnabled ? styles.floatingShareChipOn : styles.floatingShareChipOff,
              ]}
              onPress={toggleLocationSharing}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={
                isLocationSharingEnabled ? 'מיקום גלוי. לחץ להסתרת המיקום' : 'מיקום מוסתר. לחץ לשיתוף המיקום'
              }
            >
              <Ionicons
                name={isLocationSharingEnabled ? 'eye' : 'eye-off'}
                size={22}
                color={isLocationSharingEnabled ? '#fff' : '#5C4033'}
              />
              <Text
                style={[
                  styles.floatingShareChipText,
                  isLocationSharingEnabled ? styles.floatingShareChipTextLight : styles.floatingShareChipTextMuted,
                ]}
              >
                {isLocationSharingEnabled ? 'מיקום גלוי' : 'מיקום מוסתר'}
              </Text>
            </TouchableOpacity>
            {isLocationSharingEnabled ? (
              <TouchableOpacity
                style={styles.floatingLocateButton}
                onPress={centerOnMyLocation}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="מרכז אותי"
              >
                <Ionicons name="locate" size={26} color={PRIMARY_COLOR} />
              </TouchableOpacity>
            ) : (
              <View
                style={styles.hiddenLocationHintWrap}
                pointerEvents="none"
                accessible
                accessibilityRole="text"
                accessibilityLabel=" לשיתוף מיקום לחץ"
              >
                <Ionicons
                  name="arrow-forward"
                  size={22}
                  color="#5C4033"
                  importantForAccessibility="no"
                />
                <Text style={styles.hiddenLocationHintText} numberOfLines={3} importantForAccessibility="no">
                   לשיתוף מיקום לחץ
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {renderBottomCard()}
      {meetDetailUser ? renderDogMeetModal() : null}
      {incomingMeetInvite ? renderIncomingMeetModal() : null}

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

  mapTopControlsRow: {
    position: 'absolute',
    right: 16,
    zIndex: 16,
    // שיתוף צמוד לימין, כפתור מיקום משמאל לו (גם תחת RTL)
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },

  hiddenLocationHintWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    maxWidth: '72%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(250, 239, 221, 0.92)',
    overflow: 'hidden',
  },

  hiddenLocationHintText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#5C4033',
    textAlign: 'right',
  },

  floatingShareChip: {
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
    paddingHorizontal: 14,
    borderRadius: 12,
    maxWidth: '52%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  loadingOverlay: {
    position: 'absolute',
    right: 16,
    zIndex: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 8,
  },

  meetModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  meetModalCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  meetModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'right',
    marginBottom: 8,
  },
  meetModalSubtitle: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'right',
    marginBottom: 10,
    lineHeight: 20,
  },
  meetModalAvatarWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  meetModalLine: {
    fontSize: 15,
    color: '#5C4033',
    textAlign: 'right',
    marginTop: 8,
  },
  meetModalLabel: {
    fontWeight: '700',
    color: '#5C4033',
  },
  meetModalMeta: {
    fontSize: 13,
    color: '#8B7355',
    textAlign: 'right',
    marginTop: 6,
  },
  meetModalActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    gap: 10,
  },
  meetModalClose: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  meetModalCloseText: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
    fontSize: 15,
  },
  meetModalDogImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: PRIMARY_COLOR,
  },
  meetModalDogImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  meetInviteButtons: {
    marginTop: 16,
    gap: 10,
  },
  meetInviteBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  meetInviteAccept: {
    backgroundColor: PRIMARY_COLOR,
  },
  meetInviteDecline: {
    backgroundColor: '#E8DED0',
  },
  meetInviteBtnTextLight: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  meetInviteBtnTextDark: {
    color: '#5C4033',
    fontWeight: '700',
    fontSize: 16,
  },
});
