import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';

const PRIMARY_COLOR = '#7FB069';

type AppAlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type DialogState = {
  title: string;
  message: string;
  buttons: AppAlertButton[];
  options?: { cancelable?: boolean };
};

const DEFAULT_OK: AppAlertButton = { text: 'בסדר' };

function normalizeArgs(
  title: unknown,
  message?: unknown,
  buttons?: unknown,
  options?: unknown
): { state: DialogState; useNative: boolean } {
  const titleStr = title == null ? '' : String(title);

  let messageStr = '';
  if (typeof message === 'string') {
    messageStr = message;
  } else if (message != null) {
    messageStr = String(message);
  }

  let opts: { cancelable?: boolean } | undefined =
    options && typeof options === 'object' && !Array.isArray(options)
      ? (options as { cancelable?: boolean })
      : undefined;

  let btns: unknown = buttons;

  // Alert.alert(title, message?, { cancelable: true }) — third argument is options, not buttons
  if (btns && typeof btns === 'object' && !Array.isArray(btns)) {
    opts = { ...(btns as { cancelable?: boolean }), ...opts };
    btns = undefined;
  }

  if (typeof btns === 'function') {
    return { state: { title: titleStr, message: messageStr, buttons: [DEFAULT_OK], options: opts }, useNative: true };
  }

  if (btns == null) {
    return { state: { title: titleStr, message: messageStr, buttons: [DEFAULT_OK], options: opts }, useNative: false };
  }

  if (!Array.isArray(btns)) {
    return { state: { title: titleStr, message: messageStr, buttons: [DEFAULT_OK], options: opts }, useNative: true };
  }

  const cleaned: AppAlertButton[] = btns.map((b: AppAlertButton) => ({
    text: b?.text != null ? String(b.text) : '',
    onPress: typeof b?.onPress === 'function' ? b.onPress : undefined,
    style: b?.style,
  }));

  if (cleaned.length === 0) {
    return { state: { title: titleStr, message: messageStr, buttons: [DEFAULT_OK], options: opts }, useNative: false };
  }

  return { state: { title: titleStr, message: messageStr, buttons: cleaned, options: opts }, useNative: false };
}

/**
 * Patches `Alert.alert` app-wide to use the same card UI as LoginScreen’s message modal.
 * Mount once near the app root (e.g. inside App).
 */
export default function MessageDialogHost() {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const closeAndRun = useCallback((fn?: () => void) => {
    setDialog(null);
    if (fn) {
      queueMicrotask(() => {
        try {
          fn();
        } catch (e) {
          console.error(e);
        }
      });
    }
  }, []);

  useLayoutEffect(() => {
    const original = Alert.alert;
    Alert.alert = ((title, message, buttons, options) => {
      const { state, useNative } = normalizeArgs(title, message, buttons, options);
      if (useNative) {
        return original(title as never, message as never, buttons as never, options as never);
      }
      setDialog(state);
    }) as typeof Alert.alert;

    return () => {
      Alert.alert = original;
    };
  }, []);

  const onOverlayPress = () => {
    if (!dialog) return;
    if (dialog.options?.cancelable === false) return;
    const cancel = dialog.buttons.find((b) => b.style === 'cancel');
    closeAndRun(cancel?.onPress);
  };

  return (
    <Modal
      visible={dialog != null}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (dialog?.options?.cancelable === false) return;
        const cancel = dialog?.buttons.find((b) => b.style === 'cancel');
        closeAndRun(cancel?.onPress);
      }}
    >
      <Pressable style={styles.overlay} onPress={onOverlayPress}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{dialog?.title}</Text>
          <Text style={styles.body}>{dialog?.message}</Text>
          {dialog && dialog.buttons.length === 1 ? (
            <TouchableOpacity
              style={[styles.primaryButton, buttonExtraStyle(dialog.buttons[0])]}
              onPress={() => closeAndRun(dialog.buttons[0].onPress)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>{dialog.buttons[0].text}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.buttonRow}>
              {dialog?.buttons.map((btn, index) => (
                <TouchableOpacity
                  key={`${btn.text}-${index}`}
                  style={[
                    styles.multiButton,
                    btn.style === 'destructive' && styles.multiDestructive,
                    btn.style === 'cancel' && styles.multiCancel,
                    !(btn.style === 'destructive' || btn.style === 'cancel') && styles.multiDefault,
                  ]}
                  onPress={() => closeAndRun(btn.onPress)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.multiButtonText,
                      !(btn.style === 'destructive' || btn.style === 'cancel') && styles.multiDefaultText,
                      btn.style === 'destructive' && styles.multiDestructiveText,
                      btn.style === 'cancel' && styles.multiCancelText,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buttonExtraStyle(btn: AppAlertButton) {
  if (btn.style === 'destructive') return { backgroundColor: '#E74C3C' };
  return {};
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
    maxWidth: 340,
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
    width: '100%',
  },
  body: {
    fontSize: 16,
    color: '#5C4033',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
    width: '100%',
  },
  primaryButton: {
    alignSelf: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  multiButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  multiDefault: {
    backgroundColor: PRIMARY_COLOR,
  },
  multiCancel: {
    backgroundColor: '#E8DED0',
    borderWidth: 1,
    borderColor: '#D0C4B8',
  },
  multiDestructive: {
    backgroundColor: '#FDE8E8',
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  multiButtonText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  multiDefaultText: {
    color: '#FFFFFF',
  },
  multiCancelText: {
    color: '#5C4033',
  },
  multiDestructiveText: {
    color: '#C0392B',
  },
});
