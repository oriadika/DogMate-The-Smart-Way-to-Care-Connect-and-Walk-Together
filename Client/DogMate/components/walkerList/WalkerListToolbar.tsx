import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#7FB069';
const TEXT_DARK = '#5C4033';
const BORDER = '#E0D5C7';

type Props = {
  onFilterPress: () => void;
  onSortPress: () => void;
  filterActive: boolean;
};

export default function WalkerListToolbar({ onFilterPress, onSortPress, filterActive }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.btn} onPress={onSortPress} activeOpacity={0.85} accessibilityLabel="מיון">
        <Ionicons name="swap-vertical" size={22} color={TEXT_DARK} />
        <Text style={styles.btnLabel}>מיון</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={onFilterPress} activeOpacity={0.85} accessibilityLabel="סינון">
        <View style={styles.iconWrap}>
          <Ionicons name="options-outline" size={22} color={TEXT_DARK} />
          {filterActive ? <View style={styles.badgeDot} /> : null}
        </View>
        <Text style={styles.btnLabel}>סינון</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#faf0e6',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 12,
  },
  btn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    flex: 1,
    justifyContent: 'center',
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    writingDirection: 'rtl',
  },
  iconWrap: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
});
