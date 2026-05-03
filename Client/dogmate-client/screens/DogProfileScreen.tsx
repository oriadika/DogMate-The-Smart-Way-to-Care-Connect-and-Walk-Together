// screens/DogProfileScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { dogAPI, reminderAPI, foodStockAPI } from '../services/api';

const PRIMARY_COLOR = '#7FB069'; // Sage green
const BG_COLOR = '#FAEFDD'; // Main background
const TEXT_DARK = '#5C4033'; // Dark brown for text
const CARD_BG = '#faf0e6'; // Lighter beige for inputs/cards
const BORDER_COLOR = '#E0D5C7'; // Border color
const WARNING_COLOR = '#f39c12'; // Orange for low stock warning
const DANGER_COLOR = '#e74c3c'; // Red for critical stock

type DogProfileCacheEntry = {
  dogs: Dog[];
  reminders: Reminder[];
  foodStocks: FoodStock[];
  signature: string;
};

const dogProfileCache = new Map<string, DogProfileCacheEntry>();
const dogProfileDirtyUsers = new Set<string>();

interface Dog {
  id: string;
  name: string;
  breed: string;
  gender: string;
  weight?: number | null;
  weightKg?: number | null;
  birthDate: string;
  profileImageUrl?: string;
  foodStock?: FoodStock;
}

interface FoodStock {
  id: string;
  brandName: string;
  bagSizeInKg: number;
  currentLevelInKg: number;
  dailyConsumptionInGram: number;
}

interface Reminder {
  id: string;
  title: string;
  description?: string;
  remindAt: string;
  dogs: { id: string; name: string }[];
}

const buildDogProfileSignature = (
  dogsData: Dog[],
  remindersData: Reminder[],
  foodStocksData: FoodStock[]
): string => {
  const dogsPart = dogsData
    .map(
      (d) =>
        `${d?.id ?? ''}:${d?.name ?? ''}:${d?.breed ?? ''}:${d?.weightKg ?? d?.weight ?? ''}`
    )
    .join('|');
  const remindersPart = remindersData
    .map((r) => `${r?.id ?? ''}:${r?.title ?? ''}:${r?.remindAt ?? ''}`)
    .join('|');
  const foodPart = foodStocksData
    .map((f) => `${f?.id ?? ''}:${f?.currentLevelInKg ?? ''}:${f?.dailyConsumptionInGram ?? ''}`)
    .join('|');

  return `${dogsData.length}#${remindersData.length}#${foodStocksData.length}#${dogsPart}#${remindersPart}#${foodPart}`;
};

