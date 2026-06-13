/**
 * מסך ייעודי לבעלי כלבים: רשימת דוגווקרים עם סינון, מיון ודירוגים.
 * נפרד מ-Profile (טיולים/מפה) כדי שהניווט יוביל תמיד לחוויה הנכונה.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { dogWalkerAPI, type ProfessionalProfileResponse } from '../services/dogmateApi';
import { resolveOwnerUserId, getOwnerSession } from '../utils/ownerSession';
import { deferScreenCleanup, useScreenLifecycleGuard } from '../utils/screenLifecycle';
import {
  clearWalkersDirty,
  fetchAndCacheLoggedUsers,
  filterWalkersForOwner,
  getInitialLoggedUsersState,
  getInitialWalkersState,
  getWalkersCache,
  markWalkersDirty,
  setWalkersCache,
  shouldForceWalkersRefresh,
  type FormattedLoggedUser,
} from '../utils/walkersDataCache';
import HebrewAsciiParensText from '../components/HebrewAsciiParensText';
import { formatLocationLineForStoredCity } from '../utils/locationFieldCodec';
import {
  displayAvailabilityFromStored,
  getPricingDisplayLinesFromStored,
} from '../utils/walkerOfferingDisplay';
import locationService, { LocationService } from '../services/dogmateLocation';
import WalkerListToolbar from '../components/walkerList/WalkerListToolbar';
import WalkerFiltersModal from '../components/walkerList/WalkerFiltersModal';
import WalkerSortModal from '../components/walkerList/WalkerSortModal';
import {
  buildWalkerListView,
  DEFAULT_WALKER_LIST_FILTERS,
  DEFAULT_WALKER_SORT,
  hasActiveFilters,
  type WalkerSortOption,
} from '../utils/walkerListQuery';
import {
  digitsForTelDial,
  normalizeIsraeliMobileToDigits,
  normalizeIsraeliMobileToWhatsAppPhoneParam,
} from '../utils/phoneValidation';
import { OWNER_MAIN_TAB } from '../navigation/ownerTabRoutes';

const PRIMARY_COLOR = '#7FB069';
const CALL_BUTTON_GREEN = '#34C759';
const WHATSAPP_GREEN = '#25D366';
const WHATSAPP_PREFILL_MESSAGE =
  'שלום, ראיתי את הפרופיל שלך ב-DogMate ואשמח לקבוע טיול לכלב שלי!';
const USERS_REFRESH_INTERVAL_MS = 5000;
const WALKERS_REFRESH_INTERVAL_MS = 30000;

function getWalkerPhoneRaw(item: ProfessionalProfileResponse): string | number | null | undefined {
  const ext = item as ProfessionalProfileResponse & {
    phone_number?: string | null;
    PhoneNumber?: string | null;
    phone?: string | null;
  };
  return item.phoneNumber ?? ext.phone_number ?? ext.PhoneNumber ?? ext.phone ?? undefined;
}

const formatReviewDate = (rawDate: string | null | undefined): string => {
  if (!rawDate) return '';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return '';
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = String(parsed.getFullYear());
  return `${day}/${month}/${year}`;
};

const OwnerWalkersScreen = ({ navigation, route }: any) => {
  const initialOwnerId = resolveOwnerUserId(route?.params?.userId, getOwnerSession().userId ?? null);
  const initialWalkers = getInitialWalkersState(initialOwnerId);
  const initialLogged = getInitialLoggedUsersState(initialOwnerId ?? undefined);

  const [availableWalkers, setAvailableWalkers] = useState<ProfessionalProfileResponse[]>(
    initialWalkers.walkers
  );
  const [loadingWalkers, setLoadingWalkers] = useState(initialWalkers.loading);
  const [ownerId, setOwnerId] = useState<string | null>(initialWalkers.ownerId);
  const [loggedUsers, setLoggedUsers] = useState<FormattedLoggedUser[]>(initialLogged.users);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const walkersRef = useRef(availableWalkers);
  walkersRef.current = availableWalkers;

  const {
    isMountedRef,
    markMounted,
    markUnmounted,
    cancelInflightAsyncWork,
    beginAsyncWork,
    isAsyncWorkCurrent,
  } = useScreenLifecycleGuard();

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedWalker, setSelectedWalker] = useState<ProfessionalProfileResponse | null>(null);
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [deletingRatingId, setDeletingRatingId] = useState<string | null>(null);
  const [expandedReviewsByWalker, setExpandedReviewsByWalker] = useState<Record<string, boolean>>({});
  const [walkerListFilters, setWalkerListFilters] = useState(DEFAULT_WALKER_LIST_FILTERS);
  const [walkerListSort, setWalkerListSort] = useState<WalkerSortOption>(DEFAULT_WALKER_SORT);
  const [walkerFilterModalVisible, setWalkerFilterModalVisible] = useState(false);
  const [walkerSortModalVisible, setWalkerSortModalVisible] = useState(false);

  const loadAvailableWalkers = useCallback(async () => {
    const generation = beginAsyncWork();
    try {
      if (!isAsyncWorkCurrent(generation)) return;

      const uid = resolveOwnerUserId(route?.params?.userId, ownerId);
      if (!uid) {
        setAvailableWalkers([]);
        setLoadingWalkers(false);
        return;
      }
      setOwnerId(uid);

      const forceRefresh = shouldForceWalkersRefresh(uid);
      const cached = !forceRefresh ? getWalkersCache(uid) : undefined;

      if (cached) {
        setAvailableWalkers(cached.walkers);
        setLoadingWalkers(false);
      } else if (walkersRef.current.length === 0) {
        setLoadingWalkers(true);
      }

      if (forceRefresh) {
        clearWalkersDirty(uid);
      }

      const data = await dogWalkerAPI.getWalkersWithProfessionalProfiles(uid);
      if (!isAsyncWorkCurrent(generation)) return;

      const list = Array.isArray(data) ? data : [];
      const filtered = filterWalkersForOwner(list, uid);
      setAvailableWalkers(filtered);
      setWalkersCache(uid, filtered);
    } catch (error) {
      if (!isAsyncWorkCurrent(generation)) return;
      console.error('Failed to fetch available walkers:', error);
      if (walkersRef.current.length === 0) {
        Alert.alert('שגיאה', 'טעינת רשימת הדוגווקרים נכשלה');
      }
    } finally {
      if (isAsyncWorkCurrent(generation)) {
        setLoadingWalkers(false);
      }
    }
  }, [beginAsyncWork, isAsyncWorkCurrent, ownerId, route?.params?.userId]);

  const fetchLoggedUsersForDistances = useCallback(async () => {
    const uid = resolveOwnerUserId(route?.params?.userId, ownerId);
    try {
      const formatted = await fetchAndCacheLoggedUsers(uid ?? undefined);
      if (isMountedRef.current) {
        setLoggedUsers(formatted);
      }
    } catch (error) {
      console.error('Failed to fetch logged users:', error);
    }
  }, [isMountedRef, ownerId, route?.params?.userId]);

  useFocusEffect(
    useCallback(() => {
      markMounted();
      void loadAvailableWalkers();
      void fetchLoggedUsersForDistances();

      const walkersInterval = setInterval(() => {
        void loadAvailableWalkers();
      }, WALKERS_REFRESH_INTERVAL_MS);
      const usersInterval = setInterval(() => {
        void fetchLoggedUsersForDistances();
      }, USERS_REFRESH_INTERVAL_MS);

      return () => {
        cancelInflightAsyncWork();
        clearInterval(walkersInterval);
        clearInterval(usersInterval);
        deferScreenCleanup(() => {
          markUnmounted();
        });
      };
    }, [
      loadAvailableWalkers,
      fetchLoggedUsersForDistances,
      markMounted,
      markUnmounted,
      cancelInflightAsyncWork,
    ])
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await locationService.requestPermissions();
        const loc = await locationService.getCurrentLocation();
        if (alive && loc) setUserLocation(loc);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const walkerDistanceByUserId = useMemo(() => {
    if (!userLocation) return {};
    const m: Record<string, number> = {};
    for (const u of loggedUsers) {
      if (u.latitude != null && u.longitude != null) {
        m[String(u.id)] = LocationService.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          u.latitude,
          u.longitude
        );
      }
    }
    return m;
  }, [userLocation, loggedUsers]);

  const displayWalkers = useMemo(
    () =>
      buildWalkerListView(
        availableWalkers,
        walkerListFilters,
        walkerListSort,
        walkerDistanceByUserId
      ),
    [availableWalkers, walkerListFilters, walkerListSort, walkerDistanceByUserId]
  );

  const handleCall = useCallback(async (phone: string | number | null | undefined) => {
    const digits = digitsForTelDial(phone);
    if (!digits) {
      Alert.alert('אין מספר טלפון', 'לא רשום מספר התקשרות לדוגווקר זה.');
      return;
    }
    const url = `tel:${digits}`;
    try {
      if (Platform.OS === 'android') {
        const ok = await Linking.canOpenURL(url);
        if (!ok) {
          Alert.alert('לא ניתן להתקשר', 'המכשיר לא תומך בהתקשרות ישירה.');
          return;
        }
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את החייגן.');
    }
  }, []);

  const handleWhatsApp = useCallback(async (phone: string | number | null | undefined) => {
    const waPhone = normalizeIsraeliMobileToWhatsAppPhoneParam(phone);
    if (!waPhone) {
      Alert.alert('אין מספר טלפון', 'לא רשום מספר התקשרות לדוגווקר זה.');
      return;
    }
    const text = encodeURIComponent(WHATSAPP_PREFILL_MESSAGE);
    const url = `whatsapp://send?phone=${waPhone}&text=${text}`;
    try {
      if (Platform.OS === 'android') {
        const ok = await Linking.canOpenURL(url);
        if (!ok) {
          Alert.alert('לא ניתן לפתוח', 'ודא ש-WhatsApp מותקן במכשיר.');
          return;
        }
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את WhatsApp.');
    }
  }, []);

  const submitWalkerRating = async () => {
    if (!ownerId || !selectedWalker) {
      Alert.alert('שגיאה', 'לא ניתן לשלוח דירוג כרגע');
      return;
    }
    try {
      setSubmittingRating(true);
      const response = await dogWalkerAPI.createWalkerRating(String(selectedWalker.userId), {
        ownerId: String(ownerId),
        stars: selectedStars,
        comment: ratingComment.trim(),
      });
      setRatingModalVisible(false);
      setSelectedWalker(null);
      setRatingComment('');
      Alert.alert('הצלחה', 'הדירוג נשמר בהצלחה');
      markWalkersDirty(String(ownerId));
      await loadAvailableWalkers();
    } catch (error: any) {
      Alert.alert('שגיאה', error?.message || 'שמירת הדירוג נכשלה');
    } finally {
      setSubmittingRating(false);
    }
  };

  const renderWalkerProfessionalCard = ({ item }: { item: ProfessionalProfileResponse }) => {
    const displayName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email || 'דוגווקר';
    const avgRating = item.ratingsCount > 0 ? Number(item.averageRating || 0).toFixed(1) : '—';
    const walkerKey = String(item.userId);
    const isReviewsExpanded = expandedReviewsByWalker[walkerKey] === true;
    const currentOwnerId = String(ownerId || '');
    const canCallWalker = normalizeIsraeliMobileToDigits(getWalkerPhoneRaw(item)) != null;

    return (
      <View style={styles.walkerProfessionalCard}>
        <View style={styles.walkerCardHeaderBlock} collapsable={false}>
          <View style={styles.walkerCardHeaderRow}>
            <View style={styles.avatar}>
              <FontAwesome5 name="walking" size={20} color="#fff" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userMeta}>דוגווקר</Text>
            </View>
            <View style={styles.headerContactButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.whatsappButton,
                  !canCallWalker && styles.callButtonDisabled,
                  pressed && styles.callButtonPressed,
                ]}
                onPress={() => handleWhatsApp(getWalkerPhoneRaw(item))}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="שלח הודעת WhatsApp לדוגווקר"
                android_ripple={{ color: 'rgba(255,255,255,0.35)', borderless: true }}
              >
                <FontAwesome name="whatsapp" size={22} color="#fff" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.callButton,
                  !canCallWalker && styles.callButtonDisabled,
                  pressed && styles.callButtonPressed,
                ]}
                onPress={() => handleCall(getWalkerPhoneRaw(item))}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="התקשר לדוגווקר"
                android_ripple={{ color: 'rgba(255,255,255,0.35)', borderless: true }}
              >
                <Ionicons name="call" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
          <View style={styles.walkerCardHeaderRatingSummaryRow}>
            <View style={styles.ratingSummaryLineTextBlock}>
              <Text style={[styles.ratingSummaryText, styles.ratingSummaryInRatingRow, styles.ratingSummaryOnLine]}>
                דירוג:{' '}
                <Text style={styles.ratingNumberHighlight}>{avgRating}</Text>{' '}
                <Text style={styles.goldStarText}>★</Text> ({item.ratingsCount || 0})
              </Text>
            </View>
            {item.alreadyRatedByCurrentOwner ? (
              <View style={styles.ratedBadgeInRatingRow}>
                <Text style={styles.ratedBadgeText}>כבר דירגת</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addRatingButtonInRatingRow}
                onPress={() => {
                  setSelectedWalker(item);
                  setSelectedStars(5);
                  setRatingComment('');
                  setRatingModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.addRatingButtonText}>הוספת ביקורת</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {item.cityOfferings?.map((offering, idx) => {
          const loc = formatLocationLineForStoredCity(offering.city);
          return (
            <View key={`${item.userId}-${idx}`} style={styles.offeringBlock}>
              <View style={styles.offeringRow}>
                <Text style={styles.offeringLabel}>{loc.label}:</Text>
                {loc.label === 'עיר' ? (
                  <HebrewAsciiParensText
                    style={[styles.offeringValue, styles.offeringValueRtl]}
                    numberOfLines={3}
                  >
                    {loc.value}
                  </HebrewAsciiParensText>
                ) : (
                  <Text style={[styles.offeringValue, styles.offeringValueRtl]} numberOfLines={3}>
                    {loc.value}
                  </Text>
                )}
              </View>
              <View style={styles.offeringRow}>
                <Text style={styles.offeringLabel}>זמינות:</Text>
                <Text style={[styles.offeringValue, styles.offeringValueRtl]} numberOfLines={4}>
                  {displayAvailabilityFromStored(offering.availability)}
                </Text>
              </View>
              <View style={styles.offeringPricingBlock}>
                <Text style={styles.offeringLabel}>תעריף:</Text>
                {getPricingDisplayLinesFromStored(offering.pricing).map((line, lineIdx) => (
                  <Text
                    key={lineIdx}
                    style={[
                      styles.offeringValue,
                      styles.offeringValueRtl,
                      lineIdx === 0 ? styles.offeringPriceFirstLine : styles.offeringPriceNextLine,
                    ]}
                  >
                    {line}
                  </Text>
                ))}
              </View>
            </View>
          );
        })}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeaderRow}>
            <TouchableOpacity
              style={styles.reviewsToggleButton}
              onPress={() =>
                setExpandedReviewsByWalker((prev) => ({ ...prev, [walkerKey]: !isReviewsExpanded }))
              }
              activeOpacity={0.8}
            >
              <Text style={styles.reviewsToggleButtonText}>
                {isReviewsExpanded ? 'מזער -' : 'פתח +'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.reviewsTitle}>ביקורות ({item.reviews?.length || 0})</Text>
          </View>
          {isReviewsExpanded ? (
            item.reviews && item.reviews.length > 0 ? (
              item.reviews.slice(0, 5).map((review) => (
                <View key={review.ratingId} style={styles.reviewItem}>
                  <View style={styles.reviewHeaderRow}>
                    <View style={styles.reviewLeftColumn}>
                      <Text style={styles.reviewDateText}>{formatReviewDate(review.createdAt)}</Text>
                    </View>
                    <View style={styles.reviewHeaderRight}>
                      <Text style={styles.reviewHeader}>
                        <Text style={styles.reviewAuthorText}>{review.reviewerName || 'בעל כלב'}</Text>
                        {' · '}
                        <Text style={styles.reviewStarsText}>{review.stars}</Text>
                        <Text style={styles.goldStarText}>★</Text>
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>
                    {review.comment?.trim() ? review.comment : 'ללא מלל'}
                  </Text>
                  {currentOwnerId && String(review.reviewerId) === currentOwnerId ? (
                    <View style={styles.deleteReviewRow}>
                      <TouchableOpacity
                        style={styles.deleteReviewButton}
                        disabled={deletingRatingId === review.ratingId}
                        onPress={() => {
                          Alert.alert('מחיקת ביקורת', 'למחוק את הביקורת שלך?', [
                            { text: 'ביטול', style: 'cancel' },
                            {
                              text: 'מחק',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  setDeletingRatingId(review.ratingId);
                                  const resp = await dogWalkerAPI.deleteWalkerRating(
                                    walkerKey,
                                    review.ratingId,
                                    currentOwnerId
                                  );
                                  Alert.alert('הצלחה', 'הביקורת נמחקה בהצלחה');
                                  markWalkersDirty(currentOwnerId);
                                  await loadAvailableWalkers();
                                } catch (error: any) {
                                  Alert.alert('שגיאה', error?.message || 'מחיקת הביקורת נכשלה');
                                } finally {
                                  setDeletingRatingId(null);
                                }
                              },
                            },
                          ]);
                        }}
                      >
                        <Text style={styles.deleteReviewButtonText}>
                          {deletingRatingId === review.ratingId ? 'מוחק...' : 'מחק'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.noReviewsText}>עדיין אין ביקורות</Text>
            )
          ) : null}
        </View>
      </View>
    );
  };

  const listEmpty =
    loadingWalkers && availableWalkers.length === 0 ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
        <Text style={styles.loadingText}>טוען דוגווקרים...</Text>
      </View>
    ) : availableWalkers.length === 0 ? (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>אין דוגווקרים עם פרטים מקצועיים עדיין</Text>
      </View>
    ) : displayWalkers.length === 0 ? (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>אין תוצאות התואמות לסינון</Text>
        <Text style={[styles.emptyText, { marginTop: 8, fontSize: 14, opacity: 0.85 }]}>
          נסו לשנות את תנאי הסינון או לאפס את הסינון
        </Text>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => {
            const parent = navigation.getParent();
            if (parent && (parent as any).getState?.()?.type === 'tab') {
              navigation.navigate(OWNER_MAIN_TAB.Dashboard);
              return;
            }
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-forward" size={28} color="#5C4033" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>דוגווקרים זמינים</Text>
        <View style={{ width: 40 }} />
      </View>

      <WalkerListToolbar
        onFilterPress={() => setWalkerFilterModalVisible(true)}
        onSortPress={() => setWalkerSortModalVisible(true)}
        filterActive={hasActiveFilters(walkerListFilters)}
      />

      <FlatList
        style={styles.listFlex}
        data={displayWalkers}
        keyExtractor={(item) => String(item.userId)}
        renderItem={renderWalkerProfessionalCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={listEmpty}
        removeClippedSubviews={Platform.OS === 'android' ? false : undefined}
        keyboardShouldPersistTaps="handled"
      />

      <WalkerFiltersModal
        visible={walkerFilterModalVisible}
        onClose={() => setWalkerFilterModalVisible(false)}
        value={walkerListFilters}
        onApply={(f) => setWalkerListFilters(f)}
      />
      <WalkerSortModal
        visible={walkerSortModalVisible}
        onClose={() => setWalkerSortModalVisible(false)}
        value={walkerListSort}
        onChange={setWalkerListSort}
        canSortByDistance={!!userLocation}
      />

      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.ratingModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.ratingModalCard}>
              <Text style={styles.ratingModalTitle}>
                דירוג עבור{' '}
                {selectedWalker
                  ? `${selectedWalker.firstName} ${selectedWalker.lastName}`.trim()
                  : 'דוגווקר'}
              </Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setSelectedStars(star)} activeOpacity={0.8}>
                    <Ionicons
                      name={star <= selectedStars ? 'star' : 'star-outline'}
                      size={30}
                      color={star <= selectedStars ? '#F5B301' : '#8B7355'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.ratingCommentInput}
                multiline
                textAlignVertical="top"
                textAlign="right"
                placeholder="הוסף/י תגובה חופשית..."
                value={ratingComment}
                onChangeText={setRatingComment}
                maxLength={400}
              />

              <View style={styles.ratingModalActions}>
                <TouchableOpacity
                  style={styles.ratingCancelButton}
                  onPress={() => setRatingModalVisible(false)}
                  disabled={submittingRating}
                >
                  <Text style={styles.ratingCancelText}>ביטול</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.ratingSubmitButton}
                  onPress={submitWalkerRating}
                  disabled={submittingRating}
                >
                  <Text style={styles.ratingSubmitText}>{submittingRating ? 'שומר...' : 'שליחה'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default OwnerWalkersScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAEFDD',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
  },
  listFlex: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 20,
    flexGrow: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'right',
  },
  userMeta: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 4,
    textAlign: 'right',
  },
  loadingContainer: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#5C4033',
    fontSize: 16,
  },
  emptyContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'center',
  },
  walkerProfessionalCard: {
    backgroundColor: '#faf0e6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  walkerCardHeaderBlock: {
    marginBottom: 10,
  },
  walkerCardHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  walkerCardHeaderRatingSummaryRow: {
    marginTop: 10,
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  ratingSummaryLineTextBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  ratingSummaryInRatingRow: {
    marginTop: 0,
    flexShrink: 1,
    alignSelf: 'stretch',
    textAlign: 'right',
  },
  ratingSummaryOnLine: {
    marginTop: 0,
  },
  ratingSummaryText: {
    marginTop: 4,
    fontSize: 17,
    color: '#8B7355',
    textAlign: 'right',
  },
  ratingNumberHighlight: {
    fontSize: 19,
    fontWeight: '800',
  },
  goldStarText: {
    color: '#F5B301',
    fontWeight: '700',
  },
  headerContactButtons: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    marginStart: 8,
  },
  whatsappButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WHATSAPP_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    elevation: 3,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CALL_BUTTON_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    zIndex: 2,
    elevation: 3,
  },
  callButtonDisabled: {
    opacity: 0.35,
  },
  callButtonPressed: {
    opacity: 0.85,
  },
  addRatingButtonInRatingRow: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexShrink: 0,
    marginLeft: 6,
  },
  addRatingButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  ratedBadgeInRatingRow: {
    backgroundColor: '#E0D5C7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexShrink: 0,
  },
  ratedBadgeText: {
    color: '#5C4033',
    fontSize: 12,
    fontWeight: '700',
  },
  offeringBlock: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0D5C7',
  },
  offeringRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    width: '100%',
    marginTop: 6,
    gap: 6,
    rowGap: 4,
  },
  offeringLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C4033',
    textAlign: 'right',
    flexShrink: 0,
  },
  offeringValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: '#5C4033',
  },
  offeringValueRtl: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  offeringPricingBlock: {
    width: '100%',
    marginTop: 6,
    alignItems: 'stretch',
  },
  offeringPriceFirstLine: {
    marginTop: 4,
  },
  offeringPriceNextLine: {
    marginTop: 6,
  },
  reviewsSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0D5C7',
    paddingTop: 10,
  },
  reviewsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'right',
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewsToggleButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#E0D5C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewsToggleButtonText: {
    color: '#5C4033',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  reviewItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0D5C7',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  reviewHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'right',
  },
  reviewAuthorText: {
    fontSize: 14,
    fontWeight: '700',
  },
  reviewStarsText: {
    fontSize: 14,
    fontWeight: '800',
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewHeaderRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  reviewLeftColumn: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  reviewDateText: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'left',
  },
  deleteReviewButton: {
    backgroundColor: '#FDE8E8',
    borderWidth: 1,
    borderColor: '#E57373',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  deleteReviewRow: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
  deleteReviewButtonText: {
    color: '#B71C1C',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  reviewComment: {
    marginTop: 2,
    fontSize: 14,
    color: '#5C4033',
    textAlign: 'right',
  },
  noReviewsText: {
    fontSize: 13,
    color: '#8B7355',
    textAlign: 'right',
  },
  modalKeyboardRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  ratingModalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  ratingModalCard: {
    backgroundColor: '#faf0e6',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  ratingModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'right',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  ratingCommentInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#E0D5C7',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#5C4033',
  },
  ratingModalActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  ratingCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#8B7355',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ratingCancelText: {
    color: '#5C4033',
    fontWeight: '700',
  },
  ratingSubmitButton: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ratingSubmitText: {
    color: '#fff',
    fontWeight: '700',
  },
});
