import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

function lineStyle(line: string) {
  const t = line.trim();
  if (!t) return 'spacer';
  if (t.startsWith('תנאי שימוש ומדיניות פרטיות')) return 'mainTitle';
  if (t.startsWith('עדכון אחרון:')) return 'updatedAt';
  if (t.startsWith('חלק א') || t.startsWith('חלק ב')) return 'sectionTitle';
  if (/^\d+\.\s/.test(t)) return 'subSectionTitle';
  if (/^\d+\.\d+\./.test(t)) return 'bullet';
  if (t.includes('אחריות') || t.includes('איסור מוחלט') || t.includes('הסכמה') || t.includes('אבטחה')) {
    return 'important';
  }
  return 'paragraph';
}

export default function TermsPrivacyScreen({ navigation }: any) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadTermsFromFile = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const asset = Asset.fromModule(require('../docs/terms-and-privacy-he.md'));
        await asset.downloadAsync();
        const fileUri = asset.localUri || asset.uri;
        if (!fileUri) {
          throw new Error('לא נמצא קובץ תנאי שימוש');
        }
        const text = await FileSystem.readAsStringAsync(fileUri);
        setContent(text);
      } catch (e: any) {
        setLoadError(e?.message || 'טעינת תנאי השימוש נכשלה');
      } finally {
        setLoading(false);
      }
    };

    loadTermsFromFile();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>תנאי שימוש ופרטיות</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#5C4033" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#7FB069" />
            <Text style={styles.loadingText}>טוען תוכן...</Text>
          </View>
        ) : loadError ? (
          <Text style={styles.errorText}>שגיאה: {loadError}</Text>
        ) : (
          content.split(/\r?\n/).map((line, idx) => {
            const kind = lineStyle(line);
            if (kind === 'spacer') return <View key={`sp-${idx}`} style={styles.spacer} />;
            if (kind === 'mainTitle') return <Text key={idx} style={styles.mainTitle}>{line}</Text>;
            if (kind === 'updatedAt') return <Text key={idx} style={styles.updatedAt}>{line}</Text>;
            if (kind === 'sectionTitle') return <Text key={idx} style={styles.sectionTitle}>{line}</Text>;
            if (kind === 'subSectionTitle') return <Text key={idx} style={styles.subSectionTitle}>{line}</Text>;
            if (kind === 'bullet') return <Text key={idx} style={styles.bullet}>{line}</Text>;
            if (kind === 'important') return <Text key={idx} style={styles.important}>{line}</Text>;
            return <Text key={idx} style={styles.text}>{line}</Text>;
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5e6d3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
  },
  headerSpacer: {
    width: 28,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 120,
  },
  loadingText: {
    color: '#8B7355',
    fontSize: 14,
  },
  errorText: {
    color: '#B03A2E',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 14,
  },
  text: {
    fontSize: 15,
    lineHeight: 25,
    color: '#5C4033',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  mainTitle: {
    fontSize: 24,
    lineHeight: 32,
    color: '#4A3229',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '800',
    marginBottom: 4,
  },
  updatedAt: {
    fontSize: 13,
    lineHeight: 20,
    color: '#8B7355',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 30,
    color: '#5C4033',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '800',
    marginTop: 8,
  },
  subSectionTitle: {
    fontSize: 17,
    lineHeight: 27,
    color: '#5C4033',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '700',
    marginTop: 6,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    color: '#5C4033',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 2,
  },
  important: {
    fontSize: 16,
    lineHeight: 26,
    color: '#4A3229',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '700',
  },
  spacer: {
    height: 8,
  },
});
