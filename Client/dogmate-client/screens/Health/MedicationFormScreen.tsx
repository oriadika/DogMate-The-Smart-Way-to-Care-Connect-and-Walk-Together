import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { dogAPI, medicationAPI, type MedicationRow } from '../../services/api';
import ReminderSettingsSection from '../../components/health/ReminderSettingsSection';
import {
  DEFAULT_MEDICATION_NOTIFICATION,
  type MedicationNotificationSettings,
} from '../../types/notifications';
import { resyncAllNotifications } from '../../services/notificationScheduler';
import {
  findMedicationReminderForRecord,
  markHomeDataDirty,
  refreshHomeRemindersFromServer,
  shouldForceHomeRefresh,
  type HomeReminderRow,
} from '../../utils/homeDataCache';
import {
  clearMedicationsDirty,
  markMedicationsDirty,
  refreshMedicationsFromServer,
  shouldForceMedicationsRefresh,
} from '../../utils/healthDataCache';
import {
  formatTimeHe,
  parseRemindBeforeUnit,
  parseStoredNextDueTime,
  parseStoredRemindBeforeValue,
} from '../../utils/healthReminderSettings';
import { useScreenLifecycleGuard } from '../../utils/screenLifecycle';
import MedicationNamePicker from '../../components/health/MedicationNamePicker';
import MedicationNameAutocompleteInput from '../../components/health/MedicationNameAutocompleteInput';
import NextDueCycleOptions from '../../components/health/NextDueCycleOptions';
import { getUniqueMedicationNamesForDog } from '../../utils/medicationHistory';
import {
  ISRAEL_MEDICATION_CUSTOM,
  ISRAEL_MEDICATION_OPTIONS,
  computeNextDueDate,
  findMedicationOptionByLabel,
  resolveMedicationKeyFromName,
  type IsraelMedicationKey,
} from '../../constants/israelMedications';

const PRIMARY_COLOR = '#7FB069';
const BG_COLOR = '#FAEFDD';
const TEXT_DARK = '#5C4033';
const BORDER_COLOR = '#E0D5C7';
const CARD_BG = '#faf0e6';

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIsoToLocalDate(iso: string): Date {
  if (!iso) return new Date();
  const head = iso.split('T')[0];
  const parts = head.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? new Date() : t;
}

