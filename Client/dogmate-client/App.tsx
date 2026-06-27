import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { UsersProvider } from './contexts/UsersContext';
import MessageDialogHost from './components/MessageDialogHost';
import AppToastHost from './components/AppToastHost';
import SystemErrorModalHost from './components/SystemErrorModalHost';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import StartScreen from './screens/StartScreen';
import SignUpScreen from './screens/SignUpScreen';
import VerifyEmailScreen from './screens/VerifyEmailScreen';
import OwnerMainTabNavigator from './navigation/OwnerMainTabNavigator';
import WalkerHomeScreen from './screens/WalkerHomeScreen';
import WalkerProfessionalProfileScreen from './screens/WalkerProfessionalProfileScreen';
import WalkerReviewsScreen from './screens/WalkerReviewsScreen';
import WalkerSchedulePlaceholderScreen from './screens/WalkerSchedulePlaceholderScreen';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import DogProfileScreen from './screens/DogProfileScreen';
import AddDogScreen from './screens/AddDogScreen';
import EditDogScreen from './screens/EditDogScreen';
import SettingsScreen from './screens/SettingsScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import TermsPrivacyScreen from './screens/TermsPrivacyScreen';
import SupportScreen from './screens/SupportScreen';
import FoodIntakeScreen from './screens/Health/FoodIntakeScreen';
import AddReminderScreen from './screens/AddReminderScreen';
import FoodInventoryHubScreen from './screens/Health/FoodInventoryHubScreen';
import VaccinationsHubScreen from './screens/Health/VaccinationsHubScreen';
import VaccinationFormScreen from './screens/Health/VaccinationFormScreen';
import MedicationsHubScreen from './screens/Health/MedicationsHubScreen';
import MedicationFormScreen from './screens/Health/MedicationFormScreen';
import { setupNotificationListeners, requestNotificationPermissions } from './services/notifications';
import SOSScreen from './screens/SOSScreen';
import AdminScreen from './screens/AdminScreen';
import AdminSupportRequestsScreen from './screens/AdminSupportRequestsScreen';
import ManageUsersScreen from './screens/ManageScreens/Users/ManageUsersScreen';
import UserDetailsScreen from './screens/ManageScreens/Users/UserDetailsScreen';
import ManageDogScreens from './screens/ManageScreens/Dogs/ManageDogScreens';
import DogDetailScreen from './screens/ManageScreens/Dogs/DogDetailScreen';
import { rootNavigationRef } from './navigation/rootNavigationRef';
import { clearAuthToken as clearApiAuthToken, restoreAuthToken as restoreApiAuthToken } from './services/api';
import { clearAuthToken as clearDogmateAuthToken } from './services/dogmateApi';
import { clearOwnerSession, setOwnerSession } from './utils/ownerSession';
import {
  clearPersistedSession,
  getPersistedSession,
  getSavedAppVersion,
  setSavedAppVersion,
  shouldForceReauth,
} from './utils/appSession';
import { clearLoggedUsersCache } from './utils/walkersDataCache';
import { userAPI } from './services/dogmateApi';
import { runOwnerPrefetch } from './utils/ownerPrefetchCoordinator';
import { setAppInitializing } from './utils/appInitContext';
import { setCurrentScreenName } from './utils/currentScreenContext';
import {
  checkServerConnectivity,
  flushPendingErrorReportsSilently,
  syncPendingErrorReportsHintFromStorage,
} from './utils/errorReportSubmission';
import { EXPO_INTERNAL_LOGBOX_IGNORE_PATTERNS } from './utils/expoInternalWarningFilter';

