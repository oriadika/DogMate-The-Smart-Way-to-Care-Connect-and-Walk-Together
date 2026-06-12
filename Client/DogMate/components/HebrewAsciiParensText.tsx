import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

type Props = {
  children: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/** מסיר תווי LRM ישנים אם היו בשמות */
function stripLegacyMarks(s: string): string {
  return s.replace(/\u200E/g, '');
}

/**
 * תצוגת עברית עם סוגריים ASCII: בלוק LTR מקונן ל-(...) כדי שלא יתהפכו תחת RTL.
 */
export default function HebrewAsciiParensText({ children, style, numberOfLines }: Props) {
  const s = stripLegacyMarks(children ?? '');

  const nodes = useMemo(() => {
    if (!/[()]/.test(s)) {
      return s;
    }
    const parts: React.ReactNode[] = [];
    let last = 0;
    const re = /\(([^)]*)\)/g;
    let m: RegExpExecArray | null;
    let k = 0;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) {
        parts.push(s.slice(last, m.index));
      }
      parts.push(
        <Text key={`paren-${k++}`} style={sheet.ltrParens}>
          {`(${m[1]})`}
        </Text>,
      );
      last = m.index + m[0].length;
    }
    if (last < s.length) {
      parts.push(s.slice(last));
    }
    return parts;
  }, [s]);

  return (
    <Text style={[sheet.rtl, style]} numberOfLines={numberOfLines}>
      {nodes}
    </Text>
  );
}

const sheet = StyleSheet.create({
  rtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ltrParens: {
    writingDirection: 'ltr',
  },
});
