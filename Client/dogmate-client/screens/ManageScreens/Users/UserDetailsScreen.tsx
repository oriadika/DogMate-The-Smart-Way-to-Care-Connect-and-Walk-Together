import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { userAPI } from '../../../services/api';
import { useUsers } from '../../../contexts/UsersContext';

const PRIMARY_COLOR = '#7FB069'; // matches HomeScreen (regular user)
const DESTRUCTIVE_COLOR = '#E74C3C'; // matches HomeScreen delete

const UserDetailsScreen = ({ navigation, route }: any) => {
  const { removeUserById } = useUsers();
  const user = route?.params?.user ?? {};
  const onDelete = route?.params?.onDelete ?? removeUserById;

  const isAdmin = user.type === 'AdminUser';
  const fullName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.lastName || 'משתמש ללא שם';

  const isSuspended = user.suspended === true;
  console.log('User suspended status:', user.suspended);

  const handleUserDelete = () => {
    userAPI
      .deleteUser(user.id)
      .then(() => {
        if (typeof onDelete === 'function') {
          onDelete(user.id);
        }
        alert('המשתמש נמחק בהצלחה');
        navigation.goBack();
      })
      .catch((error) => {
        console.error('Failed to delete user:', error);
        alert('מחיקת המשתמש נכשלה, אנא נסה שוב מאוחר יותר');
      });
  };

  const handleUserSuspend = () => {
    userAPI
      .suspendUser(user.id)
      .then(() => {
        alert('המשתמש נחסם בהצלחה');
        navigation.goBack();
      })
      .catch((error) => {
        console.error('Failed to suspend user:', error);
        alert('חסימת המשתמש נכשלה, אנא נסה שוב מאוחר יותר');
      });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerWrapper}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
        <Text style={styles.backIcon}>→</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>פרטי משתמש</Text>

          {fullName !== 'משתמש ללא שם' ? (
            <View style={styles.section}>
              <Text style={styles.label}>שם</Text>
              <Text style={styles.value}>{fullName}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.label}>אימייל</Text>
            <Text style={styles.value}>{user.email ?? '—'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>תפקיד</Text>
            <Text style={styles.value}>{isAdmin ? 'מנהל' : 'משתמש רגיל'}</Text>
          </View>

          {user.permissionLevel ? (
            <View style={styles.section}>
              <Text style={styles.label}>רמת הרשאה</Text>
              <Text style={styles.value}>{user.permissionLevel}</Text>
            </View>
          ) : null}

          {isAdmin ? (
            <View style={styles.adminSection}>
              <Text style={styles.adminTitle}>מידע למנהל</Text>
              <Text style={styles.adminText}>
                למשתמש זה יש הרשאות ניהול והוא יכול לנהל משתמשים אחרים.
              </Text>
            </View>
          ) : null}

          
          {!isSuspended ? (
            <TouchableOpacity style={styles.banButton} onPress={handleUserSuspend}>
              <Text style={styles.banButtonText}>חסום משתמש</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.suspendedSection}>
              <Text style={styles.suspendedText}>משתמש זה חסום כרגע.</Text>
            </View>
          )}
          

          <TouchableOpacity style={[styles.banButton, styles.deleteButton]} onPress={handleUserDelete}>
            <Text style={styles.banButtonText}>מחק משתמש</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default UserDetailsScreen;

const styles = StyleSheet.create({
  rtlText: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  safeArea: { flex: 1, backgroundColor: '#f5e6d3' },
  headerWrapper: { flex: 1 },
  backButton: {
    position: 'absolute',
    top: 18,
    left: 18,
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf0e6',
    borderWidth: 1,
    borderColor: '#e0d5c7',
    zIndex: 10,
  },
  backIcon: { color: '#5C4033', fontSize: 22, fontWeight: 'bold' },
  container: { padding: 20, paddingTop: 80, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 18,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  section: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fffaf5',
    borderWidth: 1,
    borderColor: '#eadfce',
  },
  label: {
    fontSize: 12,
    color: '#7a6a5a',
    marginBottom: 6,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  value: {
    fontSize: 16,
    color: '#3e2d23',
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  adminSection: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#e8f4ff',
    borderWidth: 1,
    borderColor: '#b6d4ff',
  },
  adminTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2a4d82',
    marginBottom: 8,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  adminText: {
    fontSize: 14,
    color: '#2a4d82',
    lineHeight: 20,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  banButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  banButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  deleteButton: {
    backgroundColor: DESTRUCTIVE_COLOR,
  },
  suspendedSection: {
  backgroundColor: '#FDECEA',      // light red background
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 16,
  marginTop: 10,
  borderWidth: 1,
  borderColor: '#F5C6CB',          // soft red border
  alignItems: 'center',
},

suspendedText: {
  color: '#C0392B',                // strong red text
  fontSize: 15,
  fontWeight: '600',
  writingDirection: 'rtl',
  textAlign: 'center',
},
});