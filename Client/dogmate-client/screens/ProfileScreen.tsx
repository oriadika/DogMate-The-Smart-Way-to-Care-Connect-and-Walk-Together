// screens/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { userAPI } from '../services/api';

const mockUsers = [
  { id: '1', name: 'Sarah Cohen', role: 'Dog owner' },
  { id: '2', name: 'Adam Levi', role: 'Dog walker' },
  { id: '3', name: 'Maya Ben-David', role: 'Dog owner' },
  { id: '4', name: 'Omar Haddad', role: 'Dog walker' },
];

const ProfileScreen = ({ navigation, route }: any) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const renderContact = ({ item }: any) => (
    <View style={styles.userCard}>
      <View style={styles.avatar}>
        {item.role === 'Dog owner' ? (
          <MaterialCommunityIcons name="dog" size={20} color="#fff" />
        ) : (
          <FontAwesome5 name="walking" size={20} color="#fff" />
        )}
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userMeta}>{item.role}</Text>
      </View>

      {/* Ping button */}
      <TouchableOpacity style={styles.pingButton} onPress={() => { }}>
        <Text style={styles.pingText}>Ping</Text>
      </TouchableOpacity>
    </View>
  );

  const handleSignOut = async () => {
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
            setIsLoggingOut(true);
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
            } finally {
              setIsLoggingOut(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>

        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={mockUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* PROFILE CARD */}
            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                {route?.params?.role === 'Dog walker' ? (
                  <FontAwesome5 name="walking" size={26} color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="dog" size={28} color="#fff" />
                )}
              </View>

              <View style={styles.profileTextBlock}>
                <Text style={styles.profileName}>{route?.params?.userFirstName} {route?.params?.userLastName}</Text>
                <Text style={styles.profileRole}>{route?.params?.role}</Text>
              </View>
            </View>

            {/* Profile details */}
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>{route?.params?.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>{route?.params?.phone}</Text>
            </View>

            <Text style={styles.sectionTitle}>Contacts</Text>
          </>
        }
      />

      {/* Sign Out Button */}
      <TouchableOpacity
        style={[styles.signOutButton, isLoggingOut && styles.signOutButtonDisabled]}
        onPress={handleSignOut}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <MaterialCommunityIcons name="logout" size={20} color="#fff" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 100,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF7043',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileTextBlock: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  profileRole: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },

  sectionTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF7043',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  userMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  pingButton: {
    backgroundColor: '#2F80ED',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },

  pingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  signOutButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  signOutButtonDisabled: {
    opacity: 0.6,
  },

  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
