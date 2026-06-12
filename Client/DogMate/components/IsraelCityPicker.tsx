import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { CityDropdownItem, fetchIsraelCities } from '../services/israelCitiesApi';
import HebrewAsciiParensText from './HebrewAsciiParensText';

const PRIMARY_COLOR = '#7FB069';
const TEXT_DARK = '#5C4033';
const BORDER_COLOR = '#E0D5C7';
const BG_CARD = '#fff';
const MUTED = '#8B7355';

/** רוחב פאנל הרשימה — קומפקטי, לא ברוחב מלא */
function listPanelWidth(): number {
  const w = Dimensions.get('window').width;
  return Math.min(360, Math.max(260, Math.round(w * 0.88)));
}

/** גובה מקסימלי לרשימת הגלילה (במצב modal הספרייה לא מגבילה לבד) */
const LIST_MAX_HEIGHT = 250;

/** חיפוש + שוליים — גובה כולל של החלון הלבן */
function panelMaxHeight(): number {
  return LIST_MAX_HEIGHT + 86;
}

/** הזזת הפאנל מעט למטה בתוך המודל */
const MODAL_PANEL_TOP_INSET = 36;

type Props = {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function IsraelCityPicker({
  value,
  onChange,
  placeholder = 'בחר עיר',
  disabled = false,
}: Props) {
  const [data, setData] = useState<CityDropdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchIsraelCities();
      setData(items);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'לא ניתן לטעון את רשימת הערים';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dataWithLegacyValue = useMemo(() => {
    const v = value?.trim();
    if (!v) return data;
    if (data.some((d) => d.value === v)) return data;
    return [{ label: v, value: v }, ...data];
  }, [data, value]);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={PRIMARY_COLOR} size="small" />
        <Text style={[styles.loadingHint, { marginTop: 8 }]}>
          טוען רשימת ישובים מממשלתי...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
          <Text style={styles.retryText}>נסה שוב</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const panelW = listPanelWidth();
  const panelH = panelMaxHeight();
  const hasValue = Boolean(value?.trim());

  return (
    <View style={styles.pickerRoot}>
      <Dropdown
        style={styles.dropdown}
        containerStyle={[
          styles.dropdownListPanel,
          {
            width: panelW,
            maxWidth: panelW,
            maxHeight: panelH,
            flexGrow: 0,
            marginTop: MODAL_PANEL_TOP_INSET,
          },
        ]}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={hasValue ? styles.hiddenSelectedText : styles.selectedTextStyle}
        itemTextStyle={styles.itemTextStyle}
        inputSearchStyle={styles.inputSearchStyle}
        iconStyle={styles.iconStyle}
        data={dataWithLegacyValue}
        search
        maxHeight={LIST_MAX_HEIGHT}
        labelField="label"
        valueField="value"
        placeholder={placeholder}
        searchPlaceholder="חיפוש עיר..."
        value={value ? value : null}
        onChange={(item) => onChange(item.value)}
        disable={disabled}
        inverted={false}
        keyboardAvoiding
        mode="modal"
        backgroundColor="rgba(0,0,0,0.35)"
        flatListProps={{
          style: { maxHeight: LIST_MAX_HEIGHT, width: panelW },
        }}
        renderLeftIcon={() =>
          hasValue ? (
            <View style={styles.selectedValueWrap}>
              <HebrewAsciiParensText style={styles.selectedTextStyle}>{value}</HebrewAsciiParensText>
            </View>
          ) : null
        }
        renderItem={(item) => (
          <View style={styles.itemInner}>
            <HebrewAsciiParensText style={styles.itemTextStyle}>{item.label}</HebrewAsciiParensText>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: BG_CARD,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  loadingHint: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  errorBox: {
    padding: 14,
    backgroundColor: '#FDE8E8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8B4B4',
    alignItems: 'stretch',
  },
  errorText: {
    fontSize: 14,
    color: '#8B2E2E',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  pickerRoot: {
    width: '100%',
    alignSelf: 'stretch',
  },
  /** alignSelf + border — הרוחב מוגדר דינמית ב־containerStyle */
  dropdownListPanel: {
    alignSelf: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
    flexShrink: 1,
  },
  dropdown: {
    width: '100%',
    minHeight: 50,
    backgroundColor: BG_CARD,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
  },
  placeholderStyle: {
    fontSize: 16,
    color: MUTED,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  /** מסתיר את הטקסט המובנה של הספרייה כשמציגים את הבחירה ב־renderLeftIcon */
  hiddenSelectedText: {
    opacity: 0,
    width: 0,
    minWidth: 0,
    maxWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
    height: 0,
    minHeight: 0,
    maxHeight: 0,
    overflow: 'hidden',
    padding: 0,
    margin: 0,
    fontSize: 0,
  },
  selectedValueWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  itemInner: {
    paddingVertical: 17,
    paddingHorizontal: 17,
  },
  itemTextStyle: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputSearchStyle: {
    fontSize: 16,
    color: TEXT_DARK,
    textAlign: 'right',
    writingDirection: 'rtl',
    borderRadius: 10,
    borderColor: BORDER_COLOR,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FAF0E6',
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
});
