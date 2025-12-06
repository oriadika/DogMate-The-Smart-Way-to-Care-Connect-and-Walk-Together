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
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { userAPI } from '../services/api';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      // Call the login API
      const response = await userAPI.login({
        email,
        password,
      });

      Alert.alert('Logged in', 'Welcome back to DogMate!');

      navigation.navigate('Home', {
        userName: email,
        userRole: 'walker',
      });
    } catch (error: any) {
      Alert.alert('Login failed', error.message || 'An error occurred during login');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/images/dogs_image.jpeg')}
      style={styles.background}
      imageStyle={{ opacity: 0.7 }}
    >
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            {/* Title & subtitle */}
            <Text style={styles.title}>Log in to DogMate</Text>
            <Text style={styles.subtitle}>
              Enter your email and password to access your dogs&apos; walks,
              reminders, and more.
            </Text>

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor="#A9B5C7"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor="#A9B5C7"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

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
                <Text style={styles.primaryButtonText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* Optional: link to Sign Up */}
            <TouchableOpacity
              style={styles.footerLink}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.footerLinkText}>
                Don&apos;t have an account? <Text style={styles.footerLinkTextBold}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default LoginScreen;

const PRIMARY_COLOR = '#2F80ED';

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#D0DEEF',
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#E4ECFA',
  },
  input: {
    backgroundColor: 'rgba(11, 23, 36, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    position: 'absolute',
    top: 45,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    zIndex: 10,
  },
  backIcon: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  footerLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  footerLinkText: {
    color: '#E4ECFA',
    fontSize: 13,
  },
  footerLinkTextBold: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
