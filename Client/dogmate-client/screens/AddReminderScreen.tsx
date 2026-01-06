// screens/AddReminderScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { dogAPI, userAPI, reminderAPI } from '../services/api';

const PRIMARY_COLOR = '#7FB069'; // Sage green
const BG_COLOR = '#FAEFDD'; // Main background
const TEXT_DARK = '#5C4033'; // Dark brown for text
const CARD_BG = '#faf0e6'; // Lighter beige for inputs/cards
const BORDER_COLOR = '#E0D5C7'; // Border color

interface Dog {
  id: string;
  name: string;
  breed: string;
  profileImageUrl?: string;
}

const AddReminderScreen = ({ navigation }: any) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Dog selection state
  const [userId, setUserId] = useState<string | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loadingDogs, setLoadingDogs] = useState(true);
  const [showDogModal, setShowDogModal] = useState(false);
  const [selectedDogs, setSelectedDogs] = useState<string[]>([]); // Array of dog IDs
  const [isSaving, setIsSaving] = useState(false); // Add loading state

  // Format date as DD/MM/YYYY
  const formatDate = (dateToFormat: Date): string => {
    const day = dateToFormat.getDate().toString().padStart(2, '0');
    const month = (dateToFormat.getMonth() + 1).toString().padStart(2, '0');
    const year = dateToFormat.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format time as HH:MM
  const formatTime = (timeToFormat: Date): string => {
    const hours = timeToFormat.getHours().toString().padStart(2, '0');
    const minutes = timeToFormat.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Handle date change
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type !== 'dismissed' && selectedDate) {
        setDate(selectedDate);
      }
    } else {
      // iOS: keep picker open, update date immediately
      if (selectedDate) {
        setDate(selectedDate);
      }
    }
  };

  // Handle time change
  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type !== 'dismissed' && selectedTime) {
        setTime(selectedTime);
      }
    } else {
      // iOS: keep picker open, update time immediately
      if (selectedTime) {
        setTime(selectedTime);
      }
    }
  };

  // Load user and dogs data - same logic as FoodIntakeScreen
  useFocusEffect(
    useCallback(() => {
      loadUserAndDogs();
    }, [])
  );

  const loadUserAndDogs = async () => {
    try {
      setLoadingDogs(true);
      // Fetch current logged-in user
      const userResponse = await userAPI.getLoggedUsers();
      if (userResponse.success && userResponse.users && userResponse.users.length > 0) {
        const currentUser = userResponse.users[0];
        setUserId(currentUser.id);

        // Fetch dogs for this user
        const dogsResponse = await dogAPI.getDogsForUser(currentUser.id);
        if (dogsResponse.success && dogsResponse.dogs) {
          setDogs(dogsResponse.dogs);
        }
      }
    } catch (error: any) {
      console.error('Error loading user/dogs:', error);
      Alert.alert('שגיאה', 'שגיאה בטעינת הנתונים');
    } finally {
      setLoadingDogs(false);
    }
  };

  // Toggle dog selection
  const toggleDogSelection = (dogId: string) => {
    setSelectedDogs((prev) => {
      if (prev.includes(dogId)) {
        return prev.filter((id) => id !== dogId);
      } else {
        return [...prev, dogId];
      }
    });
  };

  // Select all dogs
  const selectAllDogs = () => {
    if (selectedDogs.length === dogs.length) {
      setSelectedDogs([]);
    } else {
      setSelectedDogs(dogs.map((dog) => dog.id));
    }
  };

  // Get display text for selected dogs
  const getSelectedDogsText = (): string => {
    if (selectedDogs.length === 0) {
      return 'בחר כלבים (אופציונלי)';
    }
    // Always return list of selected dog names, even if all dogs are selected
    const selectedDogNames = selectedDogs
      .map((dogId) => {
        const dog = dogs.find((d) => d.id === dogId);
        return dog?.name;
      })
      .filter((name) => name !== undefined) as string[];

    return selectedDogNames.join(', ');
  };

  // Handle save button press
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('שדה חובה', 'אנא הזן שם לאירוע');
      return;
    }

    if (!userId) {
      Alert.alert('שגיאה', 'לא מצא משתמש. אנא נסה שוב.');
      return;
    }

    // Combine date and time
    const reminderDateTime = new Date(date);
    reminderDateTime.setHours(time.getHours());
    reminderDateTime.setMinutes(time.getMinutes());
    reminderDateTime.setSeconds(0);
    reminderDateTime.setMilliseconds(0);

    // Validate that the reminder time is in the future
    if (reminderDateTime <= new Date()) {
      Alert.alert('שגיאה', 'התאריך והשעה חייבים להיות בעתיד');
      return;
    }

    // Get selected dogs names
    const selectedDogsNames = selectedDogs.length > 0
      ? selectedDogs
          .map((dogId) => {
            const dog = dogs.find((d) => d.id === dogId);
            return dog?.name;
          })
          .filter((name) => name !== undefined) as string[]
      : ['(לא נבחרו כלבים)'];

    setIsSaving(true);
    try {
      // Call API to create reminder
      const response = await reminderAPI.createReminder(
        userId,
        title,
        description,
        reminderDateTime
      );

      Alert.alert(
        'תזכורת נשמרה בהצלחה',
        `שם: ${title}\nתיאור: ${description || '(ללא תיאור)'}\nכלבים: ${selectedDogsNames.join(', ')}\nתאריך: ${formatDate(date)}\nשעה: ${formatTime(time)}`,
        [
          {
            text: 'בסדר',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error saving reminder:', error);
      Alert.alert('שגיאה', `שגיאה בשמירת התזכורת: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-forward" size={28} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>הוספת תזכורת חדשה</Text>
          <View style={{ width: 28 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Form Fields Section */}
            <View style={styles.formSection}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>שם האירוע</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן שם לאירוע"
                  placeholderTextColor="#8B7355"
                  textAlign="right"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>תיאור</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="הזן תיאור (אופציונלי)"
                  placeholderTextColor="#8B7355"
                  textAlign="right"
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* Dog Selection Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>למי מיועדת התזכורת?</Text>
                <TouchableOpacity
                  style={styles.pickerInput}
                  onPress={async () => {
                    // Reload dogs before opening modal
                    await loadUserAndDogs();
                    setShowDogModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerText, !selectedDogs.length && styles.pickerPlaceholder]}>
                    {getSelectedDogsText()}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#8B7355" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Date & Time Selection Section */}
            <View style={styles.dateTimeSection}>
              {/* Date Card */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>תאריך</Text>
                <TouchableOpacity
                  style={styles.dateTimeCard}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dateTimeCardContent}>
                    <View style={styles.dateTimeCardLeft}>
                      <MaterialCommunityIcons
                        name="calendar"
                        size={24}
                        color={PRIMARY_COLOR}
                      />
                      <Text style={styles.dateTimeLabel}>
                        {formatDate(date)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Time Card */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>שעה</Text>
                <TouchableOpacity
                  style={styles.dateTimeCard}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dateTimeCardContent}>
                    <View style={styles.dateTimeCardLeft}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={24}
                        color={PRIMARY_COLOR}
                      />
                      <Text style={styles.dateTimeLabel}>
                        {formatTime(time)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>שמור תזכורת</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Date Picker Modal (iOS) */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={styles.modalCloseButton}
                  >
                    <Text style={styles.modalCloseText}>אישור</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>בחר תאריך</Text>
                  <View style={{ width: 60 }} />
                </View>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Time Picker Modal (iOS) */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showTimePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowTimePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(false)}
                    style={styles.modalCloseButton}
                  >
                    <Text style={styles.modalCloseText}>אישור</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>בחר שעה</Text>
                  <View style={{ width: 60 }} />
                </View>
                <DateTimePicker
                  value={time}
                  mode="time"
                  display="spinner"
                  onChange={onTimeChange}
                  is24Hour={true}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Android Date Picker */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Android Time Picker */}
        {Platform.OS === 'android' && showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={onTimeChange}
            is24Hour={true}
          />
        )}

        {/* Dog Selection Modal */}
        <Modal
          visible={showDogModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDogModal(false)}
        >
          <TouchableOpacity
            style={styles.dogModalOverlay}
            activeOpacity={1}
            onPress={() => setShowDogModal(false)}
          >
            <TouchableOpacity
              style={styles.dogModalContainer}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <View style={styles.dogModalHeader}>
                <TouchableOpacity
                  onPress={() => setShowDogModal(false)}
                  style={styles.dogModalCloseButton}
                >
                  <Ionicons name="close" size={24} color={TEXT_DARK} />
                </TouchableOpacity>
                <Text style={styles.dogModalTitle}>בחירת כלבים</Text>
              </View>

              {/* Select All Button */}
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={selectAllDogs}
                activeOpacity={0.7}
              >
                <Text style={styles.selectAllText}>
                  {selectedDogs.length === dogs.length ? 'בטל בחירת הכל' : 'בחר הכל'}
                </Text>
              </TouchableOpacity>

              {/* Dogs List */}
              <ScrollView style={styles.dogsList} showsVerticalScrollIndicator={false}>
                {loadingDogs ? (
                  <View style={styles.noDogsContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                    <Text style={styles.noDogsText}>טוען כלבים...</Text>
                  </View>
                ) : dogs.length === 0 ? (
                  <View style={styles.noDogsContainer}>
                    <Text style={styles.noDogsText}>אין כלבים זמינים</Text>
                  </View>
                ) : (
                  dogs.map((dog) => {
                    const isSelected = selectedDogs.includes(dog.id);
                    return (
                      <TouchableOpacity
                        key={dog.id}
                        style={styles.dogItem}
                        onPress={() => toggleDogSelection(dog.id)}
                        activeOpacity={0.7}
                      >
                        {/* Left side: Avatar + Name */}
                        <View style={styles.dogLeftSide}>
                          <View style={styles.dogAvatarContainer}>
                            {dog.profileImageUrl ? (
                              <Image
                                source={{ uri: dog.profileImageUrl }}
                                style={styles.dogAvatar}
                              />
                            ) : (
                              <View style={styles.dogAvatarPlaceholder}>
                                <FontAwesome5 name="dog" size={30} color="#8B7355" />
                              </View>
                            )}
                          </View>
                          <Text style={styles.dogName}>{dog.name}</Text>
                        </View>

                        {/* Right side: Checkbox */}
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              {/* Confirm Button */}
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => setShowDogModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmButtonText}>אישור</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

export default AddReminderScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  formSection: {
    marginBottom: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 8,
    textAlign: 'right', // RTL
  },
  input: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: TEXT_DARK,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    textAlign: 'right', // RTL
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  dateTimeSection: {
    marginBottom: 24,
  },
  dateTimeCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateTimeCardContent: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTimeCardLeft: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 16,
    color: TEXT_DARK,
    fontWeight: '600',
    marginRight: 12,
    textAlign: 'right', // RTL
  },
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#A9BBA3',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  // Modal styles for iOS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: BG_COLOR,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right', // RTL
  },
  // Dog selection styles
  pickerInput: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pickerText: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right', // RTL
    flex: 1,
  },
  pickerPlaceholder: {
    color: '#8B7355',
  },
  dogModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dogModalContainer: {
    backgroundColor: BG_COLOR,
    borderRadius: 20,
    width: '80%',
    maxWidth: 360,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  dogModalHeader: {
    flexDirection: 'row', // LTR for close button on left, title on right
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  dogModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right', // RTL
    flex: 1,
  },
  dogModalCloseButton: {
    padding: 5,
  },
  selectAllButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'flex-end', // RTL
  },
  selectAllText: {
    fontSize: 16,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  dogsList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  noDogsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  dogItem: {
    flexDirection: 'row', // LTR for avatar/name, checkbox on right
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  dogLeftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dogAvatarContainer: {
    marginRight: 12,
  },
  dogAvatar: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
  },
  dogAvatarPlaceholder: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#E8DCC8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4C4A8',
  },
  dogName: {
    fontSize: 19,
    color: TEXT_DARK,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right', // RTL
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#8B7355',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  confirmButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

