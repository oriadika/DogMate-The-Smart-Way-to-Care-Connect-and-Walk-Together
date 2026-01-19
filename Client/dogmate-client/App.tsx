// App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import StartScreen from './screens/StartScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ProfileScreen from './screens/ProfileScreen';
import DogProfileScreen from './screens/DogProfileScreen';
import AddDogScreen from './screens/AddDogScreen';
import SettingsScreen from './screens/SettingsScreen';
import FoodIntakeScreen from './screens/Health/FoodIntakeScreen';
import AddReminderScreen from './screens/AddReminderScreen';
import HealthScreen from './screens/Health/HealthScreen';
import FoodInventoryHubScreen from './screens/Health/FoodInventoryHubScreen';
import { setupNotificationListeners, requestNotificationPermissions } from './services/notifications';
import SOSScreen from './screens/SOSScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialize notifications
    const initializeNotifications = async () => {
      await requestNotificationPermissions();
    };

    initializeNotifications();

    // Set up notification listeners
    const cleanup = setupNotificationListeners();

    // Cleanup on unmount
    return cleanup;
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Start"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Start" component={StartScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="DogProfile" component={DogProfileScreen} />
        <Stack.Screen name="AddDog" component={AddDogScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Health" component={HealthScreen} />
        <Stack.Screen name="FoodInventoryHub" component={FoodInventoryHubScreen} />
        <Stack.Screen name="FoodIntake" component={FoodIntakeScreen} />
        <Stack.Screen name="AddReminder" component={AddReminderScreen} />
        <Stack.Screen name="Emergency" component={SOSScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
