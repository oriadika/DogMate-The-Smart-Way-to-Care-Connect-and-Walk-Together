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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const PRIMARY_COLOR = '#E53935';
const BG_COLOR = '#FAEFDD';
const TEXT_DARK = '#5C4033';


const navigateToVet = async (lat: number, lng: number) => {
  const wazeUrl = `waze://?ll=${lat},${lng}&navigate=yes`;
  const googleMapsUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
  const appleMapsUrl = `http://maps.apple.com/?daddr=${lat},${lng}`;

  if (Platform.OS === 'ios') {
    // Google Maps
    if (await Linking.canOpenURL(googleMapsUrl)) {
      Linking.openURL(googleMapsUrl);
      return;
    }

    // Waze
    if (await Linking.canOpenURL(wazeUrl)) {
      Linking.openURL(wazeUrl);
      return;
    }

    // Apple Maps (fallback)
    Linking.openURL(appleMapsUrl);
  } else {
    // Android
    const url = `geo:${lat},${lng}?q=${lat},${lng}`;
    Linking.openURL(url);
  }
};
const getCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied');
  }

  const location = await Location.getCurrentPositionAsync({});
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

const VETS = [
  { id: '1', name: 'נועם לוי', phone: '050-6234046', lat: 32.0853, lng: 34.7818 },
  { id: '2', name: 'יעל מזרחי', phone: '052-1234567', lat: 32.0853, lng: 34.7818 },
  { id: '3', name: 'תומר אברהמי', phone: '050-9855332', lat: 32.0853, lng: 34.7818 },
  { id: '4', name: 'מיכל רוזן', phone: '053-2767779', lat: 32.0853, lng: 34.7818 },
  { id: '5', name: 'נועה פרץ', phone: '054-8112141', lat: 32.0853, lng: 34.7818 },
];

const SOSScreen = ({ navigation }: any) => {
    const [vets, setVets] = useState<any[]>(VETS);

    useEffect(() => {
    const loadDistances = async () => {
        const me = await getCurrentLocation();

        const updated = VETS.map(v => {
        const km = haversineKm(me.lat, me.lng, v.lat, v.lng);
        return { ...v, distanceKm: km };
        });

        updated.sort((a, b) => a.distanceKm - b.distanceKm);

        setVets(updated);
    };

    loadDistances().catch(console.error);
    }, []);


  const confirmCall = (name: string, phone: string) => {
    Alert.alert(
      'אישור שיחה',
      `האם אתה בטוח שברצונך להתקשר אל ${name}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'התקשר',
          style: 'destructive',
          onPress: () => Linking.openURL(`tel:${phone}`),
        },
      ]
    );
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.left}>
        <MaterialCommunityIcons
          name="account-alert"
          size={28}
          color={PRIMARY_COLOR}
        />
      </View>

      <View style={styles.center}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.phone}>{item.phone}</Text>
        <Text style={styles.distance}>{item.distanceKm !== undefined
        ? `${item.distanceKm.toFixed(1)} ק״מ`
        : 'מחשב מרחק...'}
        </Text>
        
      </View>

     <TouchableOpacity
        style={styles.navigateButton}
        onPress={() => navigateToVet(item.lat, item.lng)}
        >
        <MaterialCommunityIcons name="navigation" size={20} color="#fff" />
    </TouchableOpacity>

      <TouchableOpacity
        style={styles.callButton}
        onPress={() => confirmCall(item.name, item.phone)}
      >
        <Ionicons name="call" size={22} color="#fff" />
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
        <View style={{ width: 28 }} />
      </View>

      {/* Info text */}
      <Text style={styles.infoText}>
        האם הכלב שלך בסכנה או שיש בעיה דחופה?
        בחר למי להתקשר:
      </Text>

      {/* Contacts list */}
      <FlatList
        data={vets}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
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
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: '#8B7355',
  },
  callButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  distance: {
    fontSize: 13,
    color: '#8B7355',
    marginTop: 4,
},
    navigateButton: {
        backgroundColor: '#4A90E2',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    }
});
