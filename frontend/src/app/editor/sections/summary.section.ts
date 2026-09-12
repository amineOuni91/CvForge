import { Component, computed, inject, OnInit } from '@angular/core';
import { CvStore } from '../cv-store';
import { AiAssistantService } from '../ai.service';
import { AiSuggestion } from '../ai-suggestion.component';

@Component({
  selector: 'app-summary-section',
  imports: [AiSuggestion],
  template: `
    <textarea
      rows="5"
      class="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
      placeholder="Software Engineer avec 7 ans d'expérience..."
      [value]="summary()"
      (input)="update($event)"
    ></textarea>

    <div class="mt-2 flex flex-col gap-2">
      @if (summary()) {
        <app-ai-suggestion label="✨ Améliorer avec l'IA" [fetchFn]="improveFn" (accepted)="apply($event)" />
      }
      <app-ai-suggestion label="✨ Générer à partir du CV" [fetchFn]="generateFn" (accepted)="apply($event)" />
    </div>
  `,
})
export class SummarySection implements OnInit {
  private readonly store = inject(CvStore);
  private readonly ai = inject(AiAssistantService);

  readonly summary = computed(() => this.store.document()?.summary ?? '');

  readonly improveFn = () => this.ai.improveText(this.summary());
  readonly generateFn = () => this.ai.generateSummary(this.store.document()!);

  ngOnInit(): void {
    this.ai.checkAvailability();
  }

  update(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.store.update((doc) => ({ ...doc, summary: value }));
  }

  apply(text: string): void {
    this.store.update((doc) => ({ ...doc, summary: text }));
  }
}
