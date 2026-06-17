import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MUTED = '#8B7355';
const TEXT_DARK = '#5C4033';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  description: string;
  expanded: boolean;
  onToggle: () => void;
};

export function animateDescriptionToggle(): void {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export default function ExpandableDescription({ description, expanded, onToggle }: Props) {
  const trimmed = description.trim();
  if (!trimmed) return null;

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.85}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
    >
      <View style={styles.row}>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={MUTED}
          style={styles.toggleIcon}
        />
        <View style={styles.textColumn}>
          <Text style={styles.label}>תיאור:</Text>
          <Text
            style={styles.body}
            numberOfLines={expanded ? undefined : 1}
            ellipsizeMode="tail"
          >
            {trimmed}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    marginTop: 6,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 4,
  },
  toggleIcon: {
    marginTop: 3,
  },
  textColumn: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
    lineHeight: 19,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 13,
    color: TEXT_DARK,
    lineHeight: 19,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
  },
});
