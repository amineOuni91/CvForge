import { Component, computed, inject } from '@angular/core';
import { LetterStore } from '../letter-store';
import { RecipientInfo } from '../../models/letter-document';

@Component({
  selector: 'app-letter-recipient-section',
  template: `
    @if (recipient(); as r) {
      <div class="grid grid-cols-1 gap-3">
        <label class="text-sm">Nom du recruteur (facultatif)
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="r.recruiterName"
                 (input)="patch({ recruiterName: value($event) })" />
        </label>
        <label class="text-sm">Entreprise
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="r.companyName"
                 (input)="patch({ companyName: value($event) })" />
        </label>
        <label class="text-sm">Adresse de l'entreprise (facultatif)
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="r.companyAddress"
                 (input)="patch({ companyAddress: value($event) })" />
        </label>
      </div>
    }
  `,
})
export class LetterRecipientSection {
  private readonly store = inject(LetterStore);
  readonly recipient = computed(() => this.store.document()?.recipient);

  value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  patch(changes: Partial<RecipientInfo>): void {
    this.store.update((doc) => ({ ...doc, recipient: { ...doc.recipient, ...changes } }));
  }
}
