// screens/HomeScreen.tsx
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';

const quickActions = [
  { label: 'Walks', color: '#FFB74D', emoji: '🐾' },
  { label: 'Reminders', color: '#FF8A65', emoji: '⏰' },
  { label: 'Documents', color: '#64B5F6', emoji: '📄' },
  { label: 'Food', color: '#FF7043', emoji: '🍖' },
  { label: 'SOS', color: '#EF5350', emoji: '🚨' },
  { label: 'Dog Matching', color: '#81C784', emoji: '🐶' },
];

const dogs = [
  {
    id: '1',
    name: 'Bella',
    image:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '2',
    name: 'Max',
    image:
      'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=400&q=80',
  },
];

const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>DM</Text>
          </View>
          <Text style={styles.topBarTitle}>DogMate</Text>
          <View style={{ flex: 1 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Greeting */}
          <Text style={styles.greeting}>Good afternoon</Text>

          {/* Quick actions grid */}
          <View style={styles.quickGrid}>
            {quickActions.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.quickCard, { backgroundColor: item.color }]}
                activeOpacity={0.85}
              >
                <Text style={styles.quickEmoji}>{item.emoji}</Text>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* My Dogs */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>My Dogs</Text>
            {/* optional "See all" */}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dogsRow}
          >
            {dogs.map((dog) => (
              <View key={dog.id} style={styles.dogCard}>
                <Image source={{ uri: dog.image }} style={styles.dogImage} />
                <Text style={styles.dogName}>{dog.name}</Text>

                <View style={styles.dogButtonsRow}>
                  <TouchableOpacity style={styles.dogButton}>
                    <Text style={styles.dogButtonText}>Start Walk</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dogButton}>
                    <Text style={styles.dogButtonText}>Add Reminder</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.dogButton, { marginTop: 6 }]}>
                  <Text style={styles.dogButtonText}>Upload Document</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Notifications */}
          <View style={styles.notificationsCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Notifications</Text>
              <Text style={styles.notificationText}>
                Time for a walk! Burn off some energy with a fun outing.
              </Text>
            </View>
            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom nav (static mock) */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navEmoji}>🏠</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navEmoji}>📅</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navEmoji}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navEmoji}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF7043',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
    marginBottom: 16,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 18,
    padding: 10,
    justifyContent: 'space-between',
  },
  quickEmoji: {
    fontSize: 22,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  dogsRow: {
    paddingVertical: 4,
  },
  dogCard: {
    width: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginRight: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dogImage: {
    width: '100%',
    height: 90,
    borderRadius: 14,
    marginBottom: 8,
  },
  dogName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111827',
  },
  dogButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dogButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  dogButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  notificationsCard: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationText: {
    marginTop: 4,
    fontSize: 13,
    color: '#4B5563',
  },
  viewButton: {
    marginLeft: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    paddingHorizontal: 40,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navEmoji: {
    fontSize: 22,
  },
});
