import React from 'react';
import { View, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import OwnerWalkersScreen from '../screens/OwnerWalkersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HealthScreen from '../screens/Health/HealthScreen';
import { OWNER_MAIN_TAB } from './ownerTabRoutes';

const Tab = createBottomTabNavigator();

const BRAND_GREEN = '#7FB069';
const HEALTH_TAB_HEART = '#D67A8C';
const WALKERS_TAB_DOG = '#7A94D6';
const WALKS_TAB_WALK = '#C47E5A';
/** Nudge only the outer tabs toward the center (logical start/end; RTL-safe). */
const TAB_EDGE_INWARD = 14;

type OwnerStackParams = {
  userId?: string;
  email?: string;
  userFirstName?: string;
  userLastName?: string;
  userRole?: string;
  phoneNumber?: string;
  refresh?: boolean;
};

/** Stack may receive `{ screen, params }` from nested navigation; merge into one object for tabs. */
function flattenOwnerRouteParams(params: Record<string, unknown> | undefined): OwnerStackParams {
  if (!params || typeof params !== 'object') return {};
  const { screen: _s, params: nested, ...rest } = params as {
    screen?: string;
    params?: Record<string, unknown>;
    [key: string]: unknown;
  };
  const merged: OwnerStackParams = { ...(rest as OwnerStackParams) };
  if (nested && typeof nested === 'object') {
    Object.assign(merged, flattenOwnerRouteParams(nested as Record<string, unknown>));
  }
  return merged;
}

export const OwnerMainTabParamContext = React.createContext<OwnerStackParams>({});

function withMergedOwnerParams<P extends { route?: any }>(Component: React.ComponentType<P>) {
  return function MergedOwnerTabScreen(props: P) {
    const owner = React.useContext(OwnerMainTabParamContext);
    const mergedParams = { ...owner, ...(props.route?.params ?? {}) };
    return <Component {...props} route={{ ...props.route, params: mergedParams }} />;
  };
}

const MergedHome = withMergedOwnerParams(HomeScreen);
const MergedWalkers = withMergedOwnerParams(OwnerWalkersScreen);
const MergedWalks = withMergedOwnerParams(ProfileScreen);
const MergedHealth = withMergedOwnerParams(HealthScreen);

function EmergencyPlaceholder() {
  return <View style={{ flex: 1, backgroundColor: '#FAEFDD' }} />;
}

const CENTER_SIZE = 58;
const CENTER_RADIUS = CENTER_SIZE / 2;

function RaisedHomeTabButton({ onPress, accessibilityState }: BottomTabBarButtonProps) {
  const focused = accessibilityState?.selected;
  return (
    <View style={styles.centerTabSlot} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="בית"
        accessibilityState={accessibilityState}
        style={({ pressed }) => [
          styles.centerFab,
          pressed && { opacity: 0.9 },
          focused && styles.centerFabFocused,
        ]}
      >
        <Ionicons name="home" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export default function OwnerMainTabNavigator({ route }: { route: { params?: OwnerStackParams } }) {
  const insets = useSafeAreaInsets();
  const ownerParams = React.useMemo(() => flattenOwnerRouteParams(route.params as Record<string, unknown>), [route.params]);

  /** Extra dip so the white fill clearly reaches below icons/labels (avoids the bar “ending” too high). */
  const tabBarBottomExtra = 0;
  const tabBarBottomPad = Math.max(insets.bottom, 10) + tabBarBottomExtra;
  const tabBarTopPad = 4;

  /** Solid fill behind the tab bar (avoids gaps above the home indicator / safe area). */
  const tabBarSolidBackground = React.useCallback(
    () => <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]} />,
    []
  );

  return (
    <OwnerMainTabParamContext.Provider value={ownerParams}>
      <Tab.Navigator
        initialRouteName={OWNER_MAIN_TAB.Dashboard}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: BRAND_GREEN,
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarShowLabel: true,
          tabBarLabelPosition: 'below-icon',
          tabBarItemStyle: styles.tabBarItem,
          tabBarBackground: tabBarSolidBackground,
          tabBarStyle: {
            paddingTop: tabBarTopPad,
            height: 56 + tabBarTopPad + tabBarBottomPad,
            paddingBottom: tabBarBottomPad,
            borderWidth: 0,
            borderTopWidth: 0,
            borderBottomWidth: 0,
            borderLeftWidth: 0,
            borderRightWidth: 0,
            borderColor: 'transparent',
            elevation: 0,
            shadowOpacity: 0,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 0,
            shadowColor: 'transparent',
            backgroundColor: 'transparent',
            overflow: 'visible',
          },
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tab.Screen
          name={OWNER_MAIN_TAB.Emergency}
          component={EmergencyPlaceholder}
          options={{
            title: 'עזרה',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="alarm-light" size={24} color="#E53935" />,
            tabBarActiveTintColor: '#E53935',
            tabBarItemStyle: [styles.tabBarItem, { marginStart: TAB_EDGE_INWARD }],
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              const rootNav = navigation.getParent();
              if (!rootNav) return;
              Alert.alert(
                'מצב חירום',
                'האם הכלב שלך זקוק לעזרה דחופה?',
                [
                  { text: 'ביטול', style: 'cancel' },
                  {
                    text: 'עזרה',
                    style: 'destructive',
                    onPress: () => rootNav.navigate('Emergency'),
                  },
                ],
                { cancelable: true }
              );
            },
          })}
        />
        <Tab.Screen
          name={OWNER_MAIN_TAB.Health}
          component={MergedHealth}
          options={{
            title: 'בריאות',
            tabBarIcon: () => <Ionicons name="heart" size={26} color={HEALTH_TAB_HEART} />,
          }}
        />
        <Tab.Screen
          name={OWNER_MAIN_TAB.Dashboard}
          component={MergedHome}
          options={{
            title: 'בית',
            tabBarLabel: () => null,
            tabBarIcon: () => null,
            tabBarButton: (props) => <RaisedHomeTabButton {...props} />,
          }}
        />
        <Tab.Screen
          name={OWNER_MAIN_TAB.Walkers}
          component={MergedWalkers}
          options={{
            title: 'דוגווקרים',
            tabBarIcon: () => <FontAwesome5 name="dog" size={22} color={WALKERS_TAB_DOG} />,
          }}
        />
        <Tab.Screen
          name={OWNER_MAIN_TAB.Walks}
          component={MergedWalks}
          options={{
            title: 'טיולים',
            tabBarIcon: () => <MaterialCommunityIcons name="walk" size={26} color={WALKS_TAB_WALK} />,
            tabBarItemStyle: [styles.tabBarItem, { marginEnd: TAB_EDGE_INWARD }],
          }}
        />
      </Tab.Navigator>
    </OwnerMainTabParamContext.Provider>
  );
}

const styles = StyleSheet.create({
  tabBarItem: {
    flex: 1,
    paddingVertical: 4,
  },
  tabBarLabel: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  centerTabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    zIndex: 100,
  },
  centerFab: {
    position: 'absolute',
    /** Roughly half the circle sits above the tab bar row (no top hairline). */
    top: -CENTER_RADIUS - 6,
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_RADIUS,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: {
        elevation: 14,
      },
      default: {},
    }),
  },
  centerFabFocused: {
    ...Platform.select({
      ios: {
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 18,
      },
      default: {},
    }),
  },
});
