import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IsraelCityPicker from '../IsraelCityPicker';
import { DEFAULT_WALKER_LIST_FILTERS, type WalkerListFilters } from '../../utils/walkerListQuery';

const PRIMARY = '#7FB069';
const TEXT_DARK = '#5C4033';
const MUTED = '#8B7355';
const CARD = '#faf0e6';

const WEEKDAYS: { id: number; label: string }[] = [
  { id: 0, label: 'א׳' },
  { id: 1, label: 'ב׳' },
  { id: 2, label: 'ג׳' },
  { id: 3, label: 'ד׳' },
  { id: 4, label: 'ה׳' },
  { id: 5, label: 'ו׳' },
  { id: 6, label: 'ש׳' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  value: WalkerListFilters;
  onApply: (filters: WalkerListFilters) => void;
};

export default function WalkerFiltersModal({ visible, onClose, value, onApply }: Props) {
  const [draft, setDraft] = useState<WalkerListFilters>(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const toggleDay = (id: number) => {
    setDraft((d) => {
      const has = d.selectedWeekdays.includes(id);
      const selectedWeekdays = has
        ? d.selectedWeekdays.filter((x) => x !== id)
        : [...d.selectedWeekdays, id].sort((a, b) => a - b);
      return { ...d, selectedWeekdays };
    });
  };

  const reset = () => {
    setDraft({ ...DEFAULT_WALKER_LIST_FILTERS });
  };

  const apply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView style={styles.safe}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={26} color={TEXT_DARK} />
              </TouchableOpacity>
              <Text style={styles.title}>סינון</Text>
              <View style={{ width: 26 }} />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.cityRow}>
                <Text style={styles.sectionLabel}>עיר</Text>
                {draft.cityName.trim() ? (
                  <TouchableOpacity onPress={() => setDraft((d) => ({ ...d, cityName: '' }))}>
                    <Text style={styles.clearCity}>נקה</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={styles.hint}>השאר ריק לכל הערים</Text>
              <IsraelCityPicker
                value={draft.cityName}
                onChange={(city) => setDraft((d) => ({ ...d, cityName: city }))}
                placeholder="כל הערים"
              />

              <Text style={[styles.sectionLabel, styles.sectionSpaced, styles.priceSectionTitle]}>
                תעריף (₪ — לפי מחיר מוצג בהצעות)
              </Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={styles.input}
                  placeholder="מינ׳"
                  placeholderTextColor={MUTED}
                  keyboardType="number-pad"
                  value={draft.minPrice != null ? String(draft.minPrice) : ''}
                  onChangeText={(t) => {
                    const n = t.trim() === '' ? null : parseInt(t.replace(/[^\d]/g, ''), 10);
                    setDraft((d) => ({
                      ...d,
                      minPrice: n != null && Number.isFinite(n) ? n : null,
                    }));
                  }}
                  textAlign="right"
                />
                <Text style={styles.dash}>–</Text>
                <TextInput
                  style={styles.input}
                  placeholder="מקס׳"
                  placeholderTextColor={MUTED}
                  keyboardType="number-pad"
                  value={draft.maxPrice != null ? String(draft.maxPrice) : ''}
                  onChangeText={(t) => {
                    const n = t.trim() === '' ? null : parseInt(t.replace(/[^\d]/g, ''), 10);
                    setDraft((d) => ({
                      ...d,
                      maxPrice: n != null && Number.isFinite(n) ? n : null,
                    }));
                  }}
                  textAlign="right"
                />
              </View>

              <View style={[styles.switchRow, styles.sectionSpaced]}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.sectionLabel}>זמין עכשיו</Text>
                  <Text style={styles.hint}>לפי ימים ושעות שהוגדרו בפרופיל</Text>
                </View>
                <Switch
                  value={draft.availableNowOnly}
                  onValueChange={(v) => setDraft((d) => ({ ...d, availableNowOnly: v }))}
                  trackColor={{ false: '#ccc', true: PRIMARY }}
                  thumbColor="#fff"
                />
              </View>

              <Text style={[styles.sectionLabel, styles.sectionSpaced]}>ימים בשבוע</Text>
              <Text style={styles.hint}>השאר ריק לכל הימים. בחירה לפחות אחד מהימים שנבחרו</Text>
              <View style={styles.daysRow}>
                {WEEKDAYS.map(({ id, label }) => {
                  const on = draft.selectedWeekdays.includes(id);
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.dayChip, on && styles.dayChipOn]}
                      onPress={() => toggleDay(id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={reset} activeOpacity={0.85}>
                <Text style={styles.secondaryBtnText}>איפוס</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={apply} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>החל סינון</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  safe: {
    maxHeight: '92%',
  },
  card: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    writingDirection: 'rtl',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  cityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearCity: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY,
    writingDirection: 'rtl',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sectionSpaced: {
    marginTop: 16,
  },
  priceSectionTitle: {
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 4,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: TEXT_DARK,
    backgroundColor: '#fff',
  },
  dash: {
    fontSize: 18,
    color: TEXT_DARK,
  },
  switchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchLabelWrap: {
    flex: 1,
  },
  daysRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  dayChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
  },
  dayChipOn: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  dayChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  dayChipTextOn: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0D5C7',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
  },
  secondaryBtnText: {
    color: TEXT_DARK,
    fontWeight: '600',
    fontSize: 16,
  },
});
