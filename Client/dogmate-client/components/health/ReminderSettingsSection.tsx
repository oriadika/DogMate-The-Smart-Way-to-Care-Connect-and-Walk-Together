import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type {
  FoodNotificationSettings,
  MedicationNotificationSettings,
  VaccinationNotificationSettings,
} from '../../types/notifications';
import {
  buildFoodReminderDescription,
  buildFoodReminderTitle,
  computeFoodLowStockReminderAt,
  foodReminderCountdownSubtext,
  formatReminderDateTime,
} from '../../utils/foodReminderPreview';
import type { RemindBeforeUnit } from '../../types/notifications';
import {
  buildMedicationReminderDescription,
  buildMedicationReminderTitle,
  computeMedicationReminderAt,
  REMIND_BEFORE_UNIT_LABELS,
} from '../../utils/medicationReminderPreview';
import {
  buildVaccinationReminderDescription,
  buildVaccinationReminderTitle,
  computeVaccinationReminderAt,
} from '../../utils/vaccinationReminderPreview';

type LinkedReminderPreview = {
  title: string;
  description: string;
  remindAt: Date;
};

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
      previewContext?: {
        nextDueDate: Date | null;
        nextDueTime: string;
        medicationName: string;
        dogName: string;
      };
      linkedReminder?: LinkedReminderPreview | null;
    }
  | {
      variant: 'vaccination';
      value: VaccinationNotificationSettings;
      onChange: (value: VaccinationNotificationSettings) => void;
      disabled?: boolean;
      previewContext?: {
        nextDueDate: Date | null;
        vaccineName: string;
        dogName: string;
      };
      linkedReminder?: LinkedReminderPreview | null;
    }
  | {
      variant: 'food';
      value: FoodNotificationSettings;
      onChange: (value: FoodNotificationSettings) => void;
      disabled?: boolean;
      previewContext?: {
        currentKg: number;
        dailyGrams: number;
        dogNames: string[];
      };
      /** Live FOOD reminder from the server — used when inventory settings match the saved state. */
      linkedReminder?: LinkedReminderPreview | null;
    };

