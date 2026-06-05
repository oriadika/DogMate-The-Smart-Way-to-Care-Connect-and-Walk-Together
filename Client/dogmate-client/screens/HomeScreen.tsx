// screens/HomeScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
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
import { dogAPI, reminderAPI, userAPI, type ReminderRow } from '../services/api';
import { cancelReminderNotification } from '../services/notifications';
import { loadNotificationPreferences } from '../services/notificationPreferences';
import { resyncAllNotifications } from '../services/notificationScheduler';
import { getReminderCountdown, sortRemindersNearestFirst } from '../utils/daysDisplay';
import websocketService from '../services/websocket';

const PRIMARY_COLOR = '#7FB069'; // Sage green
const BG_COLOR = '#FAEFDD'; // Main background
const TEXT_DARK = '#5C4033'; // Dark brown for text
const CARD_BG = '#faf0e6'; // Lighter beige for inputs/cards
const BORDER_COLOR = '#E0D5C7'; // Border color

/** Let Axios home fetches complete before WebSocket / notification side effects run. */
const HOME_FOCUS_SIDE_EFFECTS_DELAY_MS = 1500;

type HomeCacheEntry = {
  userName: string;
  userLastName: string;
  dogs: any[];
  reminders: any[];
  signature: string;
};

const homeDataCache = new Map<string, HomeCacheEntry>();
const dirtyHomeDataUsers = new Set<string>();

/** Fingerprint for profile image so signature changes when photo is replaced without huge strings. */
const profileImageFingerprint = (url: unknown): string => {
  const s = typeof url === 'string' ? url : '';
  if (!s) return '0';
  const len = s.length;
  if (len <= 120) return `${len}:${s}`;
  return `${len}:${s.slice(0, 60)}:${s.slice(-60)}`;
};

const buildDataSignature = (dogsData: any[], remindersData: any[]): string => {
  const dogsPart = dogsData
    .map((d: any) =>
      [
        d?.id ?? '',
        d?.name ?? '',
        d?.breed ?? '',
        d?.birthdate ?? '',
        d?.gender ?? '',
        profileImageFingerprint(d?.profileImageUrl),
        d?.weightKg ?? '',
      ].join(':')
    )
    .join('|');
  const remindersPart = remindersData
    .map((r: any) => `${r?.id ?? ''}:${r?.title ?? ''}:${r?.remindAt ?? ''}:${r?.sent ?? ''}`)
    .join('|');
  return `${dogsData.length}#${remindersData.length}#${dogsPart}#${remindersPart}`;
};

