import React, { useEffect, useState } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";

const ManageDogScreens = ({navigation, route}: any) => {
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (route?.params?.dogs) {
        setDogs(route.params.dogs);
    }
    setLoading(false);
    }, [route?.params?.dogs]);

  const getUsersNames = (users: string[]) => {
    if (!Array.isArray(users)) return "Couldn't fetch users";
    return users.map((user) => user || 'משתמש ללא שם').join(', ');
  }
  const renderDog = ({ item }: any) => (
    <View style={styles.card}>
        <View style={styles.dogInfo}>
      <Text style={styles.name}>{item.name}</Text>
    
      <Text style={styles.text}>גזע: {item.breed}</Text>
      <Text style={styles.text}>מגדר: {item.gender == 'M' ? 'זכר' : 'נקבה'}</Text>
      <Text style={styles.text}>
        תאריך לידה: {item.birthdate}
      </Text>
      <Text style={styles.text}>{item.users_related.length > 0 ? `חברים: ${getUsersNames(item.users_related)}` : 'אין חברים'}</Text>
      </View>
       <TouchableOpacity
            style={styles.viewDetailButton}
            onPress={() => navigation.navigate('DogDetail', { dog: item })}
            >
            <Text style={styles.viewDetailButtonText}>צפייה בפרטים</Text>
        </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
        <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
      <Text style={styles.title}>All Dogs</Text>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={dogs}
          keyExtractor={(item) => item.id}
          renderItem={renderDog}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
};

export default ManageDogScreens;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAEFDD",
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#5C4033",
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 12,

    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    },
    viewDetailButton: {
        marginRight: 12, 
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: '#7FB069',
    },
    viewDetailButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
    textAlign: 'right',
  },
  text: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 2,
    textAlign: 'right',
  },
  dogInfo: {
    flex: 1,
    alignItems: 'flex-end',
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
    marginLeft: 12,
  },
  backIcon: { color: '#5C4033', fontSize: 22, fontWeight: 'bold' }
});