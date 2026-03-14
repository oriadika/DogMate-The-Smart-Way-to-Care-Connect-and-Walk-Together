import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ManageUsersScreen = ({ navigation, route }: any) => {
  const users = route?.params?.users ?? [];
  const email = route?.params?.email ?? '';

  const filteredUsers = users.filter((user: any) => user.email !== email);

  const handleUserDetails = (user: any) => {
    navigation.navigate('UserDetails', { user });    
  };

  const renderUserCard = ({ item }: any) => {
    const fullName =
      item.firstName && item.lastName
        ? `${item.firstName} ${item.lastName}`
        : 'Unnamed User';

    const type = item.type == 'AdminUser' ? 'מנהל' : 'משתמש רגיל';

    const permission = item.permissionLevel ? item.permissionLevel : '';

    return (
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.firstName?.[0]?.toUpperCase() || item.email?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.userText}>
            {fullName != 'Unnamed User' ? (
              <>
                <Text style={styles.userName}>{fullName}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
              </>
            ) : (
              <Text style={styles.userName}>{item.email}</Text>
            )}
            <Text style={styles.userType}>{type}</Text>
            {permission ? (
              <Text style={styles.userType}>{permission}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.viewDetailButton}
            onPress={() => handleUserDetails(item)}
          >
            <Text style={styles.viewDetailButtonText}>View Details</Text>
          </TouchableOpacity>
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
          <Text style={styles.title}>Manage Users</Text>
          <Text style={styles.subtitle}>
            View and manage all registered users in DogMate
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{filteredUsers.length}</Text>
          <Text style={styles.summaryLabel}>Users Found</Text>
        </View>

        <FlatList
          data={filteredUsers}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderUserCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptyText}>
                There are no other users to display right now.
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f5e6d3',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
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
  backIcon: {
    color: '#5C4033',
    fontSize: 22,
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#7a6a5a',
    lineHeight: 22,
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
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 15,
    color: '#f4f4f4',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  userCard: {
    flexDirection: 'row',
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
    marginRight: 14,
  },
  avatarText: {
    color: '#5C4033',
    fontSize: 20,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userText: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3e2d23',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#7a6a5a',
  },
  userType: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#e3d5bd',
    color: '#5C4033',
    fontSize: 12,
    fontWeight: '700',
  },
  viewDetailButton: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#588bfa',
  },
  viewDetailButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyState: {
    marginTop: 50,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#7a6a5a',
    textAlign: 'center',
    lineHeight: 22,
  },
});