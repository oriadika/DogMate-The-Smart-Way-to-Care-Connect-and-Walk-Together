import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground
} from 'react-native';

const StartScreen: React.FC = ({ navigation }: any) => {
  const handleLoginPress = () => {
     navigation.navigate('Login');
  };

  const handleSignUpPress = () => {
    navigation.navigate('SignUp');
  };

  return (
    <ImageBackground
      source={require('../assets/images/dogs_image.jpeg')} // your background image
      style={styles.background}
      imageStyle={{ opacity: 0.7 }}
    >
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top section: Logo + App Name + Tagline */}
        <View style={styles.header}>

          <Text style={styles.appName}>DogMate</Text>
          <Text style={styles.tagline}>
            All-in-one smart companion for dog owners.
          </Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          DogMate centralizes your dog&apos;s health records, daily routines,
          social walks, dog walkers, food tracking, and emergency contacts into
          one simple, intuitive mobile app.
        </Text>

        {/* Feature highlights */}
        <View style={styles.featuresContainer}>
          <FeatureChip text="Digital Health Vault" />
          <FeatureChip text="Smart Reminders & Routine" />
          <FeatureChip text="Social Walks & Dog Matching" />
          <FeatureChip text="Dog Walker Directory" />
          <FeatureChip text="Food & Supplies Tracking" />
          <FeatureChip text="SOS & Emergency Clinics" />
        </View>

        {/* Spacer to push buttons down */}
        <View style={{ flex: 1 }} />

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLoginPress}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignUpPress}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
    </ImageBackground>
  );
};

type FeatureChipProps = {
  text: string;
};

const FeatureChip: React.FC<FeatureChipProps> = ({ text }) => (
  <View style={styles.featureChip}>
    <View style={styles.featureDot} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

export default StartScreen;

const PRIMARY_COLOR = '#2F80ED'; // You can change to your brand blue
const ACCENT_COLOR = '#F2994A';

const styles = StyleSheet.create({
    background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    },
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    color: '#B3C0D4',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#E4ECFA',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#152235',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT_COLOR,
    marginRight: 10,
  },
  featureText: {
    color: '#D8E2F3',
    fontSize: 14,
  },
  buttonsContainer: {
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