const HomeScreen = ({ navigation, route }: any) => {
  const [userName, setUserName] = useState<string>(route?.params?.userFirstName || '');
  const [userLastName, setUserLastName] = useState<string>(route?.params?.userLastName || '');
  const [userId, setUserId] = useState<string | null>(route?.params?.userId || null);
  const [dogs, setDogs] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState<any | null>(null);
  const [showReminderDetails, setShowReminderDetails] = useState(false);

  const loadInFlightRef = useRef(false);
  const notificationsSyncedForUserRef = useRef<string | null>(null);
  const userNameRef = useRef(route?.params?.userFirstName || userName);
  userNameRef.current = route?.params?.userFirstName || userName;

  // Get user data from route params (passed from LoginScreen) - use state as fallback
  const currentUserId = route?.params?.userId || userId;

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
      if (!currentUserId) return;

      const forceRefresh =
        route?.params?.refresh === true || dirtyHomeDataUsers.has(currentUserId);

      if (forceRefresh) {
        homeDataCache.delete(currentUserId);
        dirtyHomeDataUsers.delete(currentUserId);
        notificationsSyncedForUserRef.current = null;
        if (route?.params?.refresh === true) {
          navigation.setParams({ refresh: false });
        }
      }

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

      const shouldSyncNotifications =
        forceRefresh || notificationsSyncedForUserRef.current !== currentUserId;

      void loadUserAndDogs(currentUserId, userNameRef.current, {
        showLoader: !cached,
        syncNotifications: false,
      });

      const deferredSideEffectsTimer = setTimeout(() => {
        void websocketService.ensureConnected(currentUserId);
        if (shouldSyncNotifications) {
          void (async () => {
            try {
              await loadNotificationPreferences(currentUserId);
              await resyncAllNotifications(currentUserId);
              notificationsSyncedForUserRef.current = currentUserId;
            } catch (error) {
              console.warn('Deferred home notification sync failed:', error);
            }
          })();
        }
      }, HOME_FOCUS_SIDE_EFFECTS_DELAY_MS);

      const intervalId = setInterval(() => {
        void loadUserAndDogs(currentUserId, userNameRef.current, {
          showLoader: false,
          syncNotifications: false,
        });
      }, 30000);

      return () => {
        clearTimeout(deferredSideEffectsTimer);
        clearInterval(intervalId);
      };
    }, [currentUserId, navigation, route?.params?.refresh])
  );

  const loadUserAndDogs = async (
    userIdToLoad: string,
    userNameToLoad?: string,
    options?: { showLoader?: boolean; syncNotifications?: boolean }
  ) => {
    if (loadInFlightRef.current) {
      return;
    }
    loadInFlightRef.current = true;

    const shouldShowLoader = options?.showLoader ?? false;
    const shouldSyncNotifications = options?.syncNotifications ?? false;

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

      const priorCache = homeDataCache.get(userIdToLoad);

      const [dogsSettled, remindersSettled] = await Promise.allSettled([
        dogAPI.getDogsForUser(userIdToLoad),
        reminderAPI.getRemindersForUser(userIdToLoad),
      ]);

      let nextDogs: any[] = [];
      if (dogsSettled.status === 'fulfilled') {
        const dogsResponse = dogsSettled.value;
        nextDogs = dogsResponse.success && dogsResponse.dogs ? dogsResponse.dogs : [];
      } else {
        console.error('Error loading dogs:', dogsSettled.reason);
        nextDogs = priorCache?.dogs ?? [];
        if (shouldShowLoader) {
          Alert.alert('שגיאה', 'שגיאה בטעינת רשימת הכלבים');
        }
      }

      let nextReminders: any[] = [];
      if (remindersSettled.status === 'fulfilled') {
        const remindersResponse = remindersSettled.value;
        nextReminders = sortRemindersNearestFirst(
          remindersResponse.success && remindersResponse.reminders
            ? remindersResponse.reminders
            : []
        );
      } else {
        console.warn('Error loading reminders:', remindersSettled.reason);
        nextReminders = sortRemindersNearestFirst(priorCache?.reminders ?? []);
      }

      const nextSignature = buildDataSignature(nextDogs, nextReminders);
      const cached = priorCache;
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

      if (shouldSyncNotifications) {
        await loadNotificationPreferences(userIdToLoad);
        await resyncAllNotifications(userIdToLoad);
      }
    } catch (error: any) {
      console.error('Error loading user/dogs:', error);
      if (shouldShowLoader) {
        Alert.alert('שגיאה', 'שגיאה בטעינת הנתונים');
      }
    } finally {
      loadInFlightRef.current = false;
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

  const parseReminderDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatReminderDateOnly = (dateValue: any): string => {
    const date = parseReminderDate(dateValue);
    if (!date) return '—';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatReminderTimeOnly = (dateValue: any): string => {
    const date = parseReminderDate(dateValue);
    if (!date) return '—';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  /** חודש בלי הספרה 1; חודשיים לגיל שניים; N חודשים אחרת */
  const hebrewMonthsPart = (months: number): string => {
    if (months <= 0) return '';
    if (months === 1) return 'חודש';
    if (months === 2) return 'חודשיים';
    return `${months} חודשים`;
  };

  /** שנה בלי "1"; N שנים אחרת */
  const hebrewYearsPart = (years: number): string => {
    if (years <= 0) return '';
    if (years === 1) return 'שנה';
    return `${years} שנים`;
  };

  // Calculate age from birth date
  const calculateAge = (birthdate: string): string => {
    if (!birthdate || !String(birthdate).trim()) return '';
    const today = new Date();
    const birth = new Date(birthdate);
    if (Number.isNaN(birth.getTime())) return 'תאריך לא תקין';

    const daysDiff = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 0) return 'תאריך לא תקין';

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

    /** גור חדש — פחות מחודש לוחזי (~30 יום) */
    if (years === 0 && months === 0 && daysDiff < 30) {
      return 'גור חדש';
    }

    if (years === 0 && months === 0) {
      return 'חודש';
    }

    if (years === 0) {
      return hebrewMonthsPart(months);
    }

    if (months === 0) {
      return hebrewYearsPart(years);
    }

    return `${hebrewYearsPart(years)} ו-${hebrewMonthsPart(months)}`;
  };

  /** משקל לתצוגה בכרטיס (למשל 5.8 ק״ג); null אם לא צוין */
  const formatDogWeightLabel = (dog: any): string | null => {
    const raw = dog?.weightKg ?? dog?.weight;
    if (raw == null || raw === '') return null;
    const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return null;
    const rounded = Math.round(n * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${text} ק״ג`;
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

  const handleEditDog = (dog: any) => {
    if (!currentUserId) {
      Alert.alert('שגיאה', 'לא נמצא משתמש מחובר');
      return;
    }
    navigation.navigate('EditDog', { userId: currentUserId, dog });
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
                loadUserAndDogs(currentUserId, userNameRef.current, { syncNotifications: true });
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

  const navigateToSystemReminderSource = (reminder: ReminderRow) => {
    if (!reminder.sourceType || !reminder.sourceId) {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את מקור התזכורת');
      return;
    }
    setShowReminderDetails(false);
    switch (reminder.sourceType) {
      case 'FOOD':
        navigation.navigate('FoodIntake', { inventoryId: reminder.sourceId, userId: currentUserId });
        break;
      case 'VACCINATION':
        navigation.navigate('VaccinationForm', {
          userId: currentUserId,
          vaccinationId: reminder.sourceId,
        });
        break;
      case 'MEDICATION':
        navigation.navigate('MedicationForm', {
          userId: currentUserId,
          medicationId: reminder.sourceId,
        });
        break;
      default:
        Alert.alert('שגיאה', 'סוג תזכורת לא מוכר');
    }
  };

  const handleDeleteReminder = (reminder: ReminderRow) => {
    if (reminder.systemGenerated) {
      Alert.alert(
        'תזכורת אוטומטית',
        'תזכורת זו נוצרה אוטומטית מהמערכת. כדי להסיר אותה, עדכן את הגדרות ההתראות בפריט המקור.',
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'פתח הגדרות',
            onPress: () => navigateToSystemReminderSource(reminder),
          },
        ]
      );
      return;
    }

    Alert.alert(
      'מחיקת תזכורת',
      `האם אתה בטוח שברצונך למחוק את "${reminder.title}"?`,
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
              await cancelReminderNotification(reminder.id);

              await reminderAPI.deleteReminder(userId, reminder.id);
              Alert.alert('הצלחה', `התזכורת נמחקה בהצלחה`);
              setShowReminderDetails(false);
              dirtyHomeDataUsers.add(userId);
              
              // Refresh reminders list
              if (currentUserId) {
                loadUserAndDogs(currentUserId, userNameRef.current, { syncNotifications: true });
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

  const renderDogCard = ({ item: dog }: { item: any }) => {
    const weightLabel = formatDogWeightLabel(dog);
    return (
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
            {weightLabel != null ? (
              <View style={[styles.dogMetaRow, styles.dogWeightRow]}>
                <MaterialCommunityIcons name="scale-bathroom" size={14} color="#8B7355" />
                <Text style={styles.dogMeta}>{weightLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.dogActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeleteDog(dog.id, dog.name)}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={15} color="#E74C3C" />
            <Text style={[styles.actionButtonText, { color: '#E74C3C' }]}>מחיקה</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditDog(dog)}
          >
            <MaterialCommunityIcons name="pencil" size={15} color="#7FB069" />
            <Text style={styles.actionButtonText}>עריכה</Text>
          </TouchableOpacity>
        </View>
      </View>
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
              onPress={() => navigation.navigate('Settings', {
                userId: currentUserId,
                email: route?.params?.email,
                userFirstName: userNameRef.current || userName,
                userLastName: userLastName,
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
                    renderItem={({ item: reminder }) => {
                      const countdown = getReminderCountdown(reminder.remindAt);
                      const isPast = countdown?.isPast ?? false;
                      return (
                      <TouchableOpacity 
                        style={styles.reminderCard}
                        onPress={() => {
                          setSelectedReminder(reminder);
                          setShowReminderDetails(true);
                        }}
                      >
                        <View style={styles.reminderContent}>
                          <View style={styles.reminderTitleRow}>
                            <Text style={styles.reminderTitle}>{reminder.title}</Text>
                            {reminder.systemGenerated ? (
                              <Ionicons name="notifications" size={16} color={PRIMARY_COLOR} />
                            ) : null}
                          </View>
                          {reminder.description && (
                            <Text style={styles.reminderDescription}>{reminder.description}</Text>
                          )}
                          <Text style={styles.reminderDogs}>{getDogText(reminder.dogIds)}</Text>
                          <Text style={styles.reminderDate}>{formatReminderDateTime(reminder.remindAt)}</Text>
                        </View>
                        {isPast ? (
                          <View style={styles.reminderStatusContainer}>
                            <Text style={styles.reminderStatusLabel}>סטטוס</Text>
                            <Text style={[styles.reminderStatusValue, { color: PRIMARY_COLOR }]}>✓</Text>
                            <Text style={styles.reminderStatusSubtext}>(עבר הזמן)</Text>
                          </View>
                        ) : countdown ? (
                          <View style={styles.reminderStatusContainer}>
                            <Text style={styles.reminderStatusLabel}>{countdown.label}</Text>
                            <Text style={[styles.reminderStatusValue, { color: countdown.urgencyColor }]}>
                              {countdown.displayValue}
                            </Text>
                            <Text style={styles.reminderStatusSubtext}>{countdown.subtext}</Text>
                          </View>
                        ) : (
                          <View style={styles.reminderStatusContainer}>
                            <Text style={styles.reminderStatusLabel}>ימים עד התזכורת:</Text>
                            <Text style={[styles.reminderStatusValue, { color: '#8B7355' }]}>—</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      );
                    }}
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
            <View style={styles.detailsHeader}>
              <TouchableOpacity
                onPress={() => setShowReminderDetails(false)}
                style={styles.detailsBackButton}
              >
                <Ionicons name="arrow-forward" size={28} color={TEXT_DARK} />
              </TouchableOpacity>
              <Text style={styles.detailsHeaderTitle}>פרטי התזכורת</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.detailsContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailsFormSection}>
                <View style={styles.detailsInputGroup}>
                  <Text style={styles.detailsFormLabel}>שם האירוע</Text>
                  <View style={styles.detailsFormInput}>
                    <Text style={styles.detailsFormInputText}>{selectedReminder?.title || '—'}</Text>
                  </View>
                </View>

                <View style={styles.detailsInputGroup}>
                  <Text style={styles.detailsFormLabel}>תיאור</Text>
                  <View style={[styles.detailsFormInput, styles.detailsFormTextArea]}>
                    <Text style={styles.detailsFormInputText}>
                      {selectedReminder?.description?.trim() || 'ללא תיאור'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsInputGroup}>
                  <Text style={styles.detailsFormLabel}>למי מיועדת התזכורת?</Text>
                  <View style={styles.detailsPickerInput}>
                    <Text style={styles.detailsFormInputText}>
                      {getDogText(selectedReminder?.dogIds || [])}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailsDateTimeSection}>
                <View style={styles.detailsInputGroup}>
                  <Text style={styles.detailsFormLabel}>תאריך</Text>
                  <View style={styles.detailsDateTimeCard}>
                    <View style={styles.detailsDateTimeCardContent}>
                      <View style={styles.detailsDateTimeCardLeft}>
                        <MaterialCommunityIcons name="calendar" size={24} color={PRIMARY_COLOR} />
                        <Text style={styles.detailsDateTimeLabel}>
                          {formatReminderDateOnly(selectedReminder?.remindAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsInputGroup}>
                  <Text style={styles.detailsFormLabel}>שעה</Text>
                  <View style={styles.detailsDateTimeCard}>
                    <View style={styles.detailsDateTimeCardContent}>
                      <View style={styles.detailsDateTimeCardLeft}>
                        <MaterialCommunityIcons name="clock-outline" size={24} color={PRIMARY_COLOR} />
                        <Text style={styles.detailsDateTimeLabel}>
                          {formatReminderTimeOnly(selectedReminder?.remindAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.detailsInputGroup}>
                <Text style={styles.detailsFormLabel}>סטטוס</Text>
                <View style={styles.detailsFormInput}>
                  <Text
                    style={[
                      styles.detailsFormInputText,
                      getReminderCountdown(selectedReminder?.remindAt)?.isPast && { color: PRIMARY_COLOR, fontWeight: '700' },
                    ]}
                  >
                    {getReminderCountdown(selectedReminder?.remindAt)?.isPast ? 'עבר הזמן ✓' : 'ממתין ⏰'}
                  </Text>
                </View>
              </View>

              {selectedReminder?.systemGenerated ? (
                <>
                  <Text style={styles.systemReminderHint}>
                    תזכורת זו נוצרה אוטומטית מהמערכת. לעריכת ההגדרות, פתח את הפריט המקור.
                  </Text>
                  <TouchableOpacity
                    style={styles.detailsSubmitButton}
                    onPress={() => navigateToSystemReminderSource(selectedReminder as ReminderRow)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="settings-outline" size={20} color="#fff" />
                    <Text style={styles.detailsSubmitButtonText}>פתח הגדרות מקור</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
              <TouchableOpacity
                style={styles.detailsSubmitButton}
                onPress={() => {
                  setShowReminderDetails(false);
                  navigation.navigate('AddReminder', {
                    userId: currentUserId,
                    reminder: selectedReminder,
                  });
                }}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
                <Text style={styles.detailsSubmitButtonText}>ערוך תזכורת</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.detailsDeleteButton}
                onPress={() => {
                  handleDeleteReminder(selectedReminder as ReminderRow);
                }}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="trash-can" size={20} color="#fff" />
                <Text style={styles.detailsDeleteButtonText}>מחוק תזכורת</Text>
              </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

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
    alignSelf: 'stretch',
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5C4033',
    textAlign: 'right',
    writingDirection: 'rtl',
    flex: 1,
  },
  reminderTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    marginBottom: 4,
  },
  systemReminderHint: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 16,
    lineHeight: 20,
  },
  reminderDescription: {
    fontSize: 13,
    color: '#8B7355',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
    marginBottom: 4,
  },
  reminderDogs: {
    fontSize: 12,
    color: '#7FB069',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
    marginBottom: 4,
    fontWeight: '500',
  },
  reminderDate: {
    fontSize: 12,
    color: '#A9A9A9',
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  reminderStatusContainer: {
    alignItems: 'center',
    minWidth: 88,
    marginLeft: 4,
  },
  reminderStatusLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
    writingDirection: 'rtl',
  },
  reminderStatusValue: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  reminderStatusSubtext: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 3,
    writingDirection: 'rtl',
  },
  // Modal Styles — matches AddReminderScreen layout
  modalContainer: {
    flex: 1,
    backgroundColor: BG_COLOR,
    width: '100%',
    alignSelf: 'stretch',
  },
  detailsHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  detailsBackButton: {
    padding: 5,
  },
  detailsHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  modalContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  detailsContent: {
    padding: 24,
    paddingBottom: 40,
    width: '100%',
    alignSelf: 'stretch',
  },
  detailsFormSection: {
    marginBottom: 2,
  },
  detailsInputGroup: {
    marginBottom: 20,
  },
  detailsFormLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  detailsFormInput: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailsFormTextArea: {
    minHeight: 100,
    justifyContent: 'flex-start',
  },
  detailsFormInputText: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 24,
  },
  detailsPickerInput: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailsDateTimeSection: {
    marginBottom: 24,
  },
  detailsDateTimeCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailsDateTimeCardContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailsDateTimeCardLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
  },
  detailsDateTimeLabel: {
    fontSize: 16,
    color: TEXT_DARK,
    fontWeight: '600',
    marginRight: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  detailsSubmitButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailsSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
    writingDirection: 'rtl',
  },
  detailsDeleteButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailsDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
    writingDirection: 'rtl',
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
  dogWeightRow: {
    marginTop: 6,
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
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row-reverse', // RTL support - icon on right, text on left
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    textAlign: 'right', // RTL support
  },
});

