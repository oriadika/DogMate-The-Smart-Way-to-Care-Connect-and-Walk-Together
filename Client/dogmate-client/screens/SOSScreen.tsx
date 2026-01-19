import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { GOOGLE_PLACES_API_KEY } from '../services/config';

const PRIMARY_COLOR = '#E53935';
const BG_COLOR = '#FAEFDD';
const TEXT_DARK = '#5C4033';

interface Vet {
  id: string;
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  isOpen?: boolean;
  rating?: number;
}

const navigateToVet = async (lat: number, lng: number, name: string) => {
  const encodedName = encodeURIComponent(name);
  const wazeUrl = `waze://?ll=${lat},${lng}&navigate=yes`;
  const googleMapsUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
  const appleMapsUrl = `http://maps.apple.com/?daddr=${lat},${lng}&dname=${encodedName}`;
  const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  if (Platform.OS === 'ios') {
    // Try Waze first
    if (await Linking.canOpenURL(wazeUrl)) {
      Linking.openURL(wazeUrl);
      return;
    }

    // Then Google Maps
    if (await Linking.canOpenURL(googleMapsUrl)) {
      Linking.openURL(googleMapsUrl);
      return;
    }

    // Apple Maps (fallback)
    Linking.openURL(appleMapsUrl);
  } else {
    // Android - try Waze first, then Google Maps
    if (await Linking.canOpenURL(wazeUrl)) {
      Linking.openURL(wazeUrl);
      return;
    }
    
    // Google Maps web fallback works on Android
    Linking.openURL(googleMapsWebUrl);
  }
};

const getCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  };
};

const toRad = (value: number) => (value * Math.PI) / 180;

const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371; // רדיוס כדור הארץ בק״מ
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // בק״מ
};

