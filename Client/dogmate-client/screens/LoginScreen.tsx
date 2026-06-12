// screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../services/dogmateApi';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('שדות חסרים', 'אנא מלא את האימייל והסיסמה.');
      return;
    }

    setIsLoading(true);
    try {
      // Call the login API
      const response = await userAPI.login({
        email,
        password,
      });

      Alert.alert('התחברת בהצלחה', 'ברוך שובך ל-DogMate!');
      if (response.userRole === 'admin') {
          navigation.navigate('Admin', {
            userId: response.userId,
            email: response.email
          });
        }
      else {
          const role = response.userRole || 'owner';
          navigation.reset({
              index: 0,
              routes: [{
                  name: role === 'walker' ? 'WalkerHome' : 'Home',
                  params: {
                      userId: response.userId,
                      email: response.email || email.trim(),
                      userFirstName: response.firstName || response.email || email.trim(),
                      userLastName: response.lastName || '',
                      userRole: role,
                      phoneNumber: response.phoneNumber || '',
                  }
              }],
          });
    }
    } catch (error: any) {
      const errorMessage = error?.message || 'אירעה שגיאה בעת ההתחברות';
      Alert.alert('התחברות נכשלה', errorMessage);
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.background}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Start')}
      >
        <Text style={styles.backIcon}>→</Text>
      </TouchableOpacity>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            {/* Title - centered at top */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>התחברות</Text>
            </View>

            {/* Email */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>אימייל</Text>
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
              <Text style={styles.fieldLabel}>סיסמה</Text>
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

            {/* Forgot password link */}
            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>שכחת סיסמה?</Text>
            </TouchableOpacity>

            {/* Login button */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>התחברות</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Optional: link to Sign Up */}
          <TouchableOpacity
            style={styles.footerLink}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.footerLinkText}>
              עדיין אין לך חשבון? <Text style={styles.footerLinkTextBold}>הרשמה</Text>
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default LoginScreen;

const PRIMARY_COLOR = '#7FB069'; // More vibrant sage green

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#f5e6d3', // Soft cream/beige
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 70,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#5C4033', // Dark brown
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'right',
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
    backgroundColor: '#faf0e6', // Light beige
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000000',
    marginBottom: 24,
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
  forgotPasswordLink: {
    marginTop: 2,
    marginBottom: 4,
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: '#5C4033', // Dark brown
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  primaryButton: {
    marginTop: 24,
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
  footerLink: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  footerLinkText: {
    color: '#5C4033', // Dark brown
    fontSize: 16,
  },
  footerLinkTextBold: {
    fontWeight: '700',
    color: '#5C4033', // Dark brown
  },
});
