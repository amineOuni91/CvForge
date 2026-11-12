import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OfferStore } from '../../editor/offer-store';
import { OfferDocument, OfferStatus } from '../../models/job-offer';
import { formatScore } from '../../core/offer-utils';
import { I18nService } from '../../core/i18n.service';
import { ToastService } from '../../core/toast.service';
import { TPipe } from '../../core/t.pipe';
import { TagInput } from '../../ui/tag-input';

const INPUT = 'mt-1 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';
const CARD = 'rounded-lg bg-white p-6 shadow-sm dark:bg-slate-800';

@Component({
  selector: 'app-offer-editor',
  imports: [RouterLink, TPipe, TagInput],
  template: `
    <main class="min-h-screen bg-slate-100 p-8 dark:bg-slate-900">
      <header class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <a routerLink="/dashboard" [queryParams]="{ tab: 'offers' }" class="text-sm text-slate-500 hover:underline dark:text-slate-400">← {{ 'offerEditor.back' | t }}</a>
          <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ 'offerEditor.title' | t }}</h1>
        </div>
        <span class="text-xs" [class]="store.saveState() === 'error' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'">{{ saveLabel() }}</span>
      </header>

      <div class="mb-6 flex gap-2">
        <button type="button" (click)="tab.set('ad')" class="rounded px-3 py-1.5 text-sm font-medium"
                [class]="tab() === 'ad' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'">
          {{ 'offerEditor.tabAd' | t }}
        </button>
        <button type="button" (click)="tab.set('steps')" class="rounded px-3 py-1.5 text-sm font-medium"
                [class]="tab() === 'steps' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'">
          {{ 'offerEditor.tabSteps' | t }}
          <span class="ml-1 rounded-full bg-indigo-500 px-1.5 text-[10px] text-white">{{ stepCount() }}</span>
        </button>
      </div>

      @if (store.document(); as doc) {
        @if (tab() === 'ad') {
          <div class="grid gap-6 text-slate-800 lg:grid-cols-3 dark:text-slate-100">
            <div class="space-y-6 lg:col-span-2">
              <div class="${CARD}">
                <h2 class="mb-4 font-semibold">{{ 'offerEditor.general' | t }}</h2>
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="text-sm">{{ 'offerEditor.jobTitle' | t }} *
                    <input class="${INPUT}" [value]="doc.title" (input)="set('title', $any($event.target).value)" /></label>
                  <label class="text-sm">{{ 'offerEditor.company' | t }} *
                    <input class="${INPUT}" [value]="doc.company" (input)="set('company', $any($event.target).value)" /></label>
                  <label class="text-sm">{{ 'offerEditor.location' | t }}
                    <input class="${INPUT}" [value]="doc.location" (input)="set('location', $any($event.target).value)" /></label>
                  <label class="text-sm">{{ 'offerEditor.contract' | t }}
                    <select class="${INPUT}" (change)="set('contractType', $any($event.target).value)">
                      @for (c of contractOptions(doc.contractType); track c) {
                        <option [value]="c" [selected]="c === doc.contractType">{{ c || '—' }}</option>
                      }
                    </select></label>
                  <label class="text-sm sm:col-span-2">{{ 'offerEditor.url' | t }}
                    <input type="url" class="${INPUT}" [value]="doc.url" (input)="set('url', $any($event.target).value)" /></label>
                </div>
              </div>

              <div class="${CARD}">
                <h2 class="mb-4 font-semibold">{{ 'offerEditor.content' | t }}</h2>
                <label class="text-sm">{{ 'offerEditor.description' | t }}
                  <textarea rows="5" class="${INPUT}" [value]="doc.description" (input)="set('description', $any($event.target).value)"></textarea></label>
                <div class="mt-4 space-y-4 text-sm">
                  <div>{{ 'offerEditor.technologies' | t }}
                    <app-tag-input [values]="doc.technologies" (valuesChange)="set('technologies', $event)" [placeholder]="'offerEditor.addTag' | t" /></div>
                  <div>{{ 'offerEditor.missions' | t }}
                    <app-tag-input [values]="doc.missions" (valuesChange)="set('missions', $event)" [placeholder]="'offerEditor.addTag' | t" /></div>
                  <div>{{ 'offerEditor.requirements' | t }}
                    <app-tag-input [values]="doc.requirements" (valuesChange)="set('requirements', $event)" [placeholder]="'offerEditor.addTag' | t" /></div>
                </div>
              </div>
            </div>

            <aside class="space-y-6">
              <div class="${CARD}">
                <h2 class="mb-4 font-semibold">{{ 'offerEditor.follow' | t }}</h2>
                <label class="block text-sm">{{ 'offerEditor.status' | t }}
                  <select class="${INPUT}" (change)="set('status', $any($event.target).value)">
                    @for (s of statuses; track s) {
                      <option [value]="s" [selected]="s === doc.status">{{ 'offers.status.' + s | t }}</option>
                    }
                  </select></label>
                <label class="mt-4 block text-sm">{{ 'offerEditor.notes' | t }}
                  <textarea rows="4" class="${INPUT}" [value]="doc.notes" (input)="set('notes', $any($event.target).value)"></textarea></label>
              </div>

              <div class="rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50 p-6 dark:border-indigo-500/40 dark:bg-indigo-500/10">
                <h2 class="mb-3 text-center font-semibold">{{ 'offerEditor.cvs' | t }}</h2>
                @if (store.cvs().length === 0) {
                  <p class="text-center text-sm text-slate-600 dark:text-slate-300">{{ 'offerEditor.noCv' | t }}</p>
                } @else {
                  <ul class="space-y-2 text-sm">
                    @for (cv of store.cvs(); track cv.id) {
                      <li class="flex items-center gap-2">
                        <span class="rounded bg-indigo-100 px-1.5 text-[10px] font-semibold uppercase text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{{ cv.language }}</span>
                        <a [routerLink]="['/editor', cv.id]" class="min-w-0 flex-1 truncate hover:underline">{{ cv.name }}</a>
                        <span class="text-xs text-slate-500 dark:text-slate-400">{{ score(cv.score) }}</span>
                      </li>
                    }
                  </ul>
                }
                <div class="mt-3 text-center">
                  <button type="button" (click)="pickOpen.set(true)" class="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                    📄 {{ 'offers.createAdapted' | t }}
                  </button>
                </div>
              </div>
            </aside>
          </div>
        } @else {
          <!-- Task 9 fills this panel with <app-offer-steps /> -->
          <div></div>
        }
        @if (pickOpen()) {
          <!-- Task 10 fills this with <app-pick-base-cvs /> -->
          <div></div>
        }
      }
    </main>
  `,
})
export class OfferEditor implements OnInit {
  protected readonly store = inject(OfferStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);

