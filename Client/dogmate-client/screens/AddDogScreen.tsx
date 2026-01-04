// screens/AddDogScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { dogAPI, userAPI } from '../services/api';

const AddDogScreen = ({ navigation }: any) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch current user on screen mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      setLoadingUser(true);
      // Try to get logged-in users list (this gives us the current user)
      const response = await userAPI.getLoggedUsers();
      
      if (response.success && response.users && response.users.length > 0) {
        // Get the first logged-in user (or you can filter by current user)
        const currentUser = response.users[0];
        setUserId(currentUser.id);
      } else {
        Alert.alert('שגיאה', 'לא נמצא משתמש מחובר');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Error fetching current user:', error);
      Alert.alert('שגיאה', 'שגיאה בטעינת נתוני המשתמש');
      navigation.goBack();
    } finally {
      setLoadingUser(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('שגיאה', 'אנא הזן את שם הכלב');
      return;
    }
    if (!breed.trim()) {
      Alert.alert('שגיאה', 'אנא הזן את גזע הכלב');
      return;
    }
    if (!age.trim()) {
      Alert.alert('שגיאה', 'אנא הזן את גיל הכלב');
      return;
    }
    if (!gender) {
      Alert.alert('שגיאה', 'אנא בחר את מין הכלב');
      return;
    }

    setLoading(true);

    try {
      // Use the userId that was fetched on mount
      if (!userId) {
        Alert.alert('שגיאה', 'לא נמצא משתמש. אנא התחבר מחדש');
        setLoading(false);
        return;
      }

      // Calculate birthdate from age
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - parseInt(age);
      const birthdate = `${birthYear}-01-01`; // Format: YYYY-MM-DD

      // Call API to add dog
      const response = await dogAPI.addDog({
        userId,
        name: name.trim(),
        breed: breed.trim(),
        birthdate,
        gender,
        profileImageUrl: undefined, // Image upload can be added later
      });

      if (response.success) {
        Alert.alert('הצלחה', `${name} נוסף בהצלחה! 🐕`, [
          {
            text: 'בסדר',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error adding dog:', error);
      Alert.alert('שגיאה', error.message || 'שגיאה בהוספת הכלב');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while fetching user
  if (loadingUser) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#7FB069" />
        <Text style={{ marginTop: 10, color: '#5C4033' }}>טוען נתונים...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#5C4033" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>הוספת חבר חדש</Text>
          <View style={{ width: 28 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content}>
            
            {/* Image Picker Placeholder */}
            <TouchableOpacity 
              style={styles.imagePicker}
              onPress={() => Alert.alert('הוסף תמונה', 'פונקציונליות זו תתווסף בקרוב')}
            >
              <View style={styles.imageCircle}>
                <MaterialCommunityIcons name="camera-plus" size={40} color="#8B7355" />
              </View>
              <Text style={styles.imageLabel}>הוסף תמונה</Text>
            </TouchableOpacity>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>שם הכלב:</Text>
                <TextInput
                  style={styles.input}
                  placeholderTextColor="#A9B5C7"
                  textAlign="right"
                  value={name}
                  onChangeText={setName}
                  editable={!loading}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 0.48, marginLeft: 10 }]}>
                  <Text style={styles.label}>גזע:</Text>
                  <TextInput
                    style={styles.input}
                    placeholderTextColor="#A9B5C7"
                    textAlign="right"
                    value={breed}
                    onChangeText={setBreed}
                    editable={!loading}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 0.48 }]}>
                  <Text style={styles.label}>גיל (שנים):</Text>
                  <TextInput
                    style={styles.input}
                    placeholderTextColor="#A9B5C7"
                    keyboardType="numeric"
                    textAlign="right"
                    value={age}
                    onChangeText={setAge}
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>משקל (ק״ג):</Text>
                <TextInput
                  style={styles.input}
                  placeholderTextColor="#A9B5C7"
                  keyboardType="numeric"
                  textAlign="right"
                  value={weight}
                  onChangeText={setWeight}
                  editable={!loading}
                />
              </View>

              {/* Gender Selection */}
              <Text style={styles.label}>מין:</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[styles.genderButton, gender === 'M' && styles.genderActive]}
                  onPress={() => setGender('M')}
                  disabled={loading}
                >
                  <MaterialCommunityIcons 
                    name="gender-male" 
                    size={24} 
                    color={gender === 'M' ? '#fff' : '#8B7355'} 
                  />
                  <Text style={[styles.genderText, gender === 'M' && styles.genderTextActive]}>זכר</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.genderButton, gender === 'F' && styles.genderActive]}
                  onPress={() => setGender('F')}
                  disabled={loading}
                >
                  <MaterialCommunityIcons 
                    name="gender-female" 
                    size={24} 
                    color={gender === 'F' ? '#fff' : '#8B7355'} 
                  />
                  <Text style={[styles.genderText, gender === 'F' && styles.genderTextActive]}>נקבה</Text>
                </TouchableOpacity>
              </View>

            </View>

            {/* Save Button */}
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>שמור וצא לדרך!</Text>
              )}
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default AddDogScreen;

const PRIMARY_COLOR = '#7FB069'; // Sage green

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5e6d3', // Beige background
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
  },
  content: {
    padding: 24,
  },
  imagePicker: {
    alignItems: 'center',
    marginBottom: 30,
  },
  imageCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8DCC8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4C4A8',
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  imageLabel: {
    color: '#8B7355',
    fontWeight: '600',
  },
  formContainer: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    color: '#5C4033',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#faf0e6', // Light beige fill inside inputs
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0D5C7',
    textAlign: 'right', // תמיכה בעברית
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  genderButton: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf0e6',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D5C7',
    gap: 8,
  },
  genderActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  genderText: {
    fontSize: 16,
    color: '#8B7355',
    fontWeight: '600',
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});