import { HttpClient } from '@angular/common/http';
import { Component, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';
import { I18nService } from '../../core/i18n.service';
import { formatScore } from '../../core/offer-utils';
import { TPipe } from '../../core/t.pipe';
import { ToastService } from '../../core/toast.service';
import { CvDto, CvSummary } from '../../models/cv-document';
import { OfferMatch } from '../../models/job-offer';
import { OfferStore } from '../../editor/offer-store';
import { Modal } from '../../ui/modal';

interface Detail { language: string; match: OfferMatch }

@Component({
  selector: 'app-pick-base-cvs',
  imports: [Modal, TPipe],
  template: `
    <app-modal align="items-start pt-[5vh]" width="w-full max-w-3xl max-h-[90vh] overflow-y-auto" (close)="closed.emit()">
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">{{ 'offerPicker.title' | t }}</h2>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ 'offerPicker.sub' | t }}</p>

      @if (cvs().length === 0 && !loading()) {
        <p class="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">{{ 'offerPicker.empty' | t }}</p>
      }
      <ul class="mt-5 flex flex-wrap justify-center gap-4">
        @for (cv of cvs(); track cv.id) {
          <li class="w-36">
            <label class="block cursor-pointer">
              <div class="relative aspect-[210/297] rounded-lg bg-slate-100 p-1.5 ring-2 hover:ring-indigo-300 dark:bg-slate-900"
                   [class.ring-indigo-500]="checked().includes(cv.id)"
                   [class.ring-transparent]="!checked().includes(cv.id)">
                @if (thumbnails()[cv.id]; as thumb) {
                  <img [src]="thumb" class="h-full w-full rounded-sm object-cover object-top" alt="" />
                } @else {
                  <div class="h-full rounded-sm bg-white"></div>
                }
                @if (details()[cv.id]; as d) {
                  <span class="absolute right-2 top-2 rounded px-1 text-[10px] font-bold uppercase"
                        [class]="d.language === 'en' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'">{{ d.language }}</span>
                }
              </div>
              <p class="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                <input type="checkbox" class="accent-indigo-600" [checked]="checked().includes(cv.id)" (change)="toggle(cv)" />
                <span class="truncate">{{ cv.name }}</span>
              </p>
            </label>
          </li>
        }
      </ul>

      <div class="mt-5 rounded-lg border border-slate-200 dark:border-slate-700">
        <p class="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100">
          {{ checked().length }} {{ 'offerPicker.copies' | t }}
        </p>
        <ul class="divide-y divide-slate-200 dark:divide-slate-700">
          @for (id of checked(); track id) {
            <li class="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3">
              <span class="rounded bg-slate-100 px-1.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">{{ details()[id]?.language ?? '…' }}</span>
              <div class="min-w-0">
                <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ 'offerPicker.from' | t }} {{ baseName(id) }}</p>
                <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                       [value]="names()[id]" (input)="setName(id, $any($event.target).value)" />
              </div>
              @if (details()[id]?.match; as m) {
                <p class="text-right text-xs">
                  <span class="font-semibold text-amber-600 dark:text-amber-400">{{ score(m.score) }}</span><br>
                  @if (m.missing.length) {
                    <span class="text-slate-400">{{ 'offerPicker.missing' | t }} {{ m.missing.join(', ') }}</span>
                  }
                </p>
              }
            </li>
          }
        </ul>
      </div>

      <div class="mt-6 flex justify-end gap-3">
        <button type="button" (click)="closed.emit()" class="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-200">{{ 'offers.cancel' | t }}</button>
        <button type="button" (click)="create()" [disabled]="checked().length === 0 || creating()"
                class="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{{ 'offerPicker.create' | t }}</button>
      </div>
      <p class="mt-3 text-right text-[11px] text-slate-400">{{ 'offerPicker.hint' | t }}</p>
    </app-modal>
  `,
})
export class PickBaseCvs implements OnInit, OnDestroy {
  readonly offerId = input.required<string>();
  readonly offerTitle = input('');
  readonly closed = output<void>();

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private readonly offers = inject(OfferStore);

  readonly cvs = signal<CvSummary[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly checked = signal<string[]>([]);
  readonly names = signal<Record<string, string>>({});
  readonly details = signal<Record<string, Detail>>({});
  readonly thumbnails = signal<Record<string, string>>({});
  protected score = formatScore;

  async ngOnInit(): Promise<void> {
    try {
      const all = await firstValueFrom(this.http.get<CvSummary[]>(`${API_BASE_URL}/api/cvs`));
      const base = all.filter((c) => !c.jobOfferId); // tailored copies are not base CVs
      this.cvs.set(base);
      for (const cv of base) this.loadThumbnail(cv.id);
    } catch {
      this.toast.error(this.i18n.t('offerPicker.loadError'));
    } finally {
      this.loading.set(false);
    }
  }

  private destroyed = false;

  ngOnDestroy(): void {
    this.destroyed = true;
    for (const url of Object.values(this.thumbnails())) URL.revokeObjectURL(url);
  }

  protected baseName(id: string): string {
    return this.cvs().find((c) => c.id === id)?.name ?? '';
  }

  protected setName(id: string, value: string): void {
    this.names.update((m) => ({ ...m, [id]: value }));
  }

  protected toggle(cv: CvSummary): void {
    if (this.checked().includes(cv.id)) {
      this.checked.update((l) => l.filter((x) => x !== cv.id));
      return;
    }
    this.checked.update((l) => [...l, cv.id]);
    const title = this.offerTitle();
    this.names.update((m) => ({ ...m, [cv.id]: m[cv.id] ?? (title ? `${cv.name} – ${title}` : cv.name) }));
    if (!this.details()[cv.id]) this.loadDetail(cv.id);
  }

  private async loadDetail(id: string): Promise<void> {
    try {
      const [cv, match] = await Promise.all([
        firstValueFrom(this.http.get<CvDto>(`${API_BASE_URL}/api/cvs/${id}`)),
        firstValueFrom(this.http.get<OfferMatch>(`${API_BASE_URL}/api/offers/${this.offerId()}/match/${id}`)),
      ]);
      this.details.update((m) => ({ ...m, [id]: { language: cv.document.settings.cvLanguage, match } }));
    } catch {
      this.toast.error(this.i18n.t('offerPicker.detailError'));
    }
  }

  private async loadThumbnail(id: string): Promise<void> {
    try {
      const blob = await firstValueFrom(this.http.get(`${API_BASE_URL}/api/cvs/${id}/thumbnail`, { responseType: 'blob' }));
      if (this.destroyed) return;
      this.thumbnails.update((m) => ({ ...m, [id]: URL.createObjectURL(blob) }));
    } catch {
      // nice-to-have, keep the blank placeholder
    }
  }

  protected async create(): Promise<void> {
    this.creating.set(true);
    try {
      const items = this.checked().map((id) => ({ baseCvId: id, name: (this.names()[id] ?? '').trim() }));
      const created = await firstValueFrom(
        this.http.post<CvSummary[]>(`${API_BASE_URL}/api/offers/${this.offerId()}/cvs`, { items }),
      );
      await this.offers.reloadCvs().catch(() => undefined);
      await this.router.navigate(['/editor', created[0].id]);
    } catch {
      this.toast.error(this.i18n.t('offerPicker.createError'));
    } finally {
      this.creating.set(false);
    }
  }
}
