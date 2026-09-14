import { Component, computed, inject } from '@angular/core';
import { LetterStore } from '../letter-store';
import { LetterDocument } from '../../models/letter-document';

@Component({
  selector: 'app-letter-body-section',
  template: `
    @if (doc(); as doc) {
      <div class="space-y-3">
        <label class="block text-sm">Introduction
          <textarea rows="3" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="doc.introduction"
                    (input)="patch({ introduction: value($event) })"></textarea>
        </label>
        <label class="block text-sm">Motivation
          <textarea rows="4" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="doc.motivation"
                    (input)="patch({ motivation: value($event) })"></textarea>
        </label>
        <label class="block text-sm">Compétences / atouts
          <textarea rows="4" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="doc.skills"
                    (input)="patch({ skills: value($event) })"></textarea>
        </label>
        <label class="block text-sm">Conclusion
          <textarea rows="3" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="doc.conclusion"
                    (input)="patch({ conclusion: value($event) })"></textarea>
        </label>
      </div>
    }
  `,
})
export class LetterBodySection {
  private readonly store = inject(LetterStore);
  readonly doc = computed(() => this.store.document());

  value(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  patch(changes: Partial<Pick<LetterDocument, 'introduction' | 'motivation' | 'skills' | 'conclusion'>>): void {
    this.store.update((doc) => ({ ...doc, ...changes }));
  }
}
