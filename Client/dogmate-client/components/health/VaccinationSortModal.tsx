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

const PRIMARY = '#7FB069';
const TEXT_DARK = '#5C4033';
const CARD = '#faf0e6';

export type VaccinationSortOption = 'date_desc' | 'date_asc';

const OPTIONS: { key: VaccinationSortOption; label: string }[] = [
  { key: 'date_desc', label: 'חיסון אחרון: מהעדכני למוקדם' },
  { key: 'date_asc', label: 'חיסון אחרון: מהמוקדם לעדכני' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  value: VaccinationSortOption;
  onChange: (v: VaccinationSortOption) => void;
};

export default function VaccinationSortModal({ visible, onClose, value, onChange }: Props) {
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
              const selected = value === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => {
                    onChange(opt.key);
                    onClose();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.optionText}>{opt.label}</Text>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color={PRIMARY} /> : null}
                </TouchableOpacity>
              );
            })}
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
  optionText: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
    flex: 1,
  },
});
