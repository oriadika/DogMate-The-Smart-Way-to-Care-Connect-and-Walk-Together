import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { userAPI } from '../../services/api';
import { useUsers } from '../../contexts/UsersContext';

const UserDetailsScreen = ({ navigation, route }: any) => {
  const { removeUserById } = useUsers();
  const user = route?.params?.user ?? {};
  const onDelete = route?.params?.onDelete ?? removeUserById;

  const isAdmin = user.type === 'AdminUser';
  const fullName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.lastName || 'Unnamed User';

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerWrapper}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>User Details</Text>

          {fullName !== 'Unnamed User' ? (
            <View style={styles.section}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{fullName}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email ?? '—'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Role</Text>
            <Text style={styles.value}>{isAdmin ? 'מנהל' : 'משתמש רגיל'}</Text>
          </View>

          {user.permissionLevel ? (
            <View style={styles.section}>
              <Text style={styles.label}>Permission Level</Text>
              <Text style={styles.value}>{user.permissionLevel}</Text>
            </View>
          ) : null}

          {isAdmin ? (
            <View style={styles.adminSection}>
              <Text style={styles.adminTitle}>Admin Info</Text>
              <Text style={styles.adminText}>
                This user has administrative privileges and can manage other users.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.banButton}
            onPress={() => alert('Ban user functionality not implemented yet')}
          >
            <Text style={styles.banButtonText}>Ban User</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.banButton} onPress={handleUserDelete}>
            <Text style={styles.banButtonText}>Delete User</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default UserDetailsScreen;

const styles = StyleSheet.create({
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
  title: { fontSize: 28, fontWeight: '700', color: '#5C4033', marginBottom: 18 },
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: { fontSize: 16, color: '#3e2d23', fontWeight: '700' },
  adminSection: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#e8f4ff',
    borderWidth: 1,
    borderColor: '#b6d4ff',
  },
  adminTitle: { fontSize: 14, fontWeight: '700', color: '#2a4d82', marginBottom: 8 },
  adminText: { fontSize: 14, color: '#2a4d82', lineHeight: 20 },
  banButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#d64545',
    alignItems: 'center',
  },
  banButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});