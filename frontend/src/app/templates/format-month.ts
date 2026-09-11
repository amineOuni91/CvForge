const MONTHS: Record<'fr' | 'en', string[]> = {
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export function formatMonth(value: string | null | undefined, lang: 'fr' | 'en'): string {
  if (!value) return '';
  const [year, month] = value.split('-');
  const index = Number(month) - 1;
  const monthName = MONTHS[lang][index];
  return monthName ? `${monthName} ${year}` : value;
}
