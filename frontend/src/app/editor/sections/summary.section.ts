import { Component, computed, inject } from '@angular/core';
import { CvStore } from '../cv-store';

@Component({
  selector: 'app-summary-section',
  template: `
    <textarea
      rows="5"
      class="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
      placeholder="Software Engineer avec 7 ans d'expérience..."
      [value]="summary()"
      (input)="update($event)"
    ></textarea>
  `,
})
export class SummarySection {
  private readonly store = inject(CvStore);

  readonly summary = computed(() => this.store.document()?.summary ?? '');

  update(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.store.update((doc) => ({ ...doc, summary: value }));
  }
}
