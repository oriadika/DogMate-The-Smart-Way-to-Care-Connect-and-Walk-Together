import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { userAPI } from '../services/dogmateApi';

// קומפוננטת עזר לשורה בהגדרות
const SettingItem = ({ icon, label, onPress, isDestructive, value, onToggle }: any) => (
  <TouchableOpacity 
    style={styles.itemContainer} 
    onPress={onToggle ? undefined : onPress} // אם זה מתג, הלחיצה היא על המתג עצמו
    activeOpacity={onToggle ? 1 : 0.7}
  >
    {/* צד שמאל: חץ או מתג */}
    <View style={styles.itemLeft}>
      {onToggle ? (
        <Switch
          trackColor={{ false: '#d1d1d1', true: '#B4D6A5' }}
          thumbColor={value ? '#7FB069' : '#f4f3f4'}
          onValueChange={onToggle}
          value={value}
        />
      ) : (
        <Feather name="chevron-left" size={24} color="#A9B5C7" />
      )}
    </View>

    {/* צד ימין: אייקון וטקסט */}
    <View style={styles.itemRight}>
      <Text style={[styles.itemLabel, isDestructive && styles.destructiveText]}>
        {label}
      </Text>
      <View style={[styles.iconContainer, isDestructive && styles.destructiveIconBg]}>
        <MaterialCommunityIcons 
          name={icon} 
          size={22} 
          color={isDestructive ? '#FF6B6B' : '#8B7355'} 
        />
      </View>
    </View>
  </TouchableOpacity>
);

const SettingsScreen = ({ navigation, route }: any) => {
  // משתני State לדוגמה
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Get user info from route params
  const userId = route?.params?.userId;
  const email = route?.params?.email;

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const performLogout = async () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(true);
    try {
      let resolvedUserId = String(userId || '').trim();
      let resolvedEmail = String(email || '').trim();

      if (!resolvedUserId && !resolvedEmail) {
        const loggedUsersResponse = await userAPI.getLoggedUsers();
        const currentUser = loggedUsersResponse?.users?.find((entry: any) => entry?.id);
        if (currentUser) {
          resolvedUserId = String(currentUser.id || '');
          resolvedEmail = String(currentUser.email || '');
        }
      }

      console.log('Logging out user:', { resolvedUserId, resolvedEmail });
      await userAPI.logout(resolvedUserId || '', resolvedEmail || '');
      console.log('User logged out successfully');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Start' }],
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      Alert.alert('שגיאה', 'ההתנתקות נכשלה. נסה שוב.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // רקע עקבות (אותו קוד כמו במסכים הקודמים לשמירה על אחידות)
  const PawPattern = () => {
    const pawPrints = [];
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 8; col++) {
        pawPrints.push(
          <Text key={`${row}-${col}`} style={[styles.pawPrint, { top: row * 60, left: col * 50 }]}>
            🐾
          </Text>
        );
      }
    }
    return <View style={styles.pawPatternContainer}>{pawPrints}</View>;
  };

  return (
    <View style={styles.container}>
      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalCard}>
            <Text style={styles.logoutModalTitle}>התנתקות</Text>
            <Text style={styles.logoutModalMessage}>האם אתה בטוח שברצונך להתנתק מהחשבון?</Text>
            <View style={styles.logoutModalActions}>
              <TouchableOpacity
                style={styles.logoutModalCancelBtn}
                onPress={() => setShowLogoutConfirm(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.logoutModalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutModalConfirmBtn}
                onPress={performLogout}
                activeOpacity={0.85}
              >
                <Text style={styles.logoutModalConfirmText}>התנתק</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.backgroundOverlay}>
        <PawPattern />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* כותרת עליונה */}
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>הגדרות</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-forward" size={28} color="#5C4033" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* קבוצה 1: חשבון */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>חשבון</Text>
            <View style={styles.card}>
              <SettingItem 
                label="ערוך פרופיל" 
                icon="account-edit-outline" 
                onPress={() =>
                  navigation.navigate('EditProfile', {
                    userId,
                    email,
                    userFirstName: route?.params?.userFirstName || '',
                    userLastName: route?.params?.userLastName || '',
                  })
                }
              />
              <View style={styles.divider} />
              <SettingItem 
                label="שינוי סיסמה" 
                icon="lock-reset" 
                onPress={() =>
                  navigation.navigate('ChangePassword', {
                    userId,
                    email,
                  })
                }
              />
            </View>
          </View>

          {/* קבוצה 2: העדפות */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>העדפות</Text>
            <View style={styles.card}>
              <SettingItem 
                label="התראות" 
                icon="bell-outline" 
                onToggle={() => setNotificationsEnabled(!notificationsEnabled)}
                value={notificationsEnabled}
              />
            </View>
          </View>

          {/* קבוצה 3: כללי */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>כללי</Text>
            <View style={styles.card}>
              <SettingItem 
                label="תנאי שימוש ופרטיות" 
                icon="file-document-outline" 
                onPress={() => navigation.navigate('TermsPrivacy')}
              />
              <View style={styles.divider} />
              <SettingItem 
                label="צור קשר / תמיכה" 
                icon="help-circle-outline" 
                onPress={() =>
                  navigation.navigate('Support', {
                    userId,
                    email,
                  })
                }
              />
            </View>
          </View>

          {/* כפתור התנתקות */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator color="#FF6B6B" size="small" />
              ) : (
                <>
                  <Text style={styles.logoutText}>התנתק מהמערכת</Text>
                  <View style={{ marginLeft: 8 }}>
                    <MaterialCommunityIcons name="logout" size={20} color="#FF6B6B" />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>DogMate Version 1.0.0</Text>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5e6d3',
  },
  backgroundOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  pawPatternContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  pawPrint: {
    position: 'absolute',
    fontSize: 24,
    opacity: 0.1,
    color: '#8B7355',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
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
  backButton: {
    padding: 5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 8,
    marginRight: 8,
    textAlign: 'right',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#faf0e6',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLeft: {
    // צד שמאל שמור לחץ או למתג
  },
  itemLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 12,
    textAlign: 'right',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EDE0D4', // רקע בהיר לאייקון
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0D5C7',
    marginLeft: 16, // נותן אפקט של קו שלא מגיע עד הקצה השמאלי
  },
  destructiveText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  destructiveIconBg: {
    backgroundColor: '#FFE5E5',
  },
  logoutContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  logoutText: {
    fontSize: 18,
    color: '#FF6B6B',
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#A9B5C7',
    fontSize: 12,
  },
  logoutModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 28,
  },
  logoutModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#faf0e6',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  logoutModalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 10,
    textAlign: 'center',
    width: '100%',
  },
  logoutModalMessage: {
    fontSize: 16,
    color: '#5C4033',
    lineHeight: 24,
    marginBottom: 22,
    textAlign: 'center',
    width: '100%',
  },
  logoutModalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  logoutModalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D5C7',
    backgroundColor: '#FFFFFF',
    minWidth: 100,
    alignItems: 'center',
  },
  logoutModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5C4033',
    textAlign: 'center',
  },
  logoutModalConfirmBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    minWidth: 100,
    alignItems: 'center',
  },
  logoutModalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});