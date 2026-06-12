import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import HebrewAsciiParensText from '../components/HebrewAsciiParensText';
import WalkerLocationPicker from '../components/WalkerLocationPicker';
import { CityOffering, dogWalkerAPI } from '../services/dogmateApi';
import {
  formatLocationLine,
  parseLocationFromCityField,
  serializeLocationToCityField,
  type LocationType,
} from '../utils/locationFieldCodec';
import { getPricingDisplayLinesFromStored } from '../utils/walkerOfferingDisplay';

const PRIMARY_COLOR = '#7FB069';
const BG_COLOR = '#f5e6d3';
const TEXT_DARK = '#5C4033';
const CARD_BG = '#faf0e6';
const DAY_SELECTED_BG = '#7FB069';
const DAY_UNSELECTED_BG = '#fff';

/** ימי השבוע מימין לשמאל: א׳ = ראשון */
const WEEKDAYS: { id: number; label: string }[] = [
  { id: 0, label: 'א׳' },
  { id: 1, label: 'ב׳' },
  { id: 2, label: 'ג׳' },
  { id: 3, label: 'ד׳' },
  { id: 4, label: 'ה׳' },
  { id: 5, label: 'ו׳' },
  { id: 6, label: 'ש׳' },
];

/** מחירים לגלגלת: 0–300 בקפיצות של 5 */
const PRICE_OPTIONS: number[] = Array.from({ length: 61 }, (_, i) => i * 5);

const DURATION_OPTIONS: string[] = [
  '15 דקות',
  '30 דקות',
  '45 דקות',
  'שעה',
  'שעה וחצי',
  'שעתיים',
];

function nearestPriceOption(amountStr: string): number {
  const t = amountStr.trim();
  if (t === '') return 0;
  const digits = amountStr.replace(/[^\d]/g, '');
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return 0;
  const clamped = Math.max(0, Math.min(300, n));
  let best = PRICE_OPTIONS[0];
  let bestDiff = Infinity;
  for (const p of PRICE_OPTIONS) {
    const d = Math.abs(p - clamped);
    if (d < bestDiff) {
      bestDiff = d;
      best = p;
    }
  }
  return best;
}

type Props = { navigation: any; route: any };

type PriceTier = {
  priceAmount: string;
  priceFor: string;
};

type OfferingForm = {
  locationType: LocationType;
  locationValue: string;
  /** מספר תעריפים לאותה זמינות (למשל 15 דק׳ / 30 דק׳) */
  priceTiers: PriceTier[];
  days: number[];
  startTime: string;
  endTime: string;
  /** טעינה מפרופיל ישן שלא בפורמט JSON */
  fallbackAvailabilityText?: string;
  fallbackPricingText?: string;
};

const emptyForm = (): OfferingForm => ({
  locationType: 'city',
  locationValue: '',
  priceTiers: [{ priceAmount: '', priceFor: '' }],
  days: [],
  startTime: '',
  endTime: '',
});

function parseHm(s: string): { h: number; m: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return { h: 9, m: 0 };
  return {
    h: Math.min(23, Math.max(0, parseInt(m[1], 10))),
    m: Math.min(59, Math.max(0, parseInt(m[2], 10))),
  };
}

