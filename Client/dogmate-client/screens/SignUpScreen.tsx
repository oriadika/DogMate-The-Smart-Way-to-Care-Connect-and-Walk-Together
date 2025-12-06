// screens/SignUpScreen.tsx
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

const SignUpScreen: React.FC = ({ navigation }: any) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'owner' | 'walker'>('owner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak password', 'Password should be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }

    if (phoneNumber.length !== 10){
      Alert.alert('Invalid phone number', 'Phone number should be 10 digits');
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
      });

    Alert.alert(
      'Account created',
      `Welcome to DogMate, ${firstName} ${lastName}! (${role === 'owner' ? 'Dog Owner' : 'Dog Walker'})`
    );

    navigation.navigate('Home', {
        userFirstName: firstName,
        userLastName: lastName,
        email: email,
        userRole: role,          // 'owner' or 'walker'
        phoneNumber: phoneNumber
      });
    } catch (error: any) {
      Alert.alert('Registration failed', error.message || 'An error occurred during registration');
      console.error('Sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/images/dogs_image.jpeg')} // same background as Home
      style={styles.background}
      imageStyle={{ opacity: 0.7 }}
    >
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
            <Text style={styles.title}>Create your DogMate account</Text>
            <Text style={styles.subtitle}>
              Centralize your dog&apos;s health, routines, and social life in one place.
            </Text>

            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John"
              placeholderTextColor="#A9B5C7"
              value={firstName}
              onChangeText={setFirstName}
            />

            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Doe"
              placeholderTextColor="#A9B5C7"
              value={lastName}
              onChangeText={setLastName}
            />


            {/* Role selector */}
            <Text style={styles.label}>I am a</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === 'owner' && styles.roleButtonActive,
                ]}
                onPress={() => setRole('owner')}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === 'owner' && styles.roleTextActive,
                  ]}
                >
                  Dog Owner
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === 'walker' && styles.roleButtonActive,
                ]}
                onPress={() => setRole('walker')}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === 'walker' && styles.roleTextActive,
                  ]}
                >
                  Dog Walker
                </Text>
              </TouchableOpacity>
            </View>

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

            {/* Phone Number */}
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="05X-XXXXXXX"
              placeholderTextColor="#A9B5C7"
              keyboardType = "phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
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

            {/* Confirm Password */}
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor="#A9B5C7"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {/* Sign Up button */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
              onPress={handleSignUp}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      

    </ImageBackground>
  );
};

export default SignUpScreen;

const PRIMARY_COLOR = '#2F80ED';
const DARK_BLUE = '#0B1724';

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  safeArea: {
    top: 40,
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
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
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  roleButtonActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  roleTextActive: {
    color: '#FFFFFF',
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

});
