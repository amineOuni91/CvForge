import { Component, computed, inject } from '@angular/core';
import { LetterStore } from '../letter-store';
import { LetterDocument } from '../../models/letter-document';

@Component({
  selector: 'app-letter-context-section',
  template: `
    @if (doc(); as doc) {
      <div class="grid grid-cols-2 gap-3">
        <label class="col-span-2 text-sm">Poste visé
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="doc.jobTitle"
                 (input)="patch({ jobTitle: value($event) })" />
        </label>
        <label class="text-sm">Lieu
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="doc.city"
                 (input)="patch({ city: value($event) })" />
        </label>
        <label class="text-sm">Date
          <input type="date" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="doc.date"
                 (input)="patch({ date: value($event) })" />
        </label>
        <label class="col-span-2 text-sm">Objet
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="doc.subject"
                 (input)="patch({ subject: value($event) })" />
        </label>
      </div>
    }
  `,
})
export class LetterContextSection {
  private readonly store = inject(LetterStore);
  readonly doc = computed(() => this.store.document());

  value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  patch(changes: Partial<Pick<LetterDocument, 'jobTitle' | 'city' | 'date' | 'subject'>>): void {
    this.store.update((doc) => ({ ...doc, ...changes }));
  }
}
