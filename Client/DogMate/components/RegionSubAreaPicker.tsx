import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  districtOptionsWithLegacy,
  formatDistrictValueForDisplay,
  type DistrictOption,
} from '../constants/israelRegions';

const TEXT_DARK = '#5C4033';
const BORDER_COLOR = '#E0D5C7';
const BG_CARD = '#fff';
const MUTED = '#8B7355';

function listPanelWidth(): number {
  const w = Dimensions.get('window').width;
  return Math.min(360, Math.max(260, Math.round(w * 0.88)));
}

const LIST_MAX_HEIGHT = Math.min(Dimensions.get('window').height * 0.55, 400);
const MODAL_PANEL_TOP_INSET = 36;

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** inline = בלי מודל נוסף (למודל סינון); modal = ברירת מחדל לפרופיל */
  variant?: 'modal' | 'inline';
};

/**
 * בחירת אזור (8 אפשרויות ברמת high-level) — משותף לפרופיל דוגווקר ולסינון רשימה.
 */
export default function RegionSubAreaPicker({
  value,
  onChange,
  placeholder = 'בחר אזור',
  disabled = false,
  variant = 'modal',
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(false);

  const options = useMemo(() => districtOptionsWithLegacy(value), [value]);
  const panelW = listPanelWidth();

  const closeModal = useCallback(() => setModalVisible(false), []);

  const onPick = useCallback(
    (v: string) => {
      onChange(v);
      closeModal();
      setInlineOpen(false);
    },
    [onChange, closeModal]
  );

  const displayLabel = useMemo(() => {
    const v = value?.trim();
    if (!v) return '';
    return formatDistrictValueForDisplay(v);
  }, [value]);

  const renderRow = (item: DistrictOption) => (
    <TouchableOpacity
      style={styles.regionRow}
      onPress={() => onPick(item.value)}
      activeOpacity={0.7}
    >
      <Text style={styles.regionRowText}>{item.label}</Text>
    </TouchableOpacity>
  );

  if (variant === 'inline') {
    return (
      <View style={styles.pickerRoot}>
        <TouchableOpacity
          style={[styles.dropdown, disabled && styles.dropdownDisabled]}
          onPress={() => !disabled && setInlineOpen((o) => !o)}
          disabled={disabled}
          activeOpacity={0.85}
        >
          <Text
            style={displayLabel ? styles.selectedTextStyle : styles.placeholderStyle}
            numberOfLines={2}
          >
            {displayLabel || placeholder}
          </Text>
          <Ionicons
            name={inlineOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={MUTED}
            style={styles.dropdownChevron}
          />
        </TouchableOpacity>
        {inlineOpen && !disabled ? (
          <ScrollView
            style={styles.inlineScroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {options.map((item) => (
              <View key={item.value}>{renderRow(item)}</View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.pickerRoot}>
      <TouchableOpacity
        style={[styles.dropdown, disabled && styles.dropdownDisabled]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <Text
          style={displayLabel ? styles.selectedTextStyle : styles.placeholderStyle}
          numberOfLines={2}
        >
          {displayLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={MUTED} style={styles.dropdownChevron} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.regionModalOverlay} onPress={closeModal}>
          <Pressable
            style={[
              styles.regionModalPanel,
              {
                width: panelW,
                maxHeight: LIST_MAX_HEIGHT + MODAL_PANEL_TOP_INSET,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={styles.flatList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => renderRow(item)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerRoot: {
    width: '100%',
    alignSelf: 'stretch',
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dropdownDisabled: {
    opacity: 0.55,
  },
  placeholderStyle: {
    flex: 1,
    fontSize: 16,
    color: MUTED,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  selectedTextStyle: {
    flex: 1,
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  dropdownChevron: {
    marginLeft: 4,
  },
  inlineScroll: {
    maxHeight: 260,
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    backgroundColor: BG_CARD,
  },
  regionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  regionModalPanel: {
    backgroundColor: BG_CARD,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  flatList: {
    maxHeight: LIST_MAX_HEIGHT,
    width: '100%',
  },
  regionRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee8df',
    backgroundColor: '#fff',
  },
  regionRowText: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