  readonly tab = signal<'ad' | 'steps'>('ad');
  readonly pickOpen = signal(false);
  readonly statuses: OfferStatus[] = ['toApply', 'applied', 'interview', 'rejected'];
  readonly stepCount = computed(() => this.store.document()?.steps.length ?? 0);
  readonly saveLabel = computed(() => {
    switch (this.store.saveState()) {
      case 'saving': return this.i18n.t('offerEditor.saving');
      case 'saved': return '✓ ' + this.i18n.t('offerEditor.saved');
      case 'error': return this.i18n.t('offerEditor.saveError');
      default: return '';
    }
  });

  protected score = formatScore;

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    if (q.get('tab') === 'steps') this.tab.set('steps');
    if (q.get('pick') === '1') this.pickOpen.set(true);
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.store.load(id).catch(() => {
      this.toast.error(this.i18n.t('offerEditor.loadError'));
      this.router.navigate(['/dashboard'], { queryParams: { tab: 'offers' } });
    });
  }

  protected set<K extends keyof OfferDocument>(key: K, value: OfferDocument[K]): void {
    this.store.update((doc) => ({ ...doc, [key]: value }));
  }

  protected contractOptions(current: string): string[] {
    const base = ['CDI', 'CDD', 'Freelance', 'Stage', 'Alternance'];
    return base.includes(current) ? base : [current, ...base];
  }
}
