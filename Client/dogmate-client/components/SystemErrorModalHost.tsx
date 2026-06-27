import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { showAppToast } from './AppToastHost';
import { submitErrorReport } from '../utils/errorReportSubmission';
import { incidentToReportPayload } from '../utils/systemErrorReporting';
import { setSystemErrorModalActive, subscribeSystemErrors, type SystemErrorIncident } from '../utils/systemErrorEvents';

const PRIMARY_COLOR = '#7FB069';

export default function SystemErrorModalHost() {
  const [incident, setIncident] = useState<SystemErrorIncident | null>(null);
  const [reporting, setReporting] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    return subscribeSystemErrors((nextIncident) => {
      setIncident(nextIncident);
    });
  }, []);

  useEffect(() => {
    return () => {
      setSystemErrorModalActive(false);
    };
  }, []);

  const dismissModal = useCallback(() => {
    if (reporting || retrying) return;
    setIncident(null);
    setSystemErrorModalActive(false);
  }, [reporting, retrying]);

  const handleReport = useCallback(async () => {
    if (!incident || reporting) return;

    setReporting(true);
    try {
      const result = await submitErrorReport(incidentToReportPayload(incident));
      setIncident(null);
      setSystemErrorModalActive(false);
      if (result === 'queued') {
        showAppToast('הדיווח נשמר וישלח אוטומטית כשהחיבור יתחדש.');
      } else {
        showAppToast('הדיווח נשלח בהצלחה. תודה!');
      }
    } catch (error) {
      console.warn('Failed to submit crash report:', error);
      showAppToast('שליחת הדיווח נכשלה. נסה שוב מאוחר יותר.');
    } finally {
      setReporting(false);
    }
  }, [incident, reporting]);

  const handleRetry = useCallback(async () => {
    if (!incident?.retryAction || reporting || retrying) return;

    setRetrying(true);
    try {
      await incident.retryAction();
      setIncident(null);
      setSystemErrorModalActive(false);
    } catch (error) {
      console.warn('Retry after system error failed:', error);
    } finally {
      setRetrying(false);
    }
  }, [incident, reporting, retrying]);

  const isCriticalFlow = incident?.isCriticalFlow === true;
  const busy = reporting || retrying;

  return (
    <Modal
      visible={incident != null}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isCriticalFlow) dismissModal();
      }}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => {
          if (!isCriticalFlow) dismissModal();
        }}
      >
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>משהו השתבש במערכת...</Text>
          <Text style={styles.body}>
            {isCriticalFlow
              ? 'לא הצלחנו לטעון את הנתונים הדרושים. אפשר לנסות שוב או לשלוח לנו דיווח כדי שנוכל לתקן במהירות.'
              : 'אירעה שגיאה בלתי צפויה. אפשר לסגור ולהמשיך, או לשלוח לנו דיווח כדי שנוכל לתקן במהירות.'}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.reportButton, busy && styles.buttonDisabled]}
              onPress={() => void handleReport()}
              disabled={busy}
              activeOpacity={0.85}
            >
              {reporting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.reportButtonText}>דווח על השגיאה</Text>
              )}
            </TouchableOpacity>

            {isCriticalFlow ? (
              <TouchableOpacity
                style={[styles.button, styles.retryButton, busy && styles.buttonDisabled]}
                onPress={() => void handleRetry()}
                disabled={busy || !incident?.retryAction}
                activeOpacity={0.85}
              >
                {retrying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.retryButtonText}>נסה שוב</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.closeButton]}
                onPress={dismissModal}
                disabled={busy}
                activeOpacity={0.85}
              >
                <Text style={styles.closeButtonText}>סגור</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#faf0e6',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E0D5C7',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 10,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 15,
    color: '#5C4033',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  buttonRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  reportButton: {
    backgroundColor: PRIMARY_COLOR,
  },
  retryButton: {
    backgroundColor: '#5C4033',
  },
  closeButton: {
    backgroundColor: '#E8DED0',
    borderWidth: 1,
    borderColor: '#D0C4B8',
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  closeButtonText: {
    color: '#5C4033',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
