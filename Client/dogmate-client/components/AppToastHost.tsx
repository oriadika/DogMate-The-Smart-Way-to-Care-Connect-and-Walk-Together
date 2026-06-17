import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type ToastState = {
  message: string;
};

let showToastImpl: ((message: string) => void) | null = null;

export function showAppToast(message: string): void {
  if (showToastImpl) {
    showToastImpl(message);
    return;
  }
  console.log('[toast]', message);
}

export default function AppToastHost() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    showToastImpl = (message: string) => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      setToast({ message });
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();

      hideTimerRef.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setToast(null);
        });
      }, 2600);
    };

    return () => {
      showToastImpl = null;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [opacity]);

  if (!toast) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
      <View style={styles.card}>
        <Text style={styles.text}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 36,
    zIndex: 2000,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#2F2A25',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: 360,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
