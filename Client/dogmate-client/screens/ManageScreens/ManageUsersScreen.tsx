import React, { useEffect, useState, useCallback } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { userAPI } from '../../services/api';
import { useUsers } from '../../contexts/UsersContext';

const PRIMARY_COLOR = '#7FB069'; // matches HomeScreen (regular user)

const ManageUsersScreen = ({ navigation, route }: any) => {
  const { users, setUsers, removeUserById } = useUsers();
  const email = route?.params?.email ?? '';
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = async () => {
    try {
      const fetchedUsers = await userAPI.getAllUsers();
      const list = Array.isArray(fetchedUsers)
        ? fetchedUsers
        : Array.isArray(fetchedUsers.data)
        ? fetchedUsers.data
        : Array.isArray(fetchedUsers.users)
        ? fetchedUsers.users
        : [];
      setUsers(list);
    } catch (error) {
      console.warn('Failed to fetch users', error);
      setUsers([]);
    }
  };

  useEffect(() => {
    if (Array.isArray(route?.params?.users)) {
      setUsers(route.params.users);
    }
  }, [route?.params?.users, setUsers]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleUserDetails = (user: any) => {
    navigation.navigate('UserDetails', {
      user,
      onDelete: removeUserById,
    });
  };

  const filteredUsers = (Array.isArray(users) ? users : []).filter(
    (user: any) => user.email !== email
  );

  const renderUserCard = ({ item }: any) => {
    const fullName =
      item.firstName && item.lastName
        ? `${item.firstName} ${item.lastName}`
        : 'משתמש ללא שם';
    const type =
      item.type === 'AdminUser'
        ? 'מנהל'
        : item.type === 'DogWalkerUser'
          ? 'דוגווקר'
          : 'משתמש רגיל';
    const permission = item.permissionLevel ? item.permissionLevel : '';

    return (
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.firstName?.[0]?.toUpperCase() ||
              item.email?.[0]?.toUpperCase() ||
              'U'}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <TouchableOpacity
            style={styles.viewDetailButton}
            onPress={() => handleUserDetails(item)}
          >
            <Text style={styles.viewDetailButtonText}>צפייה בפרטים</Text>
          </TouchableOpacity>

          <View style={styles.userText}>
            {fullName !== 'משתמש ללא שם' ? (
              <>
                <Text style={styles.userName}>{fullName}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
              </>
            ) : (
              <Text style={styles.userName}>{item.email}</Text>
            )}
            <Text style={styles.userType}>{type}</Text>
            {permission ? <Text style={styles.userType}>{permission}</Text> : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>ניהול משתמשים</Text>
          <Text style={styles.subtitle}>
            צפייה וניהול של כל המשתמשים הרשומים ב־DogMate
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{filteredUsers.length}</Text>
          <Text style={styles.summaryLabel}>משתמשים נמצאו</Text>
        </View>

        <FlatList
          data={filteredUsers}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderUserCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>לא נמצאו משתמשים</Text>
              <Text style={styles.emptyText}>
                כרגע אין משתמשים נוספים להצגה.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

export default ManageUsersScreen;

const styles = StyleSheet.create({
  rtlText: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  safeArea: { flex: 1, backgroundColor: '#f5e6d3' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf0e6',
    borderWidth: 1,
    borderColor: '#e0d5c7',
    marginBottom: 18,
  },
  backIcon: { color: '#5C4033', fontSize: 22, fontWeight: 'bold' },
  header: { marginBottom: 20 },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 6,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 15,
    color: '#7a6a5a',
    lineHeight: 22,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  summaryCard: {
    backgroundColor: '#7FB069',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  summaryNumber: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 15,
    color: '#f4f4f4',
    fontWeight: '600',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  listContent: { paddingBottom: 24 },
  userCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fffaf5',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eadfce',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#d9b99b',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
  avatarText: { color: '#5C4033', fontSize: 20, fontWeight: '700' },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userText: { flex: 1, alignItems: 'center' },
  userName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#3e2d23',
    marginBottom: 4,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  userEmail: { fontSize: 14, color: '#7a6a5a', writingDirection: 'rtl', textAlign: 'center' },
  userType: {
    marginTop: 6,
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#e3d5bd',
    color: '#5C4033',
    fontSize: 12,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  viewDetailButton: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  viewDetailButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  emptyState: { marginTop: 50, alignItems: 'center', paddingHorizontal: 20 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 8,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 15,
    color: '#7a6a5a',
    textAlign: 'right',
    lineHeight: 22,
    writingDirection: 'rtl',
  },
});