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
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';

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

const SettingsScreen = ({ navigation }: any) => {
  // משתני State לדוגמה
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // פונקציית התנתקות
  const handleLogout = () => {
    Alert.alert(
      'התנתקות',
      'האם אתה בטוח שברצונך להתנתק מהחשבון?',
      [
        { text: 'ביטול', style: 'cancel' },
        { 
          text: 'התנתק', 
          style: 'destructive',
          onPress: () => {
            // כאן תוסיף את לוגיקת ההתנתקות האמיתית שלך
            console.log('User logged out');
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }], // או לאן שתרצה לנווט
            });
          }
        },
      ]
    );
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
                onPress={() => Alert.alert('ערוך פרופיל', 'פונקציונליות זו תתווסף בקרוב')} 
              />
              <View style={styles.divider} />
              <SettingItem 
                label="שינוי סיסמה" 
                icon="lock-reset" 
                onPress={() => Alert.alert('שינוי סיסמה', 'פונקציונליות זו תתווסף בקרוב')} 
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
                onPress={() => Alert.alert('תנאי שימוש ופרטיות', 'פונקציונליות זו תתווסף בקרוב')} 
              />
              <View style={styles.divider} />
              <SettingItem 
                label="צור קשר / תמיכה" 
                icon="help-circle-outline" 
                onPress={() => Alert.alert('צור קשר / תמיכה', 'פונקציונליות זו תתווסף בקרוב')} 
              />
            </View>
          </View>

          {/* כפתור התנתקות */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>התנתק מהמערכת</Text>
              <View style={{ marginLeft: 8 }}>
                <MaterialCommunityIcons name="logout" size={20} color="#FF6B6B" />
              </View>
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
});