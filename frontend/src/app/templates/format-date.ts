import { MONTHS } from './format-month';

export function formatFullDate(value: string | null | undefined, lang: 'fr' | 'en'): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  const monthName = MONTHS[lang][Number(month) - 1];
  if (!monthName) return value;
  return lang === 'fr' ? `${Number(day)} ${monthName} ${year}` : `${monthName} ${Number(day)}, ${year}`;
}
