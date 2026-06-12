import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SupportRequestItem, userAPI } from '../services/dogmateApi';

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'תקלה',
  feature: 'הצעת שיפור',
  general: 'שאלה כללית',
  user_report: 'דיווח על משתמש',
};

function formatCategory(cat: string): string {
  return CATEGORY_LABELS[cat] || cat;
}

function formatStatus(status: string): string {
  const s = (status || '').toUpperCase();
  if (s === 'OPEN') return 'פתוח';
  if (s === 'CLOSED') return 'סגור';
  return status;
}

export default function AdminSupportRequestsScreen({ navigation, route }: any) {
  const adminUserId = String(route?.params?.userId || '').trim();
  const [requests, setRequests] = useState<SupportRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!adminUserId) {
      setLoading(false);
      return;
    }
    try {
      const res = await userAPI.getSupportRequests(adminUserId);
      setRequests(Array.isArray(res.requests) ? res.requests : []);
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message || 'לא ניתן לטעון את הפניות');
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminUserId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const toggleRequestStatus = async (requestId: string, currentStatus: string) => {
    const nextStatus = String(currentStatus || '').toUpperCase() === 'OPEN' ? 'CLOSED' : 'OPEN';
    setUpdatingStatusId(requestId);
    try {
      await userAPI.updateSupportRequestStatus(adminUserId, requestId, nextStatus);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: nextStatus } : r))
      );
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message || 'לא ניתן לעדכן את הסטטוס');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  if (!adminUserId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>חסר מזהה מנהל</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={24} color="#5C4033" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>פניות מלקוחות</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7FB069" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#5C4033" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>פניות מלקוחות</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {requests.length === 0 ? (
          <Text style={styles.emptyText}>אין פניות להצגה</Text>
        ) : (
          requests.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>{item.createdAt?.replace('T', ' ').slice(0, 19)}</Text>
                <View style={styles.categoryColumn}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{formatCategory(item.category)}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.subject}>{item.subject}</Text>
              <Text style={styles.description} numberOfLines={6}>
                {item.description}
              </Text>
              <View style={styles.meta}>
                <View style={styles.statusRow}>
                  <Text style={styles.metaLine}>סטטוס:</Text>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      String(item.status || '').toUpperCase() === 'CLOSED' && styles.statusButtonClosed,
                      updatingStatusId === item.id && styles.statusButtonBusy,
                    ]}
                    onPress={() => toggleRequestStatus(item.id, item.status)}
                    disabled={updatingStatusId === item.id}
                    activeOpacity={0.85}
                  >
                    {updatingStatusId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.statusButtonText}>{formatStatus(item.status)}</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {item.submitterEmail ? (
                  <Text style={styles.metaLine}>מייל משתמש: {item.submitterEmail}</Text>
                ) : null}
                <Text style={styles.metaLine}>יצירת קשר: {item.contactEmail}</Text>
                {item.contactPhone ? (
                  <Text style={styles.metaLine}>טלפון: {item.contactPhone}</Text>
                ) : null}
                <Text style={styles.metaSmall}>מזהה פנייה: {item.id}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5e6d3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5C4033',
  },
  backButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8B7355',
    marginTop: 24,
    fontSize: 16,
  },
  errorText: {
    color: '#c0392b',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  categoryColumn: {
    alignItems: 'flex-end',
  },
  statusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  statusButton: {
    minWidth: 72,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#7FB069',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButtonClosed: {
    backgroundColor: '#C0392B',
  },
  statusButtonBusy: {
    opacity: 0.85,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  cardDate: {
    fontSize: 12,
    color: '#8B7355',
  },
  badge: {
    backgroundColor: '#E6F0DF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3E5B2D',
  },
  subject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'right',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#5C4033',
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: 10,
  },
  meta: {
    borderTopWidth: 1,
    borderTopColor: '#EFE8DC',
    paddingTop: 8,
  },
  metaLine: {
    fontSize: 12,
    color: '#6B5444',
    textAlign: 'right',
    marginBottom: 4,
  },
  metaSmall: {
    fontSize: 11,
    color: '#9A8B7A',
    textAlign: 'right',
    marginTop: 4,
  },
});
