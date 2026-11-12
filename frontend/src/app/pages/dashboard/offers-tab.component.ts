import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';
import { I18nService } from '../../core/i18n.service';
import { formatScore, nextStep, upcomingSteps } from '../../core/offer-utils';
import { TPipe } from '../../core/t.pipe';
import { ToastService } from '../../core/toast.service';
import { JobOfferDto, OfferStatus, OfferStep } from '../../models/job-offer';
import { Modal } from '../../ui/modal';
import { Skeleton } from '../../ui/skeleton';

const STATUSES: OfferStatus[] = ['toApply', 'applied', 'interview', 'rejected'];

@Component({
  selector: 'app-offers-tab',
  imports: [RouterLink, Modal, Skeleton, TPipe],
  template: `
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <button type="button" (click)="createOffer()" class="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
        + {{ 'offers.new' | t }}
      </button>
      <input [value]="search()" (input)="search.set($any($event.target).value)" [placeholder]="'offers.search' | t"
             class="w-64 rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
      <select [value]="statusFilter()" (change)="statusFilter.set($any($event.target).value)"
              class="rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
        <option value="">{{ 'offers.allStatus' | t }}</option>
        @for (s of statuses; track s) {
          <option [value]="s">{{ 'offers.status.' + s | t }}</option>
        }
      </select>
      <p class="ml-auto text-sm text-slate-500 dark:text-slate-400">{{ statsText() }}</p>
    </div>

    @if (loading()) {
      <ul class="space-y-3">
        @for (i of [1, 2, 3]; track i) {
          <li class="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
            <app-skeleton extraClass="h-12 w-12 rounded-lg" />
            <div class="flex-1 space-y-2">
              <app-skeleton extraClass="h-3 w-1/3" />
              <app-skeleton extraClass="h-2.5 w-1/2" />
            </div>
          </li>
        }
      </ul>
    } @else if (offers().length === 0) {
      <div class="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
        <p class="text-slate-500 dark:text-slate-400">{{ 'offers.empty' | t }}</p>
        <p class="mt-1 text-sm text-slate-400 dark:text-slate-500">{{ 'offers.emptyHint' | t }}</p>
        <button type="button" (click)="createOffer()" class="mt-4 rounded bg-slate-800 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700">
          + {{ 'offers.new' | t }}
        </button>
      </div>
    } @else {
      @if (agenda().length > 0) {
        <div class="mb-4 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">📅 {{ 'offers.agenda' | t }}</h2>
            <span class="text-xs text-slate-400">{{ 'offers.agendaHint' | t }}</span>
          </div>
          <ul class="grid gap-2 sm:grid-cols-3">
            @for (a of agenda(); track a.step.id; let first = $first) {
              <li>
                <a [routerLink]="['/offers', a.offerId]" [queryParams]="{ tab: 'steps' }"
                   class="block rounded-lg border p-3 hover:ring-2 hover:ring-indigo-500"
                   [class.border-indigo-200]="first" [class.bg-indigo-50]="first" [class.dark:border-indigo-500/30]="first" [class.dark:bg-indigo-500/10]="first"
                   [class.border-slate-200]="!first" [class.dark:border-slate-700]="!first">
                  <p class="text-[11px] font-semibold uppercase" [class.text-indigo-600]="first" [class.dark:text-indigo-300]="first" [class.text-slate-500]="!first">{{ fmt(a.at) }}</p>
                  <p class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ stepLabel(a.step) }}</p>
                  <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ a.company || a.title }} · {{ 'offers.format.' + a.step.format | t }}</p>
                </a>
              </li>
            }
          </ul>
        </div>
      }

      @if (filtered().length === 0) {
        <p class="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{{ 'offers.noMatch' | t }}</p>
      }
      <ul class="space-y-3">
        @for (o of filtered(); track o.id) {
          <li class="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm ring-2 ring-transparent transition hover:shadow-md hover:ring-indigo-500 dark:bg-slate-800"
              [class.opacity-60]="o.document.status === 'rejected'">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold"
                 [class]="o.document.status === 'rejected'
                   ? 'bg-slate-100 text-slate-400 dark:bg-slate-700'
                   : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'">
              {{ initial(o) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <a [routerLink]="['/offers', o.id]" class="truncate font-semibold text-slate-800 hover:underline dark:text-slate-100">{{ o.document.title || ('offers.untitled' | t) }}</a>
                <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" [class]="statusClass(o.document.status)">{{ 'offers.status.' + o.document.status | t }}</span>
              </div>
              <p class="truncate text-sm text-slate-500 dark:text-slate-400">
                {{ meta(o) }}
                @if (o.document.url) {
                  <a [href]="o.document.url" target="_blank" rel="noopener" class="text-indigo-600 hover:underline dark:text-indigo-400">🔗 {{ 'offers.link' | t }}</a>
                }
              </p>
              @if (o.document.status !== 'rejected') {
                @if (nextOf(o); as step) {
                  <a [routerLink]="['/offers', o.id]" [queryParams]="{ tab: 'steps' }" class="mt-1 block text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                    📅 {{ 'offers.next' | t }} {{ stepLabel(step) }} · {{ fmt(step.date!) }}
                  </a>
                }
              }
              @if (o.document.technologies.length > 0) {
                <div class="mt-1.5 flex flex-wrap gap-1">
                  @for (tech of o.document.technologies.slice(0, 4); track tech) {
                    <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">{{ tech }}</span>
                  }
                  @if (o.document.technologies.length > 4) {
                    <span class="text-[11px] text-slate-400">+{{ o.document.technologies.length - 4 }}</span>
                  }
                </div>
              }
            </div>
            @if (o.cvs.length > 0) {
              <div class="space-y-1 text-right">
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ 'offers.adaptedCv' | t }} ({{ o.cvs.length }})</p>
                @for (cv of o.cvs; track cv.id) {
                  <p class="text-sm text-slate-800 dark:text-slate-100">
                    <span class="rounded px-1 text-[10px] font-bold" [class]="cv.language === 'en'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'">{{ cv.language.toUpperCase() }}</span>
                    <a [routerLink]="['/editor', cv.id]" class="hover:underline">{{ cv.name }}</a>
                    @if (cv.score !== null) {
                      · <span class="font-semibold" [class]="scoreClass(cv.score)">{{ fmtScore(cv.score) }}</span>
                    }
                  </p>
                }
              </div>
            } @else if (o.document.status !== 'rejected') {
              <a [routerLink]="['/offers', o.id]" [queryParams]="{ pick: 1 }"
                 class="rounded border-2 border-dashed border-slate-300 px-4 py-3 text-xs font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-500 dark:border-slate-600 dark:text-slate-400">
                + {{ 'offers.createAdapted' | t }}
              </a>
            }
            <div class="flex gap-2.5 text-sm text-slate-500 dark:text-slate-400">
              <a [routerLink]="['/offers', o.id]" [title]="'offers.edit' | t" class="hover:text-slate-800 dark:hover:text-slate-100">✎</a>
              @if (o.cvs.length > 0) {
                <a [routerLink]="['/editor', o.cvs[0].id]" [title]="'offers.openCv' | t" class="hover:text-slate-800 dark:hover:text-slate-100">📄</a>
              }
              <button type="button" (click)="toDelete.set(o)" [title]="'offers.delete' | t" class="hover:text-red-600">🗑️</button>
            </div>
          </li>
        }
      </ul>
    }

    @if (toDelete(); as o) {
      <app-modal (close)="toDelete.set(null)">
        <h2 class="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">{{ deleteTitle(o) }}</h2>
        <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">{{ 'offers.delete.text' | t }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" (click)="toDelete.set(null)" class="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:text-slate-200">{{ 'offers.cancel' | t }}</button>
          <button type="button" (click)="confirmDelete(o.id)" class="rounded bg-red-600 px-3 py-1.5 text-sm text-white">{{ 'offers.delete' | t }}</button>
        </div>
      </app-modal>
    }
  `,
})
export class OffersTab implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);

  readonly statuses = STATUSES;
  readonly offers = signal<JobOfferDto[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly toDelete = signal<JobOfferDto | null>(null);

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const st = this.statusFilter();
    return this.offers().filter((o) => {
      const d = o.document;
      if (st && d.status !== st) return false;
      return !q || [d.title, d.company, ...d.technologies].some((s) => s.toLowerCase().includes(q));
    });
  });

  readonly agenda = computed(() => upcomingSteps(this.offers(), new Date()));

  readonly statsText = computed(() =>
    this.i18n
      .t('offers.stats')
      .replace('{n}', String(this.offers().length))
      .replace('{m}', String(this.offers().filter((o) => o.cvs.length > 0).length)),
  );

  async ngOnInit(): Promise<void> {
    try {
      this.offers.set(await firstValueFrom(this.http.get<JobOfferDto[]>(`${API_BASE_URL}/api/offers`)));
    } finally {
      this.loading.set(false);
    }
  }

  async createOffer(): Promise<void> {
    const created = await firstValueFrom(this.http.post<JobOfferDto>(`${API_BASE_URL}/api/offers`, {}));
    await this.router.navigate(['/offers', created.id]);
  }

  async confirmDelete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/offers/${id}`));
    this.toDelete.set(null);
    this.offers.update((list) => list.filter((o) => o.id !== id));
    this.toast.success(this.i18n.t('offers.deleted'));
  }

  nextOf(o: JobOfferDto): OfferStep | null {
    return nextStep(o.document, new Date());
  }

  stepLabel(step: OfferStep): string {
    return (step.type === 'other' && step.label) || this.i18n.t(`offers.stepType.${step.type}`);
  }

  deleteTitle(o: JobOfferDto): string {
    return this.i18n.t('offers.delete.title').replace('{name}', o.document.title || this.i18n.t('offers.untitled'));
  }

  fmt(d: Date | string): string {
    return new Date(d).toLocaleString(this.i18n.lang() === 'en' ? 'en-GB' : 'fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  fmtScore = formatScore;

  initial(o: JobOfferDto): string {
    return (o.document.company || o.document.title || '?').charAt(0).toUpperCase();
  }

  meta(o: JobOfferDto): string {
    const d = o.document;
    return [d.company, d.location, d.contractType].filter(Boolean).join(' · ') + (d.url && (d.company || d.location || d.contractType) ? ' · ' : '');
  }

  statusClass(s: OfferStatus): string {
    switch (s) {
      case 'interview': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }
  }

  scoreClass(score: number): string {
    return score >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400';
  }
}
