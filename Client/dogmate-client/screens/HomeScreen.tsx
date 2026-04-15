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
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { dogAPI, reminderAPI, userAPI } from '../services/api';
import { scheduleReminderNotification, cancelReminderNotification } from '../services/notifications';

const PRIMARY_COLOR = '#7FB069'; // Sage green
const BG_COLOR = '#FAEFDD'; // Main background
const TEXT_DARK = '#5C4033'; // Dark brown for text
const CARD_BG = '#faf0e6'; // Lighter beige for inputs/cards
const BORDER_COLOR = '#E0D5C7'; // Border color

type HomeCacheEntry = {
  userName: string;
  userLastName: string;
  dogs: any[];
  reminders: any[];
  signature: string;
};

const homeDataCache = new Map<string, HomeCacheEntry>();
const dirtyHomeDataUsers = new Set<string>();

const buildDataSignature = (dogsData: any[], remindersData: any[]): string => {
  const dogsPart = dogsData
    .map((d: any) => `${d?.id ?? ''}:${d?.name ?? ''}:${d?.birthdate ?? ''}`)
    .join('|');
  const remindersPart = remindersData
    .map((r: any) => `${r?.id ?? ''}:${r?.title ?? ''}:${r?.remindAt ?? ''}:${r?.sent ?? ''}`)
    .join('|');
  return `${dogsData.length}#${remindersData.length}#${dogsPart}#${remindersPart}`;
};

