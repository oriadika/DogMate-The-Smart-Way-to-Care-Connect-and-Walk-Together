import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import {
  getCalendarDaysCountdown,
  getCountdownPrimaryText,
} from '../utils/daysDisplay';

type DogInfo = {
  id: string;
  name: string;
  imageUrl?: string;
};

type FoodInventoryCardProps = {
  dogs: DogInfo[]; // Array of dogs
  daysRemaining: number;
  daysUntilReminder?: number | null;
  notificationEnabled?: boolean;
  onEditPress: () => void;
  onDeletePress: () => void;
  onBuyNewBag: () => void;
};

const FoodInventoryCard = ({
  dogs,
  daysRemaining,
  daysUntilReminder = null,
  notificationEnabled = false,
  onEditPress,
  onDeletePress,
  onBuyNewBag,
}: FoodInventoryCardProps) => {
  
  const getStatusColor = (days: number) => {
    if (days > 30) return '#28C76F'; // Green - more than 30 days
    if (days > 10) return '#FF9F43'; // Orange - 10-30 days
    return '#EA5455'; // Red - less than 10 days
  };

  const showReminderCountdown =
    notificationEnabled && daysUntilReminder != null;
  const stockCountdown = getCalendarDaysCountdown(daysRemaining, 'סיום השק');

  // Create header text
  const getHeaderText = () => {
    return 'האוכל של:';
  };

  return (
    <View style={styles.cardContainer}>
      <Text style={styles.headerText}>{getHeaderText()}</Text>
      
      <View style={styles.contentRow}>
        <View style={styles.dogsContainer}>
          <View style={styles.dogsImagesContainer}>
            {dogs.map((dog, index) => (
              <View key={dog.id} style={styles.dogItemContainer}>
                {dog.imageUrl ? (
                  <Image source={{ uri: dog.imageUrl }} style={styles.dogImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <MaterialCommunityIcons name="dog" size={30} color="#666" />
                  </View>
                )}
                <Text style={styles.dogName}>{dog.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>
            {stockCountdown?.label ?? 'ימים עד לסיום שק המזון:'}
          </Text>
          <Text
            style={[
              stockCountdown?.displayText ? styles.statusMessage : styles.statusValue,
              { color: stockCountdown?.urgencyColor ?? getStatusColor(daysRemaining) },
            ]}
          >
            {stockCountdown ? getCountdownPrimaryText(stockCountdown) : daysRemaining}
          </Text>
          {stockCountdown?.subtext ? (
            <Text style={styles.statusSubtext}>{stockCountdown.subtext}</Text>
          ) : null}
          {showReminderCountdown ? (
            <Text style={styles.reminderDaysHint}>
              {daysUntilReminder} {daysUntilReminder === 1 ? 'יום' : 'ימים'} עד לתזכורת
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={onBuyNewBag}>
          <MaterialCommunityIcons name="cart-plus" size={18} color="#7FB069" />
          <Text style={[styles.actionText, { color: '#7FB069' }]}>קניתי שק חדש</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.actionButton} onPress={onEditPress}>
          <MaterialCommunityIcons name="pencil-outline" size={18} color="#00CFE8" />
          <Text style={[styles.actionText, { color: '#00CFE8' }]}>עריכה</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.actionButton} onPress={onDeletePress}>
          <Ionicons name="trash-outline" size={18} color="#EA5455" />
          <Text style={[styles.actionText, { color: '#EA5455' }]}>מחק</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'right',
  },
  contentRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dogsContainer: {
    flex: 1,
    marginRight: 10,
  },
  dogsImagesContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 10,
  },
  dogItemContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 5,
  },
  dogImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: 10,
  },
  placeholderImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  dogName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 3,
  },
  reminderDaysHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    paddingTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 5,
  },
  actionText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    backgroundColor: '#F0F2F5',
  },
});

export default FoodInventoryCard;