LogBox.ignoreLogs(EXPO_INTERNAL_LOGBOX_IGNORE_PATTERNS);

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      setAppInitializing(true);
      const currentVersion = Constants.expoConfig?.version ?? '1.0.11';
      const buildNumberRaw = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode;
      const currentBuildNumber = Number(buildNumberRaw);
      const previousVersion = await getSavedAppVersion();
      const isDevMode = __DEV__;

      try {
        const persistedSession = await getPersistedSession();
        let sessionToRestore = persistedSession;

        if (!isDevMode && shouldForceReauth(previousVersion, currentVersion)) {
          try {
            await userAPI.logoutOnUpdate(
              currentVersion,
              Number.isNaN(currentBuildNumber) ? undefined : currentBuildNumber
            );
          } catch (error) {
            console.warn('Version-based logout-on-update failed:', error);
          } finally {
            clearApiAuthToken();
            clearDogmateAuthToken();
            clearOwnerSession();
            await clearPersistedSession();
            await clearLoggedUsersCache();
            sessionToRestore = null;
          }
        }

        if (isDevMode) {
          try {
            if (persistedSession?.userId) {
              await userAPI.logout(persistedSession.userId, persistedSession.email);
            }
          } catch (error) {
            console.warn('Dev-mode logout cleanup failed:', error);
          }

          clearApiAuthToken();
          clearDogmateAuthToken();
          clearOwnerSession();
          await clearPersistedSession();
          await clearLoggedUsersCache();
        } else {
          await restoreApiAuthToken();
          await userAPI.restoreAuthToken();
        }

        if (!isDevMode && sessionToRestore?.userId) {
          setOwnerSession(sessionToRestore);
        }

        if (!isDevMode && sessionToRestore?.userId && sessionToRestore.userRole) {
          const routeName = sessionToRestore.userRole === 'walker' ? 'WalkerHome' : 'Home';
          if (sessionToRestore.userRole !== 'walker') {
            void runOwnerPrefetch(
              sessionToRestore.userId,
              sessionToRestore.userFirstName,
              sessionToRestore.userLastName
            );
          }
          setTimeout(() => {
            rootNavigationRef.current?.reset({
              index: 0,
              routes: [{ name: routeName, params: sessionToRestore }],
            });
          }, 0);
        }

        await setSavedAppVersion(currentVersion);
        await requestNotificationPermissions();

        if (!isDevMode) {
          try {
            await syncPendingErrorReportsHintFromStorage();
            const online = await checkServerConnectivity();
            if (online) {
              await flushPendingErrorReportsSilently();
            }
          } catch (error) {
            console.warn('Background error-report sync skipped:', error);
          }
        }
      } finally {
        setAppInitializing(false);
      }
    };

    void initializeApp();

    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  return (
    <SafeAreaProvider>
      <GlobalErrorBoundary>
        <UsersProvider>
          <MessageDialogHost />
          <SystemErrorModalHost />
          <AppToastHost />
          <NavigationContainer
            ref={rootNavigationRef}
            onStateChange={() => {
              const route = rootNavigationRef.getCurrentRoute();
              setCurrentScreenName(route?.name);
            }}
          >
          <Stack.Navigator initialRouteName="Start" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Start" component={StartScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Home" component={OwnerMainTabNavigator} />
          <Stack.Screen name="WalkerHome" component={WalkerHomeScreen} />
          <Stack.Screen name="WalkerProfessionalProfile" component={WalkerProfessionalProfileScreen} />
          <Stack.Screen name="WalkerReviews" component={WalkerReviewsScreen} />
          <Stack.Screen name="WalkerSchedulePlaceholder" component={WalkerSchedulePlaceholderScreen} />
          <Stack.Screen name="DogProfile" component={DogProfileScreen} />
          <Stack.Screen name="AddDog" component={AddDogScreen} />
          <Stack.Screen name="EditDog" component={EditDogScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="FoodInventoryHub" component={FoodInventoryHubScreen} />
          <Stack.Screen name="VaccinationsHub" component={VaccinationsHubScreen} />
          <Stack.Screen name="VaccinationForm" component={VaccinationFormScreen} />
          <Stack.Screen name="MedicationsHub" component={MedicationsHubScreen} />
          <Stack.Screen name="MedicationForm" component={MedicationFormScreen} />
          <Stack.Screen name="FoodIntake" component={FoodIntakeScreen} />
          <Stack.Screen name="AddReminder" component={AddReminderScreen} />
          <Stack.Screen name="Emergency" component={SOSScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="AdminSupportRequests" component={AdminSupportRequestsScreen} />
          <Stack.Screen name="AdminManageUsers" component={ManageUsersScreen} />
          <Stack.Screen name="UserDetails" component={UserDetailsScreen} />
          <Stack.Screen name="AdminManageDogs" component={ManageDogScreens} />
          <Stack.Screen name="DogDetail" component={DogDetailScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </UsersProvider>
      </GlobalErrorBoundary>
    </SafeAreaProvider>
  );
}