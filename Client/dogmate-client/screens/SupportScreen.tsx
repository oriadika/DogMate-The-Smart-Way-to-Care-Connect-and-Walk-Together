import React, { useEffect, useMemo, useState } from 'react';
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
import { SupportRequestPayload, userAPI } from '../services/dogmateApi';

type CategoryOption = {
  id: SupportRequestPayload['category'];
  label: string;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'bug', label: 'תקלה' },
  { id: 'feature', label: 'הצעת שיפור' },
  { id: 'general', label: 'שאלה כללית' },
  { id: 'user_report', label: 'דיווח על משתמש' },
];

/** ניסוח תמיכה קצר וברור (כמו במסכי עזרה של אפליקציות מובילות) */
const SUBJECT_PLACEHOLDER: Record<SupportRequestPayload['category'], string> = {
  bug: 'לדוגמה: תקלה במסך הבריאות',
  feature: 'לדוגמה: שיפור פיצ׳ר קיים או הצעת פיצ׳ר חדש',
  general: 'לדוגמה: שאלה כללית על החשבון או האפליקציה',
  user_report: 'לדוגמה: דיווח על משתמש — פרטים רלוונטיים',
};

/** תיאור מפורט — ניסוח אחיד לכל סוגי הפנייה */
const DESCRIPTION_DETAIL_PLACEHOLDER = 'כתוב/י כאן את פירוט הפנייה.';

const DESCRIPTION_MAX_CHARS = 1000;

export default function SupportScreen({ navigation, route }: any) {
  const userId = String(route?.params?.userId || '').trim();
  /** אימייל מהניווט; אם חסר (למשל אחרי `navigate('Home', { params: { userId } })` בלי email) — נטען מהפרופיל */
  const paramEmail = String(route?.params?.email || '').trim();
  const [profileEmail, setProfileEmail] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (paramEmail || !userId) return;
      try {
        const profile = await userAPI.getProfile(userId);
        const e = String(profile?.email || '').trim();
        if (!cancelled && e) setProfileEmail(e);
      } catch {
        /* השאר ריק — validation יציג הודעה */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paramEmail, userId]);

  const contactEmail = paramEmail || profileEmail;

  const [category, setCategory] = useState<SupportRequestPayload['category']>('bug');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const descriptionLength = description.length;

  const validationError = useMemo(() => {
    if (!subject.trim()) return 'יש למלא כותרת';
    if (!description.trim()) return 'יש למלא תיאור הפנייה';
    if (description.trim().length < 10) return 'תיאור הפנייה צריך להכיל לפחות 10 תווים';
    if (descriptionLength > DESCRIPTION_MAX_CHARS) return 'התיאור חייב להכיל לכל היותר 1,000 תווים';
    if (!contactEmail.trim()) return 'חסר אימייל בחשבון — לא ניתן לשלוח פנייה';
    return null;
  }, [subject, description, descriptionLength, contactEmail]);

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
      setCategory('bug');
      setSubject('');
      setDescription('');
      setContactPhone('');
      Alert.alert('נשלח', 'הפנייה נשלחה בהצלחה.\nנחזור אליך בהקדם.', [
        { text: 'אישור', onPress: () => navigation.goBack() },
      ]);
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
                <Text
                  style={[styles.categoryChipText, category === item.id && styles.categoryChipTextActive]}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            כותרת <Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder={SUBJECT_PLACEHOLDER[category]}
            textAlign="right"
          />

          <Text style={styles.sectionTitle}>
            תיאור מפורט <Text style={styles.requiredStar}>*</Text>
          </Text>
          <Text style={styles.remainingCaption}>מינימום 10 תווים בתיאור</Text>
          <View style={styles.textAreaWrapper}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={DESCRIPTION_DETAIL_PLACEHOLDER}
              multiline
              maxLength={DESCRIPTION_MAX_CHARS}
              textAlign="right"
              textAlignVertical="top"
            />
            <Text
              style={[
                styles.charCountOverlay,
                descriptionLength >= 900 && styles.charCountOverlayWarning,
              ]}
            >
              {descriptionLength}/{DESCRIPTION_MAX_CHARS}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>אימייל ליצירת קשר</Text>
          <Text style={styles.lockedFieldHint}>האימייל מקושר לחשבון שלך ולא ניתן לשינוי</Text>
          <TextInput
            style={[styles.input, styles.inputLocked]}
            value={contactEmail}
            editable={false}
            selectTextOnFocus={false}
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

          <Text style={styles.requiredFieldLegend}>
            <Text style={styles.requiredStar}>*</Text> שדה חובה
          </Text>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
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
  requiredStar: {
    color: '#D32F2F',
    fontWeight: '700',
  },
  requiredFieldLegend: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  categoryRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'nowrap',
    gap: 4,
    marginBottom: 6,
  },
  categoryChip: {
    flex: 1,
    minWidth: 0,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#DCCFBE',
    backgroundColor: '#F8F0E5',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: {
    borderColor: '#7FB069',
    backgroundColor: '#E6F0DF',
  },
  categoryChipText: {
    color: '#6B5444',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
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
  lockedFieldHint: {
    fontSize: 12,
    color: '#9A8B7A',
    textAlign: 'right',
    marginBottom: 4,
  },
  inputLocked: {
    backgroundColor: '#EFE8DC',
    color: '#6B5D4F',
  },
  textArea: {
    minHeight: 120,
    paddingBottom: 32,
    marginBottom: 0,
  },
  textAreaWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  remainingCaption: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'right',
    marginBottom: 6,
    lineHeight: 18,
  },
  charCountOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '500',
  },
  charCountOverlayWarning: {
    color: '#D32F2F',
    fontWeight: '700',
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
