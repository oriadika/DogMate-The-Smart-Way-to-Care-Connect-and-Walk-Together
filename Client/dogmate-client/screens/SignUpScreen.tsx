// screens/SignUpScreen.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../services/dogmateApi';
import { isValidIsraeliMobileInput } from '../utils/phoneValidation';

/** Basic format check before sending verification email (no spaces in local/domain parts). */
const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmailFormat(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return EMAIL_FORMAT_REGEX.test(normalized);
}

const SignUpScreen: React.FC = ({ navigation }: any) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'owner' | 'walker'>('owner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type !== 'dismissed' && selectedDate) {
        setBirthDate(selectedDate);
      }
    } else if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleSignUp = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('שדות חסרים', 'אנא מלא את כל השדות.');
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    if (!isValidEmailFormat(emailTrimmed)) {
      Alert.alert(
        'הרשמה נכשלה',
        'ההרשמה לא הושלמה כי כתובת האימייל לא תקינה. נא להזין כתובת בפורמט תקין (למשל user@example.com).'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert('סיסמה חלשה', 'הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('הסיסמאות לא תואמות', 'הסיסמאות אינן תואמות.');
      return;
    }

    const phoneTrimmed = phoneNumber.trim();
    if (role === 'walker') {
      if (!isValidIsraeliMobileInput(phoneTrimmed)) {
        Alert.alert(
          'מספר טלפון לא תקין',
          'לדוגווקר נדרש מספר פלאפון ישראלי תקין (למשל 05XXXXXXXX).'
        );
        return;
      }
    } else if (phoneTrimmed && !isValidIsraeliMobileInput(phoneTrimmed)) {
      Alert.alert(
        'מספר טלפון לא תקין',
        'אם ממלאים מספר פלאפון, יש להזין מספר ישראלי תקין (למשל 05XXXXXXXX).'
      );
      return;
    }

    if (!acceptedTerms) {
      Alert.alert(
        'אישור תנאי שימוש נדרש',
        'יש לסמן את תיבת האישור כדי לאשר שקראת את תנאי השימוש ומדיניות הפרטיות.'
      );
      return;
    }

    setIsLoading(true);
    try {
      // Call the API to register the user
      const response = await userAPI.register({
        email: emailTrimmed,
        password,
        firstName,
        lastName,
        birthDate: `${birthDate.getFullYear()}-${(birthDate.getMonth() + 1).toString().padStart(2, '0')}-${birthDate.getDate().toString().padStart(2, '0')}`,
        phoneNumber: phoneTrimmed || undefined,
        userRole: role,
      });

    const registeredRole =
      response?.userRole === 'walker' || response?.userRole === 'owner'
        ? response.userRole
        : role;

    const mailOk = response?.verificationEmailSent !== false;
    Alert.alert(
      mailOk ? 'קוד אימות נשלח' : 'שימו לב',
      mailOk
        ? 'החשבון ייווצר רק אחרי שתזין את הקוד שנשלח למייל שלך.'
        : 'השרת לא הצליח לשלוח מייל (חסרה הגדרת SMTP). הקוד מופיע בלוג השרת. אחרי הגדרת סיסמת אפליקציה ב-Gmail יופעל שליחה אוטומטית.'
    );

    const verifyParams = {
      firstName,
      lastName,
      email: (response?.email as string | undefined)?.trim() || emailTrimmed,
      userRole: registeredRole,
      phoneNumber: phoneTrimmed,
      password,
      fromSignUp: true,
    };

    navigation.navigate('VerifyEmail', verifyParams);
    } catch (error: any) {
      const msg = error?.message || 'אירעה שגיאה בעת ההרשמה';
      const disposableEmail =
        typeof msg === 'string' && msg.includes('מייל זמני');
      Alert.alert(
        'הרשמה נכשלה',
        disposableEmail
          ? `ההרשמה לא הושלמה בגלל האימייל: ${msg}`
          : msg
      );
      console.error('Sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.background}>
      {/* Back button - top right */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Start')}
      >
        <Text style={styles.backIcon}>→</Text>
        </TouchableOpacity>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
                {/* Title */}
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>יצירת חשבון חדש</Text>
                </View>

                {/* First Name */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    שם פרטי <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, styles.inputInField]}
                    value={firstName}
                    onChangeText={setFirstName}
                    textAlign="right"
                  />
                </View>

                {/* Last Name */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    שם משפחה <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, styles.inputInField]}
                    value={lastName}
                    onChangeText={setLastName}
                    textAlign="right"
                  />
                </View>

                {/* Role selector */}
                <Text style={styles.roleLabel}>
                  אני נרשם בתור: <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === 'walker' ? styles.roleButtonActive : styles.roleButtonInactive,
                    ]}
                    onPress={() => setRole('walker')}
                  >
                    <Text style={styles.roleIcon}>🐕</Text>
                    <Text style={[
                      styles.roleText,
                      role === 'walker' ? styles.roleTextActive : styles.roleTextInactive,
                    ]}>
                      דוגווקר
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === 'owner' ? styles.roleButtonActive : styles.roleButtonInactive,
                    ]}
                    onPress={() => setRole('owner')}
                  >
                    <Text style={styles.roleIcon}>👤🐕</Text>
                    <Text style={[
                      styles.roleText,
                      role === 'owner' ? styles.roleTextActive : styles.roleTextInactive,
                    ]}>
                      בעל כלב
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Birth Date */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    תאריך לידה <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[styles.input, styles.inputInField]}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    <View style={styles.datePickerContent}>
                      <Text style={styles.dateText}>{formatDate(birthDate)}</Text>
                      <Ionicons name="calendar-outline" size={20} color="#8B7355" />
                    </View>
                  </TouchableOpacity>

                  {Platform.OS === 'ios' && (
                    <Modal
                      visible={showDatePicker}
                      transparent
                      animationType="slide"
                      onRequestClose={() => setShowDatePicker(false)}
                    >
                      <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                          <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                              <Text style={styles.modalDoneText}>סיום</Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={birthDate}
                            mode="date"
                            display="spinner"
                            onChange={onDateChange}
                            maximumDate={new Date()}
                            textColor="#5C4033"
                            style={styles.datePicker}
                          />
                        </View>
                      </View>
                    </Modal>
                  )}

                  {Platform.OS === 'android' && showDatePicker && (
                    <DateTimePicker
                      value={birthDate}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </View>

                {/* Phone Number */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    מספר פלאפון{' '}
                    {role === 'walker' ? (
                      <Text style={styles.requiredStar}>*</Text>
                    ) : (
                      <Text style={styles.optionalHint}>(אופציונלי)</Text>
                    )}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.inputInField]}
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    textAlign="right"
                  />
                </View>

                {/* Email */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    אימייל <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, styles.inputInField]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    textAlign="right"
                  />
                </View>

                {/* Password */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    סיסמה <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.passwordInputRow}>
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword((prev) => !prev)}
                      activeOpacity={0.8}
                      accessibilityLabel={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#8B7355"
                      />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.passwordInputInner}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textAlign="right"
                    />
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    אימות סיסמה <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.passwordInputRow}>
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword((prev) => !prev)}
                      activeOpacity={0.8}
                      accessibilityLabel={showConfirmPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#8B7355"
                      />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.passwordInputInner}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textAlign="right"
                    />
                  </View>
                </View>

                <Text style={[styles.fieldLabel, styles.termsFieldLabel]}>
                  אישור תנאי שימוש ומדיניות פרטיות{' '}
                  <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.termsRow}>
                  <Pressable
                    style={styles.termsCheckboxButton}
                    onPress={() => setAcceptedTerms((prev) => !prev)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptedTerms }}
                    accessibilityLabel="אישור קריאת תנאי שימוש ומדיניות פרטיות"
                  >
                    <Ionicons
                      name={acceptedTerms ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={acceptedTerms ? PRIMARY_COLOR : '#8B7355'}
                    />
                  </Pressable>
                  <Text style={styles.termsText}>
                    אני מאשר/ת שקראתי את{' '}
                    <Text style={styles.termsLink} onPress={() => navigation.navigate('TermsPrivacy')}>
                      תנאי השימוש ומדיניות הפרטיות
                    </Text>
                  </Text>
                </View>

                <Text style={styles.requiredFieldLegend}>
                  <Text style={styles.requiredStar}>*</Text> שדה חובה
                </Text>

                {/* Sign Up button */}
                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                  onPress={handleSignUp}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>הרשמה</Text>
                  )}
                </TouchableOpacity>

                {/* Footer link */}
                <View style={styles.footerContainer}>
                  <TouchableOpacity
                    style={styles.footerLink}
                    onPress={() => navigation.navigate('Login')}
                  >
                    <Text style={styles.footerLinkText}>
                      כבר יש לך חשבון? <Text style={styles.footerLinkTextBold}>התחבר כאן</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default SignUpScreen;

