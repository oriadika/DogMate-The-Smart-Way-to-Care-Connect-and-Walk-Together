// screens/HomeScreen.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  InteractionManager,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { dogAPI, reminderAPI, type ReminderRow } from '../services/dogmateApi';
import { cancelReminderNotification } from '../services/notifications';
import { loadNotificationPreferences } from '../services/notificationPreferences';
import { resyncAllNotifications } from '../services/notificationScheduler';
import {
  getCountdownPrimaryText,
  getReminderCountdown,
  sortRemindersNearestFirst,
  filterActiveReminders,
} from '../utils/daysDisplay';
import { getHomeReminderCountdown, getReminderSourceEmoji } from '../utils/homeReminderCountdown';
import {
  applyHomeCacheToState,
  buildHomeDataSignature,
  clearHomeCache,
  EDITABLE_HEALTH_REMINDER_TYPES,
  getHomeCache,
  getInitialHomeState,
  markHomeDataDirty,
  setHomeCache,
  shouldForceHomeRefresh,
  clearHomeDirty,
} from '../utils/homeDataCache';
import MedicationOverdueMarkDoneModal from '../components/health/MedicationOverdueMarkDoneModal';
import {
  combineMedicationPlannedDue,
  findMedicationRowForUser,
  formatAdministeredAtForApi,
  isMedicationPlannedDueOverdue,
} from '../utils/healthMarkDone';
import { completeReminderFromHome } from '../utils/reminderCompletion';
import { deferScreenCleanup } from '../utils/screenLifecycle';
import {
  consumeLoginWelcomeMessage,
  showLoginWelcomeMessage,
} from '../utils/loginWelcomeMessage';
import { isAbortError } from '../utils/isAbortError';
import { getOwnerSession, resolveOwnerUserId } from '../utils/ownerSession';
import {
  ensureOwnerDataPrefetched,
  isHealthDataWarm,
  toDogOptions,
  warmHealthCountdownCache,
} from '../utils/healthDataCache';
import { waitForOwnerPrefetchHome } from '../utils/ownerPrefetchCoordinator';

const PRIMARY_COLOR = '#7FB069'; // Sage green
const BG_COLOR = '#FAEFDD'; // Main background
const TEXT_DARK = '#5C4033'; // Dark brown for text
const CARD_BG = '#faf0e6'; // Lighter beige for inputs/cards
const BORDER_COLOR = '#E0D5C7'; // Border color

/** Defer notification resync until after home HTTP completes. */
const HOME_NOTIFICATION_SYNC_DELAY_MS = 2000;
const REMINDERS_PAGE_SIZE = 5;

function ReminderCountdownLabel({
  unit,
  sourceEmoji,
}: {
  unit: string;
  sourceEmoji?: string | null;
}) {
  return (
    <Text style={styles.reminderStatusLabel}>
      {sourceEmoji ? (
        <Text style={styles.reminderLabelEmoji}>{sourceEmoji} </Text>
      ) : null}
      <Text style={styles.reminderStatusLabelUnit}>{unit}</Text>
      {' עד התזכורת:'}
    </Text>
  );
}

