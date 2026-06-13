import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../services/api';

const CODE_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'request' | 'reset';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const codeInputRef = useRef<TextInput>(null);

  const emailTrimmed = email.trim();
  const isEmailValid = useMemo(() => EMAIL_PATTERN.test(emailTrimmed), [emailTrimmed]);
  const isCodeValid = useMemo(() => /^\d{6}$/.test(code), [code]);

  const resetValidationError = useMemo(() => {
    if (!isCodeValid) {
      return 'יש להזין קוד בן 6 ספרות';
    }
    if (!newPassword.trim() || !confirmPassword.trim()) {
      return 'יש למלא את שדות הסיסמה';
    }
    if (newPassword !== confirmPassword) {
      return 'הסיסמה החדשה ואימות הסיסמה אינם תואמים';
    }
    return null;
  }, [isCodeValid, newPassword, confirmPassword]);

  const setCodeDigits = (raw: string) => {
    setCode(raw.replace(/\D/g, '').slice(0, CODE_LENGTH));
  };

  useEffect(() => {
    if (step !== 'reset') return;
    const t = setTimeout(() => codeInputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, [step]);

  const nextEmptyIndex = code.length < CODE_LENGTH ? code.length : -1;

  const handleRequestCode = async () => {
    if (!emailTrimmed) {
      Alert.alert('שדה חסר', 'אנא הזן את כתובת האימייל');
      return;
    }
    if (!isEmailValid) {
      Alert.alert('אימייל לא תקין', 'אנא הזן כתובת אימייל תקינה');
      return;
    }
    try {
      setRequesting(true);
      const response = await userAPI.forgotPassword({ email: emailTrimmed });
      const mailOk = response?.resetEmailSent !== false;
      Alert.alert(
        mailOk ? 'קוד נשלח' : 'שימו לב',
        mailOk
          ? 'קוד לאיפוס סיסמה נשלח למייל שלך. הקוד תקף ל-5 דקות.'
          : 'השרת לא הצליח לשלוח מייל (חסרה הגדרת SMTP). הקוד מופיע בלוג השרת.'
      );
      setStep('reset');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('שליחה נכשלה', error?.message || 'לא הצלחנו לשלוח קוד איפוס');
    } finally {
      setRequesting(false);
    }
  };

  const handleResetPassword = async () => {
    if (resetValidationError) {
      Alert.alert('שגיאה', resetValidationError);
      return;
    }
    try {
      setResetting(true);
      await userAPI.resetPassword({
        email: emailTrimmed,
        code,
        newPassword,
      });
      Alert.alert('הצלחה', 'הסיסמה עודכנה. אפשר להתחבר עם הסיסמה החדשה.', [
        { text: 'התחברות', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      Alert.alert('איפוס נכשל', error?.message || 'לא ניתן לאפס את הסיסמה');
    } finally {
      setResetting(false);
    }
  };

  const handleResendCode = async () => {
    if (!emailTrimmed || !isEmailValid) {
      Alert.alert('שגיאה', 'אימייל לא תקין');
      return;
    }
    try {
      setRequesting(true);
      const response = await userAPI.forgotPassword({ email: emailTrimmed });
      const mailOk = response?.resetEmailSent !== false;
      Alert.alert(
        mailOk ? 'נשלח קוד חדש' : 'שימו לב',
        mailOk ? 'קוד איפוס חדש נשלח למייל שלך' : 'המייל לא נשלח — בדוק את הגדרות SMTP בשרת'
      );
      setCode('');
    } catch (error: any) {
      Alert.alert('שליחה נכשלה', error?.message || 'לא הצלחנו לשלוח קוד חדש');
    } finally {
      setRequesting(false);
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
          <Text style={styles.headerTitle}>
            {step === 'request' ? 'שכחת סיסמה' : 'איפוס סיסמה'}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (step === 'reset' ? setStep('request') : navigation.goBack())}
          >
            <Ionicons name="arrow-forward" size={24} color="#5C4033" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {step === 'request' ? (
            <>
              <Text style={styles.description}>
                הזן את כתובת האימייל של החשבון שלך ונשלח אליך קוד בן 6 ספרות לאיפוס הסיסמה.
              </Text>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>אימייל</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  textAlign="right"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!isEmailValid || requesting) && styles.buttonDisabled,
                ]}
                onPress={handleRequestCode}
                disabled={!isEmailValid || requesting}
              >
                {requesting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>שלח קוד</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.description}>
                הזן את הקוד שנשלח אל{'\n'}
                <Text style={styles.emailText}>{emailTrimmed}</Text>
                {'\n\n'}
                ולאחר מכן בחר סיסמה חדשה.
              </Text>

              <View style={styles.otpTouchable}>
                <View style={styles.otpRow} pointerEvents="none">
                  {Array.from({ length: CODE_LENGTH }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.otpCell,
                        nextEmptyIndex === i && styles.otpCellActive,
                        code[i] ? styles.otpCellFilled : null,
                      ]}
                    >
                      <Text style={styles.otpDigit}>{code[i] ?? ''}</Text>
                    </View>
                  ))}
                </View>
                <TextInput
                  ref={codeInputRef}
                  value={code}
                  onChangeText={setCodeDigits}
                  keyboardType="number-pad"
                  maxLength={CODE_LENGTH}
                  textContentType="oneTimeCode"
                  autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                  caretHidden
                  style={styles.otpHiddenInput}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>סיסמה חדשה</Text>
                <View style={styles.passwordInputRow}>
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#8B7355"
                    />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.passwordInputInner}
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textAlign="right"
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>אימות סיסמה</Text>
                <View style={styles.passwordInputRow}>
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    activeOpacity={0.8}
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

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (resetValidationError || resetting) && styles.buttonDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={!!resetValidationError || resetting}
              >
                {resetting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>עדכן סיסמה</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resendButton, requesting && styles.buttonDisabled]}
                onPress={handleResendCode}
                disabled={requesting}
              >
                {requesting ? (
                  <ActivityIndicator color="#7FB069" />
                ) : (
                  <Text style={styles.resendButtonText}>שלח קוד שוב</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
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
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  description: {
    textAlign: 'center',
    color: '#5C4033',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  emailText: {
    fontWeight: '700',
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
  input: {
    backgroundColor: '#faf0e6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#e0d5c7',
    minHeight: 50,
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
  otpTouchable: {
    marginBottom: 20,
    height: 52,
    position: 'relative',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 52,
  },
  otpCell: {
    width: 44,
    height: 48,
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D4C4B0',
    backgroundColor: '#faf0e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellFilled: {
    borderColor: '#B8A994',
  },
  otpCellActive: {
    borderColor: '#7FB069',
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'center',
    minWidth: 14,
  },
  otpHiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
    color: 'transparent',
  },
  primaryButton: {
    backgroundColor: '#7FB069',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  resendButtonText: {
    color: '#7FB069',
    fontSize: 16,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});
