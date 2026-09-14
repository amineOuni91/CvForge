import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { LetterStore } from './letter-store';
import { LetterSettings } from '../models/letter-document';

const TEMPLATES = [
  { key: 'classique', label: 'Classique' },
  { key: 'epure', label: 'Épuré' },
  { key: 'formel', label: 'Formel' },
  { key: 'creatif', label: 'Créatif' },
  { key: 'ats', label: 'ATS' },
];

const FONTS = [
  { key: 'inter', label: 'Inter' },
  { key: 'roboto', label: 'Roboto' },
  { key: 'lora', label: 'Lora' },
  { key: 'jetbrains-mono', label: 'JetBrains Mono' },
  { key: 'system', label: 'Système' },
];

@Component({
  selector: 'app-letter-customization-panel',
  imports: [DecimalPipe],
  template: `
    @if (settings(); as s) {
      <div class="space-y-5 p-4">
        <div>
          <span class="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">Template</span>
          <div class="grid grid-cols-3 gap-2">
            @for (t of templates; track t.key) {
              <button type="button" (click)="setTemplateKey(t.key)" class="rounded border px-2 py-2 text-xs dark:text-slate-200"
                      [class.border-slate-800]="templateKey() === t.key" [class.dark:border-slate-300]="templateKey() === t.key"
                      [class.bg-slate-100]="templateKey() === t.key" [class.dark:bg-slate-700]="templateKey() === t.key"
                      [class.border-slate-300]="templateKey() !== t.key" [class.dark:border-slate-600]="templateKey() !== t.key">
                {{ t.label }}
              </button>
            }
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="text-sm dark:text-slate-200">Couleur principale
            <input type="color" class="mt-1 h-8 w-full rounded border border-slate-300 dark:border-slate-600" [value]="s.primaryColor"
                   (input)="patch({ primaryColor: colorValue($event) })" />
          </label>
          <label class="text-sm dark:text-slate-200">Couleur secondaire
            <input type="color" class="mt-1 h-8 w-full rounded border border-slate-300 dark:border-slate-600" [value]="s.secondaryColor"
                   (input)="patch({ secondaryColor: colorValue($event) })" />
          </label>
        </div>

        <label class="block text-sm dark:text-slate-200">Police
          <select class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="s.fontFamily"
                  (change)="patch({ fontFamily: selectValue($event) })">
            @for (f of fonts; track f.key) { <option [value]="f.key">{{ f.label }}</option> }
          </select>
        </label>

        <label class="block text-sm dark:text-slate-200">
          Taille du texte ({{ s.fontScale | number: '1.2-2' }}×)
          <input type="range" min="0.85" max="1.2" step="0.05" class="mt-1 w-full" [value]="s.fontScale"
                 (input)="patch({ fontScale: numberValue($event) })" />
        </label>

        <label class="block text-sm dark:text-slate-200">Langue de la lettre
          <select class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="s.language"
                  (change)="patch({ language: selectValue($event) === 'en' ? 'en' : 'fr' })">
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>
    }
  `,
})
export class LetterCustomizationPanel {
  private readonly store = inject(LetterStore);

  readonly templates = TEMPLATES;
  readonly fonts = FONTS;

  readonly settings = computed(() => this.store.document()?.settings);
  readonly templateKey = computed(() => this.store.document()?.templateKey);

  colorValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  selectValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  numberValue(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  setTemplateKey(key: string): void {
    this.store.update((doc) => ({ ...doc, templateKey: key }));
  }

  patch(changes: Partial<LetterSettings>): void {
    this.store.update((doc) => ({ ...doc, settings: { ...doc.settings, ...changes } }));
  }
}
