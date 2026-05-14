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
import { dogAPI, vaccinationAPI } from '../../services/api';

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

type DogOption = { id: string; name: string };

const VaccinationFormScreen = ({ navigation, route }: any) => {
  const paramUserId = route?.params?.userId as string | undefined;
  const paramVaccinationId = route?.params?.vaccinationId as string | undefined;
  const paramDogId = route?.params?.dogId as string | undefined;
  const paramVaccineName = route?.params?.vaccineName as string | undefined;
  const paramAdministeredDate = route?.params?.administeredDate as string | undefined;

  const [userId, setUserId] = useState<string | null>(paramUserId ?? null);
  const [vaccinationId, setVaccinationId] = useState<string | null>(paramVaccinationId ?? null);
  const [dogs, setDogs] = useState<DogOption[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(paramDogId ?? null);
  const [vaccineName, setVaccineName] = useState(paramVaccineName ?? '');
  const [administeredDate, setAdministeredDate] = useState(() =>
    parseIsoToLocalDate(paramAdministeredDate ?? '')
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(vaccinationId);

  useEffect(() => {
    setUserId(paramUserId ?? null);
    if (paramVaccinationId) {
      setVaccinationId(paramVaccinationId);
      setSelectedDogId(paramDogId ?? null);
      setVaccineName(paramVaccineName ?? '');
      setAdministeredDate(parseIsoToLocalDate(paramAdministeredDate ?? ''));
    } else {
      setVaccinationId(null);
      setSelectedDogId(paramDogId ?? null);
      setVaccineName('');
      setAdministeredDate(new Date());
    }
  }, [paramUserId, paramVaccinationId, paramDogId, paramVaccineName, paramAdministeredDate]);

  const loadDogs = useCallback(async () => {
    if (!paramUserId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await dogAPI.getDogsForUser(paramUserId);
      const list = res.success && Array.isArray(res.dogs) ? res.dogs : [];
      setDogs(
        list.map((d: any) => ({
          id: String(d.id),
          name: d.name || 'כלב',
        }))
      );
      if (!paramVaccinationId && list.length === 1) {
        setSelectedDogId(String(list[0].id));
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('שגיאה', e?.message || 'לא ניתן לטעון את רשימת הכלבים');
      setDogs([]);
    } finally {
      setLoading(false);
    }
  }, [paramUserId, paramVaccinationId]);

  useEffect(() => {
    loadDogs();
  }, [loadDogs]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type !== 'dismissed' && selectedDate) {
        setAdministeredDate(selectedDate);
      }
    } else if (selectedDate) {
      setAdministeredDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      Alert.alert('שגיאה', 'לא נמצא משתמש');
      return;
    }
    if (!selectedDogId) {
      Alert.alert('שגיאה', 'נא לבחור כלב');
      return;
    }
    if (!vaccineName.trim()) {
      Alert.alert('שגיאה', 'נא להזין שם חיסון');
      return;
    }
    const iso = toIsoLocal(administeredDate);
    try {
      setSaving(true);
      if (isEdit && vaccinationId) {
        await vaccinationAPI.update(userId, vaccinationId, {
          dogId: selectedDogId,
          vaccineName: vaccineName.trim(),
          administeredDate: iso,
        });
        Alert.alert('הצלחה', 'החיסון עודכן', [{ text: 'אישור', onPress: () => navigation.goBack() }]);
      } else {
        await vaccinationAPI.create(userId, {
          dogId: selectedDogId,
          vaccineName: vaccineName.trim(),
          administeredDate: iso,
        });
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
              const selected = selectedDogId === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.dogChip, selected && styles.dogChipSelected]}
                  onPress={() => setSelectedDogId(d.id)}
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

          <Text style={styles.label}>שם החיסון</Text>
          <TextInput
            style={styles.input}
            value={vaccineName}
            onChangeText={setVaccineName}
            placeholder="למשל: משושה"
            placeholderTextColor="#A9B5C7"
            textAlign="right"
            editable={!saving}
          />

          <Text style={styles.label}>תאריך החיסון</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
            disabled={saving}
          >
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>{formatDateHe(administeredDate)}</Text>
              <Ionicons name="calendar-outline" size={22} color="#8B7355" />
            </View>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.modalDone}>סיום</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={administeredDate}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    textColor={TEXT_DARK}
                  />
                </View>
              </View>
            </Modal>
          )}
          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={administeredDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
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
