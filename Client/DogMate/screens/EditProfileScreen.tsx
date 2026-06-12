import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { userAPI } from '../services/dogmateApi';

function normalizePhoneToDigits(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

function isValidIsraeliMobile(raw: string): boolean {
  const digits = normalizePhoneToDigits(raw);
  return /^05\d{8}$/.test(digits) || /^5\d{8}$/.test(digits);
}

function formatDateDDMMYYYY(date: Date | null): string {
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateYYYYMMDD(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

function parseBirthDate(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function EditProfileScreen({ navigation, route }: any) {
  const userId = String(route?.params?.userId || '').trim();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [initialFirstName, setInitialFirstName] = useState('');
  const [initialLastName, setInitialLastName] = useState('');
  const [initialPhoneNumber, setInitialPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [initialBirthDate, setInitialBirthDate] = useState<Date | null>(null);
  const [editingBirthDate, setEditingBirthDate] = useState(false);
  const [savingBirthDate, setSavingBirthDate] = useState(false);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingNames, setSavingNames] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [editingNames, setEditingNames] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      Alert.alert('שגיאה', 'חסר מזהה משתמש');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const profile = await userAPI.getProfile(userId);
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setPhoneNumber(profile.phoneNumber ?? '');
      const parsedBirthDate = parseBirthDate(profile.birthDate);
      setBirthDate(parsedBirthDate);
      setInitialFirstName(profile.firstName ?? '');
      setInitialLastName(profile.lastName ?? '');
      setInitialPhoneNumber(profile.phoneNumber ?? '');
      setInitialBirthDate(parsedBirthDate);
    } catch (error: any) {
      Alert.alert('שגיאה', error?.message || 'טעינת הפרופיל נכשלה');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveNames = async () => {
    if (!userId) {
      Alert.alert('שגיאה', 'חסר מזהה משתמש');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('שגיאה', 'יש למלא שם פרטי ושם משפחה');
      return;
    }
    if (!isValidIsraeliMobile(initialPhoneNumber || phoneNumber)) {
      Alert.alert('שגיאה', 'מספר טלפון לא תקין');
      return;
    }

    try {
      setSavingNames(true);
      const updated = await userAPI.updateProfile(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: normalizePhoneToDigits(initialPhoneNumber || phoneNumber),
      });
      setFirstName(updated.firstName ?? '');
      setLastName(updated.lastName ?? '');
      setInitialFirstName(updated.firstName ?? '');
      setInitialLastName(updated.lastName ?? '');
      setEditingNames(false);
      Alert.alert('נשמר', 'השם עודכן בהצלחה');
      navigation.setParams({
        userFirstName: updated.firstName,
        userLastName: updated.lastName,
      });
    } catch (error: any) {
      Alert.alert('שגיאה', error?.message || 'שמירת השם נכשלה');
    } finally {
      setSavingNames(false);
    }
  };

  const handleSavePhone = async () => {
    if (!userId) {
      Alert.alert('שגיאה', 'חסר מזהה משתמש');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('שגיאה', 'חסר שם משתמש לשמירה');
      return;
    }
    if (!isValidIsraeliMobile(phoneNumber)) {
      Alert.alert('שגיאה', 'מספר טלפון לא תקין');
      return;
    }
    try {
      setSavingPhone(true);
      const updated = await userAPI.updateProfile(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: normalizePhoneToDigits(phoneNumber),
      });
      setPhoneNumber(updated.phoneNumber ?? '');
      setInitialPhoneNumber(updated.phoneNumber ?? '');
      setEditingPhone(false);
      Alert.alert('נשמר', 'הטלפון עודכן בהצלחה');
    } catch (error: any) {
      Alert.alert('שגיאה', error?.message || 'שמירת הטלפון נכשלה');
    } finally {
      setSavingPhone(false);
    }
  };

  const onBirthDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowBirthDatePicker(false);
    }
    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }
    setBirthDate(selectedDate);
  };

  const handleSaveBirthDate = async () => {
    if (!userId) {
      Alert.alert('שגיאה', 'חסר מזהה משתמש');
      return;
    }
    if (!birthDate) {
      Alert.alert('שגיאה', 'יש לבחור תאריך לידה');
      return;
    }
    const today = new Date();
    if (birthDate.getTime() > today.getTime()) {
      Alert.alert('שגיאה', 'תאריך לידה לא יכול להיות בעתיד');
      return;
    }

    try {
      setSavingBirthDate(true);
      const updated = await userAPI.updateBirthDate(userId, {
        birthDate: formatDateYYYYMMDD(birthDate),
      });
      const persistedBirthDate = parseBirthDate(updated.birthDate) || birthDate;
      setBirthDate(persistedBirthDate);
      setInitialBirthDate(persistedBirthDate);
      setEditingBirthDate(false);
      setShowBirthDatePicker(false);
      Alert.alert('נשמר', 'תאריך הלידה עודכן בהצלחה');
    } catch (error: any) {
      Alert.alert('שגיאה', error?.message || 'שמירת תאריך הלידה נכשלה');
    } finally {
      setSavingBirthDate(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#7FB069" />
          <Text style={styles.loadingText}>טוען פרופיל...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>עריכת פרופיל</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={24} color="#5C4033" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>שם פרטי ושם משפחה</Text>
              {!editingNames ? (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setEditingPhone(false);
                    setEditingNames(true);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>עריכה</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setFirstName(initialFirstName);
                    setLastName(initialLastName);
                    setEditingNames(false);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>ביטול</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.label}>שם פרטי</Text>
            <TextInput
              style={[styles.input, !editingNames && styles.inputDisabled]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={initialFirstName || 'שם פרטי'}
              textAlign="right"
              editable={editingNames}
            />

            <Text style={styles.label}>שם משפחה</Text>
            <TextInput
              style={[styles.input, !editingNames && styles.inputDisabled]}
              value={lastName}
              onChangeText={setLastName}
              placeholder={initialLastName || 'שם משפחה'}
              textAlign="right"
              editable={editingNames}
            />
            {editingNames && (
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (savingNames || !firstName.trim() || !lastName.trim()) && styles.saveButtonDisabled,
                ]}
                onPress={handleSaveNames}
                disabled={savingNames || !firstName.trim() || !lastName.trim()}
                activeOpacity={0.85}
              >
                {savingNames ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>שמור שם</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>טלפון</Text>
              {!editingPhone ? (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setEditingNames(false);
                    setEditingPhone(true);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>עריכה</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setPhoneNumber(initialPhoneNumber);
                    setEditingPhone(false);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>ביטול</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.label}>טלפון</Text>
            <TextInput
              style={[styles.input, !editingPhone && styles.inputDisabled]}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="05XXXXXXXX"
              keyboardType="phone-pad"
              textAlign="right"
              editable={editingPhone}
            />
            <Text style={styles.helperText}>ניתן להזין 05XXXXXXXX או 5XXXXXXXX</Text>
            {editingPhone && (
              <TouchableOpacity
                style={[styles.saveButton, (savingPhone || !isValidIsraeliMobile(phoneNumber)) && styles.saveButtonDisabled]}
                onPress={handleSavePhone}
                disabled={savingPhone || !isValidIsraeliMobile(phoneNumber)}
                activeOpacity={0.85}
              >
                {savingPhone ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>שמור טלפון</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>תאריך לידה</Text>
              {!editingBirthDate ? (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setEditingNames(false);
                    setEditingPhone(false);
                    setEditingBirthDate(true);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>עריכה</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setBirthDate(initialBirthDate);
                    setShowBirthDatePicker(false);
                    setEditingBirthDate(false);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>ביטול</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.label}>תאריך לידה</Text>
            <TouchableOpacity
              style={[styles.input, !editingBirthDate && styles.inputDisabled]}
              onPress={() => {
                if (editingBirthDate) setShowBirthDatePicker(true);
              }}
              activeOpacity={editingBirthDate ? 0.85 : 1}
              disabled={!editingBirthDate}
            >
              <Text style={[styles.dateText, !editingBirthDate && styles.dateTextDisabled]}>
                {birthDate ? formatDateDDMMYYYY(birthDate) : 'לא הוגדר'}
              </Text>
            </TouchableOpacity>

            {editingBirthDate && showBirthDatePicker && (
              Platform.OS === 'ios' ? (
                <Modal transparent animationType="fade" onRequestClose={() => setShowBirthDatePicker(false)}>
                  <View style={styles.datePickerOverlay}>
                    <View style={styles.datePickerCard}>
                      <DateTimePicker
                        value={birthDate || new Date(2000, 0, 1)}
                        mode="date"
                        display="spinner"
                        onChange={onBirthDateChange}
                        maximumDate={new Date()}
                      />
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => setShowBirthDatePicker(false)}
                      >
                        <Text style={styles.secondaryButtonText}>סגירה</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={birthDate || new Date(2000, 0, 1)}
                  mode="date"
                  display="default"
                  onChange={onBirthDateChange}
                  maximumDate={new Date()}
                />
              )
            )}

            {editingBirthDate && (
              <TouchableOpacity
                style={[styles.saveButton, (savingBirthDate || !birthDate) && styles.saveButtonDisabled]}
                onPress={handleSaveBirthDate}
                disabled={savingBirthDate || !birthDate}
                activeOpacity={0.85}
              >
                {savingBirthDate ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>שמור תאריך לידה</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5e6d3',
  },
  flex: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#8B7355',
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
  },
  headerSpacer: {
    width: 28,
  },
  content: {
    padding: 20,
    paddingBottom: 30,
    gap: 14,
  },
  card: {
    backgroundColor: '#faf0e6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D5C7',
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5C4033',
  },
  secondaryButton: {
    backgroundColor: '#EDE0D4',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#5C4033',
    fontWeight: '600',
    fontSize: 13,
  },
  label: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 6,
    textAlign: 'right',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0D5C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    color: '#5C4033',
    marginBottom: 14,
  },
  inputDisabled: {
    backgroundColor: '#F4EEE6',
    color: '#8B7355',
  },
  dateText: {
    fontSize: 16,
    color: '#5C4033',
    textAlign: 'right',
  },
  dateTextDisabled: {
    color: '#8B7355',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  datePickerCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0D5C7',
    alignItems: 'center',
    gap: 10,
  },
  helperText: {
    textAlign: 'right',
    color: '#8B7355',
    fontSize: 12,
    marginBottom: 18,
  },
  saveButton: {
    backgroundColor: '#7FB069',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
