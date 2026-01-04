// screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { dogAPI, userAPI } from '../services/api';

const PRIMARY_COLOR = '#7FB069'; // Sage green

const HomeScreen = ({ navigation, route }: any) => {
  const [activeTab, setActiveTab] = useState<'home' | 'community' | 'walks' | 'profile'>('home');
  const [userName, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const userName_param = route?.params?.userFirstName;

  useEffect(() => {
    loadUserAndDogs();
  }, []);

  const loadUserAndDogs = async () => {
    try {
      setLoading(true);
      // Fetch current logged-in user
      const userResponse = await userAPI.getLoggedUsers();
      if (userResponse.success && userResponse.users && userResponse.users.length > 0) {
        const currentUser = userResponse.users[0];
        setUserId(currentUser.id);
        setUserName(currentUser.firstName || 'חברים');

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
      setLoading(false);
    }
  };

  const handleDeleteDog = (dogId: string, dogName: string) => {
    Alert.alert(
      'מחיקת כלב',
      `האם אתה בטוח שברצונך למחוק את ${dogName}?`,
      [
        {
          text: 'ביטול',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'מחוק',
          onPress: async () => {
            try {
              if (!userId) {
                Alert.alert('שגיאה', 'לא נמצא משתמש');
                return;
              }

              await dogAPI.deleteDog(userId, dogId);
              Alert.alert('הצלחה', `${dogName} נמחק בהצלחה`);
              
              // Refresh dogs list
              loadUserAndDogs();
            } catch (error: any) {
              console.error('Error deleting dog:', error);
              Alert.alert('שגיאה', error.message || 'שגיאה במחיקת הכלב');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

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

          {/* Loading State */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={PRIMARY_COLOR} />
              <Text style={styles.loadingText}>טוען נתונים...</Text>
            </View>
          ) : dogs.length === 0 ? (
            // No dogs yet
            <View style={styles.mainCard}>
              <View style={styles.cardContentRow}>
                <View style={styles.photoPlaceholder}>
                  <FontAwesome5 name="dog" size={40} color="#A9B5C7" />
                  <Text style={styles.plusSign}>+</Text>
                </View>

                <View style={styles.greetingContainer}>
                  <Text style={styles.greetingText}>שלום, {userName}!</Text>
                  <Text style={styles.ctaText}>בואו נוסיף את החבר הראשון שלכם!</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addDogButton}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('AddDog')}
              >
                <Text style={styles.addDogButtonText}>הוסף כלב</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Dogs list
            <>
              <View style={styles.dogsHeaderSection}>
                <View>
                  <Text style={styles.dogsHeaderGreeting}>שלום, {userName}!</Text>
                  <Text style={styles.dogsHeaderSubtitle}>החברים שלך</Text>
                </View>
                <TouchableOpacity
                  style={styles.addDogFab}
                  onPress={() => navigation.navigate('AddDog')}
                >
                  <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.dogsContainer}>
                {dogs.map((dog: any, index: number) => (
                  <View key={index} style={styles.dogCard}>
                    <View style={styles.dogCardHeader}>
                      <View style={styles.dogImageContainer}>
                        {dog.profileImageUrl ? (
                          <Image 
                            source={{ uri: dog.profileImageUrl }}
                            style={styles.dogImage}
                          />
                        ) : (
                          <View style={styles.dogImagePlaceholder}>
                            <FontAwesome5 name="dog" size={50} color="#8B7355" />
                          </View>
                        )}
                        <View style={styles.genderBadge}>
                          <MaterialCommunityIcons 
                            name={dog.gender === 'M' ? 'gender-male' : 'gender-female'}
                            size={16}
                            color="#fff"
                          />
                        </View>
                      </View>

                      <View style={styles.dogInfoContainer}>
                        <Text style={styles.dogName}>{dog.name}</Text>
                        <Text style={styles.dogBreed}>{dog.breed}</Text>
                        <View style={styles.dogMetaRow}>
                          <Ionicons name="calendar-outline" size={14} color="#8B7355" />
                          <Text style={styles.dogMeta}>
                            {new Date(dog.birthdate).toLocaleDateString('he-IL')}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.dogActions}>
                      <TouchableOpacity style={styles.actionButton}>
                        <MaterialCommunityIcons name="pencil" size={18} color="#7FB069" />
                        <Text style={styles.actionButtonText}>עריכה</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton}>
                        <MaterialCommunityIcons name="information-outline" size={18} color="#7FB069" />
                        <Text style={styles.actionButtonText}>פרטים</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleDeleteDog(dog.id, dog.name)}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#E74C3C" />
                        <Text style={[styles.actionButtonText, { color: '#E74C3C' }]}>מחיקה</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* Reminders Section */}
              <View style={styles.remindersSection}>
                <Text style={styles.remindersTitle}>תזכורות להיום</Text>
                <Text style={styles.remindersPlaceholder}>
                  אין תזכורות כרגע
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
            onPress={() => {
              setActiveTab('profile');
              navigation.navigate('Profile', {
                userFirstName: userName,
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
  // New styles for dogs display
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#5C4033',
    fontSize: 16,
  },
  dogsHeaderSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  dogsHeaderGreeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 4,
  },
  dogsHeaderSubtitle: {
    fontSize: 16,
    color: '#8B7355',
  },
  addDogFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  dogsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  dogCard: {
    backgroundColor: '#F6D9B7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dogCardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dogImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  dogImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  dogImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8DCC8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4C4A8',
  },
  genderBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F6D9B7',
  },
  dogInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  dogName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 4,
  },
  dogBreed: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 8,
  },
  dogMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dogMeta: {
    fontSize: 12,
    color: '#8B7355',
  },
  dogActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E0D5C7',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
});

