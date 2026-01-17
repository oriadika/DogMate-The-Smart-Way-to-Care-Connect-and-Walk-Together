import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const PRIMARY_COLOR = '#E53935';
const BG_COLOR = '#FAEFDD';
const TEXT_DARK = '#5C4033';

// אנשי קשר דמה
const DUMMY_CONTACTS = [
  { id: '1', name: 'וטרינר חירום', phone: '050-1234567' },
  { id: '2', name: 'משפחה – אבא', phone: '052-7654321' },
  { id: '3', name: 'משפחה – אמא', phone: '054-2468135' },
  { id: '4', name: 'חבר קרוב', phone: '053-9988776' },
  { id: '5', name: 'שכן', phone: '055-1122334' },
];

const SOSScreen = ({ navigation }: any) => {
  const confirmCall = (name: string, phone: string) => {
    Alert.alert(
      'אישור שיחה',
      `האם אתה בטוח שברצונך להתקשר אל ${name}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'התקשר',
          style: 'destructive',
          onPress: () => Linking.openURL(`tel:${phone}`),
        },
      ]
    );
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.left}>
        <MaterialCommunityIcons
          name="account-alert"
          size={28}
          color={PRIMARY_COLOR}
        />
      </View>

      <View style={styles.center}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.phone}>{item.phone}</Text>
      </View>

      <TouchableOpacity
        style={styles.callButton}
        onPress={() => confirmCall(item.name, item.phone)}
      >
        <Ionicons name="call" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={28} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>מצב חירום (SOS)</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Info text */}
      <Text style={styles.infoText}>
        האם הכלב שלך בסכנה או שיש בעיה דחופה?
        בחר למי להתקשר:
      </Text>

      {/* Contacts list */}
      <FlatList
        data={DUMMY_CONTACTS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
};

export default SOSScreen;

const SCREEN_WIDTH = Dimensions.get('window').width;
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
    paddingHorizontal: 20,
  },
  header: {
    width: SCREEN_WIDTH * 0.9,
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  infoText: {
    width: SCREEN_WIDTH * 0.9,
    alignSelf: 'center',
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    marginBottom: 20,
    lineHeight: 24,
  },
  card: {
    width: SCREEN_WIDTH * 0.9,
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  left: {
    marginLeft: 12,
  },
  center: {
    flex: 1,
    alignItems: 'flex-end',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: '#8B7355',
  },
  callButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
});
