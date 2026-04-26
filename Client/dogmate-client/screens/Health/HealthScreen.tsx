// screens/Health/HealthScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { userAPI } from '../../services/api';
import { OWNER_MAIN_TAB } from '../../navigation/ownerTabRoutes';

const PRIMARY_COLOR = '#7FB069'; // Sage green
const BG_COLOR = '#FAEFDD'; // Main background
const TEXT_DARK = '#5C4033'; // Dark brown for text
const CARD_BG = '#faf0e6'; // Lighter beige for inputs/cards
const BORDER_COLOR = '#E0D5C7'; // Border color

const HealthScreen = ({ navigation }: any) => {
  const [userId, setUserId] = useState<string | null>(null);

  // Load user ID on focus
  useFocusEffect(
    useCallback(() => {
      const loadUserId = async () => {
        try {
          const userResponse = await userAPI.getLoggedUsers();
          if (userResponse.success && userResponse.users && userResponse.users.length > 0) {
            setUserId(userResponse.users[0].id);
          }
        } catch (error) {
          console.error('Error loading user:', error);
        }
      };
      loadUserId();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>בריאות</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              navigation.navigate(OWNER_MAIN_TAB.Dashboard);
            }}
          >
            <Ionicons name="arrow-forward" size={28} color="#5C4033" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Food Intake Button */}
          <TouchableOpacity
            style={styles.featureButton}
            onPress={() => navigation.navigate('FoodInventoryHub')}
            activeOpacity={0.8}
          >
            <View style={styles.featureIconContainer}>
              <MaterialCommunityIcons name="bone" size={40} color={PRIMARY_COLOR} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>ניהול מלאי מזון</Text>
              <Text style={styles.featureDescription}>ניהול מלאי מזון וצריכה יומית</Text>
            </View>
            <Ionicons name="chevron-back" size={24} color={TEXT_DARK} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default HealthScreen;

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  featureButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_COLOR,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  featureContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
    textAlign: 'right',
  },
  featureDescription: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'right',
  },
});
