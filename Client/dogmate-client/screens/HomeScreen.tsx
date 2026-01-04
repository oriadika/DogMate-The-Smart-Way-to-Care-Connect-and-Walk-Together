// screens/HomeScreen.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const PRIMARY_COLOR = '#7FB069'; // Sage green

const HomeScreen = ({ navigation, route }: any) => {
  const [activeTab, setActiveTab] = useState<'home' | 'community' | 'walks' | 'profile'>('home');
  const userName = route?.params?.userFirstName;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header with logo and settings */}
          <View style={styles.header}>
            <View style={{ width: 40 }} />
            <Image
              source={require('../assets/images/DogMate.jpg')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={28} color="#5C4033" />
            </TouchableOpacity>
          </View>

          {/* Main Card */}
          <View style={styles.mainCard}>
            {/* Photo placeholder and content row */}
            <View style={styles.cardContentRow}>
              {/* Photo placeholder */}
              <View style={styles.photoPlaceholder}>
                <FontAwesome5 name="dog" size={40} color="#A9B5C7" />
                <Text style={styles.plusSign}>+</Text>
              </View>

              {/* Greeting and text */}
              <View style={styles.greetingContainer}>
                <Text style={styles.greetingText}>שלום, {userName}!</Text>
                <Text style={styles.ctaText}>בואו נוסיף את החבר הראשון שלכם!</Text>
                
              </View>
            </View>

            {/* Add Dog Button */}
            <TouchableOpacity
              style={styles.addDogButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AddDog')}
            >
              <Text style={styles.addDogButtonText}>הוסף כלב</Text>
            </TouchableOpacity>
          </View>

          {/* Reminders Section */}
          <View style={styles.remindersSection}>
            <Text style={styles.remindersTitle}>תזכורות להיום</Text>
            <Text style={styles.remindersPlaceholder}>
              כאן יופיעו התזכורות שלכם לאחר הוספת כלב.
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
            onPress={() => {
              setActiveTab('profile');
              navigation.navigate('Profile', {
                userFirstName: route?.params?.userFirstName,
                userLastName: route?.params?.userLastName,
                email: route?.params?.email,
                role: `Dog ${route?.params?.userRole}`,
                phone: route?.params?.phoneNumber,
                userId: route?.params?.userId,
              });
            }}
          >
            <FontAwesome5
              name="dog"
              size={24}
              color={activeTab === 'profile' ? PRIMARY_COLOR : '#9CA3AF'}
            />
            <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>
              פרופיל
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'community' && styles.navItemActive]}
            onPress={() => setActiveTab('community')}
          >
            <Ionicons
              name={activeTab === 'community' ? 'people' : 'people-outline'}
              size={24}
              color={activeTab === 'community' ? PRIMARY_COLOR : '#9CA3AF'}
            />
            <Text style={[styles.navLabel, activeTab === 'community' && styles.navLabelActive]}>
              קהילה
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'walks' && styles.navItemActive]}
            onPress={() => setActiveTab('walks')}
          >
            <MaterialCommunityIcons
              name={activeTab === 'walks' ? 'walk' : 'walk'}
              size={24}
              color={activeTab === 'walks' ? PRIMARY_COLOR : '#9CA3AF'}
            />
            <Text style={[styles.navLabel, activeTab === 'walks' && styles.navLabelActive]}>
              טיולים
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
            onPress={() => setActiveTab('home')}
          >
            <Ionicons
              name={activeTab === 'home' ? 'home' : 'home-outline'}
              size={24}
              color={activeTab === 'home' ? PRIMARY_COLOR : '#9CA3AF'}
            />
            <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>
              בית
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAEFDD',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollView: {
    flex: 1,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
  },
  pawPatternContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  pawPrint: {
    fontSize: 20,
    margin: 15,
    opacity: 0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
  },
  settingsButton: {
    padding: 5,
    width: 40,
    alignItems: 'flex-end',
    marginTop: -70,
    marginRight: -5,
  },
  dogsIconContainer: {
    marginBottom: 8,
  },
  dogsEmoji: {
    fontSize: 32,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginTop: -10,
  },
  mainCard: {
    backgroundColor: '#F6D9B7', 
    borderRadius: 24,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#A9B5C7',
    borderStyle: 'dashed',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  plusSign: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    fontSize: 20,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    backgroundColor: '#fff',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  greetingContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 8,
    textAlign: 'right',
  },
  ctaText: {
    fontSize: 16,
    color: '#5C4033',
    marginBottom: 12,
    textAlign: 'right',
    lineHeight: 22,
  },
  weatherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  weatherText: {
    fontSize: 14,
    color: '#5C4033',
    marginLeft: 6,
    textAlign: 'right',
  },
  addDogButton: {
    backgroundColor: PRIMARY_COLOR, // Muted sage green
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  addDogButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  remindersSection: {
    marginTop: 10,
  },
  remindersTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 12,
    textAlign: 'right',
  },
  remindersPlaceholder: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'right',
    lineHeight: 24,
    backgroundColor: '#F6D9B7',
    padding: 16,
    borderRadius: 12,
  },
  bottomNav: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-around',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navItemActive: {
    // Active state styling
  },
  navLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  navLabelActive: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
});