function timeToDate(s: string): Date {
  const { h, m } = parseHm(s);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatTime(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function encodeStructuredAvailability(days: number[], start: string, end: string): string {
  return JSON.stringify({
    __dm: 1,
    d: [...days].sort((a, b) => a - b),
    s: start || '',
    e: end || '',
  });
}

/** תאימות לאחור: __pm:1 תעריף יחיד, __pm:2 מערך תעריפים */
function encodeStructuredPricingTiers(tiers: PriceTier[]): string {
  const cleaned = tiers
    .filter((t) => t.priceAmount.trim() || t.priceFor.trim())
    .map((t) => ({ a: t.priceAmount.trim(), f: t.priceFor.trim() }));
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) {
    return JSON.stringify({ __pm: 1, a: cleaned[0].a, f: cleaned[0].f });
  }
  return JSON.stringify({ __pm: 2, tiers: cleaned });
}

function parsePricingField(raw: string): Pick<OfferingForm, 'priceTiers' | 'fallbackPricingText'> {
  const t = raw.trim();
  if (!t) {
    return { priceTiers: [{ priceAmount: '', priceFor: '' }] };
  }
  try {
    const p = JSON.parse(t);
    if (p && p.__pm === 2 && Array.isArray(p.tiers)) {
      const tiers = p.tiers
        .map((x: any) => ({
          priceAmount: typeof x.a === 'string' ? x.a : '',
          priceFor: typeof x.f === 'string' ? x.f : '',
        }))
        .filter((x: PriceTier) => x.priceAmount.trim() || x.priceFor.trim());
      if (tiers.length > 0) return { priceTiers: tiers };
    }
    if (p && p.__pm === 1) {
      return {
        priceTiers: [
          {
            priceAmount: typeof p.a === 'string' ? p.a : '',
            priceFor: typeof p.f === 'string' ? p.f : '',
          },
        ],
      };
    }
  } catch {
    /* legacy */
  }
  return { priceTiers: [{ priceAmount: '', priceFor: '' }], fallbackPricingText: t };
}

function fromCityOffering(o: CityOffering): OfferingForm {
  const loc = parseLocationFromCityField(o.city ?? '');
  const pricingParts = parsePricingField(o.pricing ?? '');
  const raw = (o.availability ?? '').trim();
  if (!raw) {
    return {
      locationType: loc.type,
      locationValue: loc.value,
      days: [],
      startTime: '',
      endTime: '',
      priceTiers: pricingParts.priceTiers,
      fallbackPricingText: pricingParts.fallbackPricingText,
    };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.__dm === 1 && Array.isArray(parsed.d)) {
      return {
        locationType: loc.type,
        locationValue: loc.value,
        days: parsed.d.filter((n: unknown) => typeof n === 'number' && n >= 0 && n <= 6),
        startTime: typeof parsed.s === 'string' ? parsed.s : '',
        endTime: typeof parsed.e === 'string' ? parsed.e : '',
        priceTiers: pricingParts.priceTiers,
        fallbackPricingText: pricingParts.fallbackPricingText,
      };
    }
  } catch {
    /* legacy text */
  }
  return {
    locationType: loc.type,
    locationValue: loc.value,
    days: [],
    startTime: '',
    endTime: '',
    fallbackAvailabilityText: raw,
    priceTiers: pricingParts.priceTiers,
    fallbackPricingText: pricingParts.fallbackPricingText,
  };
}

function toCityOffering(f: OfferingForm): CityOffering {
  const hasStructured =
    f.days.length > 0 || (f.startTime && f.startTime.length > 0) || (f.endTime && f.endTime.length > 0);
  let availability = '';
  if (hasStructured) {
    availability = encodeStructuredAvailability(f.days, f.startTime, f.endTime);
  } else if (f.fallbackAvailabilityText) {
    availability = f.fallbackAvailabilityText;
  }
  const hasPrice = f.priceTiers.some((t) => t.priceAmount.trim() || t.priceFor.trim());
  let pricing = '';
  if (hasPrice) {
    pricing = encodeStructuredPricingTiers(f.priceTiers);
  } else if (f.fallbackPricingText) {
    pricing = f.fallbackPricingText;
  }
  return {
    city: serializeLocationToCityField(f.locationType, f.locationValue).trim(),
    pricing,
    availability,
  };
}

function toggleDay(days: number[], id: number): number[] {
  if (days.includes(id)) return days.filter((d) => d !== id);
  return [...days, id].sort((a, b) => a - b);
}

