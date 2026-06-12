import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LocationType } from '../utils/locationFieldCodec';
import IsraelCityPicker from './IsraelCityPicker';
import RegionSubAreaPicker from './RegionSubAreaPicker';

const PRIMARY_COLOR = '#7FB069';
const TEXT_DARK = '#5C4033';
const BORDER_COLOR = '#E0D5C7';
const BG_CARD = '#fff';

type Props = {
  locationType: LocationType;
  locationValue: string;
  onChange: (next: { locationType: LocationType; locationValue: string }) => void;
  disabled?: boolean;
};

export default function WalkerLocationPicker({
  locationType,
  locationValue,
  onChange,
  disabled = false,
}: Props) {
  const setTab = (next: LocationType) => {
    if (next === locationType) return;
    onChange({ locationType: next, locationValue: '' });
  };

  return (
    <View style={styles.root}>
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, locationType === 'city' && styles.tabActive]}
          onPress={() => setTab('city')}
          disabled={disabled}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, locationType === 'city' && styles.tabTextActive]}>עיר</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, locationType === 'region' && styles.tabActive]}
          onPress={() => setTab('region')}
          disabled={disabled}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, locationType === 'region' && styles.tabTextActive]}>אזור</Text>
        </TouchableOpacity>
      </View>

      {locationType === 'city' ? (
        <IsraelCityPicker
          value={locationValue}
          onChange={(city) => onChange({ locationType: 'city', locationValue: city })}
          placeholder="בחר עיר"
          disabled={disabled}
        />
      ) : (
        <RegionSubAreaPicker
          value={locationValue}
          onChange={(v) => onChange({ locationType: 'region', locationValue: v })}
          placeholder="בחר אזור"
          disabled={disabled}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignSelf: 'stretch',
    gap: 10,
  },
  tabsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
    backgroundColor: BG_CARD,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  tabTextActive: {
    color: '#fff',
  },
});
