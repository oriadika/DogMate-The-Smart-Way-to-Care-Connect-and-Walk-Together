// screens/Health/FoodIntakeScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { dogAPI, userAPI, foodStockAPI, FoodStockData } from '../../services/api';

const PRIMARY_COLOR = '#7FB069'; // Sage green

interface Dog {
  id: string;
  name: string;
  breed: string;
  profileImageUrl?: string;
}

const FoodIntakeScreen = ({ navigation, route }: any) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDogModal, setShowDogModal] = useState(false);
  const [selectedDogs, setSelectedDogs] = useState<string[]>([]); // Array of dog IDs
  const [dailyConsumption, setDailyConsumption] = useState('');
  const [bagSize, setBagSize] = useState('');
  const [currentAmount, setCurrentAmount] = useState(''); // כמות נוכחית במלאי (ק״ג)
  const [foodStockId, setFoodStockId] = useState<string | null>(null); // ID for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const slideAnim = useRef(new Animated.Value(-1000)).current; // Start from top (negative value)

  // Load user and dogs data - same logic as HomeScreen
  useFocusEffect(
    useCallback(() => {
      loadUserAndDogs();
      // Load food stock data if in edit mode
      if (route?.params?.inventoryId) {
        loadFoodStockForEdit(route.params.inventoryId);
      }
    }, [route?.params?.inventoryId])
  );

  const loadUserAndDogs = async () => {
    try {
      setLoading(true);
      // Fetch current logged-in user - same as HomeScreen
      const userResponse = await userAPI.getLoggedUsers();
      if (userResponse.success && userResponse.users && userResponse.users.length > 0) {
        const currentUser = userResponse.users[0];
        setUserId(currentUser.id);

        // Fetch dogs for this user - same as HomeScreen
        const dogsResponse = await dogAPI.getDogsForUser(currentUser.id);
        if (dogsResponse.success && dogsResponse.dogs) {
          // If not in edit mode, filter out dogs that already have food stock
          if (!isEditMode) {
            const foodStocks = await foodStockAPI.getUserFoodStocks(currentUser.id);
            // Get IDs of all dogs that already have food stock
            const dogsWithFoodStock: string[] = [];
            foodStocks.forEach((stock: FoodStockData) => {
              stock.dogs.forEach((dog: any) => {
                if (!dogsWithFoodStock.includes(dog.id)) {
                  dogsWithFoodStock.push(dog.id);
                }
              });
            });
            
            // Filter out dogs that already have food stock
            const availableDogs = dogsResponse.dogs.filter((dog: Dog) => !dogsWithFoodStock.includes(dog.id));
            
            // If no dogs available, show alert and go back
            if (availableDogs.length === 0) {
              Alert.alert(
                'אין כלבים זמינים',
                'כל הכלבים שלך כבר בניהול מלאי מזון. אין כלבים נוספים להוספה.',
                [
                  {
                    text: 'אישור',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
              return;
            }
            
            setDogs(availableDogs);
          } else {
            // In edit mode, show all dogs (they may need to change selection)
            setDogs(dogsResponse.dogs);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading user/dogs:', error);
      Alert.alert('שגיאה', 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  // Load food stock data for editing
  const loadFoodStockForEdit = async (inventoryId: string) => {
    try {
      setLoading(true);
      setFoodStockId(inventoryId);
      setIsEditMode(true);

      // Get user to fetch food stocks
      const userResponse = await userAPI.getLoggedUsers();
      if (!userResponse.success || !userResponse.users || userResponse.users.length === 0) {
        throw new Error('User not found');
      }

      const currentUser = userResponse.users[0];
      const foodStocks = await foodStockAPI.getUserFoodStocks(currentUser.id);
      
      // Find the food stock with matching ID
      const foodStock = foodStocks.find((stock: FoodStockData) => stock.id === inventoryId);
      
      if (!foodStock) {
        Alert.alert('שגיאה', 'מלאי מזון לא נמצא');
        navigation.goBack();
        return;
      }

      // Fill form fields with existing data
      setBagSize(foodStock.bagSizeInKg.toString());
      setCurrentAmount(foodStock.currentLevelInKg.toString());
      setDailyConsumption(foodStock.dailyConsumptionInGram.toString());

      // Select dogs associated with this food stock
      const dogIds = foodStock.dogs.map((dog: any) => dog.id);
      setSelectedDogs(dogIds);
    } catch (error: any) {
      console.error('Error loading food stock for edit:', error);
      Alert.alert('שגיאה', error.message || 'שגיאה בטעינת נתוני מלאי המזון');
    } finally {
      setLoading(false);
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

    try {
      setLoading(true);

      // Create FoodStock payload
      const foodStockPayload = {
        brandName: 'Food Stock', // Default brand name - can be customized later
        bagSizeInKg: bagKg,
        currentLevelInKg: currentKg,
        dailyConsumptionInGram: dailyGrams,
      };

      if (isEditMode && foodStockId) {
        // Update existing FoodStock
        console.log('Updating food stock with ID:', foodStockId);
        console.log('Payload:', foodStockPayload);
        await foodStockAPI.updateFoodStock(foodStockId, foodStockPayload);
        Alert.alert('הצלחה', 'מלאי המזון עודכן בהצלחה!');
      } else {
        // Create new FoodStock for the first dog
        const firstDogId = selectedDogs[0];
        const response = await foodStockAPI.addFoodStockToDog(firstDogId, foodStockPayload);
        const newFoodStockId = response.foodStockId;

        // Connect remaining dogs to the same FoodStock
        for (let i = 1; i < selectedDogs.length; i++) {
          await foodStockAPI.connectDogToFoodStock(selectedDogs[i], newFoodStockId);
        }

        Alert.alert('הצלחה', 'מלאי המזון נשמר בהצלחה!');
      }

      navigation.navigate('FoodInventoryHub');
    } catch (error: any) {
      console.error('Error saving food stock:', error);
      Alert.alert('שגיאה', error.message || 'שגיאה בשמירת מלאי המזון');
    } finally {
      setLoading(false);
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
              onPress={() => {
                // Reset animation value before opening
                slideAnim.setValue(-1000);
                setShowDogModal(true);
                // Animate modal from top
                Animated.spring(slideAnim, {
                  toValue: 0,
                  useNativeDriver: true,
                  tension: 50,
                  friction: 8,
                }).start();
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

          {/* Calculate Button */}
          <TouchableOpacity
            style={styles.calculateButton}
            onPress={handleCalculate}
            activeOpacity={0.85}
          >
            <Text style={styles.calculateButtonText}>חשב והצג</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Dog Selection Modal */}
        <Modal
          visible={showDogModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => {
            // Animate modal to top before closing
            Animated.timing(slideAnim, {
              toValue: -1000,
              duration: 250,
              useNativeDriver: true,
            }).start(() => {
              setShowDogModal(false);
            });
          }}
          statusBarTranslucent={true}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              // Animate modal to top before closing
              Animated.timing(slideAnim, {
                toValue: -1000,
                duration: 250,
                useNativeDriver: true,
              }).start(() => {
                setShowDogModal(false);
              });
            }}
          >
              <Animated.View
                style={[
                  styles.modalContainer,
                  {
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => {
                    // Animate modal to top before closing
                    Animated.timing(slideAnim, {
                      toValue: -1000,
                      duration: 250,
                      useNativeDriver: true,
                    }).start(() => {
                      setShowDogModal(false);
                    });
                  }}
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
                  onPress={() => {
                    // Animate modal to top before closing
                    Animated.timing(slideAnim, {
                      toValue: -1000,
                      duration: 250,
                      useNativeDriver: true,
                    }).start(() => {
                      setShowDogModal(false);
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmButtonText}>אישור</Text>
                </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
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
    flexDirection: 'row-reverse',
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
    marginRight: 8,
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
    minHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
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

