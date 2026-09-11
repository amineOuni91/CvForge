import { formatMonth } from './format-month';

describe('formatMonth', () => {
  it('formats a month in French', () => {
    expect(formatMonth('2021-03', 'fr')).toBe('Mars 2021');
  });

  it('formats a month in English', () => {
    expect(formatMonth('2021-03', 'en')).toBe('March 2021');
  });

  it('returns an empty string for null', () => {
    expect(formatMonth(null, 'fr')).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(formatMonth(undefined, 'fr')).toBe('');
  });

  it('returns an empty string for an empty string', () => {
    expect(formatMonth('', 'fr')).toBe('');
  });

  it('falls back to the raw value for an out-of-range month', () => {
    expect(formatMonth('2021-13', 'fr')).toBe('2021-13');
  });

  it('formats December correctly (12-month boundary)', () => {
    expect(formatMonth('2021-12', 'en')).toBe('December 2021');
  });

  it('formats January correctly (1-month boundary)', () => {
    expect(formatMonth('2021-01', 'fr')).toBe('Janvier 2021');
  });
});
