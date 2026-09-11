import { Injectable, signal } from '@angular/core';
import { en } from './locales/en';
import { fr } from './locales/fr';

export type Lang = 'fr' | 'en';

const LOCALES: Record<Lang, Record<string, string>> = { fr, en };
const STORAGE_KEY = 'cvforge.lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>(this.readStoredLang());

  setLang(lang: Lang): void {
    this.lang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  toggle(): void {
    this.setLang(this.lang() === 'fr' ? 'en' : 'fr');
  }

  t(key: string): string {
    return LOCALES[this.lang()][key] ?? key;
  }

  private readStoredLang(): Lang {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'fr';
  }
}
