import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { userAPI } from '../services/api';

export default function ChangePasswordScreen({ navigation, route }: any) {
  const userId = String(route?.params?.userId || '').trim();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const validationError = useMemo(() => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      return 'יש למלא את כל השדות';
    }
    if (newPassword !== confirmNewPassword) {
      return 'הסיסמה החדשה ואימות הסיסמה אינם תואמים';
    }
    if (oldPassword === newPassword) {
      return 'הסיסמה החדשה חייבת להיות שונה מהסיסמה הישנה';
    }
    return null;
  }, [oldPassword, newPassword, confirmNewPassword]);

  const handleSave = async () => {
    if (!userId) {
      Alert.alert('שגיאה', 'חסר מזהה משתמש');
      return;
    }
    if (validationError) {
      Alert.alert('שגיאה', validationError);
      return;
    }
    try {
      setSaving(true);
      await userAPI.changePassword(userId, {
        oldPassword,
        newPassword,
        confirmNewPassword,
      });
      Alert.alert('הצלחה', 'הסיסמה עודכנה בהצלחה');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('שגיאה', error?.message || 'שינוי הסיסמה נכשל');
    } finally {
      setSaving(false);
    }
  };

  const renderPasswordField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    isVisible: boolean,
    onToggleVisible: () => void
  ) => (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.eyeButton} onPress={onToggleVisible} activeOpacity={0.8}>
          <Ionicons name={isVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8B7355" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!isVisible}
          autoCapitalize="none"
          autoCorrect={false}
          textAlign="right"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>שינוי סיסמה</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={24} color="#5C4033" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {renderPasswordField(
              'סיסמה ישנה',
              oldPassword,
              setOldPassword,
              showOldPassword,
              () => setShowOldPassword((prev) => !prev)
            )}

            {renderPasswordField(
              'סיסמה חדשה',
              newPassword,
              setNewPassword,
              showNewPassword,
              () => setShowNewPassword((prev) => !prev)
            )}

            {renderPasswordField(
              'אימות סיסמה חדשה',
              confirmNewPassword,
              setConfirmNewPassword,
              showConfirmNewPassword,
              () => setShowConfirmNewPassword((prev) => !prev)
            )}

            {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}

            <TouchableOpacity
              style={[styles.saveButton, (Boolean(validationError) || saving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={Boolean(validationError) || saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>עדכון סיסמה</Text>
              )}
            </TouchableOpacity>
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
  },
  card: {
    backgroundColor: '#faf0e6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D5C7',
    padding: 16,
  },
  fieldBlock: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 6,
    textAlign: 'right',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0D5C7',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  eyeButton: {
    padding: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 6,
    fontSize: 16,
    color: '#5C4033',
  },
  errorText: {
    color: '#B03A2E',
    textAlign: 'right',
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 4,
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