function formatDateHe(d: Date): string {
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' });
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

type DogOption = { id: string; name: string };

type MedicationFormState = {
  selectedDogId: string | null;
  medicationKey: IsraelMedicationKey | null;
  medicationDetailName: string;
  administeredDate: Date;
  administeredTime: string;
  nextDueDate: Date | null;
  nextDueTime: string;
  nextDueManuallyEdited: boolean;
  noNextCycle: boolean;
  vetClinicName: string;
};

function timeStringToDate(time: string): Date {
  const normalized = parseStoredNextDueTime(time);
  const [hour, minute] = normalized.split(':').map((p) => parseInt(p, 10));
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function dateToTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function initialMedicationFields(storedName: string): Pick<MedicationFormState, 'medicationKey' | 'medicationDetailName'> {
  const trimmed = storedName.trim();
  if (!trimmed) {
    return { medicationKey: null, medicationDetailName: '' };
  }
  const key = resolveMedicationKeyFromName(trimmed);
  if (key === ISRAEL_MEDICATION_CUSTOM) {
    return { medicationKey: key, medicationDetailName: trimmed };
  }
  if (findMedicationOptionByLabel(trimmed)) {
    return { medicationKey: key, medicationDetailName: '' };
  }
  return { medicationKey: key, medicationDetailName: trimmed };
}

function buildStoredMedicationName(_key: IsraelMedicationKey | null, detailName: string): string {
  return detailName.trim();
}

type DatePickerTarget = 'administered' | 'administeredTime' | 'nextDue' | 'nextDueTime';

const isTimePickerTarget = (target: DatePickerTarget | null): boolean =>
  target === 'nextDueTime' || target === 'administeredTime';

const MedicationFormScreen = ({ navigation, route }: any) => {
  const paramUserId = route?.params?.userId as string | undefined;
  const paramMedicationId = route?.params?.medicationId as string | undefined;
  const paramDogId = route?.params?.dogId as string | undefined;
  const paramMedicationName = route?.params?.medicationName as string | undefined;
  const paramAdministeredDate = route?.params?.administeredDate as string | undefined;
  const paramNextDueDate = route?.params?.nextDueDate as string | undefined;
  const paramVetClinicName = route?.params?.vetClinicName as string | undefined;

  const [userId, setUserId] = useState<string | null>(paramUserId ?? null);
  const [medicationId, setMedicationId] = useState<string | null>(paramMedicationId ?? null);
  const [dogs, setDogs] = useState<DogOption[]>([]);
  const [medicationRows, setMedicationRows] = useState<MedicationRow[]>([]);
  const [form, setForm] = useState<MedicationFormState>(() => {
    const medFields = initialMedicationFields(paramMedicationName ?? '');
    return {
      selectedDogId: paramDogId ?? null,
      ...medFields,
      administeredDate: parseIsoToLocalDate(paramAdministeredDate ?? ''),
      administeredTime: dateToTimeString(new Date()),
      nextDueDate: paramNextDueDate ? parseIsoToLocalDate(paramNextDueDate) : null,
      nextDueTime: '09:00',
      nextDueManuallyEdited: Boolean(paramNextDueDate),
      noNextCycle: !paramNextDueDate,
      vetClinicName: paramVetClinicName ?? '',
    };
  });
  const [datePickerTarget, setDatePickerTarget] = useState<DatePickerTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<MedicationNotificationSettings>(
    DEFAULT_MEDICATION_NOTIFICATION
  );
  const [linkedMedicationReminder, setLinkedMedicationReminder] = useState<HomeReminderRow | null>(null);
  const [loadedSyncSnapshot, setLoadedSyncSnapshot] = useState<{
    remindBeforeValue: number | null;
    remindBeforeUnit: string;
    nextDueDate: string | null;
    nextDueTime: string;
  } | null>(null);

  const isEdit = Boolean(medicationId);

  const {
    isMountedRef,
    beginAsyncWork,
    isAsyncWorkCurrent,
    runDeferredBlurCleanup,
  } = useScreenLifecycleGuard();

  const resolvedMedicationName = buildStoredMedicationName(
    form.medicationKey,
    form.medicationDetailName
  );

  const dogMedicationHistory = useMemo(
    () => getUniqueMedicationNamesForDog(medicationRows, form.selectedDogId),
    [medicationRows, form.selectedDogId]
  );

  const selectedDogName =
    dogs.find((d) => d.id === form.selectedDogId)?.name ?? 'כלב';

  const medicationPreviewContext = {
    nextDueDate: form.nextDueDate,
    nextDueTime: form.nextDueTime,
    medicationName: resolvedMedicationName,
    dogName: selectedDogName,
  };

  const linkedReminderPreview = (() => {
    if (!linkedMedicationReminder?.remindAt || !loadedSyncSnapshot) return null;
    const reminderDate = new Date(linkedMedicationReminder.remindAt);
    if (Number.isNaN(reminderDate.getTime())) return null;
    const nextDueIso = form.nextDueDate ? toIsoLocal(form.nextDueDate) : null;
    const unchanged =
      notificationSettings.remindBeforeValue === loadedSyncSnapshot.remindBeforeValue &&
      notificationSettings.remindBeforeUnit === loadedSyncSnapshot.remindBeforeUnit &&
      nextDueIso === loadedSyncSnapshot.nextDueDate &&
      form.nextDueTime === loadedSyncSnapshot.nextDueTime;
    if (!unchanged) return null;
    return {
      title: linkedMedicationReminder.title || '',
      description: linkedMedicationReminder.description || '',
      remindAt: reminderDate,
    };
  })();

  const applyMedicationRow = (existing: MedicationRow) => {
    const medFields = initialMedicationFields(existing.medicationName ?? '');
    setForm({
      selectedDogId: existing.dogId ?? null,
      ...medFields,
      administeredDate: parseIsoToLocalDate(existing.administeredDate ?? ''),
      administeredTime: parseStoredNextDueTime(existing.administeredTime),
      nextDueDate: existing.nextDueDate ? parseIsoToLocalDate(existing.nextDueDate) : null,
      nextDueTime: parseStoredNextDueTime(existing.nextDueTime),
      nextDueManuallyEdited: Boolean(existing.nextDueDate),
      noNextCycle: !existing.nextDueDate,
      vetClinicName: existing.vetClinicName ?? '',
    });
    const nextNotificationSettings = {
      notificationEnabled: existing.notificationEnabled ?? false,
      remindBeforeValue: parseStoredRemindBeforeValue(
        existing.remindBeforeValue,
        existing.remindDaysBefore
      ),
      remindBeforeUnit: parseRemindBeforeUnit(existing.remindBeforeUnit),
    };
    setNotificationSettings(nextNotificationSettings);
    setLoadedSyncSnapshot({
      remindBeforeValue: nextNotificationSettings.remindBeforeValue,
      remindBeforeUnit: nextNotificationSettings.remindBeforeUnit,
      nextDueDate: existing.nextDueDate
        ? toIsoLocal(parseIsoToLocalDate(existing.nextDueDate))
        : null,
      nextDueTime: parseStoredNextDueTime(existing.nextDueTime),
    });
  };

  useEffect(() => {
    if (!isMountedRef.current) return;
    setUserId(paramUserId ?? null);
    if (paramMedicationId) {
      const medFields = initialMedicationFields(paramMedicationName ?? '');
      setMedicationId(paramMedicationId);
      setForm({
        selectedDogId: paramDogId ?? null,
        ...medFields,
        administeredDate: parseIsoToLocalDate(paramAdministeredDate ?? ''),
        administeredTime: dateToTimeString(new Date()),
        nextDueDate: paramNextDueDate ? parseIsoToLocalDate(paramNextDueDate) : null,
        nextDueTime: '09:00',
        nextDueManuallyEdited: Boolean(paramNextDueDate),
        noNextCycle: !paramNextDueDate,
        vetClinicName: paramVetClinicName ?? '',
      });
    } else {
      setMedicationId(null);
      setForm({
        selectedDogId: paramDogId ?? null,
        medicationKey: null,
        medicationDetailName: '',
        administeredDate: new Date(),
        administeredTime: dateToTimeString(new Date()),
        nextDueDate: null,
        nextDueTime: '09:00',
        nextDueManuallyEdited: false,
        noNextCycle: false,
        vetClinicName: '',
      });
    }
  }, [
    paramUserId,
    paramMedicationId,
    paramDogId,
    paramMedicationName,
    paramAdministeredDate,
    paramNextDueDate,
    paramVetClinicName,
    isMountedRef,
  ]);

  const applyAutoNextDue = useCallback(
    (medicationKey: IsraelMedicationKey | null, administeredDate: Date, force = false) => {
      if (!medicationKey) return;
      setForm((prev) => {
        if (!force && (prev.nextDueManuallyEdited || prev.noNextCycle)) return prev;
        const computed = computeNextDueDate(medicationKey, administeredDate);
        return { ...prev, nextDueDate: computed, noNextCycle: false };
      });
    },
    []
  );

  const loadFormData = useCallback(async () => {
    if (!paramUserId) {
      if (isMountedRef.current) {
        setLoading(false);
      }
      return;
    }
    const generation = beginAsyncWork();
    try {
      if (!isAsyncWorkCurrent(generation)) return;
      setLoading(true);
      const forceRefresh =
        shouldForceMedicationsRefresh(paramUserId) || shouldForceHomeRefresh(paramUserId);

      const [dogsRes, meds, reminders] = await Promise.all([
        dogAPI.getDogsForUser(paramUserId),
        forceRefresh
          ? refreshMedicationsFromServer(paramUserId)
          : medicationAPI
              .list(paramUserId)
              .then((r) => (r.medications as MedicationRow[]) ?? [])
              .catch(() => [] as MedicationRow[]),
        refreshHomeRemindersFromServer(paramUserId).catch(
          async () => [] as HomeReminderRow[]
        ),
      ]);
      if (!isAsyncWorkCurrent(generation)) return;
      const list = dogsRes.success && Array.isArray(dogsRes.dogs) ? dogsRes.dogs : [];
      setDogs(
        list.map((d: any) => ({
          id: String(d.id),
          name: d.name || 'כלב',
        }))
      );
      setMedicationRows(meds);
      if (paramMedicationId) {
        const existing = meds.find((m) => m.id === paramMedicationId);
        if (existing) {
          applyMedicationRow(existing);
          setLinkedMedicationReminder(
            findMedicationReminderForRecord(reminders, paramMedicationId)
          );
        }
        if (forceRefresh) {
          clearMedicationsDirty(paramUserId);
        }
      }
      if (!paramMedicationId && list.length === 1) {
        setForm((prev) => ({ ...prev, selectedDogId: String(list[0].id) }));
      }
    } catch (e: any) {
      if (!isAsyncWorkCurrent(generation)) return;
      console.error(e);
      Alert.alert('שגיאה', e?.message || 'לא ניתן לטעון את רשימת הכלבים');
      setDogs([]);
      setMedicationRows([]);
    } finally {
      if (isAsyncWorkCurrent(generation)) {
        setLoading(false);
      }
    }
  }, [paramUserId, paramMedicationId, beginAsyncWork, isAsyncWorkCurrent, isMountedRef]);

  useEffect(() => {
    void loadFormData();
    return () => {
      runDeferredBlurCleanup(() => {
        if (!isMountedRef.current) return;
        setDatePickerTarget(null);
      });
    };
  }, [loadFormData, runDeferredBlurCleanup, isMountedRef]);

  const onMedicationKeyChange = (key: IsraelMedicationKey) => {
    setForm((prev) => ({
      ...prev,
      medicationKey: key,
      nextDueManuallyEdited: false,
      noNextCycle: false,
    }));
    applyAutoNextDue(key, form.administeredDate, true);
  };

  const onAdministeredDateChange = (selectedDate: Date) => {
    setForm((prev) => ({ ...prev, administeredDate: selectedDate }));
    if (!form.nextDueManuallyEdited && !form.noNextCycle && form.medicationKey) {
      applyAutoNextDue(form.medicationKey, selectedDate, true);
    }
  };

  const clearNextDueCycle = () => {
    setForm((prev) => ({
      ...prev,
      nextDueDate: null,
      noNextCycle: true,
      nextDueManuallyEdited: true,
    }));
    setNotificationSettings((prev) => ({ ...prev, notificationEnabled: false }));
  };

  const restoreAutoNextDue = () => {
    setForm((prev) => ({
      ...prev,
      noNextCycle: false,
      nextDueManuallyEdited: false,
    }));
    if (form.medicationKey) {
      applyAutoNextDue(form.medicationKey, form.administeredDate, true);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (!datePickerTarget || isTimePickerTarget(datePickerTarget)) return;
    if (Platform.OS === 'android') {
      setDatePickerTarget(null);
      if (event.type === 'dismissed' || !selectedDate) return;
    }
    if (datePickerTarget === 'administered') {
      onAdministeredDateChange(selectedDate!);
    } else {
      setForm((prev) => ({
        ...prev,
        nextDueDate: selectedDate ?? null,
        nextDueManuallyEdited: true,
        noNextCycle: false,
      }));
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (!isTimePickerTarget(datePickerTarget)) return;
    if (Platform.OS === 'android') {
      setDatePickerTarget(null);
      if (event.type === 'dismissed' || !selectedDate) return;
    }
    const timeStr = dateToTimeString(selectedDate!);
    setForm((prev) => ({
      ...prev,
      ...(datePickerTarget === 'administeredTime'
        ? { administeredTime: timeStr }
        : { nextDueTime: timeStr }),
    }));
  };

  const closeDatePicker = () => setDatePickerTarget(null);

  const activePickerDate = isTimePickerTarget(datePickerTarget)
    ? timeStringToDate(
        datePickerTarget === 'administeredTime' ? form.administeredTime : form.nextDueTime
      )
    : datePickerTarget === 'nextDue'
      ? form.nextDueDate ?? form.administeredDate
      : form.administeredDate;

  const validateForm = (): string | null => {
    if (!form.selectedDogId) return 'נא לבחור כלב';
    if (!form.medicationKey) return 'נא לבחור סוג תרופה / טיפול';
    if (!form.medicationDetailName.trim()) return 'נא להזין שם תרופה';
    if (!resolvedMedicationName) return 'נא להזין שם תרופה';
    if (Number.isNaN(form.administeredDate.getTime())) return 'תאריך התרופה אינו תקין';
    if (startOfDay(form.administeredDate) > startOfDay(new Date())) {
      return 'תאריך התרופה לא יכול להיות בעתיד';
    }
    if (form.nextDueDate && startOfDay(form.nextDueDate) < startOfDay(form.administeredDate)) {
      return 'תאריך המנה הבאה חייב להיות ביום מתן התרופה או אחריו';
    }
    return null;
  };

  const handleSave = async () => {
    if (!userId) {
      Alert.alert('שגיאה', 'לא נמצא משתמש');
      return;
    }
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('שגיאה', validationError);
      return;
    }
    if (
      notificationSettings.notificationEnabled &&
      (notificationSettings.remindBeforeValue == null ||
        notificationSettings.remindBeforeValue <= 0)
    ) {
      Alert.alert('שגיאה', 'יש להגדיר כמה זמן לפני מתן התרופה הבאה תופיע התזכורת בדף הבית');
      return;
    }
    if (notificationSettings.notificationEnabled && !form.nextDueDate) {
      Alert.alert(
        'שגיאה',
        'יש להגדיר תאריך מנה הבאה כדי להפעיל תזכורת, או לבטל את התזכורת לתרופה חד פעמית'
      );
      return;
    }
    const payload = {
      dogId: form.selectedDogId!,
      medicationName: resolvedMedicationName,
      administeredDate: toIsoLocal(form.administeredDate),
      administeredTime: parseStoredNextDueTime(form.administeredTime),
      nextDueDate: form.nextDueDate ? toIsoLocal(form.nextDueDate) : null,
      nextDueTime: form.nextDueDate ? parseStoredNextDueTime(form.nextDueTime) : null,
      vetClinicName: form.vetClinicName.trim() || null,
      notificationEnabled: notificationSettings.notificationEnabled,
      remindBeforeValue: notificationSettings.remindBeforeValue,
      remindBeforeUnit: notificationSettings.remindBeforeUnit,
    };
    try {
      setSaving(true);
      if (isEdit && medicationId) {
        await medicationAPI.update(userId, medicationId, payload);
        await resyncAllNotifications(userId);
        markHomeDataDirty(userId);
        markMedicationsDirty(userId);
        try {
          await Promise.all([
            refreshMedicationsFromServer(userId),
            refreshHomeRemindersFromServer(userId),
          ]);
        } catch (refreshError) {
          console.warn('Failed to refresh caches after medication update:', refreshError);
        }
        Alert.alert('הצלחה', 'התרופה עודכנה', [{ text: 'אישור', onPress: () => navigation.goBack() }]);
      } else {
        await medicationAPI.create(userId, payload);
        await resyncAllNotifications(userId);
        markHomeDataDirty(userId);
        markMedicationsDirty(userId);
        try {
          await refreshHomeRemindersFromServer(userId);
        } catch (refreshError) {
          console.warn('Failed to refresh home after medication create:', refreshError);
        }
        Alert.alert('הצלחה', 'התרופה נשמר', [{ text: 'אישור', onPress: () => navigation.goBack() }]);
      }
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message || 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>טוען...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>{isEdit ? 'עריכת תרופה' : 'הוספת תרופה'}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={28} color={TEXT_DARK} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>בחירת כלב</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dogScroll}
            contentContainerStyle={styles.dogRow}
          >
            {dogs.map((d) => {
              const selected = form.selectedDogId === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.dogChip, selected && styles.dogChipSelected]}
                  onPress={() => setForm((prev) => ({ ...prev, selectedDogId: d.id }))}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.dogChipText, selected && styles.dogChipTextSelected]}>{d.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {dogs.length === 0 ? (
            <Text style={styles.hint}>אין כלבים רשומים. הוסף כלב במסך הבית.</Text>
          ) : null}

          <Text style={styles.label}>סוג תרופה / טיפול</Text>
          <MedicationNamePicker
            value={form.medicationKey}
            onChange={onMedicationKeyChange}
            disabled={saving}
          />

          <Text style={styles.label}>שם התרופה</Text>
          <MedicationNameAutocompleteInput
            value={form.medicationDetailName}
            onChangeText={(text) => setForm((prev) => ({ ...prev, medicationDetailName: text }))}
            suggestions={dogMedicationHistory}
            disabled={saving || !form.selectedDogId}
            placeholder={
              form.selectedDogId
                ? 'הקלד את שם התרופה (חובה)'
                : 'בחר כלב תחילה'
            }
          />

          <Text style={styles.label}>תאריך מתן התרופה / הטיפול</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setDatePickerTarget('administered')}
            activeOpacity={0.7}
            disabled={saving}
          >
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>{formatDateHe(form.administeredDate)}</Text>
              <Ionicons name="calendar-outline" size={22} color="#8B7355" />
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>שעת המנה</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setDatePickerTarget('administeredTime')}
            activeOpacity={0.7}
            disabled={saving}
          >
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>{formatTimeHe(form.administeredTime)}</Text>
              <Ionicons name="time-outline" size={22} color="#8B7355" />
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>תאריך המנה הבאה / חידוש</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setDatePickerTarget('nextDue')}
            activeOpacity={0.7}
            disabled={saving}
          >
            <View style={styles.dateRow}>
              <Text style={[styles.dateText, !form.nextDueDate && styles.datePlaceholder]}>
                {form.nextDueDate ? formatDateHe(form.nextDueDate) : 'לא נקבע — לחץ לבחירה'}
              </Text>
              <Ionicons name="calendar-outline" size={22} color="#8B7355" />
            </View>
          </TouchableOpacity>
          <NextDueCycleOptions
            hasNextDueDate={Boolean(form.nextDueDate)}
            isOneTime={form.noNextCycle}
            onClearNextDue={clearNextDueCycle}
            onRestoreAuto={restoreAutoNextDue}
            showRestoreAuto={
              form.noNextCycle &&
              form.medicationKey != null &&
              form.medicationKey !== ISRAEL_MEDICATION_CUSTOM
            }
            clearLabel="אין מנה הבאה — חד פעמי"
            oneTimeHint="חד פעמי — ללא מנה הבאה"
            disabled={saving}
          />
          {form.medicationKey && !form.nextDueManuallyEdited && !form.noNextCycle ? (
            <Text style={styles.autoHint}>חושב אוטומטית לפי מינון ותדירות — ניתן לעריכה</Text>
          ) : null}

          <Text style={styles.label}>שעת המנה הבאה</Text>
          <TouchableOpacity
            style={[styles.input, !form.nextDueDate && styles.saveDisabled]}
            onPress={() => form.nextDueDate && setDatePickerTarget('nextDueTime')}
            activeOpacity={0.7}
            disabled={saving || !form.nextDueDate}
          >
            <View style={styles.dateRow}>
              <Text style={[styles.dateText, !form.nextDueDate && styles.datePlaceholder]}>
                {form.nextDueDate ? formatTimeHe(form.nextDueTime) : 'הגדר תאריך מנה הבאה תחילה'}
              </Text>
              <Ionicons name="time-outline" size={22} color="#8B7355" />
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>שם הוטרינר / המרפאה</Text>
          <TextInput
            style={styles.input}
            value={form.vetClinicName}
            onChangeText={(text) => setForm((prev) => ({ ...prev, vetClinicName: text }))}
            placeholderTextColor="#A9B5C7"
            textAlign="right"
            editable={!saving}
          />

          <ReminderSettingsSection
            variant="medication"
            value={notificationSettings}
            onChange={setNotificationSettings}
            disabled={saving}
            previewContext={medicationPreviewContext}
            linkedReminder={linkedReminderPreview}
          />

          {Platform.OS === 'ios' && datePickerTarget && (
            <Modal visible transparent animationType="slide" onRequestClose={closeDatePicker}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={closeDatePicker}>
                      <Text style={styles.modalDone}>סיום</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={activePickerDate}
                    mode={isTimePickerTarget(datePickerTarget) ? 'time' : 'date'}
                    display="spinner"
                    onChange={isTimePickerTarget(datePickerTarget) ? onTimeChange : onDateChange}
                    maximumDate={datePickerTarget === 'administered' ? new Date() : undefined}
                    minimumDate={datePickerTarget === 'nextDue' ? form.administeredDate : undefined}
                    textColor={TEXT_DARK}
                  />
                </View>
              </View>
            </Modal>
          )}
          {Platform.OS === 'android' && datePickerTarget && (
            <DateTimePicker
              value={activePickerDate}
              mode={isTimePickerTarget(datePickerTarget) ? 'time' : 'date'}
              display="default"
              onChange={isTimePickerTarget(datePickerTarget) ? onTimeChange : onDateChange}
              maximumDate={datePickerTarget === 'administered' ? new Date() : undefined}
              minimumDate={datePickerTarget === 'nextDue' ? form.administeredDate : undefined}
            />
          )}

          <TouchableOpacity
            style={[styles.saveBtn, (saving || dogs.length === 0) && styles.saveDisabled]}
            onPress={handleSave}
            disabled={saving || dogs.length === 0}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>שמירה</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default MedicationFormScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG_COLOR },
  flex: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: TEXT_DARK },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: TEXT_DARK },
  backBtn: { width: 40, alignItems: 'flex-end', padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    width: '100%',
    textAlign: 'right',
    marginBottom: 8,
    marginTop: 16,
  },
  dogScroll: { alignSelf: 'stretch' },
  dogRow: {
    flexDirection: 'row-reverse',
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingVertical: 4,
  },
  dogChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginHorizontal: 4,
  },
  dogChipSelected: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  dogChipText: { color: TEXT_DARK, fontSize: 15, fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },
  dogChipTextSelected: { color: '#fff' },
  hint: { textAlign: 'right', color: '#8B7355', marginTop: 8 },
  autoHint: { textAlign: 'right', color: '#8B7355', fontSize: 13, marginTop: 6, writingDirection: 'rtl' },
  input: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: TEXT_DARK,
  },
  dateRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: 16, color: TEXT_DARK, textAlign: 'right', flex: 1 },
  datePlaceholder: { color: '#A9B5C7' },
  saveBtn: {
    marginTop: 28,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
  modalHeader: { alignItems: 'flex-end', padding: 12 },
  modalDone: { fontSize: 17, color: PRIMARY_COLOR, fontWeight: '600' },
});
