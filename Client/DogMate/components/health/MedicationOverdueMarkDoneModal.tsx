import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { formatMarkDoneChoiceLabel } from '../../utils/healthMarkDone';

const PRIMARY_COLOR = '#7FB069';
const TEXT_DARK = '#5C4033';
const MUTED = '#8B7355';
const BORDER_COLOR = '#E0D5C7';
const CARD_BG = '#faf0e6';

type Props = {
  visible: boolean;
  plannedDue: Date | null;
  onSelectPlanned: () => void;
  onSelectNow: () => void;
  onClose: () => void;
  busy?: boolean;
};

export default function MedicationOverdueMarkDoneModal({
  visible,
  plannedDue,
  onSelectPlanned,
  onSelectNow,
  onClose,
  busy = false,
}: Props) {
  const now = new Date();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>מתי ניתנה התרופה?</Text>
          <Text style={styles.subtitle}>המנה המתוכננת כבר עברה. בחרו את מועד המתן בפועל.</Text>

          {plannedDue ? (
            <TouchableOpacity
              style={[styles.choiceBtn, busy && styles.choiceBtnDisabled]}
              onPress={onSelectPlanned}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={styles.choiceBtnText}>במועד המקורי</Text>
              <Text style={styles.choiceBtnMeta}>({formatMarkDoneChoiceLabel(plannedDue, now)})</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.choiceBtn, busy && styles.choiceBtnDisabled]}
            onPress={onSelectNow}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={styles.choiceBtnText}>עכשיו</Text>
            <Text style={styles.choiceBtnMeta}>({formatMarkDoneChoiceLabel(now, now)})</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={busy} activeOpacity={0.85}>
            <Text style={styles.cancelBtnText}>ביטול</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
    marginBottom: 8,
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
    writingDirection: 'rtl',
  },
  choiceBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  choiceBtnDisabled: {
    opacity: 0.6,
  },
  choiceBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    writingDirection: 'rtl',
  },
  choiceBtnMeta: {
    marginTop: 4,
    fontSize: 13,
    color: MUTED,
    writingDirection: 'rtl',
  },
  cancelBtn: {
    marginTop: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: MUTED,
    writingDirection: 'rtl',
  },
});
