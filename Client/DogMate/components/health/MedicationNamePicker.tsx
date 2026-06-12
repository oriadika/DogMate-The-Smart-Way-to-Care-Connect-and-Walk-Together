import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
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
  ISRAEL_MEDICATION_OPTIONS,
  type IsraelMedicationKey,
} from '../../constants/israelMedications';

const TEXT_DARK = '#5C4033';
const BORDER_COLOR = '#E0D5C7';
const BG_CARD = '#fff';
const MUTED = '#8B7355';
const PRIMARY_COLOR = '#7FB069';

function listPanelWidth(): number {
  const w = Dimensions.get('window').width;
  return Math.min(360, Math.max(280, Math.round(w * 0.92)));
}

const LIST_MAX_HEIGHT = Math.min(Dimensions.get('window').height * 0.55, 420);

type Props = {
  value: IsraelMedicationKey | null;
  onChange: (key: IsraelMedicationKey) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function MedicationNamePicker({
  value,
  onChange,
  placeholder = 'בחר שם תרופה / טיפול',
  disabled = false,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const panelW = listPanelWidth();

  const closeModal = useCallback(() => setModalVisible(false), []);

  const onPick = useCallback(
    (key: IsraelMedicationKey) => {
      onChange(key);
      closeModal();
    },
    [onChange, closeModal]
  );

  const displayLabel = useMemo(() => {
    if (!value) return '';
    return ISRAEL_MEDICATION_OPTIONS.find((o) => o.key === value)?.label ?? '';
  }, [value]);

  return (
    <View style={styles.pickerRoot}>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <Ionicons name="chevron-down" size={20} color={MUTED} style={styles.triggerChevron} />
        <Text style={[styles.triggerText, !displayLabel && styles.placeholder]} numberOfLines={3}>
          {displayLabel || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.overlay} onPress={closeModal}>
          <Pressable
            style={[styles.panel, { width: panelW }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              style={[styles.listScroll, { maxHeight: LIST_MAX_HEIGHT, width: panelW }]}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              bounces={false}
            >
              {ISRAEL_MEDICATION_OPTIONS.map((item) => {
                const selected = value === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.row, selected && styles.rowSelected]}
                    onPress={() => onPick(item.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.rowText}>{item.label}</Text>
                    {selected ? <Ionicons name="checkmark" size={20} color={PRIMARY_COLOR} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
  trigger: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#faf0e6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  triggerDisabled: { opacity: 0.6 },
  triggerChevron: {
    marginLeft: 4,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  placeholder: { color: '#A9B5C7' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  panel: {
    backgroundColor: BG_CARD,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
    alignSelf: 'center',
  },
  listScroll: {
    width: '100%',
  },
  listContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
    gap: 10,
  },
  rowSelected: { backgroundColor: '#F0F7EC' },
  rowText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 22,
  },
});
