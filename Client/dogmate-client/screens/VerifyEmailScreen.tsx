import React, { useMemo, useState } from 'react';
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

export default function VerifyEmailScreen({ navigation, route }: any) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const email = String(route?.params?.email || '').trim();
  const password = String(route?.params?.password || '');
  const userId = String(route?.params?.userId || '').trim();
  /** OTP is only for the signup flow; not for already-registered users. */
  const fromSignUp = route?.params?.fromSignUp === true;
  const userRole = route?.params?.userRole === 'walker' ? 'walker' : 'owner';
  const firstName = String(route?.params?.firstName || '').trim();
  const lastName = String(route?.params?.lastName || '').trim();
  const phoneNumber = String(route?.params?.phoneNumber || '').trim();

  const isCodeValid = useMemo(() => /^\d{6}$/.test(code), [code]);

  const handleVerify = async () => {
    if (!email) {
      Alert.alert('שגיאה', 'לא נמצא אימייל לאימות');
      return;
    }
    if (!isCodeValid) {
      Alert.alert('קוד לא תקין', 'יש להזין קוד בן 6 ספרות');
      return;
    }
    try {
      setVerifying(true);
      await userAPI.verifyRegistration({ email, code });

      if (password) {
        const loginResponse = await userAPI.login({ email, password });
        const role = loginResponse?.userRole === 'walker' ? 'walker' : userRole;
        navigation.reset({
          index: 0,
          routes: [
            {
              name: role === 'walker' ? 'WalkerHome' : 'Home',
              params: {
                userId: loginResponse?.userId || userId,
                email,
                userFirstName: loginResponse?.firstName || firstName || email,
                userLastName: loginResponse?.lastName || lastName,
                userRole: role,
                phoneNumber: loginResponse?.phoneNumber || phoneNumber,
              },
            },
          ],
        });
        return;
      }

      Alert.alert('הצלחה', 'האימייל אומת בהצלחה. אפשר להתחבר.');
      navigation.navigate('Login');
    } catch (error: any) {
      Alert.alert('האימות נכשל', error?.message || 'לא ניתן לאמת את הקוד');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert('שגיאה', 'לא נמצא אימייל לשליחת קוד');
      return;
    }
    try {
      setResending(true);
      await userAPI.resendVerification({ email });
      Alert.alert('נשלח קוד חדש', 'קוד אימות חדש נשלח למייל שלך');
    } catch (error: any) {
      Alert.alert('שליחה נכשלה', error?.message || 'לא הצלחנו לשלוח קוד חדש');
    } finally {
      setResending(false);
    }
  };

  if (!fromSignUp) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>אימות מייל</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={24} color="#5C4033" />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={styles.description}>
            קוד אימות נשלח רק כשמתחילים הרשמה חדשה מדף ההרשמה.{'\n\n'}
            אם יש לך כבר חשבון — התחבר. אם לא סיימת הרשמה — חזור לדף ההרשמה.
          </Text>
          <TouchableOpacity style={styles.verifyButton} onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.verifyButtonText}>לדף הרשמה</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resendButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.resendButtonText}>התחברות</Text>
          </TouchableOpacity>
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
          <Text style={styles.headerTitle}>אימות מייל</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={24} color="#5C4033" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            שלחנו קוד אימות בן 6 ספרות אל{'\n'}
            <Text style={styles.emailText}>{email || 'המייל שלך'}</Text>
            {'\n\n'}
            החשבון ייווצר רק אחרי הזנת הקוד.
          </Text>

          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
            placeholder="הזן קוד בן 6 ספרות"
            placeholderTextColor="#A9B5C7"
            keyboardType="number-pad"
            textAlign="center"
            maxLength={6}
          />

          <TouchableOpacity
            style={[styles.verifyButton, (!isCodeValid || verifying) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={!isCodeValid || verifying}
          >
            {verifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.verifyButtonText}>אמת</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resendButton, resending && styles.buttonDisabled]}
            onPress={handleResend}
            disabled={resending}
          >
            {resending ? (
              <ActivityIndicator color="#7FB069" />
            ) : (
              <Text style={styles.resendButtonText}>שלח קוד שוב</Text>
            )}
          </TouchableOpacity>
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
    paddingTop: 32,
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
  input: {
    backgroundColor: '#faf0e6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0d5c7',
    paddingVertical: 16,
    fontSize: 24,
    letterSpacing: 10,
    color: '#5C4033',
    marginBottom: 20,
  },
  verifyButton: {
    backgroundColor: '#7FB069',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  verifyButtonText: {
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
