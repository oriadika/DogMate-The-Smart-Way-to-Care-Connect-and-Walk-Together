import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { dogAPI } from "../../../services/api";

const PRIMARY_COLOR = "#7FB069";

const ManageDogScreens = ({ navigation, route }: any) => {
  const [dogs, setDogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const loadDogs = async () => {
    try {
      setLoading(true);
      const res = await dogAPI.getAllDogs();
      setDogs(res.dogs || []);
    } catch (error) {
      console.warn("Failed to fetch dogs", error);
      setDogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Array.isArray(route?.params?.dogs)) {
      setDogs(route.params.dogs);
    }
  }, [route?.params?.dogs]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      try {
        if (searchText.trim().length === 0) {
          const res = await dogAPI.getAllDogs();
          setDogs(res.dogs || []);
          return;
        }

        setLoading(true);
        const res = await dogAPI.searchDogs(searchText);
        setDogs(res.dogs || []);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [searchText]);

  useFocusEffect(
    useCallback(() => {
      loadDogs();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDogs();
    setRefreshing(false);
  };

  const getUsersNames = (users: string[]) => {
    if (!Array.isArray(users)) return "Couldn't fetch users";
    return users.map((user) => user || "משתמש ללא שם").join(", ");
  };

  const renderDog = ({ item }: any) => (
    <View style={styles.dogCard}>
      <View style={styles.dogInfo}>
        <Text style={styles.dogName}>{item.name}</Text>
        <Text style={styles.dogText}>גזע: {item.breed}</Text>
        <Text style={styles.dogText}>
          מגדר: {item.gender === "M" ? "זכר" : "נקבה"}
        </Text>
        <Text style={styles.dogText}>תאריך לידה: {item.birthdate}</Text>
        <Text style={styles.dogText}>
          {item.users_related?.length > 0
            ? `חברים: ${getUsersNames(item.users_related)}`
            : "אין חברים"}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.viewDetailButton}
        onPress={() => navigation.navigate("DogDetail", { dog: item })}
      >
        <Text style={styles.viewDetailButtonText}>צפייה בפרטים</Text>
      </TouchableOpacity>
    </View>
  );

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
          <Text style={styles.title}>ניהול כלבים</Text>
          <Text style={styles.subtitle}>
            צפייה וניהול של כל הכלבים הרשומים ב־DogMate
          </Text>

          <TextInput
            placeholder="חפש שם כלב/גזע"
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{dogs.length}</Text>
          <Text style={styles.summaryLabel}>כלבים נמצאו</Text>
        </View>

        {loading && dogs.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          </View>
        ) : (
          <FlatList
            data={dogs}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            renderItem={renderDog}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>לא נמצאו כלבים</Text>
                <Text style={styles.emptyText}>
                  כרגע אין כלבים להצגה או שאין התאמה לחיפוש.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default ManageDogScreens;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5e6d3",
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#faf0e6",
    borderWidth: 1,
    borderColor: "#e0d5c7",
    marginBottom: 18,
  },
  backIcon: {
    color: "#5C4033",
    fontSize: 22,
    fontWeight: "bold",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#5C4033",
    marginBottom: 6,
    textAlign: "right",
    writingDirection: "rtl",
  },
  subtitle: {
    fontSize: 15,
    color: "#7a6a5a",
    lineHeight: 22,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    textAlign: "right",
  },
  summaryCard: {
    backgroundColor: "#7FB069",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  summaryNumber: {
    fontSize: 30,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "right",
    writingDirection: "rtl",
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 15,
    color: "#f4f4f4",
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
  },
  listContent: {
    paddingBottom: 24,
  },
  dogCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#fffaf5",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#eadfce",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dogInfo: {
    flex: 1,
    alignItems: "center",
  },
  dogName: {
    fontSize: 19,
    fontWeight: "700",
    color: "#3e2d23",
    marginBottom: 4,
    textAlign: "center",
    writingDirection: "rtl",
  },
  dogText: {
    fontSize: 14,
    color: "#7a6a5a",
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: 2,
  },
  viewDetailButton: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  viewDetailButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    marginTop: 50,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#5C4033",
    marginBottom: 8,
    textAlign: "right",
    writingDirection: "rtl",
  },
  emptyText: {
    fontSize: 15,
    color: "#7a6a5a",
    textAlign: "right",
    lineHeight: 22,
    writingDirection: "rtl",
  },
});