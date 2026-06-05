// screens/Health/FoodIntakeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { dogAPI, userAPI, foodStockAPI, type FoodStockRow } from '../../services/api';
import ReminderSettingsSection from '../../components/health/ReminderSettingsSection';
import { DEFAULT_FOOD_NOTIFICATION, type FoodNotificationSettings } from '../../types/notifications';
import { resyncAllNotifications } from '../../services/notificationScheduler';
import { useScreenLifecycleGuard } from '../../utils/screenLifecycle';

const PRIMARY_COLOR = '#7FB069'; // Sage green

interface Dog {
  id: string;
  name: string;
  breed: string;
  profileImageUrl?: string;
}

const FoodIntakeScreen = ({ navigation, route }: any) => {
  const inventoryId = route?.params?.inventoryId as string | undefined;
  const isEditMode = Boolean(inventoryId);

  const [userId, setUserId] = useState<string | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDogModal, setShowDogModal] = useState(false);
  const [selectedDogs, setSelectedDogs] = useState<string[]>([]);
  const [dailyConsumption, setDailyConsumption] = useState('');
  const [bagSize, setBagSize] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [foodStockId, setFoodStockId] = useState<string | null>(inventoryId ?? null);
  const [notificationSettings, setNotificationSettings] = useState<FoodNotificationSettings>(
    DEFAULT_FOOD_NOTIFICATION
  );

  const {
    isMountedRef,
    markMounted,
    beginAsyncWork,
    isAsyncWorkCurrent,
    runDeferredBlurCleanup,
  } = useScreenLifecycleGuard();

  const loadInitialData = useCallback(async (editStockId?: string) => {
    const generation = beginAsyncWork();
    try {
      if (!isAsyncWorkCurrent(generation)) return;
      setLoading(true);
      const userResponse = await userAPI.getLoggedUsers();
      if (!isAsyncWorkCurrent(generation)) return;
      if (!userResponse.success || !userResponse.users?.length) {
        Alert.alert('שגיאה', 'לא נמצא משתמש מחובר');
        return;
      }

      const currentUser = userResponse.users[0];
      setUserId(currentUser.id);

      const dogsResponse = await dogAPI.getDogsForUser(currentUser.id);
      if (!isAsyncWorkCurrent(generation)) return;
      if (dogsResponse.success && dogsResponse.dogs) {
        setDogs(dogsResponse.dogs);
      }

      if (editStockId) {
        setFoodStockId(editStockId);
        const stocksResponse = await foodStockAPI.getFoodStocksForUser(currentUser.id);
        if (!isAsyncWorkCurrent(generation)) return;
        const stock: FoodStockRow | undefined = stocksResponse.foodStocks?.find(
          (s: FoodStockRow) => s.id === editStockId
        );

        if (!stock) {
          if (!isAsyncWorkCurrent(generation)) return;
          Alert.alert('שגיאה', 'מלאי מזון לא נמצא', [
            { text: 'אישור', onPress: () => navigation.goBack() },
          ]);
          return;
        }

        setBagSize(String(stock.bagSizeInKg));
        setCurrentAmount(String(stock.currentLevelInKg));
        setDailyConsumption(String(stock.dailyConsumptionInGram));
        setSelectedDogs(stock.dogs?.map((d) => d.id) ?? []);
        setNotificationSettings({
          notificationEnabled: stock.notificationEnabled ?? DEFAULT_FOOD_NOTIFICATION.notificationEnabled,
          lowStockThresholdDays:
            stock.lowStockThresholdDays ?? DEFAULT_FOOD_NOTIFICATION.lowStockThresholdDays,
        });
      }
    } catch (error: any) {
      if (!isAsyncWorkCurrent(generation)) return;
      console.error('Error loading food intake data:', error);
      Alert.alert('שגיאה', error?.message || 'שגיאה בטעינת הנתונים');
    } finally {
      if (isAsyncWorkCurrent(generation)) {
        setLoading(false);
      }
    }
  }, [beginAsyncWork, isAsyncWorkCurrent, navigation]);

  useFocusEffect(
    useCallback(() => {
      markMounted();
      void loadInitialData(inventoryId);
      return () => {
        runDeferredBlurCleanup(() => {
          if (!isMountedRef.current) return;
          setShowDogModal(false);
        });
      };
    }, [inventoryId, loadInitialData, markMounted, runDeferredBlurCleanup, isMountedRef])
  );

  const refreshDogsList = async () => {
    const uid = userId;
    if (!uid) return;
    try {
      const dogsResponse = await dogAPI.getDogsForUser(uid);
      if (dogsResponse.success && dogsResponse.dogs) {
        setDogs(dogsResponse.dogs);
      }
    } catch (error) {
      console.warn('Failed to refresh dogs list:', error);
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
      return 'יש לבחור כלב אחד או יותר';
    }
    if (selectedDogs.length === dogs.length) {
      return 'כל הכלבים';
    }
    // Return list of selected dog names
    const selectedDogNames = selectedDogs
      .map((dogId) => {
        const dog = dogs.find((d) => d.id === dogId);
        return dog?.name;
      })
      .filter((name) => name !== undefined) as string[];
    return selectedDogNames.join(', ');
  };

  // Calculate and add to inventory
  const handleCalculate = async () => {
    // Validation
    if (selectedDogs.length === 0) {
      Alert.alert('שגיאה', 'אנא בחר כלב אחד לפחות');
      return;
    }

    if (!dailyConsumption || !bagSize || !currentAmount) {
      Alert.alert('שדות חסרים', 'אנא מלא את כל השדות הנדרשים');
      return;
    }

    const dailyGrams = parseFloat(dailyConsumption);
    const bagKg = parseFloat(bagSize);
    const currentKg = parseFloat(currentAmount);
    const bagGrams = bagKg * 1000;

    if (isNaN(dailyGrams) || isNaN(bagGrams) || isNaN(currentKg) || dailyGrams <= 0 || bagGrams <= 0 || currentKg < 0) {
      Alert.alert('שגיאה', 'אנא הזן ערכים תקינים');
      return;
    }

    if (currentKg > bagKg) {
      Alert.alert('שגיאה', 'כמות נוכחית לא יכולה להיות גדולה מגודל השק');
      return;
    }

    // Calculate days remaining until bag is finished
    // currentAmount is in kg, dailyConsumption is in grams
    const currentGrams = currentKg * 1000;
    const daysRemaining = Math.floor(currentGrams / dailyGrams);

    // Create array of dog info for all selected dogs
    const selectedDogsInfo = selectedDogs
      .map((dogId) => {
        const dog = dogs.find((d) => d.id === dogId);
        if (!dog) return null;
        return {
          id: dogId,
          name: dog.name,
          imageUrl: dog.profileImageUrl,
        };
      })
      .filter((item) => item !== null);

    if (selectedDogsInfo.length === 0) {
      Alert.alert('שגיאה', 'לא נמצאו כלבים תקינים');
      return;
    }

    try {
      setSaving(true);

      if (isEditMode && foodStockId && userId) {
        await foodStockAPI.updateFoodStock(
          foodStockId,
          'מזון כלבים',
          bagKg,
          dailyGrams,
          currentKg,
          notificationSettings.notificationEnabled,
          notificationSettings.lowStockThresholdDays
        );

        const stocksResponse = await foodStockAPI.getFoodStocksForUser(userId);
        const stock: FoodStockRow | undefined = stocksResponse.foodStocks?.find(
          (s: FoodStockRow) => s.id === foodStockId
        );
        const linkedDogIds = new Set(stock?.dogs?.map((d) => d.id) ?? []);
        for (const dogId of selectedDogs) {
          if (!linkedDogIds.has(dogId)) {
            await foodStockAPI.connectFoodStockToDog(dogId, foodStockId);
          }
        }

        await resyncAllNotifications(userId);

        Alert.alert('הצלחה', 'מלאי המזון עודכן בהצלחה!', [
          {
            text: 'אישור',
            onPress: () => navigation.navigate('FoodInventoryHub', { refresh: true }),
          },
        ]);
        return;
      }

      // Save to database - create food stock for the first dog
      const firstDogId = selectedDogs[0];
      const response = await foodStockAPI.createFoodStock(
        firstDogId,
        'מזון כלבים', // Default brand name
        bagKg,
        dailyGrams,
        currentKg
      );

      // If there are more dogs, connect the food stock to them
      if (selectedDogs.length > 1 && response.foodStock?.id) {
        for (let i = 1; i < selectedDogs.length; i++) {
          try {
            await foodStockAPI.connectFoodStockToDog(selectedDogs[i], response.foodStock.id);
          } catch (connectError) {
            console.error('Failed to connect food stock to dog:', connectError);
          }
        }
      }

      if (response.foodStock?.id) {
        await foodStockAPI.updateFoodStock(
          response.foodStock.id,
          'מזון כלבים',
          bagKg,
          dailyGrams,
          currentKg,
          notificationSettings.notificationEnabled,
          notificationSettings.lowStockThresholdDays
        );
      }

      if (userId) {
        await resyncAllNotifications(userId);
      }

      Alert.alert('הצלחה', 'מלאי המזון נשמר בהצלחה!', [
        {
          text: 'אישור',
          onPress: () => navigation.navigate('FoodInventoryHub', { refresh: true }),
        },
      ]);
    } catch (error: any) {
      console.error('Error saving food stock:', error);
      Alert.alert('שגיאה', error.message || 'שגיאה בשמירת מלאי המזון');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>טוען נתונים...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>
            {isEditMode ? 'עריכת מלאי מזון' : 'חישוב מלאי מזון'}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-forward" size={28} color="#5C4033" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Dog Selection Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>למי מיועד האוכל?</Text>
            <TouchableOpacity
              style={styles.pickerInput}
              onPress={async () => {
                await refreshDogsList();
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

          {/* Daily Consumption Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>צריכה יומית (גרם)</Text>
            <TextInput
              style={styles.input}
              placeholder="הזן צריכה יומית בגרם"
              placeholderTextColor="#8B7355"
              keyboardType="numeric"
              value={dailyConsumption}
              onChangeText={setDailyConsumption}
              textAlign="right"
            />
          </View>

          {/* Bag Size Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>גודל שק מזון (ק״ג)</Text>
            <TextInput
              style={styles.input}
              placeholder="הזן גודל שק בקילוגרמים"
              placeholderTextColor="#8B7355"
              keyboardType="numeric"
              value={bagSize}
              onChangeText={setBagSize}
              textAlign="right"
            />
          </View>

          {/* Current Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>כמות נוכחית במלאי (ק״ג)</Text>
            <View style={styles.inputWithButtonContainer}>
              <TextInput
                style={styles.inputWithButtonText}
                placeholder="הזן כמות נוכחית בקילוגרמים"
                placeholderTextColor="#8B7355"
                keyboardType="numeric"
                value={currentAmount}
                onChangeText={setCurrentAmount}
                textAlign="right"
              />
              <TouchableOpacity
                style={styles.newBagButton}
                onPress={() => {
                  if (bagSize) {
                    setCurrentAmount(bagSize);
                  } else {
                    Alert.alert('שגיאה', 'אנא הזן תחילה את גודל שק המזון');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.newBagButtonText}>שק חדש</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ReminderSettingsSection
            variant="food"
            value={notificationSettings}
            onChange={setNotificationSettings}
          />

          {/* Calculate Button */}
          <TouchableOpacity
            style={[styles.calculateButton, saving && styles.calculateButtonDisabled]}
            onPress={handleCalculate}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.calculateButtonText}>
                {isEditMode ? 'שמור שינויים' : 'חשב והצג'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Dog Selection Modal */}
        <Modal
          visible={showDogModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDogModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDogModal(false)}
          >
            <TouchableOpacity
              style={styles.modalContainer}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setShowDogModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#5C4033" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>בחירת כלבים</Text>
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
                {dogs.length === 0 ? (
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
      </View>
    </SafeAreaView>
  );
};

export default FoodIntakeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAEFDD',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#5C4033',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D5C7',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#5C4033',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  pickerInput: {
    backgroundColor: '#F6D9B7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  pickerText: {
    fontSize: 16,
    color: '#5C4033',
    textAlign: 'right',
    flex: 1,
  },
  pickerPlaceholder: {
    color: '#8B7355',
  },
  input: {
    backgroundColor: '#F6D9B7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#5C4033',
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  inputWithButtonContainer: {
    backgroundColor: '#F6D9B7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  inputWithButtonText: {
    fontSize: 16,
    color: '#5C4033',
    textAlign: 'right',
    flex: 1,
  },
  newBagButton: {
    backgroundColor: '#FAEFDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  newBagButtonText: {
    color: '#5C4033',
    fontSize: 14,
    fontWeight: '600',
  },
  calculateButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  calculateButtonDisabled: {
    opacity: 0.7,
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FAEFDD',
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D5C7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'right',
    flex: 1,
  },
  modalCloseButton: {
    padding: 5,
  },
  selectAllButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'flex-end',
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
  noDogsText: {
    fontSize: 16,
    color: '#8B7355',
  },
  dogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D5C7',
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
    color: '#5C4033',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
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