// Search for nearby veterinarians using Google Places API
const searchNearbyVets = async (lat: number, lng: number): Promise<Vet[]> => {
  try {
    // Use Google Places Nearby Search API
    const radius = 15000; // 15km search radius
    const type = 'veterinary_care';
    
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&language=he&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      throw new Error(`Places API error: ${data.status}`);
    }
    
    if (!data.results || data.results.length === 0) {
      return [];
    }
    
    // Get detailed info (including phone) for each place
    const vetsWithDetails: Vet[] = await Promise.all(
      data.results.slice(0, 10).map(async (place: any, index: number) => {
        let phone = '';
        
        // Get place details to get phone number
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,international_phone_number&language=he&key=${GOOGLE_PLACES_API_KEY}`;
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();
          
          if (detailsData.result) {
            phone = detailsData.result.formatted_phone_number || 
                    detailsData.result.international_phone_number || 
                    'לא זמין';
          }
        } catch (err) {
          console.log('Could not get phone for', place.name);
        }
        
        const vetLat = place.geometry.location.lat;
        const vetLng = place.geometry.location.lng;
        const distanceKm = haversineKm(lat, lng, vetLat, vetLng);
        
        return {
          id: place.place_id || `vet-${index}`,
          name: place.name,
          phone: phone || 'לא זמין',
          address: place.vicinity || '',
          lat: vetLat,
          lng: vetLng,
          distanceKm,
          isOpen: place.opening_hours?.open_now,
          rating: place.rating,
        };
      })
    );
    
    // Sort by distance and return top 5
    vetsWithDetails.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    return vetsWithDetails.slice(0, 5);
    
  } catch (error) {
    console.error('Error searching for vets:', error);
    throw error;
  }
};

const SOSScreen = ({ navigation }: any) => {
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    const loadNearbyVets = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get user's current location
        const location = await getCurrentLocation();
        setUserLocation(location);
        
        // Search for nearby veterinarians
        const nearbyVets = await searchNearbyVets(location.lat, location.lng);
        
        if (nearbyVets.length === 0) {
          setError('לא נמצאו וטרינרים באזור שלך. נסה להרחיב את החיפוש.');
        } else {
          setVets(nearbyVets);
        }
      } catch (err: any) {
        console.error('Error loading vets:', err);
        if (err.message?.includes('Location permission')) {
          setError('נדרשת הרשאת מיקום כדי למצוא וטרינרים קרובים אליך.');
        } else if (err.message?.includes('Places API')) {
          setError('שגיאה בשירות החיפוש. נסה שוב מאוחר יותר.');
        } else {
          setError('לא ניתן לטעון את רשימת הוטרינרים. בדוק את החיבור לאינטרנט.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadNearbyVets();
  }, []);


  const confirmCall = (name: string, phone: string) => {
    if (phone === 'לא זמין') {
      Alert.alert('טלפון לא זמין', `לא נמצא מספר טלפון עבור ${name}. נסה להשתמש בניווט ולהתקשר ממקום אחר.`);
      return;
    }
    
    // Clean the phone number for dialing
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    
    Alert.alert(
      'אישור שיחה',
      `האם אתה בטוח שברצונך להתקשר אל ${name}?\n${phone}`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'התקשר',
          style: 'destructive',
          onPress: () => Linking.openURL(`tel:${cleanPhone}`),
        },
      ]
    );
  };

  const retrySearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      const nearbyVets = await searchNearbyVets(location.lat, location.lng);
      if (nearbyVets.length === 0) {
        setError('לא נמצאו וטרינרים באזור שלך.');
      } else {
        setVets(nearbyVets);
      }
    } catch (err) {
      setError('לא ניתן לטעון את רשימת הוטרינרים.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Vet }) => (
    <View style={styles.card}>
      <View style={styles.left}>
        <MaterialCommunityIcons
          name="hospital-building"
          size={28}
          color={PRIMARY_COLOR}
        />
      </View>

      <View style={styles.center}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          {item.isOpen !== undefined && (
            <View style={[styles.statusBadge, { backgroundColor: item.isOpen ? '#4CAF50' : '#9E9E9E' }]}>
              <Text style={styles.statusText}>{item.isOpen ? 'פתוח' : 'סגור'}</Text>
            </View>
          )}
        </View>
        
        {item.rating && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#FFC107" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
        
        <Text style={styles.phone}>{item.phone}</Text>
        <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
        <Text style={styles.distance}>
          {item.distanceKm !== undefined
            ? `${item.distanceKm.toFixed(1)} ק״מ ממך`
            : 'מחשב מרחק...'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.navigateButton}
        onPress={() => navigateToVet(item.lat, item.lng, item.name)}
      >
        <MaterialCommunityIcons name="navigation" size={20} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.callButton, item.phone === 'לא זמין' && styles.callButtonDisabled]}
        onPress={() => confirmCall(item.name, item.phone)}
      >
        <Ionicons name="call" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      <Text style={styles.loadingText}>מחפש וטרינרים קרובים...</Text>
      <Text style={styles.loadingSubtext}>זה עשוי לקחת כמה שניות</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerContainer}>
      <MaterialCommunityIcons name="alert-circle-outline" size={60} color={PRIMARY_COLOR} />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={retrySearch}>
        <Text style={styles.retryButtonText}>נסה שוב</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>מצב חירום (SOS)</Text>
        <TouchableOpacity onPress={retrySearch} disabled={loading}>
          <Ionicons name="refresh" size={24} color={loading ? '#ccc' : TEXT_DARK} />
        </TouchableOpacity>
      </View>

      {/* Info text */}
      <Text style={styles.infoText}>
        האם הכלב שלך בסכנה או שיש בעיה דחופה?{'\n'}
        להלן 5 הווטרינרים הקרובים אליך:
      </Text>

      {/* Content */}
      {loading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : (
        <FlatList
          data={vets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Emergency number */}
      <View style={styles.emergencyBanner}>
        <Ionicons name="warning" size={20} color="#fff" />
        <Text style={styles.emergencyText}>במקרה חירום חמור התקשר: 1-700-701-006</Text>
      </View>
    </SafeAreaView>
  );
};

export default SOSScreen;

const SCREEN_WIDTH = Dimensions.get('window').width;
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
    paddingHorizontal: 20,
  },
  header: {
    width: SCREEN_WIDTH * 0.9,
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  infoText: {
    width: SCREEN_WIDTH * 0.9,
    alignSelf: 'center',
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    marginBottom: 20,
    lineHeight: 24,
  },
  card: {
    width: SCREEN_WIDTH * 0.9,
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  left: {
    marginLeft: 12,
  },
  center: {
    flex: 1,
    alignItems: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 13,
    color: '#8B7355',
  },
  phone: {
    fontSize: 14,
    color: '#5C4033',
    fontWeight: '500',
  },
  address: {
    fontSize: 12,
    color: '#8B7355',
    marginTop: 2,
    maxWidth: '100%',
  },
  callButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  callButtonDisabled: {
    backgroundColor: '#ccc',
  },
  distance: {
    fontSize: 13,
    color: '#4A90E2',
    marginTop: 4,
    fontWeight: '600',
  },
  navigateButton: {
    backgroundColor: '#4A90E2',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 18,
    color: TEXT_DARK,
    marginTop: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: TEXT_DARK,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emergencyBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
  },
  emergencyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
