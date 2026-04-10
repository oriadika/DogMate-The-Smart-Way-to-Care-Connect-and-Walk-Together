import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const SCREEN_H = Dimensions.get('window').height;
const MODAL_MAX_H = Math.min(SCREEN_H * 0.72, 580);
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  type ScheduledWalk,
  splitWalksByNow,
  storageKeyForWalker,
} from '../utils/walkerWalks';

const BG_COLOR = '#f5e6d3';
const TEXT_DARK = '#5C4033';
const MUTED = '#8B7355';
const CARD_BG = '#faf0e6';
const PRIMARY_COLOR = '#7FB069';
const UPCOMING_CARD_BG = '#E8F5E9';
const HISTORY_CARD_BG = '#E8E8E8';

/** Stable picker value: unique per owner+dog (from walk history). */
const HISTORY_DOG_KEY_SEP = '\u001f';

type HistoryDogOption = {
  id: string;
  dogName: string;
  ownerName: string;
  dogImageUrl?: string;
};

function uniqueDogsFromWalkHistory(historyWalks: ScheduledWalk[]): HistoryDogOption[] {
  const seen = new Set<string>();
  const out: HistoryDogOption[] = [];
  for (const w of historyWalks) {
    const ownerName = w.ownerName.trim();
    const dogName = w.dogName.trim();
    if (!ownerName || !dogName) continue;
    const id = `${ownerName.toLowerCase()}${HISTORY_DOG_KEY_SEP}${dogName.toLowerCase()}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      dogName,
      ownerName,
      dogImageUrl: w.dogImageUrl,
    });
  }
  return out;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

function formatWalkDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} · ${h}:${m}`;
}

function formatDateOnly(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const WalkerSchedulePlaceholderScreen = ({ navigation, route }: any) => {
  const userId = route?.params?.userId as string | undefined;
  const insets = useSafeAreaInsets();

  const [walks, setWalks] = useState<ScheduledWalk[]>([]);
  const [loadingStorage, setLoadingStorage] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  /** `null` = הוספה, מזהה = עריכת טיול קיים */
  const [editingWalkId, setEditingWalkId] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [dogName, setDogName] = useState('');
  const [dogImageUrl, setDogImageUrl] = useState<string | undefined>(undefined);
  const [selectedHistoryDogId, setSelectedHistoryDogId] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const loadWalks = useCallback(async () => {
    if (!userId) {
      setLoadingStorage(false);
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(storageKeyForWalker(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as ScheduledWalk[];
        if (Array.isArray(parsed)) setWalks(parsed);
      }
    } catch (e) {
      console.warn('Walker schedule load failed', e);
    } finally {
      setLoadingStorage(false);
    }
  }, [userId]);

  useEffect(() => {
    loadWalks();
  }, [loadWalks]);

  const persistWalks = useCallback(
    async (next: ScheduledWalk[]) => {
      if (!userId) return;
      try {
        await AsyncStorage.setItem(storageKeyForWalker(userId), JSON.stringify(next));
      } catch (e) {
        console.warn('Walker schedule save failed', e);
      }
    },
    [userId]
  );

  const { upcoming, history } = useMemo(() => splitWalksByNow(walks), [walks]);

  const historyDogOptions = useMemo(() => uniqueDogsFromWalkHistory(history), [history]);

  const sections = useMemo(
    () =>
      [
        { title: 'טיולים קרובים', data: upcoming, kind: 'upcoming' as const },
        { title: 'היסטוריית טיולים', data: history, kind: 'history' as const },
      ] as const,
    [upcoming, history]
  );

  const closeModal = () => {
    setModalVisible(false);
    setEditingWalkId(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const openAddModal = () => {
    setEditingWalkId(null);
    setOwnerName('');
    setDogName('');
    setDogImageUrl(undefined);
    setSelectedHistoryDogId('');
    const now = new Date();
    setStartDate(now);
    setStartTime(now);
    setDurationMinutes(30);
    setModalVisible(true);
  };

  const openEditModal = (walk: ScheduledWalk) => {
    setEditingWalkId(walk.id);
    setOwnerName(walk.ownerName);
    setDogName(walk.dogName);
    setDogImageUrl(walk.dogImageUrl);
    const o = walk.ownerName.trim();
    const d = walk.dogName.trim();
    const key = `${o.toLowerCase()}${HISTORY_DOG_KEY_SEP}${d.toLowerCase()}`;
    const match = historyDogOptions.find((x) => x.id === key);
    setSelectedHistoryDogId(match ? match.id : '');
    const when = new Date(walk.startDateTime);
    if (!Number.isNaN(when.getTime())) {
      setStartDate(when);
      setStartTime(when);
    } else {
      const now = new Date();
      setStartDate(now);
      setStartTime(now);
    }
    const dm = DURATION_OPTIONS.includes(walk.durationMinutes) ? walk.durationMinutes : 30;
    setDurationMinutes(dm);
    setModalVisible(true);
  };

  const confirmDeleteWalk = (walk: ScheduledWalk) => {
    Alert.alert('מחיקת טיול', 'האם למחוק את הטיול מהלו״ז?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחיקה',
        style: 'destructive',
        onPress: () => {
          const next = walks.filter((w) => w.id !== walk.id);
          setWalks(next);
          persistWalks(next);
        },
      },
    ]);
  };

  const applyHistoryDog = (id: string) => {
    setSelectedHistoryDogId(id);
    if (!id) {
      return;
    }
    const d = historyDogOptions.find((x) => x.id === id);
    if (d) {
      setDogName(d.dogName);
      setOwnerName(d.ownerName);
      setDogImageUrl(d.dogImageUrl);
    }
  };

  const combineDateTime = (): Date => {
    const d = new Date(startDate);
    d.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    return d;
  };

  const saveWalk = () => {
    const o = ownerName.trim();
    const dn = dogName.trim();
    if (!o || !dn) {
      Alert.alert('חסר מידע', 'נא למלא שם בעלים ושם כלב');
      return;
    }
    const start = combineDateTime();
    if (editingWalkId) {
      const next = walks.map((w) =>
        w.id === editingWalkId
          ? {
              ...w,
              dogName: dn,
              ownerName: o,
              dogImageUrl,
              startDateTime: start.toISOString(),
              durationMinutes,
            }
          : w
      );
      setWalks(next);
      persistWalks(next);
    } else {
      const newWalk: ScheduledWalk = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        dogName: dn,
        ownerName: o,
        dogImageUrl,
        startDateTime: start.toISOString(),
        durationMinutes,
      };
      const next = [...walks, newWalk];
      setWalks(next);
      persistWalks(next);
    }
    closeModal();
  };

  const onDateChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setStartDate(date);
  };

  const onTimeChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) setStartTime(date);
  };

  const renderTrip = ({
    item,
    section,
  }: {
    item: ScheduledWalk;
    section: (typeof sections)[number];
  }) => {
    const isUpcoming = section.kind === 'upcoming';
    return (
      <View
        style={[
          styles.tripCard,
          isUpcoming ? styles.tripCardUpcoming : styles.tripCardHistory,
        ]}
      >
        <View style={styles.tripTop}>
          {item.dogImageUrl ? (
            <Image source={{ uri: item.dogImageUrl }} style={styles.dogThumb} />
          ) : (
            <View style={styles.dogThumbPlaceholder}>
              <MaterialCommunityIcons name="dog" size={28} color={PRIMARY_COLOR} />
            </View>
          )}
          <View style={styles.tripTextCol}>
            <Text style={styles.dogNameText} numberOfLines={1}>
              {item.dogName}
            </Text>
            <Text style={styles.ownerNameText} numberOfLines={1}>
              {item.ownerName}
            </Text>
          </View>
        </View>
        <Text style={styles.dateTimeText}>{formatWalkDateTime(item.startDateTime)}</Text>
        <Text style={styles.durationText}>משך מתוכנן: {item.durationMinutes} דק׳</Text>
        <View style={styles.tripActions}>
          <TouchableOpacity
            style={styles.tripActionBtn}
            onPress={() => openEditModal(item)}
            activeOpacity={0.75}
            accessibilityLabel="עריכת טיול"
          >
            <Ionicons name="create-outline" size={20} color={PRIMARY_COLOR} />
            <Text style={styles.tripActionTextEdit}>עריכה</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tripActionBtn}
            onPress={() => confirmDeleteWalk(item)}
            activeOpacity={0.75}
            accessibilityLabel="מחיקת טיול"
          >
            <Ionicons name="trash-outline" size={20} color="#C62828" />
            <Text style={styles.tripActionTextDelete}>מחיקה</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: (typeof sections)[number] }) => (
    <Text style={styles.sectionTitle}>{section.title}</Text>
  );

  const renderSectionFooter = ({ section }: { section: (typeof sections)[number] }) =>
    section.data.length === 0 ? (
      <Text style={styles.emptySection}>
        {section.kind === 'upcoming' ? 'אין טיולים מתוכננים' : 'אין טיולים בהיסטוריה'}
      </Text>
    ) : null;

  if (loadingStorage) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerBtn} />
        <Text style={styles.headerTitle}>ניהול לו״ז</Text>
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

      <SectionList
        sections={sections as any}
        keyExtractor={(item) => item.id}
        renderItem={renderTrip as any}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <Text style={styles.listHint}>טיולים קרובים והיסטוריה לפי זמן נוכחי במכשיר</Text>
        }
      />

      <TouchableOpacity
        style={[
          styles.fab,
          {
            bottom: 24 + insets.bottom,
            right: 20,
          },
        ]}
        onPress={openAddModal}
        activeOpacity={0.9}
        accessibilityLabel="הוספת עבודה"
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <ScrollView
              style={[styles.modalScroll, { maxHeight: MODAL_MAX_H }]}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              bounces={false}
              nestedScrollEnabled
            >
              <Text style={styles.modalTitle}>{editingWalkId ? 'עריכת טיול' : 'הוספת עבודה'}</Text>

              {historyDogOptions.length > 0 ? (
                <>
                  <Text style={styles.fieldLabel}>בחירת כלב (אופציונלי)</Text>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={selectedHistoryDogId}
                      onValueChange={(v) => applyHistoryDog(String(v))}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      <Picker.Item label="— הזנה ידנית —" value="" />
                      {historyDogOptions.map((d) => (
                        <Picker.Item
                          key={d.id}
                          label={`${d.dogName} · ${d.ownerName}`}
                          value={d.id}
                        />
                      ))}
                    </Picker>
                  </View>
                </>
              ) : null}

              <Text style={styles.fieldLabel}>שם בעלים</Text>
              <TextInput
                style={styles.input}
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="שם מלא"
                placeholderTextColor={MUTED}
                textAlign="right"
              />

              <Text style={styles.fieldLabel}>שם הכלב</Text>
              <TextInput
                style={styles.input}
                value={dogName}
                onChangeText={setDogName}
                placeholder="שם הכלב"
                placeholderTextColor={MUTED}
                textAlign="right"
              />

              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateBtnText}>תאריך: {formatDateOnly(startDate)}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTimePicker(true)}>
                <Text style={styles.dateBtnText}>
                  שעה:{' '}
                  {`${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`}
                </Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>משך טיול (דקות)</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={durationMinutes}
                  onValueChange={(v) => setDurationMinutes(Number(v))}
                  style={styles.picker}
                >
                  {DURATION_OPTIONS.map((n) => (
                    <Picker.Item key={n} label={`${n} דק׳`} value={n} />
                  ))}
                </Picker>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={closeModal}>
                  <Text style={styles.modalCancelText}>ביטול</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSave} onPress={saveWalk}>
                  <Text style={styles.modalSaveText}>שמירה</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {Platform.OS === 'ios' && showDatePicker && (
              <Modal transparent animationType="fade">
                <View style={styles.pickerModalOverlay}>
                  <View style={styles.pickerModalBox}>
                    <View style={styles.pickerModalHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.pickerModalDone}>סיום</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerModalTitle}>תאריך</Text>
                      <View style={{ width: 48 }} />
                    </View>
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                    />
                  </View>
                </View>
              </Modal>
            )}
            {Platform.OS === 'android' && showDatePicker && (
              <DateTimePicker value={startDate} mode="date" display="default" onChange={onDateChange} />
            )}

            {Platform.OS === 'ios' && showTimePicker && (
              <Modal transparent animationType="fade">
                <View style={styles.pickerModalOverlay}>
                  <View style={styles.pickerModalBox}>
                    <View style={styles.pickerModalHeader}>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.pickerModalDone}>סיום</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerModalTitle}>שעה</Text>
                      <View style={{ width: 48 }} />
                    </View>
                    <DateTimePicker
                      value={startTime}
                      mode="time"
                      display="spinner"
                      onChange={onTimeChange}
                      is24Hour
                    />
                  </View>
                </View>
              </Modal>
            )}
            {Platform.OS === 'android' && showTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display="default"
                onChange={onTimeChange}
                is24Hour
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default WalkerSchedulePlaceholderScreen;

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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 8,
  },
  listHint: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 12,
    marginBottom: 8,
  },
  emptySection: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 16,
    paddingVertical: 8,
  },
  tripCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
  },
  tripCardUpcoming: {
    backgroundColor: UPCOMING_CARD_BG,
    borderColor: 'rgba(127, 176, 105, 0.45)',
  },
  tripCardHistory: {
    backgroundColor: HISTORY_CARD_BG,
    borderColor: '#D0D0D0',
  },
  tripTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  dogThumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
  },
  dogThumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
  },
  tripTextCol: {
    flex: 1,
    minWidth: 0,
  },
  dogNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ownerNameText: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 4,
  },
  dateTimeText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  durationText: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 6,
  },
  tripActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(92, 64, 51, 0.12)',
  },
  tripActionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tripActionTextEdit: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  tripActionTextDelete: {
    fontSize: 15,
    fontWeight: '600',
    color: '#C62828',
  },
  fab: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  modalCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
  },
  modalScroll: {},
  modalScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0D5C7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: TEXT_DARK,
    backgroundColor: '#fff',
  },
  dateBtn: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  dateBtnText: {
    fontSize: 15,
    color: TEXT_DARK,
    textAlign: 'right',
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#E0D5C7',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    maxHeight: 140,
  },
  picker: {
    width: '100%',
  },
  pickerItem: {
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B7355',
    alignItems: 'center',
  },
  modalCancelText: {
    fontWeight: '700',
    color: TEXT_DARK,
  },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
  },
  modalSaveText: {
    fontWeight: '700',
    color: '#fff',
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerModalBox: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  pickerModalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0D5C7',
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  pickerModalDone: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
});
