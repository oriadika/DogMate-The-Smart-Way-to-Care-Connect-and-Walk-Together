import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { dogAPI, userAPI } from '../services/api';
import { useUsers } from '../contexts/UsersContext';

const PRIMARY_COLOR = '#7FB069'; // matches HomeScreen (regular user)
const DESTRUCTIVE_COLOR = '#E74C3C'; // matches HomeScreen delete

const AdminScreen = ({ navigation, route }: any) => {
  const { users, setUsers } = useUsers();
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [openSupportCount, setOpenSupportCount] = useState<number | null>(null);

  const refreshOpenSupportCount = useCallback(async () => {
    const adminId = route.params?.userId;
    if (!adminId) {
      setOpenSupportCount(0);
      return;
    }
    try {
      const res = await userAPI.getSupportRequests(String(adminId));
      const list = Array.isArray(res.requests) ? res.requests : [];
      const open = list.filter((r) => String(r.status || '').toUpperCase() === 'OPEN').length;
      setOpenSupportCount(open);
    } catch {
      setOpenSupportCount(null);
    }
  }, [route.params?.userId]);

  useFocusEffect(
    useCallback(() => {
      refreshOpenSupportCount();
    }, [refreshOpenSupportCount])
  );

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsersResponse = await userAPI.getAllUsers();

        console.log('Admin users response:', allUsersResponse);

        const fetchedUsers =
          Array.isArray(allUsersResponse)
            ? allUsersResponse
            : Array.isArray(allUsersResponse.users)
            ? allUsersResponse.users
            : Array.isArray(allUsersResponse.data)
            ? allUsersResponse.data
            : [];

        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchDogs = async () => {
      try {
        const allDogsResponse = await dogAPI.getAllDogs();
        setDogs(allDogsResponse.dogs || []);
      } catch (error) {
        console.error('Failed to fetch dogs:', error);
      }
    };


    fetchUsers();
    fetchDogs();
  }, [setUsers, setDogs]);

  const handleManageUsers = () => {
    navigation.navigate('AdminManageUsers', { users, email: route.params.email });
  };

  const handleManageDogs = () => {
    navigation.navigate('AdminManageDogs', { dogs });
  };

  const handleViewReports = () => {
    alert('צפייה בדוחות עדיין לא זמינה');
  };

  const handleSupportInbox = () => {
    navigation.navigate('AdminSupportRequests', {
      userId: route.params?.userId,
      email: route.params?.email,
    });
  };

  const handleSystemSettings = () => {
    alert('הגדרות מערכת עדיין לא זמינות');
  };

  const handleLogout = () => {
    Alert.alert('התנתקות', 'בטוח שברצונך להתנתק?', [
      {
        text: 'ביטול',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'התנתקות',
        onPress: async () => {
          try {
            await userAPI.logout(route?.params?.userId || '', route?.params?.email || '');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Start' }],
            });
          } catch (error: any) {
            Alert.alert('שגיאה', error.message || 'ההתנתקות נכשלה');
            console.error('Sign out error:', error);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text style={[styles.rtlText, { marginTop: 12 }]}>טוען לוח בקרה...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>לוח בקרה למנהל</Text>
          <Text style={styles.subtitle}>ברוך שובך, מנהל</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>סקירה</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{users.length}</Text>
              <Text style={styles.statLabel}>משתמשים</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{dogs.length}</Text>
              <Text style={styles.statLabel}>כלבים</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>16</Text>
              <Text style={styles.statLabel}>דוגווקרים</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>דוחות</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פעולות מהירות</Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleManageUsers}>
            <Text style={styles.actionButtonText}>ניהול משתמשים</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleManageDogs}>
            <Text style={styles.actionButtonText}>ניהול כלבים</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleSupportInbox} activeOpacity={0.85}>
            <View style={styles.supportBadgeWrap}>
              <View
                style={[
                  styles.supportCountBadge,
                  (openSupportCount ?? 0) > 0 ? styles.supportCountBadgeActive : styles.supportCountBadgeZero,
                ]}
              >
                <Text style={styles.supportCountBadgeText}>
                  {openSupportCount === null ? '…' : openSupportCount > 99 ? '99+' : String(openSupportCount)}
                </Text>
              </View>
            </View>
            <Text style={styles.actionButtonText}>פניות מלקוחות</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleViewReports}>
            <Text style={styles.actionButtonText}>צפייה בדוחות</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleSystemSettings}>
            <Text style={styles.actionButtonText}>הגדרות מערכת</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>התנתקות</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminScreen;

const styles = StyleSheet.create({
  rtlText: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f5e6d3',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    color: '#64748B',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  statLabel: {
    marginTop: 6,
    fontSize: 14,
    color: '#64748B',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  actionButton: {
    position: 'relative',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  supportBadgeWrap: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  supportCountBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  supportCountBadgeZero: {
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  supportCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  activityText: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: DESTRUCTIVE_COLOR,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
});