import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image
} from 'react-native';

const StartScreen: React.FC = ({ navigation }: any) => {
  const handleLoginPress = () => {
     navigation.navigate('Login');
  };

  const handleSignUpPress = () => {
    navigation.navigate('SignUp');
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/LandingPageDogMate.jpg')} 
        style={styles.image}
        resizeMode="cover"
      />
      
      {/* Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleLoginPress}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>התחברות</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSignUpPress}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>הרשמה</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default StartScreen;

const PRIMARY_COLOR = '#4CAF50'; // Green color for login button

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
  },
  primaryButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Rubik',
  },
  secondaryButton: {
    backgroundColor: '#e4bc8e',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Rubik',
  },
});
