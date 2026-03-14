import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { userAPI } from '../services/api';

const AdminScreen = ({navigation, route}: any) => {
  const adminName = 'Admin';

  const handleManageUsers = () => {
    console.log('Navigate to Manage Users');
  };

  const handleManageDogs = () => {
    console.log('Navigate to Manage Dogs');
  };

  const handleViewReports = () => {
    console.log('Navigate to Reports');
  };

  const handleSystemSettings = () => {
    console.log('Navigate to Settings');
  };

  const handleLogout = async () => {
        Alert.alert(
          'Sign Out',
          'Are you sure you want to sign out?',
          [
            {
              text: 'Cancel',
              onPress: () => { },
              style: 'cancel',
            },
            {
              text: 'Sign Out',
              onPress: async () => {
                try {
                  // Call logout API with userId and email
                  await userAPI.logout(route?.params?.userId || '', route?.params?.email || '');
    
                  // Clear user data and navigate back to Start
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
          ]
        );
      
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, {adminName}</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>128</Text>
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

        {/* Quick Actions */}
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

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          <View style={styles.activityCard}>
            <Text style={styles.activityText}>• New user registered: omry@example.com</Text>
            <Text style={styles.activityText}>• Dog profile added: Rocky</Text>
            <Text style={styles.activityText}>• Report submitted by user #204</Text>
            <Text style={styles.activityText}>• Dog walker profile approved</Text>
          </View>
        </View>

        {/* Management Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Management Summary</Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Users</Text>
            <Text style={styles.summaryText}>
              View all users, inspect profiles, block suspicious accounts, and manage user roles.
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Dogs</Text>
            <Text style={styles.summaryText}>
              Review dog profiles, remove invalid data, and monitor dog-related activity.
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Reports</Text>
            <Text style={styles.summaryText}>
              Track submitted reports, review incidents, and respond to user complaints.
            </Text>
          </View>
        </View>

        {/* Logout */}
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