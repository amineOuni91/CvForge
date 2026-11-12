import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CvStore } from '../../editor/cv-store';
import { OfferStore } from '../../editor/offer-store';
import { OfferPanel } from '../../editor/offer-panel.component';
import { I18nService } from '../../core/i18n.service';
import { formatScore } from '../../core/offer-utils';
import { SectionList } from '../../editor/section-list.component';
import { PreviewPane } from '../../editor/preview-pane.component';
import { CustomizationPanel } from '../../editor/customization-panel.component';
import { AtsPanel } from '../../editor/ats-panel.component';
import { ToastService } from '../../core/toast.service';
import { AuthService } from '../../core/auth.service';
import { Skeleton } from '../../ui/skeleton';
import { TPipe } from '../../core/t.pipe';
import { TemplateHostComponent } from '../../templates/template-host.component';

@Component({
  selector: 'app-editor',
  imports: [SectionList, PreviewPane, CustomizationPanel, AtsPanel, RouterLink, Skeleton, TPipe, TemplateHostComponent, OfferPanel],
  template: `
    <div class="flex h-screen flex-col">
      <header class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
        <div class="flex items-center gap-3">
          @if (store.adminUserId(); as adminUserId) {
            <a routerLink="/admin" [queryParams]="{ expand: adminUserId }" class="text-sm text-slate-500 hover:underline dark:text-slate-400">{{ 'editor.backToAdmin' | t }}</a>
          } @else if (linkedOfferId(); as offerId) {
            <a [routerLink]="['/offers', offerId]" class="text-sm text-slate-500 hover:underline dark:text-slate-400">← {{ 'offerPanel.backToOffer' | t }}</a>
          } @else {
            <a routerLink="/dashboard" class="text-sm text-slate-500 hover:underline dark:text-slate-400">← CvForge</a>
          }
          @if (linkedOfferId() && offers.cvs().length) {
            <select [title]="'offerPanel.cvsOfOffer' | t" (change)="switchCv($any($event.target).value)"
                    class="max-w-xs rounded border border-slate-300 bg-white px-2 py-1 text-sm font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              @for (c of offers.cvs(); track c.id) {
                <option [value]="c.id" [selected]="c.id === store.cvId()">{{ c.language === 'en' ? '🇬🇧' : '🇫🇷' }} {{ c.name }}{{ c.score === null ? '' : ' · ' + score(c.score) }}</option>
              }
              <option value="__add">+ {{ 'offerPanel.addCv' | t }}</option>
            </select>
          } @else {
            <span class="font-medium text-slate-800 dark:text-slate-100">{{ store.name() }}</span>
          }
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-500 dark:text-slate-400">{{ saveLabel() }}</span>
          @if (linkedOfferId()) {
            <button type="button" (click)="offerOpen.set(!offerOpen())" [title]="'offerPanel.toggle' | t"
                    class="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-200">📋 {{ 'offerPanel.title' | t }}</button>
          }
          <select
            [value]="store.exportFormat()"
            (change)="store.exportFormat.set($any($event.target).value)"
            class="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          >
            <option value="pdf">PDF</option>
            <option value="docx">Word (.docx)</option>
            <option value="txt">Texte (.txt)</option>
            <option value="html">HTML</option>
            <option value="json">JSON</option>
          </select>
          <button
            type="button"
            (click)="download()"
            [disabled]="store.downloadingPdf() || accountUnconfirmed()"
            [title]="accountUnconfirmed() ? ('confirmBanner.notice' | t) : ''"
            class="rounded bg-slate-800 px-3 py-1.5 text-sm text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {{ store.downloadingPdf() ? 'Génération...' : '⬇ Exporter' }}
          </button>
        </div>
      </header>

      @if (store.loading()) {
        <div class="flex flex-1 overflow-hidden">
          <div class="w-full space-y-3 border-r border-slate-200 bg-white p-4 lg:w-[420px] dark:border-slate-700 dark:bg-slate-800">
            <app-skeleton extraClass="h-6 w-1/2" />
            <app-skeleton extraClass="h-4 w-full" />
            <app-skeleton extraClass="h-4 w-full" />
            <app-skeleton extraClass="h-4 w-2/3" />
          </div>
          <div class="hidden flex-1 items-start justify-center bg-slate-200 p-8 lg:flex dark:bg-slate-900">
            <app-skeleton extraClass="aspect-[210/297] w-[420px]" />
          </div>
        </div>
      } @else {
        <div class="flex flex-1 overflow-hidden">
          @if (linkedOfferId() && offerOpen()) { <app-offer-panel /> }
          <div [class]="editPanelClass()">
            <div class="flex border-b border-slate-200 dark:border-slate-700">
              <button type="button" (click)="leftTab.set('content')"
                      class="flex-1 py-2 text-sm font-medium"
                      [class.text-slate-800]="leftTab() === 'content'"
                      [class.dark:text-slate-100]="leftTab() === 'content'"
                      [class.text-slate-400]="leftTab() !== 'content'">
                Contenu
              </button>
              <button type="button" (click)="leftTab.set('design')"
                      class="flex-1 py-2 text-sm font-medium"
                      [class.text-slate-800]="leftTab() === 'design'"
                      [class.dark:text-slate-100]="leftTab() === 'design'"
                      [class.text-slate-400]="leftTab() !== 'design'">
                Template &amp; Design
              </button>
              <button type="button" (click)="leftTab.set('analysis')"
                      class="flex-1 py-2 text-sm font-medium"
                      [class.text-slate-800]="leftTab() === 'analysis'"
                      [class.dark:text-slate-100]="leftTab() === 'analysis'"
                      [class.text-slate-400]="leftTab() !== 'analysis'">
                ✨ Analyse
              </button>
            </div>
            @switch (leftTab()) {
              @case ('content') { <app-section-list /> }
              @case ('design') { <app-customization-panel /> }
              @case ('analysis') { <app-ats-panel /> }
            }
          </div>
          <div [class]="previewPanelClass()">
            <app-preview-pane [document]="store.document()">
              @if (store.document(); as doc) {
                <app-template-host [document]="doc" />
              }
            </app-preview-pane>
          </div>
        </div>

        <div class="flex border-t border-slate-200 bg-white lg:hidden dark:border-slate-700 dark:bg-slate-800">
          <button type="button" (click)="mobileView.set('edit')"
                  class="flex-1 py-3 text-sm font-medium"
                  [class.text-slate-800]="mobileView() === 'edit'"
                  [class.dark:text-slate-100]="mobileView() === 'edit'"
                  [class.text-slate-400]="mobileView() !== 'edit'">
            ✎ Éditer
          </button>
          <button type="button" (click)="mobileView.set('preview')"
                  class="flex-1 py-3 text-sm font-medium"
                  [class.text-slate-800]="mobileView() === 'preview'"
                  [class.dark:text-slate-100]="mobileView() === 'preview'"
                  [class.text-slate-400]="mobileView() !== 'preview'">
            👁 Voir
          </button>
        </div>
      }
    </div>
  `,
})
export class Editor implements OnInit {
  protected readonly store = inject(CvStore);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly offers = inject(OfferStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  protected score = formatScore;

  readonly offerOpen = signal(true);
  // Offers API is owner-only: never expose offer UI when an admin edits someone else's CV.
  readonly linkedOfferId = computed(() => (this.store.adminUserId() ? null : this.store.jobOfferId()));

  constructor() {
    effect(() => {
      const offerId = this.linkedOfferId();
      if (offerId && this.offers.offerId() !== offerId) {
        untracked(() => this.offers.load(offerId).catch(() => this.toast.error(this.i18n.t('offerPanel.loadError'))));
      }
    });
    effect(() => {
      if (this.store.saveState() === 'saved' && this.linkedOfferId()) {
        untracked(() => this.offers.reloadCvs().catch(() => undefined));
      }
    });
  }

  readonly accountUnconfirmed = computed(
    () => this.auth.currentUser()?.emailConfirmed === false && this.auth.currentUser()?.role !== 'admin',
  );

  readonly mobileView = signal<'edit' | 'preview'>('edit');
  readonly leftTab = signal<'content' | 'design' | 'analysis'>('content');

  readonly editPanelClass = computed(
    () =>
      `${this.mobileView() === 'edit' ? 'block' : 'hidden'} lg:block w-full overflow-y-auto border-r border-slate-200 bg-white lg:w-[420px] dark:border-slate-700 dark:bg-slate-800`,
  );

  readonly previewPanelClass = computed(
    () => `${this.mobileView() === 'preview' ? 'block' : 'hidden'} lg:block flex-1 overflow-hidden`,
  );

  readonly saveLabel = computed(() => {
    switch (this.store.saveState()) {
      case 'saving':
        return 'Enregistrement...';
      case 'saved':
        return '⟳ Enregistré';
      case 'error':
        return 'Erreur de sauvegarde';
      default:
        return '';
    }
  });

  ngOnInit(): void {
    // paramMap (not snapshot): the CV switcher navigates /editor/:id -> /editor/:id2 reusing this component.
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      const adminUserId = params.get('userId') ?? undefined;
      if (id) this.store.load(id, adminUserId);
    });
  }

  protected async switchCv(value: string): Promise<void> {
    const offerId = this.linkedOfferId();
    if (value === '__add' && offerId) {
      await this.store.saveNow();
      this.router.navigate(['/offers', offerId], { queryParams: { pick: 1 } });
      return;
    }
    await this.store.saveNow();
    this.router.navigate(['/editor', value]);
  }

  async download(): Promise<void> {
    try {
      await this.store.downloadExport(this.store.exportFormat());
    } catch {
      this.toast.error("Échec de l'export.");
    }
  }
}
