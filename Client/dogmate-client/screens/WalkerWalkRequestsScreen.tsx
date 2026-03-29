import React, { useCallback, useState } from 'react';
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

function formatRange(startIso: string, endIso: string): string {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const d = s.toLocaleDateString('he-IL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const ts = s.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const te = e.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    return `${d} · ${ts}–${te}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}

const WalkerWalkRequestsScreen = ({ navigation, route }: Props) => {
  const walkerId = route?.params?.userId as string | undefined;
  const [items, setItems] = useState<WalkRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!walkerId) return;
    const data = await dogWalkerAPI.getWalkerWalkRequests(walkerId);
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
            Alert.alert('שגיאה', e?.message || 'לא ניתן לטעון בקשות');
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

  const confirmCharge = (req: WalkRequestDto) => {
    if (!walkerId) return;
    Alert.alert('אישור וחיוב (סימולציה)', `לאשר את הטיול עבור ${req.ownerFirstName} ${req.ownerLastName}?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'אשר וחיוב',
        onPress: async () => {
          setActingId(req.requestId);
          try {
            await dogWalkerAPI.confirmWalkRequestCharge(walkerId, req.requestId);
            await load();
          } catch (e: any) {
            Alert.alert('שגיאה', e?.message || 'הפעולה נכשלה');
          } finally {
            setActingId(null);
          }
        },
      },
    ]);
  };

  const decline = (req: WalkRequestDto) => {
    if (!walkerId) return;
    Alert.alert('דחיית בקשה', `לדחות את הבקשה מ${req.ownerFirstName} ${req.ownerLastName}?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'דחה',
        style: 'destructive',
        onPress: async () => {
          setActingId(req.requestId);
          try {
            await dogWalkerAPI.declineWalkRequest(walkerId, req.requestId);
            await load();
          } catch (e: any) {
            Alert.alert('שגיאה', e?.message || 'הפעולה נכשלה');
          } finally {
            setActingId(null);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: WalkRequestDto }) => {
    const busy = actingId === item.requestId;
    const ownerName = `${item.ownerFirstName || ''} ${item.ownerLastName || ''}`.trim() || 'בעלים';
    const dogLine =
      item.dogName || item.dogId ? `כלב: ${item.dogName || item.dogId}` : 'ללא כלב מצוין';

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{ownerName}</Text>
        <Text style={styles.cardMeta}>{dogLine}</Text>
        <Text style={styles.cardTime}>{formatRange(item.scheduledStart, item.scheduledEnd)}</Text>
        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={() => confirmCharge(item)}
          >
            <Text style={styles.btnPrimaryText}>אשר וחיוב</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnOutline, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={() => decline(item)}
          >
            <Text style={styles.btnOutlineText}>דחה</Text>
          </TouchableOpacity>
        </View>
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
        <Text style={styles.screenTitle}>בקשות טיול</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.requestId}
          renderItem={renderItem}
          contentContainerStyle={items.length === 0 ? styles.listEmpty : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY_COLOR} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>אין בקשות ממתינות כרגע</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default WalkerWalkRequestsScreen;

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
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
    alignItems: 'flex-end',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
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
  cardTime: {
    marginTop: 8,
    fontSize: 15,
    color: TEXT_DARK,
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
  actions: {
    flexDirection: 'row-reverse',
    marginTop: 14,
    gap: 10,
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: PRIMARY_COLOR,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: TEXT_DARK,
    backgroundColor: 'transparent',
  },
  btnOutlineText: {
    color: TEXT_DARK,
    fontWeight: '600',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  empty: {
    textAlign: 'center',
    color: '#8B7355',
    fontSize: 16,
    paddingVertical: 24,
  },
});