const PRIMARY_COLOR = '#7FB069'; // Sage green

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#f5e6d3', // Soft cream/beige
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 35,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#5C4033', // Dark brown
    textAlign: 'center',
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C4033',
    textAlign: 'right',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#D32F2F',
    fontWeight: '700',
  },
  optionalHint: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8B7355',
  },
  termsFieldLabel: {
    marginTop: 2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#faf0e6', // Light beige
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000000',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e0d5c7', // Subtle border
    minHeight: 50,
  },
  inputInField: {
    marginBottom: 0,
  },
  passwordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0d5c7',
    borderRadius: 12,
    backgroundColor: '#faf0e6',
    paddingHorizontal: 10,
    minHeight: 50,
  },
  eyeButton: {
    padding: 6,
  },
  passwordInputInner: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    fontSize: 16,
    color: '#000000',
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5C4033',
    textAlign: 'right',
    marginBottom: 12,
    marginTop: 8,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf0e6', // Light beige for inactive
    borderWidth: 2,
    borderColor: '#e0d5c7',
    minHeight: 75,
  },
  roleButtonActive: {
    backgroundColor: '#E8F5E9', // Lighter sage green tint
    borderColor: PRIMARY_COLOR,
  },
  roleButtonInactive: {
    backgroundColor: '#faf0e6',
    borderColor: '#e0d5c7',
  },
  roleIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C4033', // Dark brown
  },
  roleTextActive: {
    color: '#5C4033',
  },
  roleTextInactive: {
    color: '#5C4033',
  },
  termsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
    gap: 8,
  },
  termsCheckboxButton: {
    padding: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#5C4033',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 18,
  },
  termsLink: {
    color: '#1E6BB8',
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 25,
    paddingVertical: 18,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Rubik',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    zIndex: 10,
  },
  backIcon: {
    color: '#5C4033', // Dark brown
    fontSize: 24,
    fontWeight: 'bold',
  },
  footerContainer: {
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerLink: {
    alignItems: 'center',
  },
  footerLinkText: {
    color: '#5C4033',
    fontSize: 16,
  },
  footerLinkTextBold: {
    fontWeight: '700',
    color: '#5C4033',
  },
  requiredFieldLegend: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#faf0e6',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D5C7',
  },
  modalDoneText: {
    color: PRIMARY_COLOR,
    fontSize: 18,
    fontWeight: '600',
  },
  datePicker: {
    width: '100%',
    height: 200,
  },
});
