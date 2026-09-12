import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';
import { CvStore } from './cv-store';

interface AtsAnalysis {
  atsScore: number;
  contentScore: number;
  technicalSkillsScore: number;
  experienceScore: number;
  overallScore: number;
  recommendations: string[];
}

@Component({
  selector: 'app-ats-panel',
  template: `
    <div class="p-4">
      <button
        type="button"
        (click)="analyze()"
        [disabled]="loading()"
        class="w-full rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {{ loading() ? 'Analyse en cours...' : '✨ Analyser mon CV' }}
      </button>

      @if (result(); as r) {
        <div class="mt-4 space-y-3">
          <div class="rounded border border-slate-200 p-3 text-center dark:border-slate-700">
            <div class="text-3xl font-bold" [class]="scoreColor(r.overallScore)">{{ r.overallScore }}/100</div>
            <div class="text-xs text-slate-500 dark:text-slate-400">Score global</div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="rounded border border-slate-200 p-2 dark:border-slate-700">
              <div class="font-semibold" [class]="scoreColor(r.atsScore)">{{ r.atsScore }}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Compatibilité ATS</div>
            </div>
            <div class="rounded border border-slate-200 p-2 dark:border-slate-700">
              <div class="font-semibold" [class]="scoreColor(r.contentScore)">{{ r.contentScore }}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Contenu</div>
            </div>
            <div class="rounded border border-slate-200 p-2 dark:border-slate-700">
              <div class="font-semibold" [class]="scoreColor(r.technicalSkillsScore)">{{ r.technicalSkillsScore }}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Compétences techniques</div>
            </div>
            <div class="rounded border border-slate-200 p-2 dark:border-slate-700">
              <div class="font-semibold" [class]="scoreColor(r.experienceScore)">{{ r.experienceScore }}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Expérience</div>
            </div>
          </div>

          @if (r.recommendations.length) {
            <div>
              <div class="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Recommandations</div>
              <ul class="list-disc space-y-1 pl-4 text-sm text-slate-700 dark:text-slate-300">
                @for (rec of r.recommendations; track rec) { <li>{{ rec }}</li> }
              </ul>
            </div>
          }
        </div>
      }

      @if (error()) {
        <p class="mt-3 text-sm text-red-600 dark:text-red-400">Erreur lors de l'analyse. Réessayez.</p>
      }
    </div>
  `,
})
export class AtsPanel {
  private readonly store = inject(CvStore);
  private readonly http = inject(HttpClient);

  readonly loading = signal(false);
  readonly result = signal<AtsAnalysis | null>(null);
  readonly error = signal(false);

  async analyze(): Promise<void> {
    const document = this.store.document();
    if (!document) return;
    this.loading.set(true);
    this.error.set(false);
    try {
      this.result.set(
        await firstValueFrom(this.http.post<AtsAnalysis>(`${API_BASE_URL}/api/ats/analyze`, { document })),
      );
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  scoreColor(score: number): string {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }
}
