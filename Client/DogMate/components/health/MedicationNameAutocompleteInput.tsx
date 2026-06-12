import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { filterMedicationNameSuggestions } from '../../utils/medicationHistory';

const TEXT_DARK = '#5C4033';
const BORDER_COLOR = '#E0D5C7';
const CARD_BG = '#faf0e6';
const MUTED = '#8B7355';
const SUGGESTION_MAX_HEIGHT = 160;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  suggestions: string[];
  placeholder?: string;
  disabled?: boolean;
};

export default function MedicationNameAutocompleteInput({
  value,
  onChangeText,
  suggestions,
  placeholder = 'הקלד את שם התרופה (חובה)',
  disabled = false,
}: Props) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredSuggestions = useMemo(
    () => filterMedicationNameSuggestions(suggestions, value),
    [suggestions, value]
  );

  const listVisible = showSuggestions && !disabled && filteredSuggestions.length > 0;

  const openSuggestions = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setShowSuggestions(true);
  }, []);

  const closeSuggestions = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => setShowSuggestions(false), 180);
  }, []);

  const handleSelect = useCallback(
    (name: string) => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      onChangeText(name);
      setShowSuggestions(false);
    },
    [onChangeText]
  );

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text);
      setShowSuggestions(true);
    },
    [onChangeText]
  );

  return (
    <View style={styles.root}>
      <TextInput
        style={[styles.input, listVisible && styles.inputOpen]}
        value={value}
        onChangeText={handleChangeText}
        onFocus={openSuggestions}
        onBlur={closeSuggestions}
        placeholder={placeholder}
        placeholderTextColor="#A9B5C7"
        textAlign="right"
        editable={!disabled}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {listVisible ? (
        <View style={styles.suggestionsPanel}>
          <Text style={styles.suggestionsHeader}>תרופות קודמות של הכלב</Text>
          <ScrollView
            style={styles.suggestionsScroll}
            contentContainerStyle={styles.suggestionsContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            bounces={false}
          >
            {filteredSuggestions.map((name) => (
              <TouchableOpacity
                key={name}
                style={styles.suggestionRow}
                onPress={() => handleSelect(name)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignSelf: 'stretch',
    zIndex: 10,
    direction: 'rtl',
  },
  input: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  suggestionsPanel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: BORDER_COLOR,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    maxHeight: SUGGESTION_MAX_HEIGHT + 36,
    alignSelf: 'stretch',
    direction: 'rtl',
  },
  suggestionsHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'right',
    alignSelf: 'stretch',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
    writingDirection: 'rtl',
  },
  suggestionsScroll: {
    maxHeight: SUGGESTION_MAX_HEIGHT,
    direction: 'rtl',
  },
  suggestionsContent: {
    flexGrow: 1,
    alignItems: 'stretch',
  },
  suggestionRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  suggestionText: {
    flex: 1,
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