const DogProfileScreen = ({ navigation, route }: any) => {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [foodStocks, setFoodStocks] = useState<FoodStock[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = route?.params?.userId;

  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        const cached = dogProfileCache.get(userId);
        const shouldFetch = !cached || dogProfileDirtyUsers.has(userId);

        if (cached) {
          setDogs(cached.dogs || []);
          setReminders(cached.reminders || []);
          setFoodStocks(cached.foodStocks || []);
          setLoading(false);
        }

        if (shouldFetch) {
          loadData({ showLoader: !cached });
        }
      }
    }, [userId])
  );

  const loadData = async (options?: { showLoader?: boolean }) => {
    const shouldShowLoader = options?.showLoader ?? false;

    try {
      if (shouldShowLoader) {
        setLoading(true);
      }

      const [dogsResponse, remindersResponse] = await Promise.all([
        dogAPI.getDogsForUser(userId),
        reminderAPI.getRemindersForUser(userId),
      ]);

      const rawDogs = dogsResponse.success && dogsResponse.dogs ? dogsResponse.dogs : [];
      const nextDogs: Dog[] = rawDogs.map((d: any) => ({
        ...d,
        weight:
          typeof d.weightKg === 'number'
            ? d.weightKg
            : typeof d.weight === 'number'
              ? d.weight
              : null,
      }));
      const nextReminders: Reminder[] = remindersResponse.success && remindersResponse.reminders
        ? remindersResponse.reminders
        : [];

      let nextFoodStocks: FoodStock[] = [];
      try {
        const foodStocksResponse = await foodStockAPI.getFoodStocksForUser(userId);
        if (foodStocksResponse.success && foodStocksResponse.foodStocks) {
          nextFoodStocks = foodStocksResponse.foodStocks;
        }
      } catch (e) {
        console.log('No food stocks or error loading:', e);
      }

      const nextSignature = buildDogProfileSignature(nextDogs, nextReminders, nextFoodStocks);
      const cached = dogProfileCache.get(userId);
      const hasChanged = !cached || cached.signature !== nextSignature;

      if (hasChanged) {
        setDogs(nextDogs);
        setReminders(nextReminders);
        setFoodStocks(nextFoodStocks);

        dogProfileCache.set(userId, {
          dogs: nextDogs,
          reminders: nextReminders,
          foodStocks: nextFoodStocks,
          signature: nextSignature,
        });
      }

      dogProfileDirtyUsers.delete(userId);

    } catch (error) {
      console.error('Error loading data:', error);
      if (shouldShowLoader) {
        Alert.alert('שגיאה', 'אירעה שגיאה בטעינת הנתונים');
      }
    } finally {
      if (shouldShowLoader) {
        setLoading(false);
      }
    }
  };

  // Get food stock for a specific dog
  const getFoodStockForDog = (dogId: string): FoodStock | undefined => {
    // Check if dog has direct foodStock property
    const dog = dogs.find(d => d.id === dogId);
    if (dog?.foodStock) {
      return dog.foodStock;
    }
    // Otherwise try to find in foodStocks list
    return foodStocks.find(fs => {
      // foodStock might have dogs array
      return (fs as any).dogs?.some((d: any) => d.id === dogId);
    });
  };

  // Get reminders for a specific dog
  const getRemindersForDog = (dogId: string): Reminder[] => {
    return reminders.filter(r => 
      r.dogs && r.dogs.some(d => d.id === dogId)
    );
  };

  // Calculate days until food runs out
  const calculateDaysRemaining = (foodStock: FoodStock): number => {
    if (!foodStock.dailyConsumptionInGram || foodStock.dailyConsumptionInGram === 0) {
      return Infinity;
    }
    const currentLevelInGrams = foodStock.currentLevelInKg * 1000;
    return Math.floor(currentLevelInGrams / foodStock.dailyConsumptionInGram);
  };

  // Get stock level color
  const getStockLevelColor = (daysRemaining: number): string => {
    if (daysRemaining <= 3) return DANGER_COLOR;
    if (daysRemaining <= 7) return WARNING_COLOR;
    return PRIMARY_COLOR;
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render food stock info for a dog
  const renderFoodStockInfo = (dogId: string) => {
    const foodStock = getFoodStockForDog(dogId);
    
    if (!foodStock) {
      return (
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons name="food-drumstick" size={20} color={TEXT_DARK} />
            <Text style={styles.infoTitle}>מלאי אוכל</Text>
          </View>
          <Text style={styles.noDataText}>אין מלאי אוכל מוגדר</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              if (userId) dogProfileDirtyUsers.add(userId);
              navigation.navigate('FoodIntake', { dogId });
            }}
          >
            <Text style={styles.addButtonText}>הוסף מלאי אוכל</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const daysRemaining = calculateDaysRemaining(foodStock);
    const stockLevelColor = getStockLevelColor(daysRemaining);
    const stockPercentage = Math.min((foodStock.currentLevelInKg / foodStock.bagSizeInKg) * 100, 100);

    return (
      <View style={styles.infoSection}>
        <View style={styles.infoHeader}>
          <MaterialCommunityIcons name="food-drumstick" size={20} color={TEXT_DARK} />
          <Text style={styles.infoTitle}>מלאי אוכל</Text>
        </View>
        
        <View style={styles.foodStockCard}>
          <Text style={styles.brandName}>{foodStock.brandName}</Text>
          
          {/* Stock level bar */}
          <View style={styles.stockBarContainer}>
            <View style={styles.stockBarBackground}>
              <View
                style={[
                  styles.stockBarFill,
                  { width: `${stockPercentage}%`, backgroundColor: stockLevelColor },
                ]}
              />
            </View>
            <Text style={[styles.stockPercentage, { color: stockLevelColor }]}>
              {stockPercentage.toFixed(0)}%
            </Text>
          </View>
          
          <View style={styles.foodStockDetails}>
            <View style={styles.foodStockRow}>
              <Text style={styles.foodStockLabel}>נשאר:</Text>
              <Text style={styles.foodStockValue}>{foodStock.currentLevelInKg.toFixed(1)} ק"ג</Text>
            </View>
            <View style={styles.foodStockRow}>
              <Text style={styles.foodStockLabel}>גודל שקית:</Text>
              <Text style={styles.foodStockValue}>{foodStock.bagSizeInKg} ק"ג</Text>
            </View>
            <View style={styles.foodStockRow}>
              <Text style={styles.foodStockLabel}>צריכה יומית:</Text>
              <Text style={styles.foodStockValue}>{foodStock.dailyConsumptionInGram} גרם</Text>
            </View>
            <View style={styles.foodStockRow}>
              <Text style={styles.foodStockLabel}>מספיק ל:</Text>
              <Text style={[styles.foodStockValue, { color: stockLevelColor, fontWeight: 'bold' }]}>
                {daysRemaining === Infinity ? '∞' : `${daysRemaining} ימים`}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render reminders for a dog
  const renderRemindersInfo = (dogId: string) => {
    const dogReminders = getRemindersForDog(dogId);
    
    return (
      <View style={styles.infoSection}>
        <View style={styles.infoHeader}>
          <Ionicons name="notifications" size={20} color={TEXT_DARK} />
          <Text style={styles.infoTitle}>תזכורות ({dogReminders.length})</Text>
        </View>
        
        {dogReminders.length === 0 ? (
          <>
            <Text style={styles.noDataText}>אין תזכורות</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                if (userId) dogProfileDirtyUsers.add(userId);
                navigation.navigate('AddReminder', { userId, dogId });
              }}
            >
              <Text style={styles.addButtonText}>הוסף תזכורת</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.remindersList}>
            {dogReminders.slice(0, 3).map((reminder) => (
              <View key={reminder.id} style={styles.reminderCard}>
                <View style={styles.reminderHeader}>
                  <Ionicons name="alarm" size={16} color={PRIMARY_COLOR} />
                  <Text style={styles.reminderTitle}>{reminder.title}</Text>
                </View>
                {reminder.description && (
                  <Text style={styles.reminderDescription} numberOfLines={1}>
                    {reminder.description}
                  </Text>
                )}
                <Text style={styles.reminderTime}>
                  {formatDate(reminder.remindAt)}
                </Text>
              </View>
            ))}
            {dogReminders.length > 3 && (
              <Text style={styles.moreRemindersText}>
                +{dogReminders.length - 3} תזכורות נוספות
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  // Render a single dog card
  const renderDogCard = (dog: Dog) => {
    return (
      <View key={dog.id} style={styles.dogCard}>
        {/* Dog header */}
        <View style={styles.dogHeader}>
          {dog.profileImageUrl ? (
            <Image
              source={{ uri: dog.profileImageUrl }}
              style={styles.dogImage}
            />
          ) : (
            <View style={styles.dogImagePlaceholder}>
              <FontAwesome5 name="dog" size={40} color={PRIMARY_COLOR} />
            </View>
          )}
          <View style={styles.dogInfo}>
            <Text style={styles.dogName}>{dog.name}</Text>
            <Text style={styles.dogBreed}>{dog.breed}</Text>
            <View style={styles.dogDetailsRow}>
              <View style={styles.dogDetailItem}>
                <FontAwesome5
                  name={dog.gender === 'זכר' ? 'mars' : 'venus'}
                  size={14}
                  color={TEXT_DARK}
                />
                <Text style={styles.dogDetailText}>{dog.gender}</Text>
              </View>
              <View style={styles.dogDetailItem}>
                <MaterialCommunityIcons name="weight" size={14} color={TEXT_DARK} />
                <Text style={styles.dogDetailText}>
                  {dog.weight != null ? `${dog.weight} ק"ג` : 'לא צוין'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Food stock info */}
        {renderFoodStockInfo(dog.id)}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Reminders info */}
        {renderRemindersInfo(dog.id)}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>טוען...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-forward" size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>פרופיל הכלבים שלי</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Dogs list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {dogs.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome5 name="dog" size={60} color={BORDER_COLOR} />
            <Text style={styles.emptyStateTitle}>אין כלבים</Text>
            <Text style={styles.emptyStateText}>הוסף את הכלב הראשון שלך</Text>
            <TouchableOpacity
              style={styles.addDogButton}
              onPress={() => {
                if (userId) dogProfileDirtyUsers.add(userId);
                navigation.navigate('AddDog', { userId });
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addDogButtonText}>הוסף כלב</Text>
            </TouchableOpacity>
          </View>
        ) : (
          dogs.map((dog) => renderDogCard(dog))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: TEXT_DARK,
    fontSize: 16,
    fontFamily: 'System',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TEXT_DARK,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 30,
  },
  dogCard: {
    backgroundColor: CARD_BG,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dogImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginLeft: 15,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
  },
  dogImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginLeft: 15,
    backgroundColor: '#E8F5E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
  },
  dogInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dogName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: TEXT_DARK,
    textAlign: 'right',
  },
  dogBreed: {
    fontSize: 16,
    color: PRIMARY_COLOR,
    textAlign: 'right',
    marginTop: 2,
  },
  dogDetailsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 15,
  },
  dogDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dogDetailText: {
    fontSize: 14,
    color: TEXT_DARK,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginVertical: 15,
  },
  infoSection: {
    marginBottom: 5,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 10,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  noDataText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  foodStockCard: {
    backgroundColor: BG_COLOR,
    borderRadius: 10,
    padding: 12,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'right',
    marginBottom: 10,
  },
  stockBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stockBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: BORDER_COLOR,
    borderRadius: 6,
    overflow: 'hidden',
  },
  stockBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  stockPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 45,
    textAlign: 'right',
  },
  foodStockDetails: {
    marginTop: 12,
    gap: 5,
  },
  foodStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  foodStockLabel: {
    fontSize: 14,
    color: '#666',
  },
  foodStockValue: {
    fontSize: 14,
    color: TEXT_DARK,
  },
  remindersList: {
    gap: 8,
  },
  reminderCard: {
    backgroundColor: BG_COLOR,
    borderRadius: 8,
    padding: 10,
    borderRightWidth: 3,
    borderRightColor: PRIMARY_COLOR,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'right',
  },
  reminderDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  reminderTime: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    textAlign: 'right',
    marginTop: 6,
  },
  moreRemindersText: {
    textAlign: 'center',
    color: PRIMARY_COLOR,
    fontSize: 13,
    marginTop: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TEXT_DARK,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
  },
  addDogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
  },
  addDogButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DogProfileScreen;