const HomeScreen = ({ navigation, route }: any) => {
  const routeUserId = (route?.params?.userId || getOwnerSession().userId) as string | undefined;
  const initialHome = getInitialHomeState(routeUserId, route?.params?.userFirstName || getOwnerSession().userFirstName);

  const [userName, setUserName] = useState<string>(
    route?.params?.userFirstName || initialHome.userName
  );
  const [userLastName, setUserLastName] = useState<string>(
    route?.params?.userLastName || initialHome.userLastName
  );
  const [userId, setUserId] = useState<string | null>(routeUserId || null);
  const [dogs, setDogs] = useState<any[]>(initialHome.dogs);
  const [reminders, setReminders] = useState<any[]>(initialHome.reminders);
  const [loading, setLoading] = useState(initialHome.loading);
  const [selectedReminder, setSelectedReminder] = useState<any | null>(null);
  const [showReminderDetails, setShowReminderDetails] = useState(false);
  const [visibleRemindersCount, setVisibleRemindersCount] = useState(REMINDERS_PAGE_SIZE);
  const [markingReminderId, setMarkingReminderId] = useState<string | null>(null);
  const [medicationOverduePrompt, setMedicationOverduePrompt] = useState<{
    reminder: ReminderRow;
    plannedDue: Date | null;
  } | null>(null);
  const [medicationOverdueBusy, setMedicationOverdueBusy] = useState(false);

  const loadGenerationRef = useRef(0);
  const homeFetchAbortRef = useRef<AbortController | null>(null);
  const isHomeFocusedRef = useRef(false);
  const notificationsSyncedForUserRef = useRef<string | null>(null);
  const routeRef = useRef(route);
  const navigationRef = useRef(navigation);
  const userNameRef = useRef(route?.params?.userFirstName || userName);
  const dogsRef = useRef<any[]>(dogs);
  const remindersRef = useRef<any[]>(reminders);
  routeRef.current = route;
  navigationRef.current = navigation;
  userNameRef.current = route?.params?.userFirstName || userName;
  dogsRef.current = dogs;
  remindersRef.current = reminders;

  const cancelHomeFetch = useCallback(() => {
    loadGenerationRef.current += 1;
    homeFetchAbortRef.current?.abort();
    homeFetchAbortRef.current = null;
  }, []);

  const beginHomeFetch = useCallback(() => {
    homeFetchAbortRef.current?.abort();
    loadGenerationRef.current += 1;
    const generation = loadGenerationRef.current;
    const abortController = new AbortController();
    homeFetchAbortRef.current = abortController;
    return { generation, signal: abortController.signal };
  }, []);

  const isHomeFetchCurrent = useCallback((generation: number) => {
    return generation === loadGenerationRef.current;
  }, []);

  const hydrateFromCache = useCallback((userIdKey: string): boolean => {
    const cached = getHomeCache(userIdKey);
    if (!cached) return false;
    applyHomeCacheToState(cached, { setUserName, setUserLastName, setDogs, setReminders });
    setLoading(false);
    return true;
  }, []);

  // Get user data from route params, session, or state
  const currentUserId = resolveOwnerUserId(route?.params?.userId, userId);

  const visibleReminders = useMemo(
    () => reminders.slice(0, visibleRemindersCount),
    [reminders, visibleRemindersCount]
  );
  const hasMoreReminders = reminders.length > visibleRemindersCount;

  useEffect(() => {
    setVisibleRemindersCount(REMINDERS_PAGE_SIZE);
  }, [reminders]);

  // Keep userId state aligned when session survives a partial navigation reset
  React.useEffect(() => {
    const resolved = resolveOwnerUserId(route?.params?.userId, userId);
    if (resolved && resolved !== userId) {
      setUserId(resolved);
    }
  }, [route?.params?.userId, userId]);

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

  const loadUserAndDogs = useCallback(async (
    userIdToLoad: string,
    userNameToLoad?: string,
    options?: { showLoader?: boolean; syncNotifications?: boolean }
  ) => {
    const { generation, signal } = beginHomeFetch();

    const shouldShowLoader = options?.showLoader ?? false;
    const shouldSyncNotifications = options?.syncNotifications ?? false;

    try {
      if (shouldShowLoader) {
        setLoading(true);
      }

      if (isHomeFetchCurrent(generation)) {
        setUserId(userIdToLoad);
      }

      let nextUserName = userNameToLoad || userNameRef.current || 'חברים';
      let nextUserLastName = userLastName || '';

      const priorCache = getHomeCache(userIdToLoad);

      const [dogsSettled, remindersSettled] = await Promise.allSettled([
        dogAPI.getDogsForUser(userIdToLoad, { signal }),
        reminderAPI.getRemindersForUser(userIdToLoad, { signal }),
      ]);

      if (!isHomeFetchCurrent(generation)) return;

      let nextDogs: any[] = [];
      if (dogsSettled.status === 'fulfilled') {
        const dogsResponse = dogsSettled.value;
        nextDogs = dogsResponse.success && dogsResponse.dogs ? dogsResponse.dogs : [];
      } else {
        if (isAbortError(dogsSettled.reason)) return;
        console.error('Error loading dogs:', dogsSettled.reason);
        nextDogs = priorCache?.dogs ?? dogsRef.current;
      }

      let nextReminders: any[] = [];
      if (remindersSettled.status === 'fulfilled') {
        const remindersResponse = remindersSettled.value;
        nextReminders = sortRemindersNearestFirst(
          filterActiveReminders(
            remindersResponse.success && remindersResponse.reminders
              ? remindersResponse.reminders
              : []
          )
        );
      } else {
        if (isAbortError(remindersSettled.reason)) return;
        console.warn('Error loading reminders:', remindersSettled.reason);
        nextReminders = sortRemindersNearestFirst(priorCache?.reminders ?? remindersRef.current);
      }

      if (!isHomeFetchCurrent(generation)) return;

      if (!isHealthDataWarm(userIdToLoad)) {
        try {
          await warmHealthCountdownCache(userIdToLoad, toDogOptions(nextDogs));
        } catch (error) {
          if (!isAbortError(error)) {
            console.warn('Error warming health countdown cache:', error);
          }
        }
      }

      if (!isHomeFetchCurrent(generation)) return;

      const nextSignature = buildHomeDataSignature(nextDogs, nextReminders);
      const cached = priorCache;
      const hasChanged =
        !cached ||
        cached.signature !== nextSignature ||
        cached.userName !== nextUserName ||
        cached.userLastName !== nextUserLastName;

      setUserName(nextUserName);
      setUserLastName(nextUserLastName);
      setDogs(nextDogs);
      setReminders(nextReminders);
      setLoading(false);

      if (hasChanged) {
        setHomeCache(userIdToLoad, {
          userName: nextUserName,
          userLastName: nextUserLastName,
          dogs: nextDogs,
          reminders: nextReminders,
          signature: nextSignature,
        });
      }

      clearHomeDirty(userIdToLoad);

      if (shouldSyncNotifications) {
        await loadNotificationPreferences(userIdToLoad);
        if (!isHomeFetchCurrent(generation)) return;
        await resyncAllNotifications(userIdToLoad);
      }
    } catch (error: any) {
      if (isAbortError(error) || !isHomeFetchCurrent(generation)) return;
      console.error('Error loading user/dogs:', error);
      if (hydrateFromCache(userIdToLoad)) {
        setLoading(false);
        return;
      }
      if (shouldShowLoader) {
        Alert.alert('שגיאה', 'שגיאה בטעינת הנתונים');
      }
    } finally {
      if (!isHomeFetchCurrent(generation)) return;
      homeFetchAbortRef.current = null;
      if (shouldShowLoader) {
        setLoading(false);
      }
    }
  }, [beginHomeFetch, hydrateFromCache, isHomeFetchCurrent, userLastName]);

  // Load data when screen is focused (including when returning from AddDog screen)
  useFocusEffect(
    useCallback(() => {
      const resolvedUserId = resolveOwnerUserId(routeRef.current?.params?.userId, userId);
      if (!resolvedUserId) return;

      isHomeFocusedRef.current = true;

      const routeParams = routeRef.current?.params;
      const forceRefresh = shouldForceHomeRefresh(resolvedUserId, routeParams?.refresh === true);

      if (forceRefresh) {
        clearHomeCache(resolvedUserId);
        clearHomeDirty(resolvedUserId);
        notificationsSyncedForUserRef.current = null;
        if (routeParams?.refresh === true) {
          setTimeout(() => {
            navigationRef.current?.setParams?.({ refresh: false });
          }, 0);
        }
      }

      const cached = getHomeCache(resolvedUserId);
      const hasVisibleData =
        Boolean(cached) ||
        dogsRef.current.length > 0 ||
        remindersRef.current.length > 0;

      if (cached) {
        applyHomeCacheToState(cached, { setUserName, setUserLastName, setDogs, setReminders });
      }

      setLoading(!hasVisibleData);

      const shouldSyncNotifications =
        forceRefresh || notificationsSyncedForUserRef.current !== resolvedUserId;

      void ensureOwnerDataPrefetched(
        resolvedUserId,
        userNameRef.current,
        userLastName
      );

      const scheduleLoad = async () => {
        if (!isHomeFocusedRef.current) return;

        let visible =
          Boolean(getHomeCache(resolvedUserId)) ||
          dogsRef.current.length > 0 ||
          remindersRef.current.length > 0;

        if (!visible) {
          await waitForOwnerPrefetchHome(resolvedUserId);
          const warmed = getHomeCache(resolvedUserId);
          if (warmed && isHomeFocusedRef.current) {
            applyHomeCacheToState(warmed, {
              setUserName,
              setUserLastName,
              setDogs,
              setReminders,
            });
            setLoading(false);
            visible = true;
          }
        }

        void loadUserAndDogs(resolvedUserId, userNameRef.current, {
          showLoader: !visible,
          syncNotifications: false,
        });
      };

      const interactionTask = hasVisibleData
        ? InteractionManager.runAfterInteractions(() => {
            void scheduleLoad();
          })
        : null;
      if (!hasVisibleData) {
        void scheduleLoad();
      }

      const notificationSyncTimer = setTimeout(() => {
        if (!isHomeFocusedRef.current || !shouldSyncNotifications) return;
        void (async () => {
          try {
            await loadNotificationPreferences(resolvedUserId);
            await resyncAllNotifications(resolvedUserId);
            notificationsSyncedForUserRef.current = resolvedUserId;
          } catch (error) {
            console.warn('Deferred home notification sync failed:', error);
          }
        })();
      }, HOME_NOTIFICATION_SYNC_DELAY_MS);

      let welcomeTimer: ReturnType<typeof setTimeout> | null = null;
      if (consumeLoginWelcomeMessage()) {
        welcomeTimer = setTimeout(() => {
          if (!isHomeFocusedRef.current) return;
          InteractionManager.runAfterInteractions(showLoginWelcomeMessage);
        }, 400);
      }

      const intervalId = setInterval(() => {
        if (!isHomeFocusedRef.current) return;
        void loadUserAndDogs(resolvedUserId, userNameRef.current, {
          showLoader: false,
          syncNotifications: false,
        });
      }, 30000);

      return () => {
        isHomeFocusedRef.current = false;
        interactionTask?.cancel();
        deferScreenCleanup(() => {
          if (!isHomeFocusedRef.current) {
            cancelHomeFetch();
          }
        });
        clearTimeout(notificationSyncTimer);
        if (welcomeTimer) clearTimeout(welcomeTimer);
        clearInterval(intervalId);
      };
    }, [currentUserId, userId, cancelHomeFetch, loadUserAndDogs])
  );

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
              markHomeDataDirty(userId);

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

  const refreshHomeAfterReminderCompletion = useCallback(async () => {
    if (!userId) return;
    const cached = getHomeCache(userId);
    if (cached) {
      applyHomeCacheToState(cached, {
        setUserName,
        setUserLastName,
        setDogs,
        setReminders,
      });
      return;
    }
    if (currentUserId) {
      await loadUserAndDogs(currentUserId, userNameRef.current);
    }
  }, [userId, currentUserId]);

  const handleMarkReminderDone = async (reminder: ReminderRow) => {
    if (!userId || markingReminderId || medicationOverdueBusy) return;

    setMarkingReminderId(reminder.id);
    try {
      if (reminder.sourceType === 'MEDICATION' && reminder.sourceId) {
        const medication = await findMedicationRowForUser(userId, reminder.sourceId);
        if (medication && isMedicationPlannedDueOverdue(medication)) {
          setMedicationOverduePrompt({
            reminder,
            plannedDue: combineMedicationPlannedDue(medication),
          });
          return;
        }
      }

      await completeReminderFromHome(userId, reminder);
      if (selectedReminder?.id === reminder.id) {
        setShowReminderDetails(false);
        setSelectedReminder(null);
      }
      await refreshHomeAfterReminderCompletion();
    } catch (error: any) {
      console.error('Error completing reminder:', error);
      Alert.alert('שגיאה', error?.message || 'נכשל סימון התזכורת כבוצעה');
    } finally {
      setMarkingReminderId(null);
    }
  };

  const handleMedicationOverdueChoice = async (administeredAt: Date) => {
    if (!userId || !medicationOverduePrompt) return;

    setMedicationOverdueBusy(true);
    try {
      const { reminder } = medicationOverduePrompt;
      await completeReminderFromHome(
        userId,
        reminder,
        formatAdministeredAtForApi(administeredAt)
      );
      if (selectedReminder?.id === reminder.id) {
        setShowReminderDetails(false);
        setSelectedReminder(null);
      }
      setMedicationOverduePrompt(null);
      await refreshHomeAfterReminderCompletion();
    } catch (error: any) {
      console.error('Error completing overdue medication reminder:', error);
      Alert.alert('שגיאה', error?.message || 'נכשל סימון התרופה כבוצעה');
    } finally {
      setMedicationOverdueBusy(false);
      setMarkingReminderId(null);
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
              markHomeDataDirty(userId);

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
          {loading && dogs.length === 0 && reminders.length === 0 ? (
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
                  if (currentUserId) markHomeDataDirty(currentUserId);
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
                    if (currentUserId) markHomeDataDirty(currentUserId);
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
                      if (currentUserId) markHomeDataDirty(currentUserId);
                      navigation.navigate('AddReminder', { userId: currentUserId });
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addReminderButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                {reminders && reminders.length > 0 ? (
                  <FlatList
                    data={visibleReminders}
                    renderItem={({ item: reminder }) => {
                      const countdown = getHomeReminderCountdown(reminder);
                      const isPast = countdown?.isPast ?? false;
                      const openReminderDetails = () => {
                        setSelectedReminder(reminder);
                        setShowReminderDetails(true);
                      };
                      return (
                      <View style={styles.reminderCard}>
                        <View style={styles.reminderCardMain}>
                          <TouchableOpacity
                            style={styles.reminderContentPress}
                            onPress={openReminderDetails}
                            activeOpacity={0.85}
                          >
                            <View style={styles.reminderContent}>
                              <View style={styles.reminderTitleRow}>
                                <Text style={styles.reminderTitle}>{reminder.title}</Text>
                              </View>
                              {reminder.description ? (
                                <Text style={styles.reminderDescription}>{reminder.description}</Text>
                              ) : null}
                              <Text style={styles.reminderDogs}>{getDogText(reminder.dogIds)}</Text>
                              <Text style={styles.reminderDate} numberOfLines={1}>
                                {formatReminderDateTime(reminder.remindAt)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          <View style={styles.reminderStatusColumn}>
                            <TouchableOpacity onPress={openReminderDetails} activeOpacity={0.85}>
                              {isPast ? (
                                <View style={styles.reminderStatusContainer}>
                                  <Text style={styles.reminderStatusLabel}>סטטוס</Text>
                                  <Text style={[styles.reminderStatusValue, { color: PRIMARY_COLOR }]}>✓</Text>
                                  <Text style={styles.reminderStatusSubtext}>(עבר הזמן)</Text>
                                </View>
                              ) : countdown ? (
                                <View style={styles.reminderStatusContainer}>
                                  {countdown.displayText ? (
                                    <Text style={styles.reminderStatusLabel}>{countdown.label}</Text>
                                  ) : (
                                    <ReminderCountdownLabel
                                      unit={countdown.labelUnit}
                                      sourceEmoji={countdown.sourceEmoji}
                                    />
                                  )}
                                  <Text
                                    style={[
                                      countdown.displayText
                                        ? styles.reminderStatusMessage
                                        : styles.reminderStatusValue,
                                      { color: countdown.urgencyColor },
                                    ]}
                                  >
                                    {getCountdownPrimaryText(countdown)}
                                  </Text>
                                  <Text style={styles.reminderStatusSubtext}>{countdown.subtext}</Text>
                                </View>
                              ) : (
                                <View style={styles.reminderStatusContainer}>
                                  <ReminderCountdownLabel
                                    unit="ימים"
                                    sourceEmoji={getReminderSourceEmoji(reminder.sourceType)}
                                  />
                                  <Text style={[styles.reminderStatusValue, { color: '#8B7355' }]}>—</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.reminderMarkDoneBtn}
                              onPress={() => handleMarkReminderDone(reminder as ReminderRow)}
                              activeOpacity={0.85}
                              disabled={markingReminderId === reminder.id}
                              accessibilityRole="button"
                              accessibilityLabel="סמן כבוצע"
                            >
                              {markingReminderId === reminder.id ? (
                                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                              ) : (
                                <>
                                  <Ionicons
                                    name="checkmark-circle-outline"
                                    size={13}
                                    color={PRIMARY_COLOR}
                                  />
                                  <Text style={styles.reminderMarkDoneBtnText}>סמן כבוצע</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                      );
                    }}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : `reminder-${index}`}
                    scrollEnabled={false}
                    ListFooterComponent={
                      hasMoreReminders ? (
                        <TouchableOpacity
                          style={styles.loadMoreRemindersBtn}
                          onPress={() =>
                            setVisibleRemindersCount((count) => count + REMINDERS_PAGE_SIZE)
                          }
                          activeOpacity={0.85}
                          accessibilityRole="button"
                          accessibilityLabel="טען עוד תזכורות"
                        >
                          <Text style={styles.loadMoreRemindersText}>טען עוד</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.remindersListEndSpacer} />
                      )
                    }
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
              <View style={styles.detailsFieldsSection}>
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

                <View style={[styles.detailsInputGroup, styles.detailsInputGroupLast]}>
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
              </View>

              {selectedReminder?.systemGenerated ? (
                <>
                  <Text style={styles.systemReminderHint}>
                    {selectedReminder?.sourceType === 'FOOD'
                      ? 'תזכורת זו נוצרה אוטומטית ממלאי המזון. ניתן לערוך אותה כאן או לפתוח את הגדרות המלאי.'
                      : selectedReminder?.sourceType === 'VACCINATION'
                        ? 'תזכורת זו נוצרה אוטומטית מחיסונים. ניתן לערוך אותה כאן או לפתוח את הגדרות החיסון.'
                        : selectedReminder?.sourceType === 'MEDICATION'
                          ? 'תזכורת זו נוצרה אוטומטית מתרופות. ניתן לערוך אותה כאן או לפתוח את הגדרות התרופה.'
                          : 'תזכורת זו נוצרה אוטומטית מהמערכת. לעריכת ההגדרות, פתח את הפריט המקור.'}
                  </Text>
                  {EDITABLE_HEALTH_REMINDER_TYPES.includes(selectedReminder?.sourceType) ? (
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
                  ) : null}
                  <TouchableOpacity
                    style={[
                      styles.detailsSubmitButton,
                      EDITABLE_HEALTH_REMINDER_TYPES.includes(selectedReminder?.sourceType) &&
                        styles.detailsSecondaryButton,
                    ]}
                    onPress={() => navigateToSystemReminderSource(selectedReminder as ReminderRow)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={20}
                      color={
                        EDITABLE_HEALTH_REMINDER_TYPES.includes(selectedReminder?.sourceType)
                          ? PRIMARY_COLOR
                          : '#fff'
                      }
                    />
                    <Text
                      style={[
                        styles.detailsSubmitButtonText,
                        EDITABLE_HEALTH_REMINDER_TYPES.includes(selectedReminder?.sourceType) &&
                          styles.detailsSecondaryButtonText,
                      ]}
                    >
                      פתח הגדרות מקור
                    </Text>
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

        <MedicationOverdueMarkDoneModal
          visible={Boolean(medicationOverduePrompt)}
          plannedDue={medicationOverduePrompt?.plannedDue ?? null}
          busy={medicationOverdueBusy}
          onSelectPlanned={() => {
            if (medicationOverduePrompt?.plannedDue) {
              void handleMedicationOverdueChoice(medicationOverduePrompt.plannedDue);
            }
          }}
          onSelectNow={() => {
            void handleMedicationOverdueChoice(new Date());
          }}
          onClose={() => {
            if (medicationOverdueBusy) return;
            setMedicationOverduePrompt(null);
            setMarkingReminderId(null);
          }}
        />
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
    paddingBottom: 96,
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
  loadMoreRemindersBtn: {
    marginTop: 6,
    marginBottom: 8,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreRemindersText: {
    color: PRIMARY_COLOR,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  remindersListEndSpacer: {
    height: 12,
  },
  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_COLOR,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reminderCardMain: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    width: '100%',
  },
  reminderContentPress: {
    flex: 1,
    marginRight: 12,
    alignSelf: 'stretch',
  },
  reminderContent: {
    alignSelf: 'stretch',
  },
  reminderStatusColumn: {
    alignItems: 'center',
    minWidth: 88,
    marginLeft: 4,
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
    marginTop: 2,
  },
  reminderMarkDoneBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    backgroundColor: '#F8FFF5',
    flexShrink: 0,
    minHeight: 24,
    minWidth: 78,
    marginTop: 6,
    marginLeft: 10,
  },
  reminderMarkDoneBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    writingDirection: 'rtl',
  },
  reminderStatusContainer: {
    alignItems: 'center',
    minWidth: 88,
  },
  reminderStatusLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
    writingDirection: 'rtl',
  },
  reminderStatusLabelUnit: {
    fontWeight: '700',
    color: '#666',
  },
  reminderLabelEmoji: {
    fontSize: 13,
    lineHeight: 16,
  },
  reminderStatusValue: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  reminderStatusMessage: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    width: '100%',
    alignSelf: 'stretch',
  },
  detailsFieldsSection: {
    width: '100%',
  },
  detailsInputGroup: {
    marginBottom: 12,
  },
  detailsInputGroupLast: {
    marginBottom: 4,
  },
  detailsFormLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  detailsFormInput: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailsFormTextArea: {
    minHeight: 72,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailsDateTimeCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailsSecondaryButton: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
  detailsSecondaryButtonText: {
    color: PRIMARY_COLOR,
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

