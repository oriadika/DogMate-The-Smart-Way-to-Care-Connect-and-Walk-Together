import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Pressable,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { userAPI, vaccinationAPI, dogAPI, type VaccinationRow } from '../../services/api';
import { OWNER_MAIN_TAB } from '../../navigation/ownerTabRoutes';
import VaccinationSortModal, {
  type VaccinationSortOption,
} from '../../components/health/VaccinationSortModal';
import VaccinationGroupCard from '../../components/health/VaccinationGroupCard';
import {
  groupVaccinations,
  sortVaccinationGroups,
  type VaccinationGroup,
} from '../../utils/vaccinationGroups';

const PRIMARY_COLOR = '#7FB069';
const BG_COLOR = '#FAEFDD';
const TEXT_DARK = '#5C4033';
const BORDER_COLOR = '#E0D5C7';
const BG_CARD = '#fff';
const MUTED = '#8B7355';

function dogFilterPanelWidth(): number {
  const w = Dimensions.get('window').width;
  return Math.min(360, Math.max(260, Math.round(w * 0.88)));
}

const DOG_MODAL_LIST_MAX_HEIGHT = Math.min(Dimensions.get('window').height * 0.55, 400);

/** מסנן "כל הכלבים" — לא dogId אמיתי */
const ALL_DOGS_FILTER = '__all_dogs__';

const DEFAULT_VACCINATION_SORT: VaccinationSortOption = 'date_desc';

type DogOption = { id: string; name: string };

