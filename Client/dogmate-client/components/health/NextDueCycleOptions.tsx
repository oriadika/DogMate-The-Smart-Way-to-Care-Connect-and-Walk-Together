import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const PRIMARY_COLOR = '#7FB069';
const TEXT_DARK = '#5C4033';
const MUTED = '#8B7355';
const BORDER_COLOR = '#E0D5C7';

type Props = {
  hasNextDueDate: boolean;
  /** True after the user explicitly cleared the next-due date (one-time). */
  isOneTime: boolean;
  onClearNextDue: () => void;
  onRestoreAuto?: () => void;
  showRestoreAuto?: boolean;
  clearLabel: string;
  oneTimeHint: string;
  disabled?: boolean;
};

/** Chip / hint row under the next-due date field — matches hub card chip styling. */
export default function NextDueCycleOptions({
  hasNextDueDate,
  isOneTime,
  onClearNextDue,
  onRestoreAuto,
  showRestoreAuto = false,
  clearLabel,
  oneTimeHint,
  disabled = false,
}: Props) {
  if (hasNextDueDate) {
    return (
      <TouchableOpacity
        style={[styles.chip, disabled && styles.chipDisabled]}
        onPress={onClearNextDue}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <Text style={styles.chipText}>{clearLabel}</Text>
      </TouchableOpacity>
    );
  }

  if (!isOneTime) {
    return null;
  }

  return (
    <View style={styles.hintRow}>
      <Text style={styles.oneTimeHint}>{oneTimeHint}</Text>
      {showRestoreAuto && onRestoreAuto ? (
        <TouchableOpacity onPress={onRestoreAuto} disabled={disabled} activeOpacity={0.85}>
          <Text style={styles.restoreLink}>חישוב אוטומטי לפי פרוטוקול</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FAEFDD',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  chipDisabled: {
    opacity: 0.55,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hintRow: {
    marginTop: 8,
    alignItems: 'flex-end',
    gap: 4,
  },
  oneTimeHint: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  restoreLink: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
