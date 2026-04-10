import {
  digitsForTelDial,
  isValidIsraeliMobileInput,
  normalizeIsraeliMobileToDigits,
  normalizeIsraeliMobileToWhatsAppPhoneParam,
} from './phoneValidation';

describe('normalizeIsraeliMobileToDigits', () => {
  it('accepts 10 digits with leading 05', () => {
    expect(normalizeIsraeliMobileToDigits('050-123-4567')).toBe('0501234567');
  });

  it('accepts 9 digits starting with 5', () => {
    expect(normalizeIsraeliMobileToDigits('501234567')).toBe('501234567');
  });

  it('returns null for empty', () => {
    expect(normalizeIsraeliMobileToDigits('')).toBeNull();
    expect(normalizeIsraeliMobileToDigits('   ')).toBeNull();
  });

  it('returns null for landline / wrong prefix', () => {
    expect(normalizeIsraeliMobileToDigits('03-1234567')).toBeNull();
    expect(normalizeIsraeliMobileToDigits('0312345678')).toBeNull();
  });

  it('returns null when too short', () => {
    expect(normalizeIsraeliMobileToDigits('054')).toBeNull();
  });
});

describe('isValidIsraeliMobileInput', () => {
  it('matches normalized valid numbers', () => {
    expect(isValidIsraeliMobileInput('0501234567')).toBe(true);
    expect(isValidIsraeliMobileInput('501234567')).toBe(true);
  });

  it('rejects invalid', () => {
    expect(isValidIsraeliMobileInput('')).toBe(false);
    expect(isValidIsraeliMobileInput('0412345678')).toBe(false);
  });
});

describe('digitsForTelDial', () => {
  it('delegates to normalize', () => {
    expect(digitsForTelDial('050-123-4567')).toBe('0501234567');
    expect(digitsForTelDial(null)).toBeNull();
  });
});

describe('normalizeIsraeliMobileToWhatsAppPhoneParam', () => {
  it('maps 05… to 972…', () => {
    expect(normalizeIsraeliMobileToWhatsAppPhoneParam('050-123-4567')).toBe('972501234567');
  });

  it('maps 9-digit 5… to 972…', () => {
    expect(normalizeIsraeliMobileToWhatsAppPhoneParam('501234567')).toBe('972501234567');
  });

  it('returns null when invalid', () => {
    expect(normalizeIsraeliMobileToWhatsAppPhoneParam('')).toBeNull();
  });
});
