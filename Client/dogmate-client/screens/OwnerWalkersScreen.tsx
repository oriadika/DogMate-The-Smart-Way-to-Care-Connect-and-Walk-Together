/**
 * מסך ייעודי לבעלי כלבים: רשימת דוגווקרים עם סינון, מיון ודירוגים.
 * נפרד מ-Profile (טיולים/מפה) כדי שהניווט יוביל תמיד לחוויה הנכונה.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { userAPI, dogWalkerAPI, type ProfessionalProfileResponse } from '../services/api';
import HebrewAsciiParensText from '../components/HebrewAsciiParensText';
import { formatLocationLineForStoredCity } from '../utils/locationFieldCodec';
import {
  displayAvailabilityFromStored,
  getPricingDisplayLinesFromStored,
} from '../utils/walkerOfferingDisplay';
import locationService, { LocationService } from '../services/location';
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

const PRIMARY_COLOR = '#7FB069';
const USERS_REFRESH_INTERVAL_MS = 5000;

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
  const ownerId = route?.params?.userId as string | undefined;

  const [availableWalkers, setAvailableWalkers] = useState<ProfessionalProfileResponse[]>([]);
  const [loadingWalkers, setLoadingWalkers] = useState(true);
  const [loggedUsers, setLoggedUsers] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );

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

  const fetchAvailableWalkers = useCallback(
    async (options?: { showLoader?: boolean }) => {
      const shouldShowLoader = options?.showLoader ?? true;
      try {
        if (shouldShowLoader) setLoadingWalkers(true);
        const data = await dogWalkerAPI.getWalkersWithProfessionalProfiles(ownerId);
        const list = Array.isArray(data) ? data : [];
        const filtered = list.filter((w) => String(w.userId) !== String(ownerId));
        setAvailableWalkers(filtered);
      } catch (error) {
        console.error('Failed to fetch available walkers:', error);
        if (shouldShowLoader) {
          Alert.alert('שגיאה', 'טעינת רשימת הדוגווקרים נכשלה');
        }
      } finally {
        if (shouldShowLoader) setLoadingWalkers(false);
      }
    },
    [ownerId]
  );

  useEffect(() => {
    fetchAvailableWalkers();
    const interval = setInterval(() => fetchAvailableWalkers({ showLoader: false }), 10000);
    return () => clearInterval(interval);
  }, [fetchAvailableWalkers]);

  const fetchLoggedUsersForDistances = useCallback(async () => {
    try {
      const data = await userAPI.getLoggedUsers();
      const currentUserId = ownerId;
      if (!data.success || !data.users) return;

      const formattedUsers = data.users
        .filter((user: any) => user.id !== currentUserId)
        .map((user: any) => {
          const userObj: any = {
            id: user.id,
            name:
              user.type === 'RegularUser' || user.type === 'DogWalkerUser'
                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                : `Admin: ${user.email}`,
            role:
              user.type === 'RegularUser'
                ? 'בעל כלב'
                : user.type === 'DogWalkerUser'
                  ? 'דוגווקר'
                  : `מנהל (רמה ${user.permissionLevel})`,
            email: user.email,
            type: user.type,
          };

          const canHaveLocation =
            (user.type === 'RegularUser' || user.type === 'DogWalkerUser') &&
            user.latitude != null &&
            user.longitude != null;
          if (canHaveLocation) {
            userObj.latitude = user.latitude;
            userObj.longitude = user.longitude;
          }

          return userObj;
        });

      setLoggedUsers(formattedUsers);
    } catch (error) {
      console.error('Failed to fetch logged users:', error);
    }
  }, [ownerId]);

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
    fetchLoggedUsersForDistances();
    const id = setInterval(() => fetchLoggedUsersForDistances(), USERS_REFRESH_INTERVAL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [fetchLoggedUsersForDistances]);

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
      await fetchAvailableWalkers({ showLoader: false });
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

    return (
      <View style={styles.walkerProfessionalCard}>
        <View style={styles.walkerCardHeader}>
          <View style={styles.avatar}>
            <FontAwesome5 name="walking" size={20} color="#fff" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userMeta}>דוגווקר</Text>
            <Text style={styles.ratingSummaryText}>
              דירוג:{' '}
              <Text style={styles.ratingNumberHighlight}>{avgRating}</Text>{' '}
              <Text style={styles.goldStarText}>★</Text> ({item.ratingsCount || 0})
            </Text>
          </View>
          {item.alreadyRatedByCurrentOwner ? (
            <View style={styles.ratedBadge}>
              <Text style={styles.ratedBadgeText}>כבר דירגת</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addRatingButton}
              onPress={() => {
                setSelectedWalker(item);
                setSelectedStars(5);
                setRatingComment('');
                setRatingModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.addRatingButtonText}>הוספת דירוג</Text>
            </TouchableOpacity>
          )}
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
                                  await fetchAvailableWalkers({ showLoader: false });
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
    loadingWalkers ? (
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
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
  },
  userInfo: {
    flex: 1,
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
  walkerCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingSummaryText: {
    marginTop: 4,
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'right',
  },
  ratingNumberHighlight: {
    fontSize: 15,
    fontWeight: '800',
  },
  goldStarText: {
    color: '#F5B301',
    fontWeight: '700',
  },
  addRatingButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginLeft: 8,
  },
  addRatingButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  ratedBadge: {
    backgroundColor: '#E0D5C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginLeft: 8,
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
