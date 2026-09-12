import { Component, inject, input, output, signal } from '@angular/core';
import { AiAssistantService } from './ai.service';

@Component({
  selector: 'app-ai-suggestion',
  template: `
    <div>
      <button
        type="button"
        (click)="run()"
        [disabled]="!ai.available() || loading()"
        [title]="ai.available() ? '' : 'Configurez ANTHROPIC_API_KEY pour activer l\\'assistant IA'"
        class="text-xs font-medium text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
      >
        {{ loading() ? 'Génération...' : label() }}
      </button>

      @if (suggestion(); as text) {
        <div class="mt-2 rounded border border-indigo-200 bg-indigo-50 p-2 dark:border-indigo-800 dark:bg-indigo-950">
          <p class="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{{ text }}</p>
          <div class="mt-2 flex gap-2">
            <button type="button" (click)="accept()" class="rounded bg-indigo-600 px-2 py-1 text-xs text-white">
              Accepter
            </button>
            <button type="button" (click)="suggestion.set(null)" class="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300">
              Ignorer
            </button>
          </div>
        </div>
      }

      @if (error()) {
        <p class="mt-1 text-xs text-red-600 dark:text-red-400">Erreur lors de l'appel à l'IA.</p>
      }
    </div>
  `,
})
export class AiSuggestion {
  protected readonly ai = inject(AiAssistantService);

  readonly label = input("✨ Améliorer avec l'IA");
  readonly fetchFn = input.required<() => Promise<string>>();
  readonly accepted = output<string>();

  readonly loading = signal(false);
  readonly suggestion = signal<string | null>(null);
  readonly error = signal(false);

  async run(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      this.suggestion.set(await this.fetchFn()());
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  accept(): void {
    const text = this.suggestion();
    if (text) this.accepted.emit(text);
    this.suggestion.set(null);
  }
}