const VaccinationsHubScreen = ({ navigation, route }: any) => {
  const [rows, setRows] = useState<VaccinationRow[]>([]);
  const [userDogs, setUserDogs] = useState<DogOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(route?.params?.userId || null);
  const [selectedDogId, setSelectedDogId] = useState<string>(ALL_DOGS_FILTER);
  const [dogFilterModalVisible, setDogFilterModalVisible] = useState(false);
  const [vaccinationSort, setVaccinationSort] = useState<VaccinationSortOption>(DEFAULT_VACCINATION_SORT);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [expandedHistoryByKey, setExpandedHistoryByKey] = useState<Record<string, boolean>>({});

  const closeDogFilterModal = useCallback(() => setDogFilterModalVisible(false), []);

  const loadVaccinations = useCallback(async () => {
    try {
      setLoading(true);
      // Get userId from route params (passed from navigation) instead of calling getLoggedUsers()
      const uid = route?.params?.userId || userId;
      if (!uid) {
        Alert.alert('שגיאה', 'לא נמצא משתמש מחובר');
        setRows([]);
        setUserDogs([]);
        return;
      }
      setUserId(uid);

      try {
        const res = await vaccinationAPI.list(uid);
        const list = Array.isArray(res.vaccinations) ? res.vaccinations : [];
        setRows(list as VaccinationRow[]);
      } catch (ve: any) {
        console.error('Vaccinations load error:', ve);
        Alert.alert('שגיאה', ve?.message || 'שגיאה בטעינת החיסונים');
        setRows([]);
      }

      try {
        const dogsRes = await dogAPI.getDogsForUser(uid);
        const dogList = dogsRes.success && Array.isArray(dogsRes.dogs) ? dogsRes.dogs : [];
        setUserDogs(
          dogList.map((d: { id?: string; name?: string }) => ({
            id: String(d.id),
            name: String(d.name || 'כלב').trim() || 'כלב',
          }))
        );
      } catch (de: any) {
        console.warn('Dogs list for filter failed:', de);
        setUserDogs([]);
      }
    } catch (e: any) {
      console.error('Vaccinations hub load error:', e);
      Alert.alert('שגיאה', e?.message || 'שגיאה בטעינת הנתונים');
      setRows([]);
      setUserDogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVaccinations();
    }, [loadVaccinations])
  );

  const dogsInData = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of userDogs) {
      if (d.id) m.set(String(d.id), d.name);
    }
    for (const r of rows) {
      if (!r.dogId) continue;
      const id = String(r.dogId);
      if (!m.has(id)) {
        m.set(id, (r.dogName || 'כלב').trim() || 'כלב');
      }
    }
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [userDogs, rows]);

  useEffect(() => {
    if (selectedDogId === ALL_DOGS_FILTER) return;
    if (!dogsInData.some((d) => d.id === selectedDogId)) {
      setSelectedDogId(ALL_DOGS_FILTER);
    }
  }, [dogsInData, selectedDogId]);

  const filteredRows = useMemo(() => {
    if (selectedDogId === ALL_DOGS_FILTER) return rows;
    return rows.filter((r) => String(r.dogId) === selectedDogId);
  }, [rows, selectedDogId]);

  const sortedGroupedRows = useMemo(() => {
    const groups = groupVaccinations(filteredRows);
    return sortVaccinationGroups(groups, vaccinationSort);
  }, [filteredRows, vaccinationSort]);

  const dogModalOptions = useMemo(
    () => [{ id: ALL_DOGS_FILTER, name: 'כל הכלבים' }, ...dogsInData],
    [dogsInData]
  );

  const dogFilterButtonLabel = useMemo(() => {
    if (selectedDogId === ALL_DOGS_FILTER) return 'כל הכלבים';
    return dogsInData.find((d) => d.id === selectedDogId)?.name || 'כל הכלבים';
  }, [selectedDogId, dogsInData]);

  const onPickDogFilter = useCallback(
    (id: string) => {
      setSelectedDogId(id);
      closeDogFilterModal();
    },
    [closeDogFilterModal]
  );

  const formatDateDisplay = (iso: string) => {
    try {
      const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'));
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const handleAdd = () => {
    if (!userId) return;
    navigation.navigate('VaccinationForm', { userId });
  };

  const handleEdit = (item: VaccinationRow) => {
    if (!userId) return;
    navigation.navigate('VaccinationForm', {
      userId,
      vaccinationId: item.id,
      dogId: item.dogId,
      vaccineName: item.vaccineName,
      administeredDate: item.administeredDate,
      nextDueDate: item.nextDueDate ?? undefined,
      vetClinicName: item.vetClinicName ?? undefined,
    });
  };

  const handleDelete = (item: VaccinationRow) => {
    if (!userId) return;
    Alert.alert(
      'מחיקת רישום',
      `למחוק את רישום "${item.vaccineName}" של ${item.dogName} מתאריך ${formatDateDisplay(item.administeredDate)}?`,
      [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          try {
            await vaccinationAPI.delete(userId, item.id);
            await loadVaccinations();
            Alert.alert('הצלחה', 'הרישום נמחק');
          } catch (e: any) {
            Alert.alert('שגיאה', e?.message || 'מחיקה נכשלה');
          }
        },
      },
    ]
    );
  };

  const handleDeleteGroup = (group: VaccinationGroup) => {
    if (!userId) return;
    const count = group.history.length;
    Alert.alert(
      'מחיקת חיסון',
      `למחוק את "${group.vaccineName}" של ${group.dogName} כולו${count > 1 ? ` (${count} רישומים)` : ''}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(
                group.history.map((entry) => vaccinationAPI.delete(userId, entry.id))
              );
              setExpandedHistoryByKey((prev) => {
                const next = { ...prev };
                delete next[group.key];
                return next;
              });
              await loadVaccinations();
              Alert.alert('הצלחה', 'החיסון נמחק');
            } catch (e: any) {
              Alert.alert('שגיאה', e?.message || 'מחיקה נכשלה');
              await loadVaccinations();
            }
          },
        },
      ]
    );
  };

  const toggleHistory = useCallback((key: string) => {
    setExpandedHistoryByKey((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>טוען חיסונים...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => {
              if (userId) {
                navigation.navigate('Home', { screen: 'Dashboard', params: { userId } });
              } else {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="home-outline" size={24} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>החיסונים שלי</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Home', { screen: OWNER_MAIN_TAB.Health })}
          >
            <Ionicons name="arrow-forward" size={28} color={TEXT_DARK} />
          </TouchableOpacity>
        </View>

        <View style={styles.hubSection}>
          <Text style={styles.subtitle}>רשימת החיסונים לפי כלב</Text>
          <View style={styles.titleRow}>
            <View style={styles.hubControlCell}>
              <TouchableOpacity
                style={styles.dogFilterButton}
                onPress={() => setDogFilterModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.dogFilterButtonText} numberOfLines={2}>
                  {dogFilterButtonLabel}
                </Text>
                <Ionicons name="chevron-down" size={20} color={MUTED} style={styles.dogFilterChevron} />
              </TouchableOpacity>
              <Modal
                visible={dogFilterModalVisible}
                transparent
                animationType="fade"
                onRequestClose={closeDogFilterModal}
              >
                <Pressable style={styles.dogFilterModalOverlay} onPress={closeDogFilterModal}>
                  <Pressable
                    style={[
                      styles.dogFilterModalPanel,
                      {
                        width: dogFilterPanelWidth(),
                        maxHeight: DOG_MODAL_LIST_MAX_HEIGHT + 36,
                      },
                    ]}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <FlatList
                      data={dogModalOptions}
                      keyExtractor={(item) => item.id}
                      style={styles.dogFilterModalList}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => {
                        const selected = selectedDogId === item.id;
                        return (
                          <TouchableOpacity
                            style={[styles.dogFilterRow, selected && styles.dogFilterRowSelected]}
                            onPress={() => onPickDogFilter(item.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.dogFilterRowText}>{item.name}</Text>
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </Pressable>
                </Pressable>
              </Modal>
            </View>
            <View style={styles.hubControlCell}>
              <TouchableOpacity
                style={styles.sortInlineBtn}
                onPress={() => setSortModalVisible(true)}
                activeOpacity={0.85}
                accessibilityLabel="מיון"
              >
                <Ionicons name="swap-vertical" size={20} color={TEXT_DARK} />
                <Text style={styles.sortInlineLabel}>מיון</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={sortedGroupedRows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listPad}
          renderItem={({ item }) => (
            <VaccinationGroupCard
              group={item}
              expanded={Boolean(expandedHistoryByKey[item.key])}
              onToggleHistory={() => toggleHistory(item.key)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDeleteGroup={handleDeleteGroup}
              formatDate={formatDateDisplay}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {rows.length === 0
                  ? 'אין חיסונים רשומים. לחץ על + להוספה.'
                  : selectedDogId === ALL_DOGS_FILTER
                    ? 'אין חיסונים להצגה.'
                    : 'אין חיסונים לכלב זה. בחר כלב אחר או "כל הכלבים".'}
              </Text>
            </View>
          }
        />

        <VaccinationSortModal
          visible={sortModalVisible}
          onClose={() => setSortModalVisible(false)}
          value={vaccinationSort}
          onChange={setVaccinationSort}
        />
      </View>
    </SafeAreaView>
  );
};

export default VaccinationsHubScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG_COLOR },
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: TEXT_DARK, fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: TEXT_DARK },
  backBtn: { padding: 5, width: 40, alignItems: 'flex-end' },
  homeBtn: { padding: 5, width: 40, alignItems: 'flex-start' },
  /** מיון: אותו גודל כמו כפתור בוחר הכלבים */
  sortInlineBtn: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    minHeight: 45,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: BG_CARD,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
  },
  sortInlineLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hubSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
    width: '100%',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  /** רוחב אחיד לכפתור כלבים ולכפתור מיון */
  hubControlCell: {
    flexShrink: 0,
    maxWidth: 150,
    minWidth: 100,
  },
  /** כמו כפתור בחירת עיר/אזור — לחיצה פותחת מודל עם רשימה */
  dogFilterButton: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 45,
    backgroundColor: BG_CARD,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  dogFilterButtonText: {
    flex: 1,
    fontSize: 14,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
  },
  dogFilterChevron: {
    marginLeft: 2,
  },
  dogFilterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dogFilterModalPanel: {
    backgroundColor: BG_CARD,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  dogFilterModalList: {
    maxHeight: DOG_MODAL_LIST_MAX_HEIGHT,
    width: '100%',
  },
  dogFilterRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee8df',
    backgroundColor: '#fff',
  },
  dogFilterRowSelected: {
    backgroundColor: '#E6F0DF',
  },
  dogFilterRowText: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  addBtn: {
    backgroundColor: PRIMARY_COLOR,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    flexShrink: 0,
  },
  listPad: { padding: 20, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 48 },
  emptyText: { textAlign: 'center', color: '#8B7355', fontSize: 16 },
});
