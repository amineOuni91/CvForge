import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LetterStore } from '../../editor/letter-store';
import { LetterSenderSection } from '../../editor/sections/letter-sender.section';
import { LetterRecipientSection } from '../../editor/sections/letter-recipient.section';
import { LetterContextSection } from '../../editor/sections/letter-context.section';
import { LetterBodySection } from '../../editor/sections/letter-body.section';
import { LetterCustomizationPanel } from '../../editor/letter-customization-panel.component';
import { PreviewPane } from '../../editor/preview-pane.component';
import { LetterTemplateHostComponent } from '../../templates/letters/letter-template-host.component';
import { ToastService } from '../../core/toast.service';
import { AuthService } from '../../core/auth.service';
import { Skeleton } from '../../ui/skeleton';

@Component({
  selector: 'app-letter-editor',
  imports: [
    LetterSenderSection, LetterRecipientSection, LetterContextSection, LetterBodySection,
    LetterCustomizationPanel, PreviewPane, LetterTemplateHostComponent, RouterLink, Skeleton,
  ],
  template: `
    <div class="flex h-screen flex-col">
      <header class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
        <div class="flex items-center gap-3">
          @if (store.adminUserId(); as adminUserId) {
            <a routerLink="/admin" [queryParams]="{ expand: adminUserId }" class="text-sm text-slate-500 hover:underline dark:text-slate-400">← Retour à l'administration</a>
          } @else {
            <a routerLink="/dashboard" class="text-sm text-slate-500 hover:underline dark:text-slate-400">← CvForge</a>
          }
          <span class="font-medium text-slate-800 dark:text-slate-100">{{ store.name() }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-500 dark:text-slate-400">{{ saveLabel() }}</span>
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
          </div>
          <div class="hidden flex-1 items-start justify-center bg-slate-200 p-8 lg:flex dark:bg-slate-900">
            <app-skeleton extraClass="aspect-[210/297] w-[420px]" />
          </div>
        </div>
      } @else {
        <div class="flex flex-1 overflow-hidden">
          <div [class]="editPanelClass()">
            <div class="flex border-b border-slate-200 dark:border-slate-700">
              <button type="button" (click)="leftTab.set('content')" class="flex-1 py-2 text-sm font-medium"
                      [class.text-slate-800]="leftTab() === 'content'" [class.dark:text-slate-100]="leftTab() === 'content'" [class.text-slate-400]="leftTab() !== 'content'">
                Contenu
              </button>
              <button type="button" (click)="leftTab.set('design')" class="flex-1 py-2 text-sm font-medium"
                      [class.text-slate-800]="leftTab() === 'design'" [class.dark:text-slate-100]="leftTab() === 'design'" [class.text-slate-400]="leftTab() !== 'design'">
                Template &amp; Design
              </button>
            </div>
            @switch (leftTab()) {
              @case ('content') {
                <div class="space-y-6 p-4">
                  <section>
                    <h2 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Expéditeur</h2>
                    <app-letter-sender-section />
                  </section>
                  <section>
                    <h2 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Destinataire</h2>
                    <app-letter-recipient-section />
                  </section>
                  <section>
                    <h2 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Contexte</h2>
                    <app-letter-context-section />
                  </section>
                  <section>
                    <h2 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Lettre</h2>
                    <app-letter-body-section />
                  </section>
                </div>
              }
              @case ('design') { <app-letter-customization-panel /> }
            }
          </div>
          <div [class]="previewPanelClass()">
            <app-preview-pane [document]="store.document()">
              @if (store.document(); as doc) {
                <app-letter-template-host [document]="doc" />
              }
            </app-preview-pane>
          </div>
        </div>

        <div class="flex border-t border-slate-200 bg-white lg:hidden dark:border-slate-700 dark:bg-slate-800">
          <button type="button" (click)="mobileView.set('edit')" class="flex-1 py-3 text-sm font-medium"
                  [class.text-slate-800]="mobileView() === 'edit'" [class.dark:text-slate-100]="mobileView() === 'edit'" [class.text-slate-400]="mobileView() !== 'edit'">
            ✎ Éditer
          </button>
          <button type="button" (click)="mobileView.set('preview')" class="flex-1 py-3 text-sm font-medium"
                  [class.text-slate-800]="mobileView() === 'preview'" [class.dark:text-slate-100]="mobileView() === 'preview'" [class.text-slate-400]="mobileView() !== 'preview'">
            👁 Voir
          </button>
        </div>
      }
    </div>
  `,
})
export class LetterEditor implements OnInit {
  protected readonly store = inject(LetterStore);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  readonly accountUnconfirmed = computed(
    () => this.auth.currentUser()?.emailConfirmed === false && this.auth.currentUser()?.role !== 'admin',
  );

  readonly mobileView = signal<'edit' | 'preview'>('edit');
  readonly leftTab = signal<'content' | 'design'>('content');

  readonly editPanelClass = computed(
    () => `${this.mobileView() === 'edit' ? 'block' : 'hidden'} lg:block w-full overflow-y-auto border-r border-slate-200 bg-white lg:w-[420px] dark:border-slate-700 dark:bg-slate-800`,
  );

  readonly previewPanelClass = computed(
    () => `${this.mobileView() === 'preview' ? 'block' : 'hidden'} lg:block flex-1 overflow-hidden`,
  );

  readonly saveLabel = computed(() => {
    switch (this.store.saveState()) {
      case 'saving': return 'Enregistrement...';
      case 'saved': return '⟳ Enregistré';
      case 'error': return 'Erreur de sauvegarde';
      default: return '';
    }
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const adminUserId = this.route.snapshot.paramMap.get('userId') ?? undefined;
    if (id) this.store.load(id, adminUserId);
  }

  async download(): Promise<void> {
    try {
      await this.store.downloadExport(this.store.exportFormat());
    } catch {
      this.toast.error("Échec de l'export.");
    }
  }
}
