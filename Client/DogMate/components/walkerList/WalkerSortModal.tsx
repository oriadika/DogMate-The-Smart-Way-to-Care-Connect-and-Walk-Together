import React from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WalkerSortOption } from '../../utils/walkerListQuery';

const PRIMARY = '#7FB069';
const TEXT_DARK = '#5C4033';
const BG = '#FAEFDD';
const CARD = '#faf0e6';

const OPTIONS: { key: WalkerSortOption; label: string }[] = [
  { key: 'price_asc', label: 'מחיר: מהנמוך לגבוה' },
  { key: 'price_desc', label: 'מחיר: מהגבוה לנמוך' },
  { key: 'rating_desc', label: 'דירוג: מהגבוה לנמוך' },
  { key: 'distance_asc', label: 'מרחק: מהקרוב לרחוק' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  value: WalkerSortOption;
  onChange: (v: WalkerSortOption) => void;
  canSortByDistance: boolean;
};

export default function WalkerSortModal({
  visible,
  onClose,
  value,
  onChange,
  canSortByDistance,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView style={styles.safe}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={26} color={TEXT_DARK} />
              </TouchableOpacity>
              <Text style={styles.title}>מיון</Text>
              <View style={{ width: 26 }} />
            </View>
            {OPTIONS.map((opt) => {
              const disabled = opt.key === 'distance_asc' && !canSortByDistance;
              const selected = value === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.option, disabled && styles.optionDisabled, selected && styles.optionSelected]}
                  onPress={() => {
                    if (disabled) return;
                    onChange(opt.key);
                    onClose();
                  }}
                  disabled={disabled}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.optionText, disabled && styles.optionTextDisabled]}>{opt.label}</Text>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color={PRIMARY} /> : null}
                </TouchableOpacity>
              );
            })}
            {canSortByDistance ? null : (
              <Text style={styles.hint}>מיון לפי מרחק דורש אישור מיקום והצגת מיקום דוגווקרים ברשת.</Text>
            )}
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  safe: {
    maxHeight: '90%',
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    writingDirection: 'rtl',
  },
  option: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
  },
  optionSelected: {
    borderColor: PRIMARY,
  },
  optionDisabled: {
    opacity: 0.45,
  },
  optionText: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
    flex: 1,
  },
  optionTextDisabled: {
    color: '#8B7355',
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    color: '#8B7355',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 18,
  },
});
