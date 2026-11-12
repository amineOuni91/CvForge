import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';
import { I18nService } from '../core/i18n.service';
import { formatScore } from '../core/offer-utils';
import { TPipe } from '../core/t.pipe';
import { ToastService } from '../core/toast.service';
import { OfferMatch } from '../models/job-offer';
import { CvStore } from './cv-store';
import { OfferStore } from './offer-store';

@Component({
  selector: 'app-offer-panel',
  imports: [TPipe],
  template: `
    <aside class="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 text-sm text-slate-800 lg:block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
      <p class="text-xs uppercase tracking-wide text-slate-400">{{ 'offerPanel.title' | t }}</p>
      @if (offers.document(); as o) {
        <h3 class="mt-1 font-semibold">{{ o.title }}</h3>
        <p class="text-slate-500 dark:text-slate-400">{{ meta() }}</p>
        @if (o.url) {
          <a [href]="o.url" target="_blank" rel="noopener noreferrer" class="text-xs text-indigo-600 hover:underline dark:text-indigo-400">🔗 {{ 'offerPanel.link' | t }}</a>
        }

        <div class="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
          <div class="flex items-baseline justify-between">
            <span>{{ 'offerPanel.match' | t }}</span>
            <span class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ score(match()?.score ?? null) }}</span>
          </div>
          <div class="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
            <div class="h-full rounded-full bg-emerald-500" [style.width.%]="match()?.score ?? 0"></div>
          </div>
          <p class="mt-1 text-[11px] text-slate-400">{{ 'offerPanel.matchHint' | t }}</p>
        </div>

        @if (match(); as m) {
          @if (m.found.length + m.missing.length > 0) {
            <p class="mt-4 font-medium">{{ 'offerPanel.technologies' | t }}</p>
            <ul class="mt-1 space-y-1">
              @for (tech of m.found; track tech) {
                <li class="flex justify-between"><span>{{ tech }}</span><span class="text-emerald-600 dark:text-emerald-400">✓ {{ 'offerPanel.inCv' | t }}</span></li>
              }
              @for (tech of m.missing; track tech) {
                <li class="flex justify-between"><span>{{ tech }}</span>
                  <button type="button" (click)="addSkill(tech)" class="text-xs text-indigo-600 hover:underline dark:text-indigo-400">+ {{ 'offerPanel.addToSkills' | t }}</button></li>
              }
            </ul>
          }
        }

        @if (o.missions.length) {
          <p class="mt-4 font-medium">{{ 'offerPanel.missions' | t }}</p>
          <ul class="mt-1 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-300">@for (x of o.missions; track $index) { <li>{{ x }}</li> }</ul>
        }
        @if (o.requirements.length) {
          <p class="mt-4 font-medium">{{ 'offerPanel.requirements' | t }}</p>
          <ul class="mt-1 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-300">@for (x of o.requirements; track $index) { <li>{{ x }}</li> }</ul>
        }
        @if (o.description) {
          <details class="mt-4"><summary class="cursor-pointer font-medium">{{ 'offerPanel.description' | t }}</summary>
            <p class="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-300">{{ o.description }}</p></details>
        }
      }
    </aside>
  `,
})
export class OfferPanel {
  protected readonly store = inject(CvStore);
  protected readonly offers = inject(OfferStore);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);

  readonly match = signal<OfferMatch | null>(null);
  protected score = formatScore;
  protected readonly meta = computed(() => {
    const o = this.offers.document();
    return o ? [o.company, o.location, o.contractType].filter(Boolean).join(' · ') : '';
  });

  constructor() {
    // Re-fetch the match when the CV changes and after every successful autosave.
    effect(() => {
      const cvId = this.store.cvId();
      const offerId = this.offers.offerId();
      const state = this.store.saveState();
      if (cvId && offerId && (state === 'idle' || state === 'saved')) untracked(() => this.refresh(offerId, cvId));
    });
  }

  private async refresh(offerId: string, cvId: string): Promise<void> {
    try {
      const m = await firstValueFrom(this.http.get<OfferMatch>(`${API_BASE_URL}/api/offers/${offerId}/match/${cvId}`));
      if (this.store.cvId() === cvId) this.match.set(m);
    } catch {
      this.toast.error(this.i18n.t('offerPanel.matchError'));
    }
  }

  protected addSkill(tech: string): void {
    this.store.update((doc) => {
      const cats = doc.skillCategories;
      if (cats.length === 0) {
        const name = doc.settings.cvLanguage === 'en' ? 'Skills' : 'Compétences';
        return { ...doc, skillCategories: [{ name, skills: [tech] }] };
      }
      const last = cats[cats.length - 1];
      return { ...doc, skillCategories: [...cats.slice(0, -1), { ...last, skills: [...last.skills, tech] }] };
    });
  }
}
