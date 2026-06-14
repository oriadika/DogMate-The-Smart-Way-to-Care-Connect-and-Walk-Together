import React, { useState, useCallback, useEffect } from 'react';
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
import { dogAPI, vaccinationAPI, type VaccinationRow } from '../../services/dogmateApi';
import ReminderSettingsSection from '../../components/health/ReminderSettingsSection';
import { DEFAULT_VACCINATION_NOTIFICATION, type VaccinationNotificationSettings } from '../../types/notifications';
import { resyncAllNotifications } from '../../services/notificationScheduler';
import {
  findVaccinationReminderForRecord,
  markHomeDataDirty,
  refreshHomeRemindersFromServer,
  shouldForceHomeRefresh,
  type HomeReminderRow,
} from '../../utils/homeDataCache';
import {
  clearVaccinationsDirty,
  markVaccinationsDirty,
  refreshVaccinationsFromServer,
  shouldForceVaccinationsRefresh,
} from '../../utils/healthDataCache';
import {
  parseStoredRemindDaysBefore,
  remindDaysBeforeToApiString,
} from '../../utils/healthReminderSettings';
import { useScreenLifecycleGuard } from '../../utils/screenLifecycle';
import VaccineNamePicker from '../../components/health/VaccineNamePicker';
import NextDueCycleOptions from '../../components/health/NextDueCycleOptions';
import {
  ISRAEL_VACCINE_CUSTOM,
  ISRAEL_VACCINE_OPTIONS,
  computeNextDueDate,
  resolveVaccineKeyFromName,
  type IsraelVaccineKey,
} from '../../constants/israelVaccines';

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

type VaccinationFormState = {
  selectedDogId: string | null;
  vaccineKey: IsraelVaccineKey | null;
  customVaccineName: string;
  administeredDate: Date;
  nextDueDate: Date | null;
  nextDueManuallyEdited: boolean;
  noNextCycle: boolean;
  vetClinicName: string;
};

type DatePickerTarget = 'administered' | 'nextDue';

