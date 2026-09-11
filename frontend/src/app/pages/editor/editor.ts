import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CvStore } from '../../editor/cv-store';
import { SectionList } from '../../editor/section-list.component';
import { PreviewPane } from '../../editor/preview-pane.component';
import { CustomizationPanel } from '../../editor/customization-panel.component';
import { AtsPanel } from '../../editor/ats-panel.component';
import { ToastService } from '../../core/toast.service';
import { Skeleton } from '../../ui/skeleton';

@Component({
  selector: 'app-editor',
  imports: [SectionList, PreviewPane, CustomizationPanel, AtsPanel, RouterLink, Skeleton],
  template: `
    <div class="flex h-screen flex-col">
      <header class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div class="flex items-center gap-3">
          <a routerLink="/dashboard" class="text-sm text-slate-500 hover:underline">← CvForge</a>
          <span class="font-medium text-slate-800">{{ store.name() }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-500">{{ saveLabel() }}</span>
          <select
            [value]="store.exportFormat()"
            (change)="store.exportFormat.set($any($event.target).value)"
            class="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
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
            [disabled]="store.downloadingPdf()"
            class="rounded bg-slate-800 px-3 py-1.5 text-sm text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {{ store.downloadingPdf() ? 'Génération...' : '⬇ Exporter' }}
          </button>
        </div>
      </header>

      @if (store.loading()) {
        <div class="flex flex-1 overflow-hidden">
          <div class="w-full space-y-3 border-r border-slate-200 bg-white p-4 lg:w-[420px]">
            <app-skeleton extraClass="h-6 w-1/2" />
            <app-skeleton extraClass="h-4 w-full" />
            <app-skeleton extraClass="h-4 w-full" />
            <app-skeleton extraClass="h-4 w-2/3" />
          </div>
          <div class="hidden flex-1 items-start justify-center bg-slate-200 p-8 lg:flex">
            <app-skeleton extraClass="aspect-[210/297] w-[420px]" />
          </div>
        </div>
      } @else {
        <div class="flex flex-1 overflow-hidden">
          <div [class]="editPanelClass()">
            <div class="flex border-b border-slate-200">
              <button type="button" (click)="leftTab.set('content')"
                      class="flex-1 py-2 text-sm font-medium"
                      [class.text-slate-800]="leftTab() === 'content'"
                      [class.text-slate-400]="leftTab() !== 'content'">
                Contenu
              </button>
              <button type="button" (click)="leftTab.set('design')"
                      class="flex-1 py-2 text-sm font-medium"
                      [class.text-slate-800]="leftTab() === 'design'"
                      [class.text-slate-400]="leftTab() !== 'design'">
                Template &amp; Design
              </button>
              <button type="button" (click)="leftTab.set('analysis')"
                      class="flex-1 py-2 text-sm font-medium"
                      [class.text-slate-800]="leftTab() === 'analysis'"
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
            <app-preview-pane [document]="store.document()" />
          </div>
        </div>

        <div class="flex border-t border-slate-200 bg-white lg:hidden">
          <button type="button" (click)="mobileView.set('edit')"
                  class="flex-1 py-3 text-sm font-medium"
                  [class.text-slate-800]="mobileView() === 'edit'"
                  [class.text-slate-400]="mobileView() !== 'edit'">
            ✎ Éditer
          </button>
          <button type="button" (click)="mobileView.set('preview')"
                  class="flex-1 py-3 text-sm font-medium"
                  [class.text-slate-800]="mobileView() === 'preview'"
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

  readonly mobileView = signal<'edit' | 'preview'>('edit');
  readonly leftTab = signal<'content' | 'design' | 'analysis'>('content');

  readonly editPanelClass = computed(
    () =>
      `${this.mobileView() === 'edit' ? 'block' : 'hidden'} lg:block w-full overflow-y-auto border-r border-slate-200 bg-white lg:w-[420px]`,
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
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.store.load(id);
  }

  async download(): Promise<void> {
    try {
      await this.store.downloadExport(this.store.exportFormat());
    } catch {
      this.toast.error("Échec de l'export.");
    }
  }
}
