import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  dogWalkerAPI,
  type ProfessionalProfileResponse,
  type WalkerReview,
} from '../services/api';

const PRIMARY_COLOR = '#7FB069';
const BG_COLOR = '#f5e6d3';
const TEXT_DARK = '#5C4033';
const MUTED = '#8B7355';
const CARD_BG = '#faf0e6';

/**
 * שנה ל-true בפיתוח כדי לראות את מסך הביקורות עם נתוני דוגמה (ללא שרת).
 */
const USE_MOCK_REVIEWS = __DEV__ && false;

/** מבנה לדוגמה לפי המפרט — מומר ל-WalkerReview לתצוגה */
type MockReviewShape = {
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
};

const mockReviews: MockReviewShape[] = [
  {
    reviewerName: 'דני כהן',
    rating: 5,
    comment: 'שירות מעולה, הכלב חזר שמח ועייף בדיוק כמו שצריך. ממליץ בחום!',
    date: '2026-03-15T10:00:00.000Z',
  },
  {
    reviewerName: 'מיכל לוי',
    rating: 4,
    comment: 'אמינה ומדויקת בזמנים. נשמח להזמין שוב.',
    date: '2026-03-01T14:30:00.000Z',
  },
  {
    reviewerName: 'יוסי אברהם',
    rating: 5,
    comment: '',
    date: '2026-02-20T09:15:00.000Z',
  },
];

const mockToWalkerReviews = (items: MockReviewShape[]): WalkerReview[] =>
  items.map((m, i) => ({
    ratingId: `mock-${i}`,
    reviewerId: `mock-reviewer-${i}`,
    stars: m.rating,
    comment: m.comment,
    reviewerName: m.reviewerName,
    createdAt: m.date,
  }));

const formatReviewDate = (rawDate: string | null | undefined): string => {
  if (!rawDate) return '';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return '';
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = String(parsed.getFullYear());
  return `${day}/${month}/${year}`;
};

const averageFromReviews = (list: WalkerReview[]): number => {
  if (list.length === 0) return 0;
  const sum = list.reduce((acc, r) => acc + (Number(r.stars) || 0), 0);
  return sum / list.length;
};

const StarRow = ({ stars }: { stars: number }) => {
  const n = Math.max(0, Math.min(5, Math.round(Number(stars) || 0)));
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= n ? 'star' : 'star-outline'}
          size={18}
          color={i <= n ? '#F5B301' : MUTED}
          style={styles.starIcon}
        />
      ))}
    </View>
  );
};

const WalkerReviewsScreen = ({ navigation, route }: any) => {
  const userId = route?.params?.userId as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfessionalProfileResponse | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setError('לא נמצא משתמש');
      setLoading(false);
      return;
    }
    if (USE_MOCK_REVIEWS) {
      setProfile({
        userId,
        email: '',
        firstName: '',
        lastName: '',
        cityOfferings: [],
        averageRating: averageFromReviews(mockToWalkerReviews(mockReviews)),
        ratingsCount: mockReviews.length,
        alreadyRatedByCurrentOwner: false,
        reviews: mockToWalkerReviews(mockReviews),
      });
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await dogWalkerAPI.getProfessionalProfile(userId);
      setProfile(data);
    } catch (e: any) {
      setError(e?.message || 'טעינת הביקורות נכשלה');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const reviews = profile?.reviews ?? [];
  const ratingsCount = profile?.ratingsCount ?? reviews.length;
  const avg =
    ratingsCount > 0
      ? Number(profile?.averageRating ?? averageFromReviews(reviews)).toFixed(1)
      : '—';

  const renderItem = ({ item }: { item: WalkerReview }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName} numberOfLines={1}>
          {item.reviewerName || 'בעל כלב'}
        </Text>
        <StarRow stars={item.stars} />
      </View>
      <Text style={styles.reviewDate}>{formatReviewDate(item.createdAt)}</Text>
      <Text style={styles.reviewComment}>
        {item.comment?.trim() ? item.comment.trim() : 'ללא מלל'}
      </Text>
    </View>
  );

  const listHeader = (
    <View>
      <View style={styles.summaryBlock}>
        <Text style={styles.summaryTitle}>סיכום דירוג</Text>
        <Text style={styles.summaryLine}>
          ממוצע:{' '}
          <Text style={styles.summaryHighlight}>
            {avg === '—' ? '—' : `${avg}/5`}
          </Text>
        </Text>
        <Text style={styles.summaryCount}>סה״כ {ratingsCount} ביקורות</Text>
      </View>
      <Text style={styles.reviewsSectionTitle}>הביקורות שלי</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerBtn} />
        <Text style={styles.headerTitle}>הביקורות שלי</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() =>
            navigation.navigate('WalkerHome', {
              userId,
              userFirstName: route?.params?.userFirstName,
              userLastName: route?.params?.userLastName,
              email: route?.params?.email,
            })
          }
        >
          <Ionicons name="arrow-forward" size={26} color={TEXT_DARK} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>טוען ביקורות...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyWrap}>
          {listHeader}
          <Text style={styles.emptyText}>עדיין אין ביקורות לדוגווקר זה</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.ratingId}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default WalkerReviewsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0D5C7',
    backgroundColor: CARD_BG,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#B71C1C',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'stretch',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  summaryBlock: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
  },
  reviewsSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  summaryLine: {
    fontSize: 15,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  summaryHighlight: {
    fontWeight: '800',
    color: PRIMARY_COLOR,
  },
  summaryCount: {
    marginTop: 6,
    fontSize: 14,
    color: MUTED,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  reviewCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  reviewerName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  starRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  starIcon: {
    marginHorizontal: 2,
  },
  reviewDate: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 15,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 22,
  },
  emptyText: {
    marginTop: 24,
    fontSize: 16,
    color: MUTED,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 24,
    alignSelf: 'center',
    paddingHorizontal: 12,
  },
});