const VaccinationFormScreen = ({ navigation, route }: any) => {
  const paramUserId = route?.params?.userId as string | undefined;
  const paramVaccinationId = route?.params?.vaccinationId as string | undefined;
  const paramDogId = route?.params?.dogId as string | undefined;
  const paramVaccineName = route?.params?.vaccineName as string | undefined;
  const paramAdministeredDate = route?.params?.administeredDate as string | undefined;
  const paramNextDueDate = route?.params?.nextDueDate as string | undefined;
  const paramVetClinicName = route?.params?.vetClinicName as string | undefined;

  const [userId, setUserId] = useState<string | null>(paramUserId ?? null);
  const [vaccinationId, setVaccinationId] = useState<string | null>(paramVaccinationId ?? null);
  const [dogs, setDogs] = useState<DogOption[]>([]);
  const [form, setForm] = useState<VaccinationFormState>(() => {
    const vaccineName = paramVaccineName ?? '';
    const key = resolveVaccineKeyFromName(vaccineName);
    const isCustom = key === ISRAEL_VACCINE_CUSTOM;
    return {
      selectedDogId: paramDogId ?? null,
      vaccineKey: vaccineName ? key : null,
      customVaccineName: isCustom ? vaccineName : '',
      administeredDate: parseIsoToLocalDate(paramAdministeredDate ?? ''),
      nextDueDate: paramNextDueDate ? parseIsoToLocalDate(paramNextDueDate) : null,
      nextDueManuallyEdited: Boolean(paramNextDueDate),
      noNextCycle: !paramNextDueDate,
      vetClinicName: paramVetClinicName ?? '',
    };
  });
  const [datePickerTarget, setDatePickerTarget] = useState<DatePickerTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<VaccinationNotificationSettings>(
    DEFAULT_VACCINATION_NOTIFICATION
  );
  const [linkedVaccinationReminder, setLinkedVaccinationReminder] = useState<HomeReminderRow | null>(null);
  const [loadedSyncSnapshot, setLoadedSyncSnapshot] = useState<{
    remindDaysBefore: number | null;
    nextDueDate: string | null;
  } | null>(null);

  const isEdit = Boolean(vaccinationId);
  const isCustomVaccine = form.vaccineKey === ISRAEL_VACCINE_CUSTOM;

  const {
    isMountedRef,
    beginAsyncWork,
    isAsyncWorkCurrent,
    runDeferredBlurCleanup,
  } = useScreenLifecycleGuard();

  const resolvedVaccineName = isCustomVaccine
    ? form.customVaccineName.trim()
    : ISRAEL_VACCINE_OPTIONS.find((o) => o.key === form.vaccineKey)?.label ?? '';

  const selectedDogName =
    dogs.find((d) => d.id === form.selectedDogId)?.name ?? 'כלב';

  const vaccinationPreviewContext = form.nextDueDate
    ? {
        nextDueDate: form.nextDueDate,
        vaccineName: resolvedVaccineName,
        dogName: selectedDogName,
      }
    : undefined;

  const linkedReminderPreview = (() => {
    if (!linkedVaccinationReminder?.remindAt || !loadedSyncSnapshot) return null;
    const reminderDate = new Date(linkedVaccinationReminder.remindAt);
    if (Number.isNaN(reminderDate.getTime())) return null;
    const nextDueIso = form.nextDueDate ? toIsoLocal(form.nextDueDate) : null;
    const unchanged =
      notificationSettings.remindDaysBefore === loadedSyncSnapshot.remindDaysBefore &&
      nextDueIso === loadedSyncSnapshot.nextDueDate;
    if (!unchanged) return null;
    return {
      title: linkedVaccinationReminder.title || '',
      description: linkedVaccinationReminder.description || '',
      remindAt: reminderDate,
    };
  })();

  const applyVaccinationRow = (existing: VaccinationRow) => {
    const vaccineName = existing.vaccineName ?? '';
    const key = resolveVaccineKeyFromName(vaccineName);
    const isCustom = key === ISRAEL_VACCINE_CUSTOM;
    setForm({
      selectedDogId: existing.dogId ?? null,
      vaccineKey: vaccineName ? key : null,
      customVaccineName: isCustom ? vaccineName : '',
      administeredDate: parseIsoToLocalDate(existing.administeredDate ?? ''),
      nextDueDate: existing.nextDueDate ? parseIsoToLocalDate(existing.nextDueDate) : null,
      nextDueManuallyEdited: Boolean(existing.nextDueDate),
      noNextCycle: !existing.nextDueDate,
      vetClinicName: existing.vetClinicName ?? '',
    });
    const nextNotificationSettings = {
      notificationEnabled: existing.notificationEnabled ?? false,
      remindDaysBefore: parseStoredRemindDaysBefore(existing.remindDaysBefore),
    };
    setNotificationSettings(nextNotificationSettings);
    setLoadedSyncSnapshot({
      remindDaysBefore: nextNotificationSettings.remindDaysBefore,
      nextDueDate: existing.nextDueDate ? toIsoLocal(parseIsoToLocalDate(existing.nextDueDate)) : null,
    });
  };

  useEffect(() => {
    if (!isMountedRef.current) return;
    setUserId(paramUserId ?? null);
    if (paramVaccinationId) {
      const vaccineName = paramVaccineName ?? '';
      const key = resolveVaccineKeyFromName(vaccineName);
      const isCustom = key === ISRAEL_VACCINE_CUSTOM;
      setVaccinationId(paramVaccinationId);
      setForm({
        selectedDogId: paramDogId ?? null,
        vaccineKey: vaccineName ? key : null,
        customVaccineName: isCustom ? vaccineName : '',
        administeredDate: parseIsoToLocalDate(paramAdministeredDate ?? ''),
        nextDueDate: paramNextDueDate ? parseIsoToLocalDate(paramNextDueDate) : null,
        nextDueManuallyEdited: Boolean(paramNextDueDate),
        noNextCycle: !paramNextDueDate,
        vetClinicName: paramVetClinicName ?? '',
      });
    } else {
      setVaccinationId(null);
      setForm({
        selectedDogId: paramDogId ?? null,
        vaccineKey: null,
        customVaccineName: '',
        administeredDate: new Date(),
        nextDueDate: null,
        nextDueManuallyEdited: false,
        noNextCycle: true,
        vetClinicName: '',
      });
    }
  }, [
    paramUserId,
    paramVaccinationId,
    paramDogId,
    paramVaccineName,
    paramAdministeredDate,
    paramNextDueDate,
    paramVetClinicName,
    isMountedRef,
  ]);

  const applyAutoNextDue = useCallback(
    (vaccineKey: IsraelVaccineKey | null, administeredDate: Date, force = false) => {
      if (!vaccineKey) return;
      setForm((prev) => {
        if (!force && (prev.nextDueManuallyEdited || prev.noNextCycle)) return prev;
        const computed = computeNextDueDate(vaccineKey, administeredDate);
        return { ...prev, nextDueDate: computed, noNextCycle: false };
      });
    },
    []
  );

  const loadDogs = useCallback(async () => {
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
        shouldForceVaccinationsRefresh(paramUserId) || shouldForceHomeRefresh(paramUserId);

      const [res, vaxRows, reminders] = await Promise.all([
        dogAPI.getDogsForUser(paramUserId),
        forceRefresh
          ? refreshVaccinationsFromServer(paramUserId)
          : vaccinationAPI
              .list(paramUserId)
              .then((r) => (r.vaccinations as VaccinationRow[]) ?? [])
              .catch(() => [] as VaccinationRow[]),
        refreshHomeRemindersFromServer(paramUserId).catch(
          async () => [] as HomeReminderRow[]
        ),
      ]);
      if (!isAsyncWorkCurrent(generation)) return;
      const list = res.success && Array.isArray(res.dogs) ? res.dogs : [];
      setDogs(
        list.map((d: any) => ({
          id: String(d.id),
          name: d.name || 'כלב',
        }))
      );
      if (paramVaccinationId) {
        const existing = vaxRows.find((v) => v.id === paramVaccinationId);
        if (existing) {
          applyVaccinationRow(existing);
          setLinkedVaccinationReminder(
            findVaccinationReminderForRecord(reminders, paramVaccinationId)
          );
        }
        if (forceRefresh) {
          clearVaccinationsDirty(paramUserId);
        }
      }
      if (!paramVaccinationId && list.length === 1) {
        setForm((prev) => ({ ...prev, selectedDogId: String(list[0].id) }));
      }
    } catch (e: any) {
      if (!isAsyncWorkCurrent(generation)) return;
      console.error(e);
      Alert.alert('שגיאה', e?.message || 'לא ניתן לטעון את רשימת הכלבים');
      setDogs([]);
    } finally {
      if (isAsyncWorkCurrent(generation)) {
        setLoading(false);
      }
    }
  }, [paramUserId, paramVaccinationId, beginAsyncWork, isAsyncWorkCurrent, isMountedRef]);

  useEffect(() => {
    void loadDogs();
    return () => {
      runDeferredBlurCleanup(() => {
        if (!isMountedRef.current) return;
        setDatePickerTarget(null);
      });
    };
  }, [loadDogs, runDeferredBlurCleanup, isMountedRef]);

  const onVaccineKeyChange = (key: IsraelVaccineKey) => {
    setForm((prev) => ({
      ...prev,
      vaccineKey: key,
      customVaccineName: key === ISRAEL_VACCINE_CUSTOM ? prev.customVaccineName : '',
      ...(prev.nextDueManuallyEdited
        ? {}
        : {
            nextDueDate: null,
            nextDueManuallyEdited: false,
            noNextCycle: true,
          }),
    }));
  };

  const onAdministeredDateChange = (selectedDate: Date) => {
    setForm((prev) => ({ ...prev, administeredDate: selectedDate }));
    if (!form.nextDueManuallyEdited && !form.noNextCycle && form.vaccineKey) {
      applyAutoNextDue(form.vaccineKey, selectedDate, true);
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
    if (form.vaccineKey) {
      applyAutoNextDue(form.vaccineKey, form.administeredDate, true);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (!datePickerTarget) return;
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

  const closeDatePicker = () => setDatePickerTarget(null);

  const activePickerDate =
    datePickerTarget === 'nextDue'
      ? form.nextDueDate ?? form.administeredDate
      : form.administeredDate;

  const validateForm = (): string | null => {
    if (!form.selectedDogId) return 'נא לבחור כלב';
    if (!form.vaccineKey) return 'נא לבחור שם חיסון / טיפול';
    if (isCustomVaccine && !form.customVaccineName.trim()) return 'נא להזין שם חיסון / טיפול';
    if (!resolvedVaccineName) return 'נא להזין שם חיסון';
    if (Number.isNaN(form.administeredDate.getTime())) return 'תאריך החיסון אינו תקין';
    if (startOfDay(form.administeredDate) > startOfDay(new Date())) {
      return 'תאריך החיסון לא יכול להיות בעתיד';
    }
    if (form.nextDueDate && startOfDay(form.nextDueDate) < startOfDay(form.administeredDate)) {
      return 'תאריך החיסון הבא חייב להיות ביום החיסון או אחריו';
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
    if (notificationSettings.notificationEnabled && !form.nextDueDate) {
      Alert.alert('שגיאה', 'יש להגדיר תאריך חיסון הבא כדי להפעיל תזכורת, או לבטל את התזכורת לחיסון חד פעמי');
      return;
    }
    if (
      notificationSettings.notificationEnabled &&
      (notificationSettings.remindDaysBefore == null ||
        notificationSettings.remindDaysBefore <= 0)
    ) {
      Alert.alert('שגיאה', 'יש להגדיר כמה ימים לפני החיסון תופיע התזכורת בדף הבית');
      return;
    }
    const payload = {
      dogId: form.selectedDogId!,
      vaccineName: resolvedVaccineName,
      administeredDate: toIsoLocal(form.administeredDate),
      nextDueDate: form.nextDueDate ? toIsoLocal(form.nextDueDate) : null,
      vetClinicName: form.vetClinicName.trim() || null,
      notificationEnabled: notificationSettings.notificationEnabled,
      remindDaysBefore: remindDaysBeforeToApiString(notificationSettings.remindDaysBefore),
    };
    try {
      setSaving(true);
      if (isEdit && vaccinationId) {
        await vaccinationAPI.update(userId, vaccinationId, payload);
        await resyncAllNotifications(userId);
        markHomeDataDirty(userId);
        markVaccinationsDirty(userId);
        try {
          await Promise.all([
            refreshVaccinationsFromServer(userId),
            refreshHomeRemindersFromServer(userId),
          ]);
        } catch (refreshError) {
          console.warn('Failed to refresh caches after vaccination update:', refreshError);
        }
        Alert.alert('הצלחה', 'החיסון עודכן', [{ text: 'אישור', onPress: () => navigation.goBack() }]);
      } else {
        await vaccinationAPI.create(userId, payload);
        await resyncAllNotifications(userId);
        markHomeDataDirty(userId);
        markVaccinationsDirty(userId);
        try {
          await refreshHomeRemindersFromServer(userId);
        } catch (refreshError) {
          console.warn('Failed to refresh home after vaccination create:', refreshError);
        }
        Alert.alert('הצלחה', 'החיסון נשמר', [{ text: 'אישור', onPress: () => navigation.goBack() }]);
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
          <Text style={styles.headerTitle}>{isEdit ? 'עריכת חיסון' : 'הוספת חיסון'}</Text>
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

          <Text style={styles.label}>שם החיסון / טיפול</Text>
          <VaccineNamePicker
            value={form.vaccineKey}
            onChange={onVaccineKeyChange}
            disabled={saving}
          />

          {isCustomVaccine ? (
            <>
              <Text style={styles.label}>שם מותאם אישית</Text>
              <TextInput
                style={styles.input}
                value={form.customVaccineName}
                onChangeText={(text) => setForm((prev) => ({ ...prev, customVaccineName: text }))}
                placeholder="הקלד שם חיסון / טיפול"
                placeholderTextColor="#A9B5C7"
                textAlign="right"
                editable={!saving}
              />
            </>
          ) : null}

          <Text style={styles.label}>תאריך מתן החיסון / הטיפול</Text>
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

          <Text style={styles.label}>תאריך החיסון / הטיפול הבא</Text>
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
              form.vaccineKey != null &&
              form.vaccineKey !== ISRAEL_VACCINE_CUSTOM
            }
            clearLabel="אין חיסון הבא — חד פעמי"
            oneTimeHint="חד פעמי — ללא חיסון הבא"
            disabled={saving}
          />
          {form.vaccineKey && !form.nextDueManuallyEdited && !form.noNextCycle ? (
            <Text style={styles.autoHint}>חושב אוטומטית לפי פרוטוקול ישראלי — ניתן לעריכה</Text>
          ) : null}

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
            variant="vaccination"
            value={notificationSettings}
            onChange={setNotificationSettings}
            disabled={saving}
            previewContext={vaccinationPreviewContext}
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
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
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
              mode="date"
              display="default"
              onChange={onDateChange}
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

export default VaccinationFormScreen;

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