const ReminderSettingsSection = (props: Props) => {
  const disabled = props.disabled ?? false;

  const renderPreviewCard = (
    title: string,
    description: string,
    triggerAt: Date,
    emptyHint: string,
    showEmpty: boolean
  ) => {
    if (!triggerAt) {
      return showEmpty ? <Text style={styles.foodHint}>{emptyHint}</Text> : null;
    }
    return (
      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>{title}</Text>
          <MaterialCommunityIcons name="bell-ring-outline" size={18} color={PRIMARY_COLOR} />
        </View>
        <Text style={styles.previewDescription}>{description}</Text>
        <Text style={styles.previewMeta}>{formatReminderDateTime(triggerAt)}</Text>
        <Text style={styles.previewCountdown}>{foodReminderCountdownSubtext(triggerAt)}</Text>
      </View>
    );
  };

  const renderDaysBeforeField = (
    label: string,
    days: number | null,
    onDaysChange: (days: number | null) => void,
    emptyPreviewHint: string,
    previewTitle: string,
    previewDescription: string,
    triggerAt: Date | null,
    showPreview: boolean
  ) => (
    <>
      <Text style={styles.foodHint}>
        התזכורת תופיע אוטומטית בדף הבית עם תאריך, שעה וספירה לאחור — כמו תזכורת רגילה.
      </Text>
      <View style={styles.intervalRow}>
        <Text style={styles.intervalLabel}>{label}</Text>
        <TextInput
          style={styles.intervalInput}
          keyboardType="number-pad"
          value={days != null ? String(days) : ''}
          onChangeText={(text) => {
            const parsed = parseInt(text, 10);
            onDaysChange(Number.isNaN(parsed) ? null : Math.max(1, parsed));
          }}
          editable={!disabled}
          textAlign="center"
          placeholder="7"
          placeholderTextColor="#A9B5C7"
        />
      </View>
      {triggerAt
        ? renderPreviewCard(previewTitle, previewDescription, triggerAt, '', false)
        : showPreview ? (
            <Text style={styles.foodHint}>{emptyPreviewHint}</Text>
          ) : null}
    </>
  );

  const renderMedicationLeadTimeField = (
    value: MedicationNotificationSettings,
    onChange: (v: MedicationNotificationSettings) => void,
    previewContext?: {
      nextDueDate: Date | null;
      nextDueTime: string;
      medicationName: string;
      dogName: string;
    },
    linkedReminder?: LinkedReminderPreview | null
  ) => {
    const units: RemindBeforeUnit[] = ['DAYS', 'HOURS', 'MINUTES'];
    const canComputePreview =
      previewContext?.nextDueDate != null &&
      value.remindBeforeValue != null &&
      value.remindBeforeValue > 0;
    const computedTriggerAt = canComputePreview
      ? computeMedicationReminderAt(
          previewContext!.nextDueDate,
          previewContext!.nextDueTime,
          value.remindBeforeValue,
          value.remindBeforeUnit
        )
      : null;
    const triggerAt = computedTriggerAt ?? linkedReminder?.remindAt ?? null;
    const previewTitle = previewContext
      ? buildMedicationReminderTitle(previewContext.medicationName)
      : linkedReminder?.title ?? '';
    const previewDescription = previewContext
      ? buildMedicationReminderDescription(previewContext.medicationName, previewContext.dogName)
      : linkedReminder?.description ?? '';

    return (
      <>
        <Text style={styles.foodHint}>
          התזכורת תופיע אוטומטית בדף הבית עם תאריך, שעה וספירה לאחור — כמו תזכורת רגילה.
        </Text>
        <Text style={styles.intervalLabel}>כמה זמן לפני מתן התרופה הבאה לתזכר?</Text>
        <View style={styles.frequencyRow}>
          {units.map((unit) => {
            const selected = value.remindBeforeUnit === unit;
            return (
              <TouchableOpacity
                key={unit}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => onChange({ ...value, remindBeforeUnit: unit })}
                disabled={disabled}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {REMIND_BEFORE_UNIT_LABELS[unit]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.intervalRow}>
          <Text style={styles.intervalLabel}>כמות</Text>
          <TextInput
            style={styles.intervalInput}
            keyboardType="number-pad"
            value={value.remindBeforeValue != null ? String(value.remindBeforeValue) : ''}
            onChangeText={(text) => {
              const parsed = parseInt(text, 10);
              onChange({
                ...value,
                remindBeforeValue: Number.isNaN(parsed) ? null : Math.max(1, parsed),
              });
            }}
            editable={!disabled}
            textAlign="center"
            placeholder="7"
            placeholderTextColor="#A9B5C7"
          />
        </View>
        {triggerAt ? (
          <View key={`med-preview-${triggerAt.getTime()}-${value.remindBeforeValue}-${value.remindBeforeUnit}`}>
            {renderPreviewCard(previewTitle, previewDescription, triggerAt, '', false)}
          </View>
        ) : value.notificationEnabled ? (
          <Text style={styles.foodHint}>
            הגדר תאריך ושעת מנה הבאה כדי לראות תצוגה מקדימה של התזכורת.
          </Text>
        ) : null}
      </>
    );
  };

  const renderVaccination = (
    value: VaccinationNotificationSettings,
    onChange: (v: VaccinationNotificationSettings) => void,
    previewContext?: {
      nextDueDate: Date | null;
      vaccineName: string;
      dogName: string;
    },
    linkedReminder?: LinkedReminderPreview | null
  ) => {
    const computedTriggerAt =
      previewContext?.nextDueDate && value.remindDaysBefore
        ? computeVaccinationReminderAt(previewContext.nextDueDate, value.remindDaysBefore)
        : null;
    const triggerAt = linkedReminder?.remindAt ?? computedTriggerAt;
    const previewTitle =
      linkedReminder?.title ??
      (previewContext ? buildVaccinationReminderTitle(previewContext.vaccineName) : '');
    const previewDescription =
      linkedReminder?.description ??
      (previewContext
        ? buildVaccinationReminderDescription(previewContext.vaccineName, previewContext.dogName)
        : '');

    return renderDaysBeforeField(
      'כמה ימים לפני החיסון לתזכר?',
      value.remindDaysBefore,
      (remindDaysBefore) => onChange({ ...value, remindDaysBefore }),
      'הגדר תאריך חיסון הבא כדי לראות תצוגה מקדימה של התזכורת.',
      previewTitle,
      previewDescription,
      triggerAt,
      value.notificationEnabled
    );
  };

  const renderFood = (
    value: FoodNotificationSettings,
    onChange: (v: FoodNotificationSettings) => void,
    previewContext?: {
      currentKg: number;
      dailyGrams: number;
      dogNames: string[];
    },
    linkedReminder?: {
      title: string;
      description: string;
      remindAt: Date;
    } | null
  ) => {
    const daysRemaining =
      previewContext && previewContext.dailyGrams > 0
        ? Math.floor((previewContext.currentKg * 1000) / previewContext.dailyGrams)
        : null;
    const computedTriggerAt =
      previewContext && value.lowStockThresholdDays
        ? computeFoodLowStockReminderAt(
            previewContext.currentKg,
            previewContext.dailyGrams,
            value.lowStockThresholdDays
          )
        : null;
    const triggerAt = linkedReminder?.remindAt ?? computedTriggerAt;
    const previewTitle = linkedReminder?.title ?? (previewContext ? buildFoodReminderTitle(previewContext.dogNames) : '');
    const previewDescription =
      linkedReminder?.description ??
      (previewContext ? buildFoodReminderDescription(previewContext.dogNames) : '');

    return (
      <>
        <Text style={styles.foodHint}>
          התזכורת תופיע אוטומטית בדף הבית עם תאריך, שעה וספירה לאחור — כמו תזכורת רגילה.
        </Text>
        <View style={styles.intervalRow}>
          <Text style={styles.intervalLabel}>כמה ימים לפני סיום השק לתזכר?</Text>
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

        {previewContext && value.lowStockThresholdDays && daysRemaining != null && triggerAt ? (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{previewTitle}</Text>
              <MaterialCommunityIcons name="bell-ring-outline" size={18} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.previewDescription}>{previewDescription}</Text>
            <Text style={styles.previewMeta}>{formatReminderDateTime(triggerAt)}</Text>
            <Text style={styles.previewCountdown}>{foodReminderCountdownSubtext(triggerAt)}</Text>
          </View>
        ) : value.notificationEnabled ? (
          <Text style={styles.foodHint}>מלא את שדות המלאי כדי לראות תצוגה מקדימה של התזכורת.</Text>
        ) : null}
      </>
    );
  };

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
          {props.variant === 'medication' &&
            renderMedicationLeadTimeField(
              props.value,
              props.onChange,
              props.previewContext,
              props.linkedReminder
            )}
          {props.variant === 'vaccination' &&
            renderVaccination(props.value, props.onChange, props.previewContext, props.linkedReminder)}
          {props.variant === 'food' &&
            renderFood(props.value, props.onChange, props.previewContext, props.linkedReminder)}
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
  foodHint: {
    marginBottom: 10,
    color: '#8B7355',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 14,
    lineHeight: 20,
  },
  previewCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FAEFDD',
  },
  previewHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
    flex: 1,
  },
  previewDescription: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
    marginBottom: 8,
  },
  previewMeta: {
    fontSize: 14,
    color: TEXT_DARK,
    textAlign: 'right',
    fontWeight: '600',
  },
  previewCountdown: {
    marginTop: 4,
    fontSize: 13,
    color: PRIMARY_COLOR,
    textAlign: 'right',
    fontWeight: '600',
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
