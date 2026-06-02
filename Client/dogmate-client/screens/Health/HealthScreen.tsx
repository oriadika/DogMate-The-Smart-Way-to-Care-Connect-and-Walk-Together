// screens/Health/HealthScreen.tsx
import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { OWNER_MAIN_TAB } from '../../navigation/ownerTabRoutes';
import { navigateRoot, rootNavigationRef } from '../../navigation/rootNavigationRef';

const PRIMARY_COLOR = '#7FB069';
const BG_COLOR = '#FAEFDD';
const TEXT_DARK = '#5C4033';
const BORDER_COLOR = '#E0D5C7';

/** Fallback when ref not ready yet: walk parents until a navigator lists the target route. */
function navigateToRootStackScreen(navigation: any, screenName: string, params?: Record<string, any>) {
  let nav: any = navigation;
  for (let depth = 0; depth < 10 && nav; depth++) {
    try {
      const state = nav.getState?.();
      const names: string[] | undefined = state?.routeNames;
      if (Array.isArray(names) && names.includes(screenName)) {
        nav.navigate(screenName, params);
        return;
      }
    } catch {
      /* ignore */
    }
    nav = nav.getParent?.();
  }
  navigation.navigate(screenName, params);
}

function openHealthStackScreen(navigation: any, screenName: string, params?: Record<string, any>) {
  if (rootNavigationRef.isReady()) {
    navigateRoot(screenName, params);
    return;
  }
  navigateToRootStackScreen(navigation, screenName, params);
}

type HealthMenuRowProps = {
  onPress: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
};

function HealthMenuRow({ onPress, icon, title, description }: HealthMenuRowProps) {
  return (
    <TouchableOpacity
      style={styles.featureButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.featureIconContainer}>{icon}</View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-back" size={24} color={TEXT_DARK} />
    </TouchableOpacity>
  );
}

const HealthScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12) + 100;
  const userId = route?.params?.userId;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>בריאות</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              navigation.navigate(OWNER_MAIN_TAB.Dashboard);
            }}
          >
            <Ionicons name="arrow-forward" size={28} color="#5C4033" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          <HealthMenuRow
            onPress={() => openHealthStackScreen(navigation, 'FoodInventoryHub', { userId })}
            icon={<MaterialCommunityIcons name="bone" size={40} color={PRIMARY_COLOR} />}
            title="ניהול מלאי מזון"
            description="ניהול מלאי מזון וצריכה יומית"
          />
          <HealthMenuRow
            onPress={() => openHealthStackScreen(navigation, 'VaccinationsHub', { userId })}
            icon={<MaterialCommunityIcons name="needle" size={40} color={PRIMARY_COLOR} />}
            title="החיסונים שלי"
            description="רישום חיסונים לפי כלב ותאריך"
          />
          <HealthMenuRow
            onPress={() => openHealthStackScreen(navigation, 'MedicationsHub', { userId })}
            icon={<MaterialCommunityIcons name="pill" size={40} color={PRIMARY_COLOR} />}
            title="התרופות שלי"
            description="רישום תרופות וטיפולים"
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default HealthScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  backButton: {
    padding: 5,
    width: 40,
    alignItems: 'flex-end',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  featureButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    minHeight: 88,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_COLOR,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  featureContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
    textAlign: 'right',
  },
  featureDescription: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'right',
  },
});
