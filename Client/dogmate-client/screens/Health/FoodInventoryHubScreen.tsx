// screens/Health/FoodInventoryHubScreen.tsx
import React, { useState, useCallback } from 'react';
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
import { userAPI, foodStockAPI } from '../../services/api';
import { OWNER_MAIN_TAB } from '../../navigation/ownerTabRoutes';

const PRIMARY_COLOR = '#7FB069'; // Sage green
const BG_COLOR = '#FAEFDD'; // Main background
const TEXT_DARK = '#5C4033'; // Dark brown for text
const BORDER_COLOR = '#E0D5C7'; // Border color

type DogInfo = {
  id: string;
  name: string;
  imageUrl?: string;
};

type InventoryItem = {
  id: string;
  dogs: DogInfo[];
  daysRemaining: number;
  dailyConsumption: string; // in grams
  bagSize: string; // in kg
  currentAmount: string; // in kg
  brandName?: string;
};

const FoodInventoryHubScreen = ({ navigation, route }: any) => {
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Load food stocks from database
  const loadFoodStocks = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user
      const userResponse = await userAPI.getLoggedUsers();
      if (!userResponse.success || !userResponse.users || userResponse.users.length === 0) {
        Alert.alert('שגיאה', 'לא נמצא משתמש מחובר');
        setLoading(false);
        return;
      }
      
      const currentUser = userResponse.users[0];
      setUserId(currentUser.id);

      // Fetch food stocks for this user
      const response = await foodStockAPI.getFoodStocksForUser(currentUser.id);
      
      if (response.success && response.foodStocks) {
        // Transform API response to our format
        const transformedList: InventoryItem[] = response.foodStocks.map((stock: any) => {
          // Calculate days remaining - currentLevelInKg is in kg, dailyConsumptionInGram is in grams
          const currentGrams = stock.currentLevelInKg * 1000;
          const daysRemaining = stock.dailyConsumptionInGram > 0 
            ? Math.floor(currentGrams / stock.dailyConsumptionInGram) 
            : 0;

          return {
            id: stock.id,
            dogs: stock.dogs?.map((dog: any) => ({
              id: dog.id,
              name: dog.name,
              imageUrl: dog.profileImageUrl,
            })) || [],
            daysRemaining,
            dailyConsumption: stock.dailyConsumptionInGram.toString(),
            bagSize: stock.bagSizeInKg.toString(),
            currentAmount: stock.currentLevelInKg.toString(),
            brandName: stock.brandName,
          };
        });
        
        setInventoryList(transformedList);
      }
    } catch (error: any) {
      console.error('Error loading food stocks:', error);
      Alert.alert('שגיאה', 'שגיאה בטעינת מלאי המזון');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadFoodStocks();
    }, [loadFoodStocks])
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
              // Reload the list
              loadFoodStocks();
              Alert.alert('הצלחה', 'המלאי נמחק בהצלחה');
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
      await foodStockAPI.renewFoodStock(id);
      // Reload the list to get updated values
      loadFoodStocks();
      Alert.alert('הצלחה', 'השק החדש נוסף למלאי בהצלחה!');
    } catch (error: any) {
      console.error('Error renewing food stock:', error);
      Alert.alert('שגיאה', error.message || 'שגיאה בחידוש המלאי');
    }
  };

  if (loading) {
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
            onPress={() => {
              if (userId) {
                navigation.navigate('Home', {
                  screen: 'Dashboard',
                  params: { userId },
                });
              } else {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="home-outline" size={24} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ניהול מלאי מזון</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Home', { screen: OWNER_MAIN_TAB.Health })}
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
