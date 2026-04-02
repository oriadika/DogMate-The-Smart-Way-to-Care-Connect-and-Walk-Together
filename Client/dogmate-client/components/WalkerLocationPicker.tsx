import React, { useMemo } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { ISRAEL_REGION_OPTIONS } from '../constants/israelRegions';
import type { LocationType } from '../utils/locationFieldCodec';
import IsraelCityPicker from './IsraelCityPicker';

const PRIMARY_COLOR = '#7FB069';
const TEXT_DARK = '#5C4033';
const BORDER_COLOR = '#E0D5C7';
const BG_CARD = '#fff';
const MUTED = '#8B7355';

function listPanelWidth(): number {
  const w = Dimensions.get('window').width;
  return Math.min(360, Math.max(260, Math.round(w * 0.88)));
}

const LIST_MAX_HEIGHT = 220;
const MODAL_PANEL_TOP_INSET = 36;

function panelMaxHeightRegion(): number {
  return LIST_MAX_HEIGHT + 48;
}

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
  const regionData = useMemo(() => {
    const v = locationValue?.trim();
    if (!v) return ISRAEL_REGION_OPTIONS;
    if (ISRAEL_REGION_OPTIONS.some((d) => d.value === v)) return ISRAEL_REGION_OPTIONS;
    return [{ label: v, value: v }, ...ISRAEL_REGION_OPTIONS];
  }, [locationValue]);

  const panelW = listPanelWidth();
  const panelH = panelMaxHeightRegion();

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
        <View style={styles.pickerRoot}>
          <Dropdown
            style={styles.dropdown}
            containerStyle={[
              styles.dropdownListPanel,
              {
                width: panelW,
                maxWidth: panelW,
                maxHeight: panelH,
                flexGrow: 0,
                marginTop: MODAL_PANEL_TOP_INSET,
              },
            ]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            itemTextStyle={styles.itemTextStyle}
            iconStyle={styles.iconStyle}
            data={regionData}
            search={false}
            maxHeight={LIST_MAX_HEIGHT}
            labelField="label"
            valueField="value"
            placeholder="בחר אזור"
            value={locationValue ? locationValue : null}
            onChange={(item) => onChange({ locationType: 'region', locationValue: item.value })}
            disable={disabled}
            inverted={false}
            keyboardAvoiding
            mode="modal"
            backgroundColor="rgba(0,0,0,0.35)"
            flatListProps={{
              style: { maxHeight: LIST_MAX_HEIGHT, width: panelW },
            }}
          />
        </View>
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
  pickerRoot: {
    width: '100%',
    alignSelf: 'stretch',
  },
  dropdownListPanel: {
    alignSelf: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
    flexShrink: 1,
  },
  dropdown: {
    width: '100%',
    minHeight: 50,
    backgroundColor: BG_CARD,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
  },
  placeholderStyle: {
    fontSize: 16,
    color: MUTED,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  itemTextStyle: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
});
