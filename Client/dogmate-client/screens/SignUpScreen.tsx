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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../services/api';
import { isValidIsraeliMobileInput } from '../utils/phoneValidation';

const SignUpScreen: React.FC = ({ navigation }: any) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'owner' | 'walker'>('owner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('שדות חסרים', 'אנא מלא את כל השדות.');
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

    if (!isValidIsraeliMobileInput(phoneNumber.trim())) {
      Alert.alert(
        'מספר טלפון לא תקין',
        'נדרש מספר פלאפון ישראלי תקין (למשל 05XXXXXXXX).'
      );
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('נדרש אישור', 'יש לאשר שקראת את תנאי השימוש ומדיניות הפרטיות.');
      return;
    }

    setIsLoading(true);
    try {
      // Call the API to register the user
      const response = await userAPI.register({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        userRole: role,
      });

      let registeredUserId = response?.userId;

      // Fallback: if register response misses userId, login immediately to retrieve it.
      if (!registeredUserId) {
        const loginResponse = await userAPI.login({ email, password });
        registeredUserId = loginResponse?.userId;
      }

      if (!registeredUserId) {
        throw new Error('Registration succeeded, but failed to obtain user ID');
      }

    const registeredRole =
      response?.userRole === 'walker' || response?.userRole === 'owner'
        ? response.userRole
        : role;

    Alert.alert(
      'החשבון נוצר בהצלחה',
      `ברוך הבא ל-DogMate, ${firstName} ${lastName}! (${registeredRole === 'owner' ? 'בעל כלב' : 'דוגווקר'})`
    );

    const homeParams = {
      userId: registeredUserId,
      userFirstName: firstName,
      userLastName: lastName,
      email,
      userRole: registeredRole,
      phoneNumber,
    };

    navigation.reset({
      index: 0,
      routes: [
        {
          name: registeredRole === 'walker' ? 'WalkerHome' : 'Home',
          params: homeParams,
        },
      ],
    });
    } catch (error: any) {
      Alert.alert('הרשמה נכשלה', error.message || 'אירעה שגיאה בעת ההרשמה');
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
        <Text style={styles.backIcon}>←</Text>
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
                <TextInput
                  style={styles.input}
                  placeholder="שם פרטי"
                  placeholderTextColor="#A9B5C7"
                  value={firstName}
                  onChangeText={setFirstName}
                  textAlign="right"
                />

                {/* Last Name */}
                <TextInput
                  style={styles.input}
                  placeholder="שם משפחה"
                  placeholderTextColor="#A9B5C7"
                  value={lastName}
                  onChangeText={setLastName}
                  textAlign="right"
                />

                {/* Role selector */}
                <Text style={styles.roleLabel}>אני נרשם בתור:</Text>
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

                {/* Phone Number */}
                <TextInput
                  style={styles.input}
                  placeholder="מספר פלאפון (חובה, 05…)"
                  placeholderTextColor="#A9B5C7"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  textAlign="right"
                />

                {/* Email */}
                <TextInput
                  style={styles.input}
                  placeholder="אימייל"
                  placeholderTextColor="#A9B5C7"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  textAlign="right"
                />

                {/* Password */}
                <TextInput
                  style={styles.input}
                  placeholder="סיסמה"
                  placeholderTextColor="#A9B5C7"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  textAlign="right"
                />

                {/* Confirm Password */}
                <TextInput
                  style={styles.input}
                  placeholder="אימות סיסמה"
                  placeholderTextColor="#A9B5C7"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  textAlign="right"
                />

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

                {/* Sign Up button */}
                <TouchableOpacity
                  style={[styles.primaryButton, (isLoading || !acceptedTerms) && styles.primaryButtonDisabled]}
                  onPress={handleSignUp}
                  disabled={isLoading || !acceptedTerms}
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
    fontSize: 14,
    color: '#5C4033',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
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
});
