import React, { useEffect, useState } from 'react';
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
import { userAPI } from '../services/api';
import { useUsers } from '../contexts/UsersContext';

const AdminScreen = ({ navigation, route }: any) => {
  const { users, setUsers } = useUsers();
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);

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

    fetchUsers();
  }, [setUsers]);

  const handleManageUsers = () => {
    navigation.navigate('AdminManageUsers', { users, email: route.params.email });
  };

  const handleManageDogs = () => {
    alert('Manage Dogs feature is not implemented yet');
  };

  const handleViewReports = () => {
    alert('View Reports feature is not implemented yet');
  };

  const handleSystemSettings = () => {
    alert('System Settings feature is not implemented yet');
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Log Out',
        onPress: async () => {
          try {
            await userAPI.logout(route?.params?.userId || '', route?.params?.email || '');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Start' }],
            });
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to sign out');
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
          <Text style={{ marginTop: 12 }}>Loading admin dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, Admin</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{users.length}</Text>
              <Text style={styles.statLabel}>Users</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>84</Text>
              <Text style={styles.statLabel}>Dogs</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>16</Text>
              <Text style={styles.statLabel}>Walkers</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Reports</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleManageUsers}>
            <Text style={styles.actionButtonText}>Manage Users</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleManageDogs}>
            <Text style={styles.actionButtonText}>Manage Dogs</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleViewReports}>
            <Text style={styles.actionButtonText}>View Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleSystemSettings}>
            <Text style={styles.actionButtonText}>System Settings</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminScreen;

const styles = StyleSheet.create({
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
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    color: '#64748B',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
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
  },
  statLabel: {
    marginTop: 6,
    fontSize: 14,
    color: '#64748B',
  },
  actionButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
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
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
});