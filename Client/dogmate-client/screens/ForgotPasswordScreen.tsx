// screens/ForgotPasswordScreen.tsx
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
  ScrollView,
} from 'react-native';

const PRIMARY_COLOR = '#7FB069'; // More vibrant sage green

const ForgotPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');

  const handleSendResetLink = async () => {
    Alert.alert('שלח קישור לאיפוס סיסמה', 'פונקציונליות זו תתווסף בקרוב');
  };

  return (
    <View style={styles.background}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
              {/* Title - centered at top */}
              <View style={styles.titleContainer}>
                <Text style={styles.title}>איפוס סיסמה</Text>
              </View>

              {/* Subtitle */}
              <Text style={styles.subtitle}>
                הזן את כתובת האימייל שלך כדי לקבל קישור לאיפוס סיסמה.
              </Text>

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

              {/* Send Reset Link button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSendResetLink}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>שלח קישור לאיפוס סיסמה</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#f5e6d3', // Soft cream/beige
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#5C4033', // Dark brown
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#5C4033',
    textAlign: 'center',
    marginBottom: 50,
    lineHeight: 24,
    paddingHorizontal: 10,
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
  primaryButton: {
    marginTop: 30,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 25,
    paddingVertical: 18,
    alignItems: 'center',
    width: '100%',
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
    left: 20,
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
});

