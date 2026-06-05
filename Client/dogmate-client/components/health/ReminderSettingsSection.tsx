import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type {
  FoodNotificationSettings,
  MedicationFrequencyType,
  MedicationNotificationSettings,
  VaccinationNotificationSettings,
} from '../../types/notifications';

const PRIMARY_COLOR = '#7FB069';
const TEXT_DARK = '#5C4033';
const BORDER_COLOR = '#E0D5C7';
const CARD_BG = '#FFFFFF';

type Props =
  | {
      variant: 'medication';
      value: MedicationNotificationSettings;
      onChange: (value: MedicationNotificationSettings) => void;
      disabled?: boolean;
    }
  | {
      variant: 'vaccination';
      value: VaccinationNotificationSettings;
      onChange: (value: VaccinationNotificationSettings) => void;
      disabled?: boolean;
    }
  | {
      variant: 'food';
      value: FoodNotificationSettings;
      onChange: (value: FoodNotificationSettings) => void;
      disabled?: boolean;
    };

const FREQUENCY_OPTIONS: { id: MedicationFrequencyType; label: string }[] = [
  { id: 'HOURLY', label: 'כל X שעות' },
  { id: 'DAILY', label: 'יומי' },
  { id: 'EVERY_X_DAYS', label: 'פעם ב-X ימים' },
];

const VACCINATION_LEAD_OPTIONS = [14, 7, 3, 1];

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function parseTimeToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 8, m || 0, 0, 0);
  return d;
}

const ReminderSettingsSection = (props: Props) => {
  const disabled = props.disabled ?? false;
  const [showTimePicker, setShowTimePicker] = useState(false);

  const renderMedication = (value: MedicationNotificationSettings, onChange: (v: MedicationNotificationSettings) => void) => {
    const timeDate = parseTimeToDate(value.scheduleTimes.split(',')[0] || '08:00');
    return (
      <>
        <View style={styles.frequencyRow}>
          {FREQUENCY_OPTIONS.map((opt) => {
            const selected = value.frequencyType === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => onChange({ ...value, frequencyType: opt.id })}
                disabled={disabled || !value.notificationEnabled}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.inputRow}
          onPress={() => setShowTimePicker(true)}
          disabled={disabled || !value.notificationEnabled}
        >
          <Ionicons name="time-outline" size={20} color="#8B7355" />
          <Text style={styles.inputText}>{value.scheduleTimes || '08:00'}</Text>
        </TouchableOpacity>

        {(value.frequencyType === 'HOURLY' || value.frequencyType === 'EVERY_X_DAYS') && (
          <View style={styles.intervalRow}>
            <Text style={styles.intervalLabel}>
              {value.frequencyType === 'HOURLY' ? 'כל כמה שעות?' : 'כל כמה ימים?'}
            </Text>
            <TextInput
              style={styles.intervalInput}
              keyboardType="number-pad"
              value={String(value.frequencyInterval)}
              onChangeText={(text) => {
                const n = Math.max(1, parseInt(text || '1', 10) || 1);
                onChange({ ...value, frequencyInterval: n });
              }}
              editable={!disabled && value.notificationEnabled}
              textAlign="center"
            />
          </View>
        )}

        {showTimePicker && (
          Platform.OS === 'ios' ? (
            <Modal transparent animationType="slide" visible onRequestClose={() => setShowTimePicker(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={styles.modalDone}>סיום</Text>
                  </TouchableOpacity>
                  <DateTimePicker
                    value={timeDate}
                    mode="time"
                    display="spinner"
                    is24Hour
                    onChange={(_, selected) => {
                      if (selected) onChange({ ...value, scheduleTimes: formatTime(selected) });
                    }}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={timeDate}
              mode="time"
              is24Hour
              onChange={(_, selected) => {
                setShowTimePicker(false);
                if (selected) onChange({ ...value, scheduleTimes: formatTime(selected) });
              }}
            />
          )
        )}
      </>
    );
  };

  const renderVaccination = (value: VaccinationNotificationSettings, onChange: (v: VaccinationNotificationSettings) => void) => {
    const selected = new Set(
      (value.remindDaysBefore || '7,1').split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n))
    );
    return (
      <View style={styles.frequencyRow}>
        {VACCINATION_LEAD_OPTIONS.map((days) => {
          const active = selected.has(days);
          return (
            <TouchableOpacity
              key={days}
              style={[styles.chip, active && styles.chipSelected]}
              onPress={() => {
                const next = new Set(selected);
                if (active) next.delete(days);
                else next.add(days);
                const sorted = Array.from(next).sort((a, b) => b - a);
                onChange({ ...value, remindDaysBefore: sorted.length ? sorted.join(',') : '1' });
              }}
              disabled={disabled || !value.notificationEnabled}
            >
              <Text style={[styles.chipText, active && styles.chipTextSelected]}>
                {days === 1 ? 'יום לפני' : `${days} ימים לפני`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderFood = (value: FoodNotificationSettings, onChange: (v: FoodNotificationSettings) => void) => (
    <View style={styles.intervalRow}>
      <Text style={styles.intervalLabel}>התראה כשיש עוד (ימים)</Text>
      <TextInput
        style={styles.intervalInput}
        keyboardType="number-pad"
        value={value.lowStockThresholdDays != null ? String(value.lowStockThresholdDays) : ''}
        onChangeText={(text) => {
          const parsed = parseInt(text, 10);
          onChange({
            ...value,
            lowStockThresholdDays: Number.isNaN(parsed) ? null : Math.max(1, parsed),
          });
        }}
        editable={!disabled && value.notificationEnabled}
        textAlign="center"
        placeholder="7"
        placeholderTextColor="#A9B5C7"
      />
    </View>
  );

  const enabled = props.value.notificationEnabled;
  const setEnabled = (notificationEnabled: boolean) => {
    props.onChange({ ...props.value, notificationEnabled });
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>הגדרות תזכורת</Text>
          <MaterialCommunityIcons name="bell-outline" size={22} color={PRIMARY_COLOR} />
        </View>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          disabled={disabled}
          trackColor={{ false: '#d1d1d1', true: '#B4D6A5' }}
          thumbColor={enabled ? PRIMARY_COLOR : '#f4f3f4'}
        />
      </View>

      {enabled ? (
        <View style={styles.body}>
          {props.variant === 'medication' && renderMedication(props.value, props.onChange)}
          {props.variant === 'vaccination' && renderVaccination(props.value, props.onChange)}
          {props.variant === 'food' && renderFood(props.value, props.onChange)}
        </View>
      ) : (
        <Text style={styles.hint}>הפעל כדי לקבל התראות עבור פריט זה</Text>
      )}
    </View>
  );
};

export default ReminderSettingsSection;

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextWrap: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    marginTop: 14,
  },
  hint: {
    marginTop: 10,
    color: '#8B7355',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 14,
  },
  frequencyRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FAEFDD',
  },
  chipSelected: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  chipText: {
    color: TEXT_DARK,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FAEFDD',
  },
  inputText: {
    fontSize: 16,
    color: TEXT_DARK,
    fontWeight: '600',
  },
  intervalRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  intervalLabel: {
    flex: 1,
    fontSize: 15,
    color: TEXT_DARK,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  intervalInput: {
    width: 72,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingVertical: 8,
    backgroundColor: '#FAEFDD',
    color: TEXT_DARK,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalDone: {
    color: PRIMARY_COLOR,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: 8,
  },
});
