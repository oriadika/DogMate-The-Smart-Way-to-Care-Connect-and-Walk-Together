import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dogWalkerAPI, WalkRequestDto } from '../services/api';

const PRIMARY_COLOR = '#7FB069';
const BG_COLOR = '#FAEFDD';
const TEXT_DARK = '#5C4033';
const CARD_BG = '#faf0e6';

type Props = { navigation: any; route: any };

type SectionRow =
  | { type: 'header'; key: string; label: string }
  | { type: 'item'; key: string; item: WalkRequestDto };

function dateKey(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatTimeRange(startIso: string, endIso: string): string {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const ts = s.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const te = e.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    return `${ts}–${te}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}

function buildSections(items: WalkRequestDto[]): SectionRow[] {
  const map = new Map<string, WalkRequestDto[]>();
  for (const it of items) {
    const k = dateKey(it.scheduledStart);
    const list = map.get(k) ?? [];
    list.push(it);
    map.set(k, list);
  }
  const labels = Array.from(map.keys()).sort((a, b) => {
    const sa = map.get(a)![0].scheduledStart;
    const sb = map.get(b)![0].scheduledStart;
    return sa.localeCompare(sb);
  });
  const rows: SectionRow[] = [];
  for (const label of labels) {
    const list = map.get(label)!;
    rows.push({ type: 'header', key: `h-${label}`, label });
    list.sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
    for (const item of list) {
      rows.push({ type: 'item', key: item.requestId, item });
    }
  }
  return rows;
}

const WalkerScheduleScreen = ({ navigation, route }: Props) => {
  const walkerId = route?.params?.userId as string | undefined;
  const [items, setItems] = useState<WalkRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!walkerId) return;
    const data = await dogWalkerAPI.getWalkerWalkSchedule(walkerId);
    setItems(Array.isArray(data) ? data : []);
  }, [walkerId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!walkerId) {
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          await load();
        } catch (e: any) {
          if (!cancelled) {
            Alert.alert('שגיאה', e?.message || 'לא ניתן לטעון לוח זמנים');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [walkerId, load])
  );

  const onRefresh = async () => {
    if (!walkerId) return;
    setRefreshing(true);
    try {
      await load();
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message || 'רענון נכשל');
    } finally {
      setRefreshing(false);
    }
  };

  const rows = useMemo(() => buildSections(items), [items]);

  const renderRow = ({ item }: { item: SectionRow }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.label}</Text>
        </View>
      );
    }
    const r = item.item;
    const ownerName = `${r.ownerFirstName || ''} ${r.ownerLastName || ''}`.trim() || 'בעלים';
    const dogLine =
      r.dogName || r.dogId ? `כלב: ${r.dogName || r.dogId}` : 'ללא כלב מצוין';

    return (
      <View style={styles.card}>
        <Text style={styles.cardTime}>{formatTimeRange(r.scheduledStart, r.scheduledEnd)}</Text>
        <Text style={styles.cardTitle}>{ownerName}</Text>
        <Text style={styles.cardMeta}>{dogLine}</Text>
        {r.notes ? <Text style={styles.notes}>{r.notes}</Text> : null}
        {r.charged ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>מאושר · חויב (סימולציה)</Text>
          </View>
        ) : null}
      </View>
    );
  };

  if (!walkerId) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.empty}>לא נמצא משתמש מחובר</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={26} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>לוח זמנים</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={renderRow}
          contentContainerStyle={items.length === 0 ? styles.listEmpty : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY_COLOR} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>אין טיולים מתוכננים (מאושרים) בעתיד</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default WalkerScheduleScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0D5C7',
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  listEmpty: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  sectionHeader: {
    marginBottom: 8,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    textAlign: 'right',
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
    alignItems: 'flex-end',
  },
  cardTime: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  cardTitle: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  notes: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B5B4F',
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  badge: {
    marginTop: 10,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(127, 176, 105, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    color: TEXT_DARK,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: '#8B7355',
    fontSize: 16,
    paddingVertical: 24,
  },
});
