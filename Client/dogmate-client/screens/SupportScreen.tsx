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
import { SupportRequestPayload, userAPI } from '../services/api';

type CategoryOption = {
  id: SupportRequestPayload['category'];
  label: string;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'bug', label: 'תקלה' },
  { id: 'feature', label: 'הצעת שיפור' },
  { id: 'general', label: 'שאלה כללית' },
];

export default function SupportScreen({ navigation, route }: any) {
  const userId = String(route?.params?.userId || '').trim();
  const initialEmail = String(route?.params?.email || '').trim();

  const [category, setCategory] = useState<SupportRequestPayload['category']>('bug');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState(initialEmail);
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validationError = useMemo(() => {
    if (!subject.trim()) return 'יש למלא כותרת';
    if (!description.trim()) return 'יש למלא תיאור הפנייה';
    if (description.trim().length < 10) return 'תיאור הפנייה צריך להכיל לפחות 10 תווים';
    if (!contactEmail.trim()) return 'יש למלא אימייל ליצירת קשר';
    return null;
  }, [subject, description, contactEmail]);

  const handleSubmit = async () => {
    if (!userId) {
      Alert.alert('שגיאה', 'חסר מזהה משתמש');
      return;
    }
    if (validationError) {
      Alert.alert('שגיאה', validationError);
      return;
    }
    try {
      setSubmitting(true);
      await userAPI.createSupportRequest(userId, {
        category,
        subject: subject.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
      });
      Alert.alert('נשלח', 'הפנייה נשלחה בהצלחה. נחזור אליך בהקדם.');
      setCategory('bug');
      setSubject('');
      setDescription('');
      setContactPhone('');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('שגיאה', error?.message || 'שליחת הפנייה נכשלה');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>צור קשר / תמיכה</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={24} color="#5C4033" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>סוג פנייה</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.categoryChip, category === item.id && styles.categoryChipActive]}
                onPress={() => setCategory(item.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.categoryChipText, category === item.id && styles.categoryChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>כותרת</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="לדוגמה: בעיה בשליחת פנייה"
            textAlign="right"
          />

          <Text style={styles.sectionTitle}>תיאור מפורט</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="תאר/י מה קרה או מה תרצה/י לשפר..."
            multiline
            textAlign="right"
            textAlignVertical="top"
          />

          <Text style={styles.sectionTitle}>אימייל ליצירת קשר</Text>
          <TextInput
            style={styles.input}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            textAlign="right"
          />

          <Text style={styles.sectionTitle}>טלפון ליצירת קשר (אופציונלי)</Text>
          <TextInput
            style={styles.input}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="05XXXXXXXX"
            keyboardType="phone-pad"
            textAlign="right"
          />

          <TouchableOpacity
            style={[styles.submitButton, (Boolean(validationError) || submitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={Boolean(validationError) || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>שליחת פנייה</Text>
            )}
          </TouchableOpacity>
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
  headerSpacer: {
    width: 28,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
  },
  backButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 6,
    marginTop: 8,
    textAlign: 'right',
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 6,
  },
  categoryChip: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#DCCFBE',
    backgroundColor: '#F8F0E5',
    paddingVertical: 10,
    alignItems: 'center',
  },
  categoryChipActive: {
    borderColor: '#7FB069',
    backgroundColor: '#E6F0DF',
  },
  categoryChipText: {
    color: '#6B5444',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#3E5B2D',
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
    marginBottom: 6,
  },
  textArea: {
    minHeight: 120,
  },
  submitButton: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: '#7FB069',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
