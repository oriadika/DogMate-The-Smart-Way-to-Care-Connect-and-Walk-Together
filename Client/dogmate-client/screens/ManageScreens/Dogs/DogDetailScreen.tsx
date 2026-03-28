import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { dogAPI } from '../../../services/api';

const DogDetailScreen = ({ navigation, route }: any) => {
  const dog = route?.params?.dog;

  if (!dog) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>לא נמצאו פרטי כלב</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>חזרה</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getUsersNames = (users: string[]) => {
    if (!Array.isArray(users) || users.length === 0) return 'אין חברים';
    return users.map((user) => user || 'משתמש ללא שם').join(', ');
  };

  const handleDeleteDog = () => {
  Alert.alert(
    'מחיקת כלב',
    `האם אתה בטוח שברצונך למחוק את ${dog.name}?`,
    [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחוק',
        style: 'destructive',
        onPress: async () => {
          try {
            await dogAPI.deleteDogForever(dog.id); // adjust if your API needs userId

            Alert.alert('הצלחה', 'הכלב נמחק');

            navigation.goBack(); // go back to list
          } catch (error: any) {
            console.error(error);
            Alert.alert('שגיאה', error.message || 'מחיקה נכשלה');
          }
        },
      },
    ]
  );
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.topBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.topBackIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <View style={styles.imageWrapper}>
            {dog.profileImageUrl || dog.profileImageURL ? (
              <Image
                source={{ uri: dog.profileImageUrl || dog.profileImageURL }}
                style={styles.dogImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <FontAwesome5 name="dog" size={48} color="#8B7355" />
              </View>
            )}
          </View>

          <Text style={styles.dogName}>{dog.name}</Text>
          <Text style={styles.dogBreed}>{dog.breed}</Text>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="paw" size={20} color="#7FB069" />
            <Text style={styles.label}>גזע:</Text>
            <Text style={styles.value}>{dog.breed || 'לא ידוע'}</Text>
          </View>

          <View style={styles.row}>
            <MaterialCommunityIcons
              name={dog.gender === 'M' ? 'gender-male' : 'gender-female'}
              size={20}
              color={dog.gender === 'M' ? '#4A90E2' : '#FF69B4'}
            />
            <Text style={styles.label}>מגדר:</Text>
            <Text style={styles.value}>{dog.gender === 'M' ? 'זכר' : 'נקבה'}</Text>
          </View>

          <View style={styles.row}>
            <MaterialCommunityIcons name="calendar" size={20} color="#7FB069" />
            <Text style={styles.label}>תאריך לידה:</Text>
            <Text style={styles.value}>{dog.birthdate || 'לא ידוע'}</Text>
          </View>

          <View style={styles.rowMulti}>
            <MaterialCommunityIcons name="account-group" size={20} color="#7FB069" />
            <Text style={styles.label}>חברים:</Text>
          </View>
          <Text style={styles.valueBlock}>{getUsersNames(dog.users_related)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteDog}
        >
          <Text style={styles.deleteButtonText}>מחיקת כלב</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DogDetailScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAEFDD',
  },
  container: {
    padding: 20,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 20,
  },
  topBackButton: {
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
  topBackIcon: {
    color: '#5C4033',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageWrapper: {
    marginBottom: 16,
  },
  dogImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8DCC8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4C4A8',
  },
  dogName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  dogBreed: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  rowMulti: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'right',
  },
  value: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
    textAlign: 'right',
  },
  valueSmall: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    textAlign: 'right',
  },
  valueBlock: {
    fontSize: 15,
    color: '#334155',
    textAlign: 'right',
    marginBottom: 14,
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: '#7FB069',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomBackButton: {
    backgroundColor: '#7FB069',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bottomBackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
  backgroundColor: '#E74C3C',
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: 'center',
  marginTop: 12,
},

deleteButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
},
});