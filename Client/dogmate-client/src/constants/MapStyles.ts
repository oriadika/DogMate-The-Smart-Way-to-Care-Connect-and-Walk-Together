/**
 * Google Maps custom style — Light & Clean with subtle DogMate brand green.
 * Applies only when MapView uses PROVIDER_GOOGLE (Android default; iOS with API key).
 * @see https://developers.google.com/maps/documentation/javascript/style-reference
 */
import type { MapStyleElement } from 'react-native-maps';

const BRAND_GREEN = '#7FB069';
const BG_LIGHT = '#FAEFDD';
const WATER = '#D4E8F0';
const ROAD_MAJOR = '#F5F0E8';
const ROAD_MINOR = '#FAF7F2';
const PARK = '#E2EDD8';
const TEXT = '#5C4033';

export const dogMateMapStyle: MapStyleElement[] = [
  { featureType: 'all', elementType: 'geometry', stylers: [{ color: BG_LIGHT }] },
  { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: TEXT }, { lightness: 25 }] },
  { featureType: 'all', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { lightness: 100 }] },

  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: WATER }] },
  { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },

  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: BG_LIGHT }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: PARK }] },
  { featureType: 'landscape.natural.landcover', elementType: 'geometry', stylers: [{ color: PARK }] },

  { featureType: 'park', elementType: 'geometry', stylers: [{ color: PARK }] },
  { featureType: 'park', elementType: 'labels', stylers: [{ visibility: 'on' }] },

  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: ROAD_MAJOR }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#E0D5C7' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: ROAD_MAJOR }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: ROAD_MINOR }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: TEXT }] },

  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#E8E4DC' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },

  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'simplified' }] },

  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: TEXT }] },

  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  {
    featureType: 'landscape',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: PARK }, { saturation: 5 }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: BRAND_GREEN }, { lightness: -15 }],
  },
];