function DayRow({
  selected,
  onToggle,
}: {
  selected: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <View style={styles.dayRow}>
      {WEEKDAYS.map(({ id, label }) => {
        const on = selected.includes(id);
        return (
          <TouchableOpacity
            key={id}
            style={[styles.dayChip, on ? styles.dayChipOn : styles.dayChipOff]}
            onPress={() => onToggle(id)}
            activeOpacity={0.85}
          >
            <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

type PriceWheelOpen = 'price' | 'duration' | null;

function PriceRangeRow({
  priceAmount,
  priceFor,
  onAmountChange,
  onForChange,
}: {
  priceAmount: string;
  priceFor: string;
  onAmountChange: (v: string) => void;
  onForChange: (v: string) => void;
}) {
  const [open, setOpen] = useState<PriceWheelOpen>(null);
  const [draftPrice, setDraftPrice] = useState<number>(0);
  const [draftDurationIdx, setDraftDurationIdx] = useState(0);
  const [durationChoices, setDurationChoices] = useState<string[]>(DURATION_OPTIONS);

  const openPriceWheel = () => {
    setDraftPrice(nearestPriceOption(priceAmount));
    setOpen('price');
  };

  const openDurationWheel = () => {
    const cur = priceFor.trim();
    let choices = DURATION_OPTIONS;
    let idx = choices.indexOf(priceFor);
    if (cur && idx < 0) {
      choices = [cur, ...DURATION_OPTIONS];
      idx = 0;
    } else if (idx < 0) {
      idx = 0;
    }
    setDurationChoices(choices);
    setDraftDurationIdx(idx);
    setOpen('duration');
  };

  const applyPrice = () => {
    onAmountChange(String(draftPrice));
    setOpen(null);
  };

  const applyDuration = () => {
    const v = durationChoices[draftDurationIdx] ?? DURATION_OPTIONS[0];
    onForChange(v);
    setOpen(null);
  };

  const trimmedAmt = priceAmount.trim();
  const parsedAmt = trimmedAmt === '' ? NaN : parseInt(trimmedAmt.replace(/[^\d]/g, ''), 10);
  const hasPriceNum = trimmedAmt !== '' && Number.isFinite(parsedAmt);
  const displayPrice = hasPriceNum ? `${parsedAmt} ₪` : 'בחר';
  const displayDuration = priceFor.trim().length > 0 ? priceFor : 'בחר';

  return (
    <View style={styles.priceRow}>
      <TouchableOpacity style={styles.priceBox} onPress={openPriceWheel} activeOpacity={0.85}>
        <Text
          style={[
            styles.timeBoxText,
            styles.priceShekelFirst,
            !hasPriceNum && styles.placeholderMuted,
          ]}
          numberOfLines={1}
        >
          {displayPrice}
        </Text>
      </TouchableOpacity>
      <Text style={styles.pricePhraseText}>עבור טיול של</Text>
      <TouchableOpacity style={styles.priceBoxWide} onPress={openDurationWheel} activeOpacity={0.85}>
        <Text
          style={[styles.durationBoxText, !priceFor.trim() && styles.placeholderMuted]}
          numberOfLines={1}
        >
          {displayDuration}
        </Text>
      </TouchableOpacity>

      {open === 'price' && (
        <Modal transparent animationType="fade" visible>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOpen(null)} />
          <View style={styles.iosPickerSheet}>
            <Picker
              selectedValue={draftPrice}
              onValueChange={(v) => setDraftPrice(typeof v === 'number' ? v : parseInt(String(v), 10))}
              style={styles.wheelPicker}
              {...(Platform.OS === 'ios' ? { itemStyle: styles.wheelPickerItem } : {})}
            >
              {PRICE_OPTIONS.map((p) => (
                <Picker.Item key={`price-${p}`} label={`${p} ₪`} value={p} />
              ))}
            </Picker>
            <TouchableOpacity style={styles.iosDoneBtn} onPress={applyPrice} activeOpacity={0.85}>
              <Text style={styles.iosDoneText}>אישור</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {open === 'duration' && (
        <Modal transparent animationType="fade" visible>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOpen(null)} />
          <View style={styles.iosPickerSheet}>
            <Picker
              selectedValue={durationChoices[draftDurationIdx]}
              onValueChange={(v) => {
                const i = durationChoices.indexOf(String(v));
                if (i >= 0) setDraftDurationIdx(i);
              }}
              style={styles.wheelPicker}
              {...(Platform.OS === 'ios' ? { itemStyle: styles.wheelPickerItem } : {})}
            >
              {durationChoices.map((d) => (
                <Picker.Item key={d} label={d} value={d} />
              ))}
            </Picker>
            <TouchableOpacity style={styles.iosDoneBtn} onPress={applyDuration} activeOpacity={0.85}>
              <Text style={styles.iosDoneText}>אישור</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
}

type TimePickerTarget = 'start' | 'end' | null;

function TimeRangeRow({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
}: {
  startTime: string;
  endTime: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  const [open, setOpen] = useState<TimePickerTarget>(null);
  const [iosDraft, setIosDraft] = useState<Date>(() => new Date());

  const openPicker = (which: 'start' | 'end') => {
    const current = which === 'start' ? startTime : endTime;
    setIosDraft(timeToDate(current));
    setOpen(which);
  };

  const applyAndroid = (which: 'start' | 'end', event: { type?: string }, date?: Date) => {
    if (Platform.OS === 'android') setOpen(null);
    if (event.type !== 'set' || !date) return;
    const s = formatTime(date);
    if (which === 'start') onStartChange(s);
    else onEndChange(s);
  };

  const applyIos = () => {
    const s = formatTime(iosDraft);
    if (open === 'start') onStartChange(s);
    if (open === 'end') onEndChange(s);
    setOpen(null);
  };

  const displayStart = startTime || '--:--';
  const displayEnd = endTime || '--:--';

  return (
    <View style={styles.timeRow}>
      <Text style={styles.timeRowLabel}>מ</Text>
      <TouchableOpacity style={styles.timeBox} onPress={() => openPicker('start')} activeOpacity={0.85}>
        <Text style={styles.timeBoxText}>{displayStart}</Text>
      </TouchableOpacity>
      <Text style={styles.timeRowLabelMid}>עד</Text>
      <TouchableOpacity style={styles.timeBox} onPress={() => openPicker('end')} activeOpacity={0.85}>
        <Text style={styles.timeBoxText}>{displayEnd}</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && open && (
        <DateTimePicker
          value={open === 'start' ? timeToDate(startTime) : timeToDate(endTime)}
          mode="time"
          display="default"
          is24Hour
          onChange={(e, date) => applyAndroid(open, e, date)}
        />
      )}

      {Platform.OS === 'ios' && open && (
        <Modal transparent animationType="fade" visible>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOpen(null)} />
          <View style={styles.iosPickerSheet}>
            <DateTimePicker
              value={iosDraft}
              mode="time"
              display="spinner"
              is24Hour
              onChange={(_, date) => date && setIosDraft(date)}
              style={styles.iosPicker}
            />
            <TouchableOpacity style={styles.iosDoneBtn} onPress={applyIos} activeOpacity={0.85}>
              <Text style={styles.iosDoneText}>אישור</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
}

function AvailabilityBlock({
  days,
  startTime,
  endTime,
  fallbackText,
  onDaysChange,
  onStartChange,
  onEndChange,
}: {
  days: number[];
  startTime: string;
  endTime: string;
  fallbackText?: string;
  onDaysChange: (next: number[]) => void;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  return (
    <View style={styles.availabilityBlock}>
      <Text style={styles.fieldLabel}>
        ימים בשבוע <Text style={styles.requiredStar}>*</Text>
      </Text>
      <DayRow selected={days} onToggle={(id) => onDaysChange(toggleDay(days, id))} />
      <Text style={[styles.fieldLabel, styles.timeSectionLabel]}>
        שעות זמינות <Text style={styles.requiredStar}>*</Text>
      </Text>
      <TimeRangeRow
        startTime={startTime}
        endTime={endTime}
        onStartChange={onStartChange}
        onEndChange={onEndChange}
      />
      {fallbackText ? (
        <Text style={styles.legacyHint}>
          נשמר בעבר כטקסט חופשי: {fallbackText}
        </Text>
      ) : null}
    </View>
  );
}

function formatOfferingSummary(f: OfferingForm): string | null {
  if (f.fallbackAvailabilityText && f.days.length === 0 && !f.startTime && !f.endTime) {
    return f.fallbackAvailabilityText;
  }
  const parts: string[] = [];
  if (f.days.length > 0) {
    parts.push(f.days.map((id) => WEEKDAYS.find((w) => w.id === id)?.label).join(', '));
  }
  if (f.startTime || f.endTime) {
    parts.push(`מ-${f.startTime || '—'} עד ${f.endTime || '—'}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

function formatPriceSummary(f: OfferingForm): string | null {
  const hasTier = f.priceTiers.some((t) => t.priceAmount.trim() || t.priceFor.trim());
  if (f.fallbackPricingText && !hasTier) {
    return f.fallbackPricingText;
  }
  const items: { key: number; line: string }[] = [];
  for (const tier of f.priceTiers) {
    if (!tier.priceAmount.trim() && !tier.priceFor.trim()) continue;
    const a = tier.priceAmount.trim();
    const num = a ? parseInt(a.replace(/[^\d]/g, ''), 10) : NaN;
    const pricePart = a && Number.isFinite(num) ? `${num} ₪` : '—';
    const line = `${pricePart} עבור טיול של ${tier.priceFor.trim() || '—'}`;
    const key = Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
    items.push({ key, line });
  }
  items.sort((x, y) => x.key - y.key);
  return items.length ? items.map((x) => x.line).join(' · ') : null;
}

const TIME_RE = /^(\d{1,2}):(\d{2})$/;

/** כל שדות השורה (מיקום — עיר או אזור, זמינות מובנית, תעריף מובנה) חובה לפני שמירה */
function validateOfferingRow(f: OfferingForm): string | null {
  if (!f.locationValue.trim()) {
    return 'נא לבחור עיר או אזור.';
  }
  if (f.days.length === 0) {
    if (f.fallbackAvailabilityText?.trim()) {
      return 'נא לעדכן את הזמינות לפורמט המלא (ימים ושעות), או למחוק את השורה ולהוסיף מחדש.';
    }
    return 'נא לבחור לפחות יום אחד בשבוע.';
  }
  const st = f.startTime.trim();
  const et = f.endTime.trim();
  if (!st || !TIME_RE.test(st)) {
    return 'נא לבחור שעת התחלה.';
  }
  if (!et || !TIME_RE.test(et)) {
    return 'נא לבחור שעת סיום.';
  }
  const startM = parseHm(st).h * 60 + parseHm(st).m;
  const endM = parseHm(et).h * 60 + parseHm(et).m;
  if (endM <= startM) {
    return 'שעת הסיום חייבת להיות אחרי שעת ההתחלה.';
  }

  const hasStructuredPrice = f.priceTiers.some(
    (t) => t.priceAmount.trim() || t.priceFor.trim(),
  );
  if (!hasStructuredPrice) {
    if (f.fallbackPricingText?.trim()) {
      return 'נא לעדכן את התעריף לפורמט המלא (סכום ומשך טיול), או למחוק את השורה ולהוסיף מחדש.';
    }
    return 'נא לבחור לפחות תעריף אחד (סכום ומשך טיול).';
  }
  for (let i = 0; i < f.priceTiers.length; i++) {
    const tier = f.priceTiers[i];
    const priceNum = parseInt(tier.priceAmount.replace(/[^\d]/g, ''), 10);
    if (!tier.priceAmount.trim() || !Number.isFinite(priceNum)) {
      if (f.fallbackPricingText?.trim()) {
        return 'נא לעדכן את התעריף לפורמט המלא (סכום ומשך טיול), או למחוק את השורה ולהוסיף מחדש.';
      }
      return f.priceTiers.length > 1
        ? `תעריף ${i + 1}: נא לבחור סכום (₪).`
        : 'נא לבחור תעריף (₪).';
    }
    if (!tier.priceFor.trim()) {
      if (f.fallbackPricingText?.trim()) {
        return 'נא לעדכן את התעריף לפורמט המלא (סכום ומשך טיול), או למחוק את השורה ולהוסיף מחדש.';
      }
      return f.priceTiers.length > 1
        ? `תעריף ${i + 1}: נא לבחור משך טיול.`
        : 'נא לבחור משך טיול.';
    }
  }
  return null;
}

const WalkerProfessionalProfileScreen = ({ navigation, route }: Props) => {
  const userId: string | undefined = route?.params?.userId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offerings, setOfferings] = useState<OfferingForm[]>([]);
  const [draft, setDraft] = useState<OfferingForm>(emptyForm());

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await dogWalkerAPI.getProfessionalProfile(userId);
      setOfferings((data.cityOfferings ?? []).map(fromCityOffering));
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message || 'לא ניתן לטעון את הפרופיל');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addOfferingAndSave = async () => {
    if (!userId) {
      Alert.alert('שגיאה', 'חסר מזהה משתמש');
      return;
    }
    const draftRow = { ...draft };
    const hasAny =
      draftRow.locationValue.trim() ||
      draftRow.priceTiers.some((t) => t.priceAmount.trim() || t.priceFor.trim()) ||
      draftRow.days.length > 0 ||
      draftRow.startTime ||
      draftRow.endTime ||
      draftRow.fallbackAvailabilityText ||
      draftRow.fallbackPricingText;

    if (hasAny) {
      const err = validateOfferingRow(draftRow);
      if (err) {
        Alert.alert('חסרים פרטים', err);
        return;
      }
    } else if (offerings.length > 0) {
      for (let i = 0; i < offerings.length; i++) {
        const err = validateOfferingRow(offerings[i]);
        if (err) {
          Alert.alert('חסרים פרטים', `שורה ${i + 1}: ${err}`);
          return;
        }
      }
    }

    const nextOfferings = hasAny ? [...offerings, draftRow] : offerings;
    if (hasAny) {
      setOfferings(nextOfferings);
      setDraft(emptyForm());
    }

    setSaving(true);
    try {
      const cityOfferings: CityOffering[] = nextOfferings.map(toCityOffering);
      await dogWalkerAPI.updateProfessionalProfile(userId, {
        cityOfferings,
      });
      Alert.alert('נשמר', 'ניהול השירות שלך עודכן');
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message || 'השמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  const removeOffering = async (index: number) => {
    if (!userId) return;
    const nextOfferings = offerings.filter((_, i) => i !== index);
    setOfferings(nextOfferings);
    setSaving(true);
    try {
      await dogWalkerAPI.updateProfessionalProfile(userId, {
        cityOfferings: nextOfferings.map(toCityOffering),
      });
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message || 'השמירה נכשלה');
      load();
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = useCallback((patch: Partial<OfferingForm>) => {
    setDraft((d) => {
      const next = { ...d, ...patch };
      if (patch.days !== undefined || patch.startTime !== undefined || patch.endTime !== undefined) {
        if (next.days.length > 0 || next.startTime || next.endTime) {
          next.fallbackAvailabilityText = undefined;
        }
      }
      return next;
    });
  }, []);

  const updateDraftTier = useCallback((index: number, patch: Partial<PriceTier>) => {
    setDraft((d) => {
      const priceTiers = d.priceTiers.map((t, i) => (i === index ? { ...t, ...patch } : t));
      const next = { ...d, priceTiers };
      if (priceTiers.some((t) => t.priceAmount.trim() || t.priceFor.trim())) {
        next.fallbackPricingText = undefined;
      }
      return next;
    });
  }, []);

  const addDraftPriceTier = useCallback(() => {
    setDraft((d) => ({
      ...d,
      priceTiers: [...d.priceTiers, { priceAmount: '', priceFor: '' }],
    }));
  }, []);

  const removeDraftPriceTier = useCallback((index: number) => {
    setDraft((d) => {
      if (d.priceTiers.length <= 1) return d;
      return { ...d, priceTiers: d.priceTiers.filter((_, i) => i !== index) };
    });
  }, []);

  if (!userId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>לא נמצא מזהה משתמש</Text>
          <TouchableOpacity style={styles.saveButton} onPress={() => navigation.goBack()}>
            <Text style={styles.saveButtonText}>חזרה</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>טוען פרופיל...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerBtn} />
        <Text style={styles.headerTitle}>ניהול השירות שלי</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() =>
            navigation.navigate('WalkerHome', {
              userId,
              userFirstName: route?.params?.userFirstName,
              userLastName: route?.params?.userLastName,
              email: route?.params?.email,
            })
          }
        >
          <Ionicons name="arrow-forward" size={26} color={TEXT_DARK} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>מיקום, זמינות ותעריף</Text>
          <Text style={styles.sectionHint}>
            כל השדות חובה: מיקום (עיר או אזור), ימים, שעות התחלה וסיום, ותעריף (ניתן להוסיף כמה תעריפים
            לאותה זמינות). לחצו הוסף ושמור. הסרת שורה נשמרת אוטומטית.
          </Text>

          <Text style={styles.fieldLabel}>
            מיקום <Text style={styles.requiredStar}>*</Text>
          </Text>
          <WalkerLocationPicker
            locationType={draft.locationType}
            locationValue={draft.locationValue}
            onChange={({ locationType, locationValue }) => updateDraft({ locationType, locationValue })}
            disabled={saving}
          />

          <AvailabilityBlock
            days={draft.days}
            startTime={draft.startTime}
            endTime={draft.endTime}
            fallbackText={draft.fallbackAvailabilityText}
            onDaysChange={(days) => updateDraft({ days })}
            onStartChange={(startTime) => updateDraft({ startTime })}
            onEndChange={(endTime) => updateDraft({ endTime })}
          />

          <Text style={styles.fieldLabel}>
            תעריף <Text style={styles.requiredStar}>*</Text>
          </Text>
          {draft.priceTiers.map((tier, idx) => (
            <View key={`draft-tier-${idx}`} style={styles.priceTierBlock}>
              {draft.priceTiers.length > 1 ? (
                <View style={styles.priceTierTitleRow}>
                  <TouchableOpacity
                    onPress={() => removeDraftPriceTier(idx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={22} color="#C45C5C" />
                  </TouchableOpacity>
                  <Text style={styles.priceTierTitle}>תעריף {idx + 1}</Text>
                </View>
              ) : null}
              <PriceRangeRow
                priceAmount={tier.priceAmount}
                priceFor={tier.priceFor}
                onAmountChange={(priceAmount) => updateDraftTier(idx, { priceAmount })}
                onForChange={(priceFor) => updateDraftTier(idx, { priceFor })}
              />
            </View>
          ))}
          {draft.priceTiers.some((t) => t.priceAmount.trim() && t.priceFor.trim()) ? (
            <TouchableOpacity
              style={styles.addTierButton}
              onPress={addDraftPriceTier}
              activeOpacity={0.85}
            >
              <Text style={styles.addTierButtonText}>+ הוסף תעריף נוסף</Text>
            </TouchableOpacity>
          ) : null}
          {draft.fallbackPricingText ? (
            <Text style={styles.legacyHint}>
              תעריף ישן (טקסט חופשי): {draft.fallbackPricingText}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[styles.addButtonWide, saving && styles.saveButtonDisabled]}
            onPress={addOfferingAndSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.addButtonText}>הוסף ושמור</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.requiredFieldLegend}>
            <Text style={styles.requiredStar}>*</Text> שדה חובה
          </Text>
        </View>

        {offerings.map((row, index) => {
          const summary = formatOfferingSummary(row);
          const priceLine = formatPriceSummary(row);
          const priceDisplayLines = priceLine
            ? getPricingDisplayLinesFromStored(toCityOffering(row).pricing)
            : [];
          const locLine = formatLocationLine(row.locationType, row.locationValue);
          return (
            <View key={`offering-${index}`} style={styles.card}>
              <View style={styles.rowHeader}>
                <TouchableOpacity
                  onPress={() => removeOffering(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={22} color="#C45C5C" />
                </TouchableOpacity>
                <Text style={styles.rowTitle}>שורה {index + 1}</Text>
              </View>
              {locLine.value !== '—' ? (
                <Text style={styles.lineText}>
                  <Text style={styles.lineBold}>{locLine.label}: </Text>
                  {row.locationType === 'city' ? (
                    <HebrewAsciiParensText style={[styles.lineText, styles.lineTextInlineValue]}>
                      {locLine.value}
                    </HebrewAsciiParensText>
                  ) : (
                    locLine.value
                  )}
                </Text>
              ) : null}
              {summary ? (
                <Text style={styles.lineText}>
                  <Text style={styles.lineBold}>זמינות: </Text>
                  {summary}
                </Text>
              ) : null}
              {priceLine ? (
                <View style={styles.savedPriceBlock}>
                  <Text style={styles.lineText}>
                    <Text style={styles.lineBold}>תעריף:</Text>
                  </Text>
                  {priceDisplayLines.map((line, i) => (
                    <Text
                      key={`${index}-p-${i}`}
                      style={[
                        styles.lineText,
                        i === 0 ? styles.savedPriceLineFirst : styles.savedPriceLineNext,
                      ]}
                    >
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}
              {locLine.value === '—' && !summary && !priceLine ? (
                <Text style={styles.lineMuted}>(ריק)</Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default WalkerProfessionalProfileScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0D5C7',
    backgroundColor: CARD_BG,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  sectionHint: {
    marginTop: 6,
    fontSize: 13,
    color: '#8B7355',
    textAlign: 'right',
    alignSelf: 'stretch',
    lineHeight: 20,
  },
  fieldLabel: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  requiredStar: {
    color: '#D32F2F',
    fontWeight: '700',
  },
  requiredFieldLegend: {
    marginTop: 10,
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  availabilityBlock: {
    marginTop: 4,
  },
  timeSectionLabel: {
    marginTop: 16,
  },
  dayRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: 10,
    gap: 4,
  },
  dayChip: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 9,
    paddingHorizontal: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
  },
  dayChipOn: {
    backgroundColor: DAY_SELECTED_BG,
    borderColor: DAY_SELECTED_BG,
  },
  dayChipOff: {
    backgroundColor: DAY_UNSELECTED_BG,
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  dayChipTextOn: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 10,
  },
  timeRowLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  timeRowLabelMid: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B7355',
  },
  timeBox: {
    minWidth: 88,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
    alignItems: 'center',
  },
  timeBoxText: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT_DARK,
    fontVariant: ['tabular-nums'],
  },
  /** מספר ואז ₪ — סדר קריאה נכון בעברית (הסימן משמאל למספר) */
  priceShekelFirst: {
    writingDirection: 'ltr',
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
    rowGap: 10,
  },
  pricePhraseText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_DARK,
    flexShrink: 1,
    textAlign: 'right',
  },
  priceBox: {
    minWidth: 56,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBoxWide: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBoxText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'center',
    width: '100%',
  },
  placeholderMuted: {
    color: '#8B7355',
    fontWeight: '500',
  },
  wheelPicker: {
    width: '100%',
  },
  wheelPickerItem: {
    fontSize: 20,
    color: TEXT_DARK,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iosPickerSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
  },
  iosPicker: {
    alignSelf: 'center',
    width: '100%',
  },
  iosDoneBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0D5C7',
  },
  iosDoneText: {
    fontSize: 17,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  legacyHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'right',
    lineHeight: 18,
  },
  textInput: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: TEXT_DARK,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D5C7',
  },
  priceTierBlock: {
    marginTop: 8,
  },
  priceTierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 6,
    gap: 10,
  },
  priceTierTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
  },
  addTierButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PRIMARY_COLOR,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  addTierButtonText: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
    fontSize: 15,
  },
  addButtonWide: {
    marginTop: 16,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
    gap: 10,
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
  },
  lineText: {
    marginTop: 6,
    fontSize: 15,
    color: TEXT_DARK,
    textAlign: 'right',
  },
  /** ערך בשורה אחת עם התווית — בלי margin כפול */
  lineTextInlineValue: {
    marginTop: 0,
  },
  savedPriceBlock: {
    alignSelf: 'stretch',
    width: '100%',
  },
  savedPriceLineFirst: {
    marginTop: 4,
  },
  savedPriceLineNext: {
    marginTop: 6,
  },
  lineBold: {
    fontWeight: '700',
  },
  lineMuted: {
    marginTop: 4,
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: TEXT_DARK,
    fontSize: 16,
  },
  errorText: {
    color: TEXT_DARK,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
});