const HomeScreen = ({ navigation, route }: any) => {
  const [activeTab, setActiveTab] = useState<'home' | 'health' | 'walks' | 'profile'>('home');
  const [userName, setUserName] = useState<string>(route?.params?.userFirstName || '');
  const [userLastName, setUserLastName] = useState<string>(route?.params?.userLastName || '');
  const [userId, setUserId] = useState<string | null>(route?.params?.userId || null);
  const [dogs, setDogs] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState<any | null>(null);
  const [showReminderDetails, setShowReminderDetails] = useState(false);

  // Get user data from route params (passed from LoginScreen) - use state as fallback
  const currentUserId = route?.params?.userId || userId;
  const currentUserName = route?.params?.userFirstName || userName;
  const currentUserLastName = route?.params?.userLastName || userLastName;

  // Update state when route params change (e.g., on first login)
  React.useEffect(() => {
    if (route?.params?.userId && route.params.userId !== userId) {
      setUserId(route.params.userId);
    }
    if (route?.params?.userFirstName && route.params.userFirstName !== userName) {
      setUserName(route.params.userFirstName);
    }
    if (route?.params?.userLastName && route.params.userLastName !== userLastName) {
      setUserLastName(route.params.userLastName);
    }
  }, [route?.params?.userId, route?.params?.userFirstName, route?.params?.userLastName]);

  // Load data when screen is focused (including when returning from AddDog screen)
  useFocusEffect(
    React.useCallback(() => {
      setActiveTab('home');

      if (!currentUserId) return;

      const cached = homeDataCache.get(currentUserId);
      if (cached) {
        setUserName(cached.userName || 'חברים');
        setUserLastName(cached.userLastName || '');
        setDogs(cached.dogs || []);
        setReminders(cached.reminders || []);
        setLoading(false);
      } else {
        setLoading(true);
      }

      // Always fetch fresh data when screen gets focus
      loadUserAndDogs(currentUserId, currentUserName, { showLoader: !cached });

      // Keep screen fresh while user stays on it
      const intervalId = setInterval(() => {
        loadUserAndDogs(currentUserId, currentUserName, { showLoader: false });
      }, 5000);

      return () => {
        clearInterval(intervalId);
      };
    }, [currentUserId, currentUserName])
  );

  const loadUserAndDogs = async (
    userIdToLoad: string,
    userNameToLoad?: string,
    options?: { showLoader?: boolean }
  ) => {
    const shouldShowLoader = options?.showLoader ?? false;

    try {
      if (shouldShowLoader) {
        setLoading(true);
      }

      // Use the userId passed from login instead of fetching logged users
      setUserId(userIdToLoad);
      let nextUserName = userNameToLoad || userName || 'חברים';
      let nextUserLastName = userLastName || '';
      
      // If userName is missing, try to fetch it from logged users
      if (!userNameToLoad) {
        try {
          const loggedUsersResponse = await userAPI.getLoggedUsers();
          if (loggedUsersResponse.success && loggedUsersResponse.users) {
            const currentUser = loggedUsersResponse.users.find((u: any) => u.id === userIdToLoad);
            if (currentUser) {
              nextUserName = currentUser.firstName || 'חברים';
              nextUserLastName = currentUser.lastName || '';
            } else {
              nextUserName = 'חברים';
            }
          } else {
            nextUserName = 'חברים';
          }
        } catch (e) {
          console.log('Could not fetch user info:', e);
          nextUserName = 'חברים';
        }
      }

      const [dogsResponse, remindersResponse] = await Promise.all([
        dogAPI.getDogsForUser(userIdToLoad),
        reminderAPI.getRemindersForUser(userIdToLoad),
      ]);

      const nextDogs = dogsResponse.success && dogsResponse.dogs ? dogsResponse.dogs : [];
      const nextReminders = remindersResponse.success && remindersResponse.reminders
        ? remindersResponse.reminders
        : [];

      const nextSignature = buildDataSignature(nextDogs, nextReminders);
      const cached = homeDataCache.get(userIdToLoad);
      const hasChanged = !cached || cached.signature !== nextSignature || cached.userName !== nextUserName || cached.userLastName !== nextUserLastName;

      if (hasChanged) {
        setUserName(nextUserName);
        setUserLastName(nextUserLastName);
        setDogs(nextDogs);
        setReminders(nextReminders);

        homeDataCache.set(userIdToLoad, {
          userName: nextUserName,
          userLastName: nextUserLastName,
          dogs: nextDogs,
          reminders: nextReminders,
          signature: nextSignature,
        });
      }

      dirtyHomeDataUsers.delete(userIdToLoad);

      // Schedule notifications for future reminders
      const now = new Date();
      for (const reminder of nextReminders) {
        if (!reminder?.remindAt) {
          continue;
        }
        const reminderDate = new Date(reminder.remindAt);
        if (isNaN(reminderDate.getTime())) {
          continue;
        }
        if (reminderDate > now) {
          await scheduleReminderNotification(
            reminder.id,
            reminder.title,
            reminder.description || 'זמן לתזכורת!',
            reminderDate
          );
        }
      }
    } catch (error: any) {
      console.error('Error loading user/dogs:', error);
      if (shouldShowLoader) {
        Alert.alert('שגיאה', 'שגיאה בטעינת הנתונים');
      }
    } finally {
      if (shouldShowLoader) {
        setLoading(false);
      }
    }
  };

  // Format reminder date/time
  const formatReminderDateTime = (dateValue: any): string => {
    try {
      if (!dateValue) {
        return 'ללא תאריך';
      }

      // Backend now sends ISO 8601 string: "2026-01-06T14:30:00"
      const date = new Date(dateValue);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date received:', dateValue);
        return 'תאריך לא תקין';
      }

      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'תאריך לא תקין';
    }
  };

  // Calculate age from birth date
  const calculateAge = (birthdate: string): string => {
    const today = new Date();
    const birth = new Date(birthdate);
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (today.getDate() < birth.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 11;
      }
    }
    
    // Check if it's a very young puppy (less than 1 month)
    const daysDiff = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 30) {
      return 'גור חדש';
    }
    
    if (years === 0 && months === 0) {
      return 'חודש אחד';
    }
    
    if (years === 0) {
      return `${months} חודשים`;
    }
    
    if (months === 0) {
      return `${years} ${years === 1 ? 'שנה' : 'שנים'}`;
    }
    
    return `${years} ${years === 1 ? 'שנה' : 'שנים'} ו-${months} חודשים`;
  };

  // Get dog names from dog IDs
  const getDogNames = (dogIds: string[]): string => {
    if (!dogIds || dogIds.length === 0) return 'כל הכלבים';
    
    const names = dogIds.map(id => {
      const dog = dogs.find(d => d.id === id);
      return dog ? dog.name : 'כלב לא ידוע';
    });
    
    return names.join(', ');
  };

  // Get formatted dog text for reminders
  const getDogText = (dogIds: string[]): string => {
    if (!dogIds || dogIds.length === 0) return 'כל הכלבים';

    if (dogIds.length === dogs.length) {
      return 'כל הכלבים';
    }
    
    if (dogIds.length === 1) {
      const dog = dogs.find(d => d.id === dogIds[0]);
      return `כלב: ${dog ? dog.name : 'כלב לא ידוע'}`;
    }
    
    const names = dogIds.map(id => {
      const dog = dogs.find(d => d.id === id);
      return dog ? dog.name : 'כלב לא ידוע';
    });
    
    return `כלבים: ${names.join(', ')}`;
  };

  const handleEditDog = (dogId: string, dogName: string) => {
    Alert.alert(
      'עריכת כלב',
      `פונקציונליות עריכת ${dogName} עדיין לא מומשה.`,
      [
        {
          text: 'בסדר',
          style: 'default',
        },
      ]
    );
  };

  const handleViewDogDetails = (dogId: string, dogName: string) => {
    Alert.alert(
      'פרטי כלב',
      `פונקציונליות הצגת פרטי ${dogName} עדיין לא מומשה.`,
      [
        {
          text: 'בסדר',
          style: 'default',
        },
      ]
    );
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
              dirtyHomeDataUsers.add(userId);
              
              // Refresh dogs list
              if (currentUserId) {
                loadUserAndDogs(currentUserId, currentUserName);
              }
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

  const handleDeleteReminder = (reminderId: string, reminderTitle: string) => {
    Alert.alert(
      'מחיקת תזכורת',
      `האם אתה בטוח שברצונך למחוק את "${reminderTitle}"?`,
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

              // Cancel the notification before deleting the reminder
              await cancelReminderNotification(reminderId);

              await reminderAPI.deleteReminder(userId, reminderId);
              Alert.alert('הצלחה', `התזכורת נמחקה בהצלחה`);
              setShowReminderDetails(false);
              dirtyHomeDataUsers.add(userId);
              
              // Refresh reminders list
              if (currentUserId) {
                loadUserAndDogs(currentUserId, currentUserName);
              }
            } catch (error: any) {
              console.error('Error deleting reminder:', error);
              Alert.alert('שגיאה', error.message || 'שגיאה במחיקת התזכורת');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderDogCard = ({ item: dog }: { item: any }) => (
    <View style={styles.dogCard}>
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
          <View style={[
            styles.genderBadge,
            { backgroundColor: dog.gender === 'M' ? '#4A90E2' : '#FF69B4' }
          ]}>
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
              {calculateAge(dog.birthdate)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.dogActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteDog(dog.id, dog.name)}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#E74C3C" />
          <Text style={[styles.actionButtonText, { color: '#E74C3C' }]}>מחיקה</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditDog(dog.id, dog.name)}
        >
          <MaterialCommunityIcons name="pencil" size={18} color="#7FB069" />
          <Text style={styles.actionButtonText}>עריכה</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleViewDogDetails(dog.id, dog.name)}
        >
          <MaterialCommunityIcons name="information-outline" size={18} color="#7FB069" />
          <Text style={styles.actionButtonText}>פרטים</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
              onPress={() => navigation.navigate('Settings', {
                userId: currentUserId,
                email: route?.params?.email,
                userFirstName: currentUserName,
                userLastName: currentUserLastName,
              })}
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
                onPress={() => {
                  if (currentUserId) dirtyHomeDataUsers.add(currentUserId);
                  navigation.navigate('AddDog', { userId: currentUserId });
                }}
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
                  <Text style={styles.dogsHeaderSubtitle}>הכלבים שלך:</Text>
                </View>
                <TouchableOpacity
                  style={styles.addDogFab}
                  onPress={() => {
                    if (currentUserId) dirtyHomeDataUsers.add(currentUserId);
                    navigation.navigate('AddDog', { userId: currentUserId });
                  }}
                >
                  <Text style={styles.addDogFabText}>הוסף כלב</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={dogs}
                renderItem={renderDogCard}
                keyExtractor={(item) => item.id}
                horizontal
                inverted
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dogsContainer}
                snapToInterval={320} // Card width + margin
                decelerationRate="fast"
                pagingEnabled={false}
              />

              {/* Reminders Section */}
              <View style={styles.remindersSection}>
                <View style={styles.remindersHeader}>
                  <Text style={styles.remindersTitle}>תזכורות</Text>
                  <TouchableOpacity
                    style={styles.addReminderButton}
                    onPress={() => {
                      if (currentUserId) dirtyHomeDataUsers.add(currentUserId);
                      navigation.navigate('AddReminder', { userId: currentUserId });
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addReminderButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                {reminders && reminders.length > 0 ? (
                  <FlatList
                    data={reminders}
                    renderItem={({ item: reminder }) => (
                      <TouchableOpacity 
                        style={styles.reminderCard}
                        onPress={() => {
                          setSelectedReminder(reminder);
                          setShowReminderDetails(true);
                        }}
                      >
                        <View style={styles.reminderContent}>
                          <Text style={styles.reminderTitle}>{reminder.title}</Text>
                          {reminder.description && (
                            <Text style={styles.reminderDescription}>{reminder.description}</Text>
                          )}
                          <Text style={styles.reminderDogs}>{getDogText(reminder.dogIds)}</Text>
                          <Text style={styles.reminderDate}>{formatReminderDateTime(reminder.remindAt)}</Text>
                        </View>
                        <View style={[styles.reminderStatus, reminder.sent && styles.reminderSent]}>
                          <Text style={styles.reminderStatusText}>
                            {reminder.sent ? '✓' : '⏰'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : `reminder-${index}`}
                    scrollEnabled={false}
                  />
                ) : (
                  <Text style={styles.remindersPlaceholder}>
                    אין תזכורות כרגע
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* Reminder Details Modal */}
        <Modal
          visible={showReminderDetails && selectedReminder !== null}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowReminderDetails(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReminderDetails(false)}>
                <Ionicons name="arrow-forward" size={28} color={TEXT_DARK} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>פרטי התזכורת</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.detailsCard}>
                <Text style={styles.detailsLabel}>שם</Text>
                <Text style={styles.detailsValue}>{selectedReminder?.title}</Text>
              </View>

              {selectedReminder?.description && (
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsLabel}>תיאור</Text>
                  <Text style={styles.detailsValue}>{selectedReminder.description}</Text>
                </View>
              )}

              <View style={styles.detailsCard}>
                <Text style={styles.detailsLabel}>תאריך ושעה</Text>
                <Text style={styles.detailsValue}>{formatReminderDateTime(selectedReminder?.remindAt)}</Text>
              </View>

              <View style={styles.detailsCard}>
                <Text style={styles.detailsValue}>{getDogText(selectedReminder?.dogIds || [])}</Text>
              </View>

              <View style={styles.detailsCard}>
                <Text style={styles.detailsLabel}>סטטוס</Text>
                <Text style={[styles.detailsValue, selectedReminder?.sent && { color: PRIMARY_COLOR }]}>
                  {selectedReminder?.sent ? '✓ נשלח' : '⏰ ממתין'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  handleDeleteReminder(selectedReminder?.id, selectedReminder?.title);
                }}
              >
                <MaterialCommunityIcons name="trash-can" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>מחוק תזכורת</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              Alert.alert(
                'מצב חירום',
                `האם הכלב שלך זקוק לעזרה דחופה?`,
                [
                  { text: 'ביטול', style: 'cancel' },
                  {
                    text: 'עזרה',
                    style: 'destructive',
                    onPress: async () => {
                      navigation.navigate('Emergency');
                    },
                  },
                ],
                { cancelable: true }
              );
            }}
          >
            <MaterialCommunityIcons name="alarm-light" size={24} color="#E53935" />
            <Text style={styles.navLabel}>
             עזרה
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
            onPress={() => {
              setActiveTab('profile');
              navigation.navigate('OwnerWalkers', {
                userId: currentUserId,
                userFirstName: currentUserName,
                userLastName: currentUserLastName,
                userRole: route?.params?.userRole,
                email: route?.params?.email,
              });
            }}
          >
            <FontAwesome5
              name="dog"
              size={24}
              color={activeTab === 'profile' ? PRIMARY_COLOR : '#9CA3AF'}
            />
            <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>
              דוגווקרים
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'health' && styles.navItemActive]}
            onPress={() => {
              setActiveTab('health');
              navigation.navigate('Health');
            }}
          >
            <Ionicons
              name={activeTab === 'health' ? 'heart' : 'heart-outline'}
              size={24}
              color={activeTab === 'health' ? PRIMARY_COLOR : '#9CA3AF'}
            />
            <Text style={[styles.navLabel, activeTab === 'health' && styles.navLabelActive]}>
              בריאות
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'walks' && styles.navItemActive]}
            onPress={() => {
              setActiveTab('walks');
              navigation.navigate('Profile', {
                userId: currentUserId,
                userFirstName: currentUserName,
                userLastName: currentUserLastName,
                userRole: route?.params?.userRole,
                email: route?.params?.email,
              });
            }}
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
            onPress={() => {
              setActiveTab('home');
              navigation.navigate('Home');
            }}
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
  remindersHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  remindersTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'right',
    flex: 1,
  },
  addReminderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  addReminderButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
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
  reminderCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_COLOR,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reminderContent: {
    flex: 1,
    marginRight: 12,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5C4033',
    textAlign: 'right',
    marginBottom: 4,
  },
  reminderDescription: {
    fontSize: 13,
    color: '#8B7355',
    textAlign: 'right',
    marginBottom: 4,
  },
  reminderDogs: {
    fontSize: 12,
    color: '#7FB069',
    textAlign: 'right',
    marginBottom: 4,
    fontWeight: '500',
  },
  reminderDate: {
    fontSize: 12,
    color: '#A9A9A9',
    textAlign: 'right',
  },
  reminderStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderSent: {
    backgroundColor: '#E8F5E9',
  },
  reminderStatusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_COLOR,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B7355',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  detailsValue: {
    fontSize: 16,
    color: TEXT_DARK,
    lineHeight: 24,
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    flexDirection: 'row-reverse', // RTL support - text on right, button on left
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
    textAlign: 'right', // RTL support
  },
  dogsHeaderSubtitle: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'right', // RTL support
  },
  addDogFab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  addDogFabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dogsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingLeft: 24, // Extra padding on the left for last card when list is inverted
  },
  dogCard: {
    backgroundColor: '#F6D9B7',
    borderRadius: 16,
    padding: 16,
    width: 300, // Fixed width for horizontal scrolling
    marginLeft: 16, // Space between cards in inverted horizontal list
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dogCardHeader: {
    flexDirection: 'row-reverse', // RTL support
    marginBottom: 16,
  },
  dogImageContainer: {
    position: 'relative',
    marginLeft: 16, // Changed from marginRight for RTL
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
    alignItems: 'flex-end', // Align content to right
  },
  dogName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 4,
    textAlign: 'right', // RTL support
  },
  dogBreed: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 8,
    textAlign: 'right', // RTL support
  },
  dogMetaRow: {
    flexDirection: 'row-reverse', // RTL support - icon on right, text on left
    alignItems: 'center',
    gap: 6,
  },
  dogMeta: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'right', // RTL support
  },
  dogActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E0D5C7',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row-reverse', // RTL support - icon on right, text on left
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    textAlign: 'right', // RTL support
  },
});

