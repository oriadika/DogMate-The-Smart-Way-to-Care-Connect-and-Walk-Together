/**
 * Israeli mobile: 10 digits starting with 05, or 9 digits starting with 5 (no leading 0).
 * Matches server {@link com.DogMate.util.PhoneValidation}.
 */

export function normalizeIsraeliMobileToDigits(
  raw: string | number | null | undefined
): string | null {
  if (raw == null || raw === '') return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('05')) return digits;
  if (digits.length === 9 && digits.startsWith('5')) return digits;
  return null;
}

export function isValidIsraeliMobileInput(raw: string): boolean {
  return normalizeIsraeliMobileToDigits(raw) != null;
}

/** For tel: — digits only */
export function digitsForTelDial(raw: string | number | null | undefined): string | null {
  return normalizeIsraeliMobileToDigits(raw);
}

/**
 * Digits for WhatsApp `phone` query param: country code 972, no leading 0 (e.g. 972501234567).
 */
export function normalizeIsraeliMobileToWhatsAppPhoneParam(
  raw: string | number | null | undefined
): string | null {
  const d = normalizeIsraeliMobileToDigits(raw);
  if (!d) return null;
  if (d.length === 10 && d.startsWith('05')) return `972${d.slice(1)}`;
  if (d.length === 9 && d.startsWith('5')) return `972${d}`;
  return null;
}
