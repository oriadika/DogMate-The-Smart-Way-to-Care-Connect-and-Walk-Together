import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

const PRIMARY_COLOR = '#7FB069';
const BG_COLOR = '#f5e6d3';
const TEXT_DARK = '#5C4033';
const CARD_BG = '#faf0e6';

const WalkerHomeScreen = ({ navigation, route }: any) => {
  const currentUserId = route?.params?.userId;
  const firstName = route?.params?.userFirstName || '';
  const lastName = route?.params?.userLastName || '';
  const displayName = `${firstName} ${lastName}`.trim() || 'דוגווקר';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <Text style={styles.greeting} numberOfLines={1}>
              שלום, {displayName}
            </Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() =>
                navigation.navigate('Settings', {
                  userId: currentUserId,
                  email: route?.params?.email,
                  userFirstName: firstName,
                  userLastName: lastName,
                })
              }
            >
              <Ionicons name="settings-outline" size={28} color="#5C4033" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            מרכז הדוגווקר — שירות, ביקורות וטיולים במקום אחד
          </Text>
        </View>

        <TouchableOpacity
          style={styles.placeholderCard}
          activeOpacity={0.85}
          onPress={() => {
            if (!currentUserId) {
              Alert.alert('שגיאה', 'לא נמצא משתמש מחובר');
              return;
            }
            navigation.navigate('WalkerProfessionalProfile', {
              userId: currentUserId,
              userFirstName: firstName,
              userLastName: lastName,
              email: route?.params?.email,
            });
          }}
        >
          <FontAwesome5 name="id-card" size={22} color={PRIMARY_COLOR} />
          <Text style={styles.cardTitle}>ניהול השירות שלי</Text>
          <Text style={styles.cardHint}>זמינות, ערים ותעריפים</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.placeholderCard}
          activeOpacity={0.85}
          onPress={() => {
            if (!currentUserId) {
              Alert.alert('שגיאה', 'לא נמצא משתמש מחובר');
              return;
            }
            navigation.navigate('WalkerReviews', {
              userId: currentUserId,
              userFirstName: firstName,
              userLastName: lastName,
              email: route?.params?.email,
            });
          }}
        >
          <Ionicons name="star-outline" size={26} color={PRIMARY_COLOR} />
          <Text style={styles.cardTitle}>הביקורות שלי</Text>
          <Text style={styles.cardHint}>כל הביקורות והדירוגים מבעלי כלבים</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.placeholderCard}
          activeOpacity={0.85}
          onPress={() => {
            if (!currentUserId) {
              Alert.alert('שגיאה', 'לא נמצא משתמש מחובר');
              return;
            }
            navigation.navigate('WalkerSchedulePlaceholder', {
              userId: currentUserId,
              userFirstName: firstName,
              userLastName: lastName,
              email: route?.params?.email,
            });
          }}
        >
          <Ionicons name="calendar-outline" size={24} color={PRIMARY_COLOR} />
          <Text style={styles.cardTitle}>הטיולים שלי</Text>
          <Text style={styles.cardHint}>ניהול לו״ז, טיולים קרובים והיסטוריה</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WalkerHomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 28,
    marginTop: 6,
  },
  /** שם מימין, גלגל שיניים משמאל (אותה שורה) */
  nameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  settingsButton: {
    padding: 5,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    flex: 1,
    minWidth: 0,
    fontSize: 26,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#8B7355',
    textAlign: 'right',
    lineHeight: 22,
  },
  placeholderCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
    alignItems: 'flex-end',
  },
  cardTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  cardHint: {
    marginTop: 4,
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'right',
    alignSelf: 'stretch',
  },
});
