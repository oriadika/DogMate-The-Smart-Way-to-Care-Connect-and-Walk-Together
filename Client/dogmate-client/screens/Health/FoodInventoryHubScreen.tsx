// screens/Health/FoodInventoryHubScreen.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import FoodInventoryCard from '../../components/FoodInventoryCard';
import { foodStockAPI } from '../../services/api';
import { resyncAllNotificationsInBackground } from '../../services/notificationScheduler';
import { markHomeDataDirty, shouldForceHomeRefresh } from '../../utils/homeDataCache';
import {
  markFoodInventoryDirty,
  removeFoodInventoryItem,
  transformFoodStockRow,
  upsertFoodInventoryItem,
} from '../../utils/healthDataCache';
import { useScreenLifecycleGuard } from '../../utils/screenLifecycle';
import {
  navigateBackToOwnerHealth,
  navigateToOwnerDashboard,
} from '../../navigation/ownerNavigation';
import { resolveOwnerUserId, getOwnerSession } from '../../utils/ownerSession';
import {
  clearFoodInventoryDirty,
  getFoodInventoryCache,
  getInitialFoodInventoryState,
  setFoodInventoryCache,
  shouldForceFoodInventoryRefresh,
  transformFoodStocks,
  type FoodInventoryItem,
} from '../../utils/healthDataCache';

const PRIMARY_COLOR = '#7FB069'; // Sage green
const BG_COLOR = '#FAEFDD'; // Main background
const TEXT_DARK = '#5C4033'; // Dark brown for text
const BORDER_COLOR = '#E0D5C7'; // Border color

type DogInfo = FoodInventoryItem['dogs'][number];

const FoodInventoryHubScreen = ({ navigation, route }: any) => {
  const initialUserId = resolveOwnerUserId(undefined, getOwnerSession().userId ?? null);
  const initial = getInitialFoodInventoryState(initialUserId);

  const [inventoryList, setInventoryList] = useState<FoodInventoryItem[]>(initial.items);
  const [loading, setLoading] = useState(initial.loading);
  const [userId, setUserId] = useState<string | null>(initial.userId);
  const inventoryRef = useRef(inventoryList);
  inventoryRef.current = inventoryList;

  const {
    markMounted,
    beginAsyncWork,
    isAsyncWorkCurrent,
    runDeferredBlurCleanup,
  } = useScreenLifecycleGuard();

  // Load food stocks from database
  const loadFoodStocks = useCallback(async () => {
    const generation = beginAsyncWork();
    try {
      if (!isAsyncWorkCurrent(generation)) return;

      const uid = resolveOwnerUserId(undefined, userId);
      if (!uid) {
        Alert.alert('שגיאה', 'לא נמצא משתמש מחובר');
        return;
      }
      setUserId(uid);

      const forceRefresh =
        shouldForceFoodInventoryRefresh(uid) || shouldForceHomeRefresh(uid);
      const cached = getFoodInventoryCache(uid);

      if (cached) {
        setInventoryList(cached.items);
        setLoading(false);
      } else if (inventoryRef.current.length === 0) {
        setLoading(true);
      }

      if (forceRefresh) {
        clearFoodInventoryDirty(uid);
      }

      if (!forceRefresh && cached) {
        return;
      }

      const response = await foodStockAPI.getFoodStocksForUser(uid);
      if (!isAsyncWorkCurrent(generation)) return;

      const transformedList =
        response.success && response.foodStocks
          ? transformFoodStocks(response.foodStocks)
          : cached?.items ?? [];

      setInventoryList(transformedList);
      setFoodInventoryCache(uid, { items: transformedList });
    } catch (error: any) {
      if (!isAsyncWorkCurrent(generation)) return;
      console.error('Error loading food stocks:', error);
      if (inventoryRef.current.length === 0) {
        Alert.alert('שגיאה', 'שגיאה בטעינת מלאי המזון');
      }
    } finally {
      if (isAsyncWorkCurrent(generation)) {
        setLoading(false);
      }
    }
  }, [beginAsyncWork, isAsyncWorkCurrent, userId]);

  useFocusEffect(
    useCallback(() => {
      markMounted();
      void loadFoodStocks();
      return () => {
        runDeferredBlurCleanup();
      };
    }, [loadFoodStocks, markMounted, runDeferredBlurCleanup])
  );

  // ניווט להוספה (ללא ID)
  const handleAddPress = () => {
    navigation.navigate('FoodIntake');
  };

  // ניווט לעריכה (עם ID)
  const handleEditPress = (id: string) => {
    navigation.navigate('FoodIntake', { inventoryId: id });
  };

  const handleDeletePress = (id: string, dogs: DogInfo[]) => {
    const dogsText = dogs.length === 1 
      ? dogs[0].name 
      : dogs.map(d => d.name).join(', ');
    Alert.alert(
      'מחיקת מלאי',
      `האם אתה בטוח שברצונך למחוק את המלאי של ${dogsText}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await foodStockAPI.deleteFoodStock(id);
              if (userId) {
                const nextList = removeFoodInventoryItem(userId, id);
                setInventoryList(nextList);
                markHomeDataDirty(userId);
                markFoodInventoryDirty(userId);
                resyncAllNotificationsInBackground(userId);
              }
              Alert.alert('הצלחה', 'המלאי נמחק בהצלחה');
              void loadFoodStocks();
            } catch (error: any) {
              console.error('Error deleting food stock:', error);
              Alert.alert('שגיאה', error.message || 'שגיאה במחיקת המלאי');
            }
          },
        },
      ]
    );
  };

  const handleBuyNewBag = async (id: string) => {
    try {
      const renewed = await foodStockAPI.renewFoodStock(id);
      if (userId && renewed) {
        const updated = transformFoodStockRow(renewed);
        const nextList = upsertFoodInventoryItem(userId, updated);
        setInventoryList(nextList);
        markHomeDataDirty(userId);
        markFoodInventoryDirty(userId);
        resyncAllNotificationsInBackground(userId);
      }
      Alert.alert('הצלחה', 'השק החדש נוסף למלאי בהצלחה!');
      void loadFoodStocks();
    } catch (error: any) {
      console.error('Error renewing food stock:', error);
      Alert.alert('שגיאה', error.message || 'שגיאה בחידוש המלאי');
    }
  };

  if (loading && inventoryList.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>טוען מלאי מזון...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigateToOwnerDashboard(navigation)}
          >
            <Ionicons name="home-outline" size={24} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ניהול מלאי מזון</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigateBackToOwnerHealth(navigation)}
          >
            <Ionicons name="arrow-forward" size={28} color={TEXT_DARK} />
          </TouchableOpacity>
        </View>

        {/* Add Button and Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.subtitle}>רשימת המלאים הפעילים שלך</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>
        </View>

        {/* List of Food Inventories */}
        <FlatList
          data={inventoryList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <FoodInventoryCard
              dogs={item.dogs}
              daysRemaining={item.daysRemaining}
              daysUntilReminder={item.daysUntilReminder}
              notificationEnabled={item.notificationEnabled}
              onEditPress={() => handleEditPress(item.id)}
              onDeletePress={() => handleDeletePress(item.id, item.dogs)}
              onBuyNewBag={() => handleBuyNewBag(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                לא מוגדר מלאי מזון. לחץ על + להוספה.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

export default FoodInventoryHubScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
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
    color: TEXT_DARK,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  backButton: {
    padding: 5,
    width: 40,
    alignItems: 'flex-end',
  },
  homeButton: {
    padding: 5,
    width: 40,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'right',
    flex: 1,
  },
  addButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  listContent: {
    padding: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8B7355',
    fontSize: 16,
  },
});
