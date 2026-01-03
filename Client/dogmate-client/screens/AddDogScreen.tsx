// screens/AddDogScreen.tsx
import React, { useState } from 'react';
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
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const AddDogScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);

  const handleSave = () => {
    // כאן תהיה הלוגיקה לשמירת הכלב בשרת
    console.log({ name, breed, age, weight, gender });
    navigation.goBack(); // סגירת החלונית לאחר שמירה
  };

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
                />
              </View>

              {/* Gender Selection */}
              <Text style={styles.label}>מין:</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[styles.genderButton, gender === 'male' && styles.genderActive]}
                  onPress={() => setGender('male')}
                >
                  <MaterialCommunityIcons 
                    name="gender-male" 
                    size={24} 
                    color={gender === 'male' ? '#fff' : '#8B7355'} 
                  />
                  <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>זכר</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.genderButton, gender === 'female' && styles.genderActive]}
                  onPress={() => setGender('female')}
                >
                  <MaterialCommunityIcons 
                    name="gender-female" 
                    size={24} 
                    color={gender === 'female' ? '#fff' : '#8B7355'} 
                  />
                  <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>נקבה</Text>
                </TouchableOpacity>
              </View>

            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>שמור וצא לדרך!</Text>
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