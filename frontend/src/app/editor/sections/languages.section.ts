import { Component, computed, inject } from '@angular/core';
import { CvStore } from '../cv-store';
import { LANGUAGE_LEVELS, LanguageEntry } from '../../models/cv-document';

const EMPTY_LANGUAGE: LanguageEntry = { name: '', level: 'B1' };

@Component({
  selector: 'app-languages-section',
  template: `
    <div class="space-y-2">
      @for (lang of languages(); track $index) {
        <div class="flex items-center gap-2">
          <input class="flex-1 rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Langue"
                 [value]="lang.name" (input)="patch($index, { name: value($event) })" />
          <select class="rounded border border-slate-300 px-2 py-1 text-sm" [value]="lang.level"
                  (change)="patch($index, { level: value($event) })">
            @for (level of levels; track level) {
              <option [value]="level">{{ level }}</option>
            }
          </select>
          <button type="button" (click)="remove($index)" class="text-sm text-red-600">Supprimer</button>
        </div>
      }
      <button type="button" (click)="add()" class="w-full rounded border border-dashed border-slate-300 py-2 text-sm text-slate-600">
        + Ajouter une langue
      </button>
    </div>
  `,
})
export class LanguagesSection {
  private readonly store = inject(CvStore);
  readonly languages = computed(() => this.store.document()?.languages ?? []);
  readonly levels = LANGUAGE_LEVELS;

  value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  patch(index: number, changes: Partial<LanguageEntry>): void {
    this.store.update((doc) => ({
      ...doc,
      languages: doc.languages.map((l, i) => (i === index ? { ...l, ...changes } : l)),
    }));
  }

  add(): void {
    this.store.update((doc) => ({ ...doc, languages: [...doc.languages, { ...EMPTY_LANGUAGE }] }));
  }

  remove(index: number): void {
    this.store.update((doc) => ({ ...doc, languages: doc.languages.filter((_, i) => i !== index) }));
  }
}
