import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

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

  // Create header text
  const getHeaderText = () => {
    return 'האוכל של:';
  };

  // Format days to readable format (ימים / שבועות / חודשים)
  const formatDaysToText = (days: number): string => {
    if (days < 7) {
      return `${days} ${days === 1 ? 'יום' : 'ימים'}`;
    }
    
    if (days < 30) {
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      
      if (remainingDays === 0) {
        if (weeks === 1) return 'שבוע';
        if (weeks === 2) return 'שבועיים';
        return `${weeks} שבועות`;
      }
      
      const weeksText = weeks === 1 ? 'שבוע' : weeks === 2 ? 'שבועיים' : `${weeks} שבועות`;
      const daysText = remainingDays === 1 ? 'יום' : `${remainingDays} ימים`;
      return `${weeksText} ו-${daysText}`;
    }
    
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    
    if (remainingDays === 0) {
      return months === 1 ? 'חודש' : `${months} חודשים`;
    }
    
    const monthsText = months === 1 ? 'חודש' : `${months} חודשים`;
    const daysText = remainingDays === 1 ? 'יום' : `${remainingDays} ימים`;
    return `${monthsText} ו-${daysText}`;
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
          <Text style={styles.statusLabel}>ימים עד לסיום שק המזון:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(daysRemaining) }]}>
            {daysRemaining}
          </Text>
          <Text style={styles.statusSubtext}>
            ({formatDaysToText(daysRemaining)})
          </Text>
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
