// screens/Health/FoodInventoryHubScreen.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import FoodInventoryCard from '../../components/FoodInventoryCard';

const PRIMARY_COLOR = '#7FB069'; // Sage green
const BG_COLOR = '#FAEFDD'; // Main background
const TEXT_DARK = '#5C4033'; // Dark brown for text
const BORDER_COLOR = '#E0D5C7'; // Border color

// נתוני דמה ראשוניים - רשימה ריקה
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
};

const INITIAL_INVENTORY_DATA: InventoryItem[] = [];

let idCounter = 1; // Counter for generating unique IDs

const FoodInventoryHubScreen = ({ navigation, route }: any) => {
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>(INITIAL_INVENTORY_DATA);

  // Listen for new inventory data from FoodIntakeScreen
  useFocusEffect(
    React.useCallback(() => {
      if (route?.params?.newInventory) {
        const newInventory = route.params.newInventory;
        
        // Generate unique ID
        const newId = idCounter.toString();
        idCounter++;

        // Create inventory item with all dogs
        const inventoryItem: InventoryItem = {
          id: newId,
          dogs: newInventory.dogs,
          daysRemaining: newInventory.daysRemaining,
          dailyConsumption: newInventory.dailyConsumption,
          bagSize: newInventory.bagSize,
          currentAmount: newInventory.currentAmount,
        };

        // Add new inventory to list
        setInventoryList((prev) => [inventoryItem, ...prev]);

        // Clear the params to prevent adding again
        navigation.setParams({ newInventory: undefined });
      }
    }, [route?.params?.newInventory, navigation])
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
          onPress: () => {
            setInventoryList((prev) => prev.filter((item) => item.id !== id));
          },
        },
      ]
    );
  };

  const handleBuyNewBag = (id: string) => {
    setInventoryList((prev) => {
      return prev.map((item) => {
        if (item.id === id) {
          // Add bag size to current amount
          const currentKg = parseFloat(item.currentAmount);
          const bagKg = parseFloat(item.bagSize);
          const newCurrentAmount = currentKg + bagKg;
          
          // Calculate new days remaining
          const dailyGrams = parseFloat(item.dailyConsumption);
          const currentGrams = newCurrentAmount * 1000;
          const newDaysRemaining = Math.floor(currentGrams / dailyGrams);
          
          return {
            ...item,
            currentAmount: newCurrentAmount.toString(),
            daysRemaining: newDaysRemaining,
          };
        }
        return item;
      });
    });
    
    Alert.alert('הצלחה', 'השק החדש נוסף למלאי בהצלחה!');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>ניהול מלאי מזון</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Health')}
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
