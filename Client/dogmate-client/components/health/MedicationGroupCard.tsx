import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MedicationRow } from '../../services/dogmateApi';
import type { MedicationGroup } from '../../utils/medicationGroups';
import { getLatestMedicationRecord } from '../../utils/medicationGroups';
import {
  getCountdownPrimaryText,
  getHealthHubCountdown,
} from '../../utils/daysDisplay';
import { formatTimeHe } from '../../utils/healthReminderSettings';

const PRIMARY_COLOR = '#7FB069';
const TEXT_DARK = '#5C4033';
const BORDER_COLOR = '#E0D5C7';
const CARD_BG = '#faf0e6';
const MUTED = '#8B7355';

type Props = {
  group: MedicationGroup;
  expanded: boolean;
  onToggleHistory: () => void;
  onEdit: (item: MedicationRow) => void;
  onDelete: (item: MedicationRow) => void;
  onDeleteGroup: (group: MedicationGroup) => void;
  onLogDose?: (group: MedicationGroup, latest: MedicationRow) => void;
  loggingDose?: boolean;
  formatDate: (iso: string) => string;
};

export default function MedicationGroupCard({
  group,
  expanded,
  onToggleHistory,
  onEdit,
  onDelete,
  onDeleteGroup,
  onLogDose,
  loggingDose = false,
  formatDate,
}: Props) {
  const latest = getLatestMedicationRecord(group.history);
  const countdown = getHealthHubCountdown(
    latest?.nextDueDate ?? null,
    latest?.nextDueTime,
    'המנה הבאה'
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardBody}>
          <Text style={styles.dogName}>{group.dogName}</Text>
          <Text style={styles.medication}>{group.medicationName}</Text>
          <Text style={styles.summaryLine}>
            מתן אחרון: {formatDate(group.lastAdministeredDate)}
            {latest?.administeredTime ? ` · ${formatTimeHe(latest.administeredTime)}` : ''}
          </Text>
          {latest?.nextDueDate ? (
            <Text style={styles.nextDue}>מנה הבאה: {formatDate(latest.nextDueDate)}</Text>
          ) : (
            <Text style={styles.nextDueMuted}>מנה הבאה: לא נקבע</Text>
          )}
          {latest && onLogDose ? (
            <TouchableOpacity
              style={[styles.logDoseBtn, loggingDose && styles.logDoseBtnDisabled]}
              onPress={() => !loggingDose && onLogDose(group, latest)}
              disabled={loggingDose}
              activeOpacity={0.85}
            >
              {loggingDose ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.logDoseBtnText}>ניתנה התרופה</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        {latest ? (
          <View style={styles.cardActionsColumn}>
            <View style={styles.cardQuickActions}>
              <TouchableOpacity onPress={() => onEdit(latest)} style={styles.iconBtn}>
                <Ionicons name="create-outline" size={22} color={PRIMARY_COLOR} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDeleteGroup(group)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={22} color="#C45C5C" />
              </TouchableOpacity>
            </View>
            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>{countdown?.label ?? 'ימים עד המנה הבאה:'}</Text>
              {countdown ? (
                <>
                  <Text
                    style={[
                      countdown.displayText ? styles.statusMessage : styles.statusValue,
                      { color: countdown.urgencyColor },
                    ]}
                  >
                    {getCountdownPrimaryText(countdown)}
                  </Text>
                  {countdown.subtext ? (
                    <Text style={styles.statusSubtext}>{countdown.subtext}</Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.statusUnset}>לא נקבע</Text>
              )}
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.historySection}>
        <View style={styles.historyHeaderRow}>
          <TouchableOpacity style={styles.historyToggleButton} onPress={onToggleHistory} activeOpacity={0.8}>
            <Text style={styles.historyToggleButtonText}>{expanded ? 'מזער -' : 'פתח +'}</Text>
          </TouchableOpacity>
          <Text style={styles.historyTitle}>היסטוריית תרופות ({group.history.length})</Text>
        </View>

        {expanded ? (
          group.history.length > 0 ? (
            group.history.map((entry, index) => (
              <View key={entry.id} style={styles.historyItem}>
                <View style={styles.historyItemHeader}>
                  <View style={styles.historyItemActions}>
                    <TouchableOpacity onPress={() => onEdit(entry)} style={styles.iconBtn}>
                      <Ionicons name="create-outline" size={20} color={PRIMARY_COLOR} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onDelete(entry)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={20} color="#C45C5C" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.historyItemText}>
                    <Text style={styles.historyDate}>
                      {formatDate(entry.administeredDate)}
                      {entry.administeredTime
                        ? ` · ${formatTimeHe(entry.administeredTime)}`
                        : ''}
                    </Text>
                    {index === 0 ? <Text style={styles.latestBadge}>אחרון</Text> : null}
                  </View>
                </View>
                {entry.nextDueDate ? (
                  <Text style={styles.historyMeta}>הבא: {formatDate(entry.nextDueDate)}</Text>
                ) : null}
                {entry.vetClinicName ? (
                  <Text style={styles.historyMeta}>{entry.vetClinicName}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.historyEmpty}>אין רישומים</Text>
          )
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
  },
  cardBody: { flex: 1, alignItems: 'flex-end' },
  cardActionsColumn: {
    alignItems: 'center',
    minWidth: 88,
    marginRight: 4,
  },
  cardQuickActions: { flexDirection: 'row', alignItems: 'center' },
  statusContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 4,
    writingDirection: 'rtl',
  },
  statusValue: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  statusSubtext: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    marginTop: 2,
    writingDirection: 'rtl',
  },
  statusUnset: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  dogName: { fontSize: 17, fontWeight: '700', color: TEXT_DARK, textAlign: 'right', writingDirection: 'rtl' },
  medication: { fontSize: 15, color: TEXT_DARK, marginTop: 4, textAlign: 'right', writingDirection: 'rtl' },
  summaryLine: { fontSize: 14, color: MUTED, marginTop: 8, textAlign: 'right', writingDirection: 'rtl' },
  nextDue: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  nextDueMuted: {
    fontSize: 14,
    color: MUTED,
    marginTop: 4,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  logDoseBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    maxWidth: '78%',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30,
  },
  logDoseBtnDisabled: {
    backgroundColor: '#B4D6A5',
  },
  logDoseBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  historySection: {
    alignSelf: 'stretch',
    width: '100%',
    marginTop: 12,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 10,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  historyTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginLeft: 8,
  },
  historyToggleButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#E0D5C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyToggleButtonText: {
    color: TEXT_DARK,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  historyItem: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  historyItemText: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  historyItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  latestBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    backgroundColor: '#E6F0DF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  historyMeta: {
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  historyEmpty: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  iconBtn: { padding: 6, marginHorizontal: 2 },
});
